const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const dossierTest = fs.mkdtempSync(path.join(os.tmpdir(), "fbac-comptabilite-aides-"));
const fichiers = require("../backend/gestion/fichiers");
fichiers.definirDossierDonnees(dossierTest);
const comptabilite = require("../backend/gestion/comptabilite");

function reinitialiserComptabilite() {
    fichiers.ecrireJson("comptabilite.json", { operations: [], parametres: {} });
}

test("une aide est comptée une seule fois en recette et dans la trésorerie", () => {
    reinitialiserComptabilite();
    comptabilite.enregistrerParametres("saison_2026_2027", {
        licence: 39,
        compteBancaire: 0,
        caisse: 0
    });

    const inscription = {
        id: "inscription_aide",
        personId: "personne_aide",
        season: "saison_2026_2027",
        category: "adulte",
        frequency: "1",
        licenceFederaleIncluse: false,
        aides: { kiosk: { enabled: true, amount: 50 } },
        paiements: [{
            id: "paiement_reste",
            date: "2026-10-10",
            amount: 105,
            method: "virement"
        }]
    };
    const configuration = {
        tarifs: { adult1: 155 },
        aides: { kiosk: 50 },
        reductionFamille: 0
    };

    const personnes = [{ id: "personne_aide", firstName: "Test", lastName: "Aide" }];
    const saisons = [{ id: "saison_2026_2027" }];
    comptabilite.synchroniserCotisations([inscription], personnes, saisons, configuration);
    comptabilite.synchroniserCotisations([inscription], personnes, saisons, configuration);

    const operations = comptabilite.obtenirOperations({ saisonId: "saison_2026_2027" });
    const synthese = comptabilite.obtenirSynthese("saison_2026_2027", configuration);
    const operationAide = operations.find(operation => operation.source === "aide");

    assert.ok(operationAide);
    assert.equal(operationAide.montant, 50);
    assert.equal(operationAide.modePaiement, "virement");
    assert.equal(operationAide.saisonId, "saison_2026_2027");
    assert.equal(operations.filter(operation => operation.source === "aide").length, 1);
    assert.equal(synthese.totalRecettes, 155);
    assert.equal(synthese.compteBancaire, 155);
    assert.equal(synthese.resultat, 155);
});

test("la synthèse conserve le journal complet au-delà de 100 opérations", () => {
    reinitialiserComptabilite();
    for (let index = 0; index < 101; index += 1) {
        comptabilite.creerOperation({
            date: "2026-10-10",
            type: "recette",
            libelle: "Recette " + index,
            categorie: "autres-recettes",
            montant: 1,
            modePaiement: "virement",
            saisonId: "saison_2026_2027"
        });
    }

    const synthese = comptabilite.obtenirSynthese("saison_2026_2027", {});

    assert.equal(synthese.nombreOperations, 101);
    assert.equal(synthese.operations.length, 100);
    assert.equal(synthese.operationsCompletes.length, 101);
    assert.equal(synthese.totalRecettes, 101);
    assert.equal(synthese.nombreOperationsNonAffectees, 0);
});

test("reprend un ancien paiement stocké uniquement dans paidAmount", () => {
    reinitialiserComptabilite();
    comptabilite.enregistrerParametres("saison_2026_2027", {
        licence: 39,
        compteBancaire: 0,
        caisse: 0
    });

    const inscription = {
        id: "inscription_ancienne",
        personId: "personne_ancienne",
        season: "saison_2026_2027",
        category: "adulte",
        frequency: "1",
        licenceFederaleIncluse: false,
        paidAmount: 100,
        paymentMethod: "cheque"
    };

    comptabilite.synchroniserCotisations(
        [inscription],
        [{ id: "personne_ancienne", firstName: "Ancien", lastName: "Adhérent" }],
        [{ id: "saison_2026_2027" }],
        { tarifs: { adult1: 155 } }
    );

    const operations = comptabilite.obtenirOperations({ saisonId: "saison_2026_2027" });
    const synthese = comptabilite.obtenirSynthese("saison_2026_2027", {});

    assert.equal(operations.filter(operation => operation.source === "cotisation").length, 1);
    assert.equal(operations.find(operation => operation.source === "cotisation").montant, 100);
    assert.equal(synthese.totalRecettes, 100);
    assert.equal(synthese.compteBancaire, 100);
});

test("reconnaît le libellé accentué Chèque dans la trésorerie", () => {
    reinitialiserComptabilite();
    comptabilite.creerOperation({
        date: "2026-10-10",
        type: "recette",
        libelle: "Paiement par chèque",
        categorie: "cotisations",
        montant: 75,
        modePaiement: "Chèque",
        saisonId: "saison_2026_2027"
    });

    const synthese = comptabilite.obtenirSynthese("saison_2026_2027", {});

    assert.equal(synthese.compteBancaire, 75);
});

test("empêche la saisie manuelle d'une aide déjà générée depuis l'inscription", () => {
    reinitialiserComptabilite();
    assert.throws(
        () => comptabilite.creerOperation({
            date: "2026-10-10",
            type: "recette",
            libelle: "Kiosk — Test",
            categorie: "aide-kiosk",
            montant: 50,
            modePaiement: "virement",
            saisonId: "saison_2026_2027"
        }),
        /générées automatiquement/
    );
});

test("une aide ne peut jamais être créée ou modifiée comme dépense manuelle", () => {
    reinitialiserComptabilite();
    assert.throws(() => comptabilite.creerOperation({
        type: "depense",
        libelle: "Aide Pass'Sport",
        categorie: "aide-passsport",
        montant: 50,
        saisonId: "saison_2026_2027"
    }), /ne peuvent pas être saisies manuellement/);

    const operation = comptabilite.creerOperation({
        type: "depense",
        libelle: "Frais divers",
        categorie: "autres-depenses",
        montant: 10,
        saisonId: "saison_2026_2027"
    });
    assert.throws(() => comptabilite.modifierOperation(operation.id, {
        categorie: "aide-passsport"
    }), /ne peuvent pas être saisies manuellement/);
    assert.equal(comptabilite.obtenirOperation(operation.id).categorie, "autres-depenses");
});

test("empêche la suppression d'une aide générée automatiquement", () => {
    reinitialiserComptabilite();
    fichiers.ecrireJson("comptabilite.json", {
        operations: [{
            id: "aide_inscription_kiosk",
            date: "2026-10-10",
            type: "recette",
            libelle: "Kiosk — Test",
            categorie: "aide-kiosk",
            montant: 50,
            modePaiement: "virement",
            saisonId: "saison_2026_2027",
            source: "aide"
        }],
        parametres: {}
    });
    assert.throws(
        () => comptabilite.supprimerOperation("aide_inscription_kiosk"),
        /générée automatiquement/
    );
});

test("ne génère pas de dépense FFK pour une ancienne inscription dont le tarif prouve que la licence était exclue", () => {
    reinitialiserComptabilite();
    comptabilite.enregistrerParametres("saison_2026_2027", {
        licence: 39,
        compteBancaire: 500,
        caisse: 0
    });
    const inscription = {
        id: "inscription_ancienne_sans_licence",
        personId: "personne_ancienne_sans_licence",
        season: "saison_2026_2027",
        category: "adulte",
        frequency: "1",
        tarif: 116,
        tarifPersonnalise: false
    };
    comptabilite.synchroniserCotisations(
        [inscription],
        [{ id: "personne_ancienne_sans_licence", firstName: "Ancien", lastName: "Licencié" }],
        [{ id: "saison_2026_2027" }],
        { tarifs: { adult1: 155 } }
    );
    const operations = comptabilite.obtenirOperations({ saisonId: "saison_2026_2027" });
    assert.equal(operations.filter(operation => operation.source === "licence-adherent").length, 0);
    assert.equal(comptabilite.obtenirSynthese("saison_2026_2027", {}).totalDepenses, 0);
});

test("les licences FFK sont débitées de la trésorerie par prélèvement bancaire", () => {
    reinitialiserComptabilite();
    comptabilite.enregistrerParametres("saison_2026_2027", {
        licence: 39,
        compteBancaire: 1000,
        caisse: 0
    });

    const inscriptions = [
        {
            id: "inscription_normale",
            personId: "personne_normale",
            season: "saison_2026_2027",
            licenceFederaleIncluse: true
        },
        {
            id: "inscription_vip",
            personId: "personne_vip",
            season: "saison_2026_2027",
            licenceFederaleIncluse: true,
            vip: true
        }
    ];
    comptabilite.synchroniserCotisations(
        inscriptions,
        [
            { id: "personne_normale", firstName: "Adhérent", lastName: "Normal" },
            { id: "personne_vip", firstName: "Adhérent", lastName: "VIP" }
        ],
        [{ id: "saison_2026_2027" }],
        {}
    );

    const operations = comptabilite.obtenirOperations({ saisonId: "saison_2026_2027" });
    const licences = operations.filter(operation =>
        operation.source === "licence-adherent" || operation.source === "licence-vip"
    );
    const synthese = comptabilite.obtenirSynthese("saison_2026_2027", {});

    assert.equal(licences.length, 2);
    assert.ok(licences.every(operation => operation.modePaiement === "prélèvement"));
    assert.equal(synthese.totalDepenses, 78);
    assert.equal(synthese.compteBancaire, 922);
    assert.equal(synthese.tresorerie, 922);
    assert.equal(synthese.nombreOperationsNonAffectees, 0);
});

test("cotisation adulte de 155 € avec 50 € de Pass'Sport et licence prise en charge : résultat de 116 €", () => {
    reinitialiserComptabilite();
    comptabilite.enregistrerParametres("saison_2026_2027", {
        licence: 39,
        compteBancaire: 0,
        caisse: 0
    });

    const inscription = {
        id: "inscription_passsport_licence",
        personId: "personne_passsport_licence",
        season: "saison_2026_2027",
        category: "adulte",
        frequency: "1",
        tarif: 155,
        tarifPersonnalise: false,
        licenceFederaleIncluse: true,
        aides: {
            passSport: { enabled: true, amount: 50 }
        },
        paiements: [{
            id: "paiement_famille",
            date: "2026-10-13",
            amount: 105,
            method: "virement"
        }]
    };
    const configuration = {
        tarifs: { adult1: 155 },
        aides: { passSport: 50 },
        reductionFamille: 0
    };
    const personnes = [{
        id: "personne_passsport_licence",
        firstName: "Test",
        lastName: "PassSport"
    }];
    const saisons = [{ id: "saison_2026_2027" }];

    comptabilite.synchroniserCotisations([inscription], personnes, saisons, configuration);
    comptabilite.synchroniserCotisations([inscription], personnes, saisons, configuration);

    const synthese = comptabilite.obtenirSynthese("saison_2026_2027", configuration);
    const operations = comptabilite.obtenirOperations({ saisonId: "saison_2026_2027" });

    assert.equal(operations.filter(operation => operation.source === "cotisation").reduce((total, operation) => total + operation.montant, 0), 105);
    assert.equal(operations.filter(operation => operation.source === "aide").reduce((total, operation) => total + operation.montant, 0), 50);
    assert.equal(operations.filter(operation => operation.source === "licence-adherent").reduce((total, operation) => total + operation.montant, 0), 39);
    assert.equal(synthese.totalRecettes, 155);
    assert.equal(synthese.totalDepenses, 39);
    assert.equal(synthese.resultat, 116);
    assert.equal(synthese.compteBancaire, 116);
});
