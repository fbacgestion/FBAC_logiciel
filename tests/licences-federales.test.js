const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const dossierTest = fs.mkdtempSync(path.join(os.tmpdir(), "fbac-licences-"));
const fichiers = require("../backend/gestion/fichiers");
fichiers.definirDossierDonnees(dossierTest);
const comptabilite = require("../backend/gestion/comptabilite");

const SAISON = "saison_2026_2027";
const CONFIG = { tarifs: { child1: 110, adult1: 155, adult4: 255 } };

function reinitialiser(solde = 1000) {
    fichiers.ecrireJson("comptabilite.json", { operations: [], parametres: {} });
    comptabilite.enregistrerParametres(SAISON, {
        licence: 39,
        compteBancaire: solde,
        caisse: 0
    });
}

function synchroniser(inscriptions, configuration = CONFIG) {
    const personnes = inscriptions.map((inscription, index) => ({
        id: inscription.personId,
        firstName: "Test" + index,
        lastName: "Adherent"
    }));
    return comptabilite.synchroniserCotisations(
        inscriptions,
        personnes,
        [{ id: SAISON }],
        configuration
    );
}

function inscription(id, options = {}) {
    return {
        id,
        personId: "personne_" + id,
        season: SAISON,
        category: "adulte",
        frequency: "1",
        tarif: 155,
        tarifPersonnalise: false,
        ...options
    };
}

function operationsLicence() {
    return comptabilite.obtenirOperations({ saisonId: SAISON }).filter(operation =>
        operation.source === "licence-adherent" || operation.source === "licence-vip"
    );
}

test("case licence incluse cochée : crée une dépense de 39 € par prélèvement", () => {
    reinitialiser();
    synchroniser([inscription("incluse", { licenceFederaleIncluse: true })]);
    const operations = operationsLicence();
    assert.equal(operations.length, 1);
    assert.equal(operations[0].montant, 39);
    assert.equal(operations[0].modePaiement, "prélèvement");
    assert.equal(comptabilite.obtenirSynthese(SAISON, CONFIG).compteBancaire, 961);
});

test("case licence incluse décochée : aucune dépense de 39 €", () => {
    reinitialiser();
    synchroniser([inscription("deja_licencie", { licenceFederaleIncluse: false })]);
    assert.equal(operationsLicence().length, 0);
    assert.equal(comptabilite.obtenirSynthese(SAISON, CONFIG).totalDepenses, 0);
    assert.equal(comptabilite.obtenirSynthese(SAISON, CONFIG).compteBancaire, 1000);
});

test("sans licence prise en charge, la cotisation encaissée n'est pas ventilée en recette de licence", () => {
    reinitialiser();
    synchroniser([inscription("sans_licence", {
        licenceFederaleIncluse: false,
        paiements: [{ id: "p1", date: "2026-10-10", amount: 116, method: "virement" }]
    })]);
    const operation = comptabilite.obtenirOperations({ saisonId: SAISON }).find(item => item.source === "cotisation");
    assert.ok(operation);
    assert.equal(operation.licenceMontant, 0);
    assert.equal(operation.clubMontant, 116);
});

test("une inscription VIP avec licence incluse génère la dépense, sans cotisation adhérent", () => {
    reinitialiser();
    synchroniser([inscription("vip_avec", { vip: true, licenceFederaleIncluse: true })]);
    assert.equal(operationsLicence().length, 1);
    assert.equal(operationsLicence()[0].source, "licence-vip");
    assert.equal(comptabilite.obtenirOperations({ saisonId: SAISON }).some(item => item.source === "cotisation"), false);
});

test("la ventilation inclut les licences VIP dans la part licences sans les compter deux fois", () => {
    reinitialiser();
    synchroniser([
        inscription("payant", {
            licenceFederaleIncluse: true,
            paiements: [{ id: "p1", date: "2026-10-10", amount: 155, method: "virement" }]
        }),
        inscription("vip_ventilation", { vip: true, licenceFederaleIncluse: true })
    ]);
    const synthese = comptabilite.obtenirSynthese(SAISON, CONFIG);
    assert.equal(synthese.totalRecettes, 155);
    assert.equal(synthese.totalDepenses, 78);
    assert.equal(synthese.licenceEncaissee, 78);
    assert.equal(synthese.clubEncaisse, 77);
    assert.equal(synthese.resultat, 77);
});

test("une inscription VIP sans licence incluse ne génère aucune dépense", () => {
    reinitialiser();
    synchroniser([inscription("vip_sans", { vip: true, licenceFederaleIncluse: false })]);
    assert.equal(operationsLicence().length, 0);
});

test("la synchronisation répétée ne double pas les dépenses de licence", () => {
    reinitialiser();
    const entree = inscription("idempotente", { licenceFederaleIncluse: true });
    synchroniser([entree]);
    synchroniser([entree]);
    assert.equal(operationsLicence().length, 1);
});

test("une ancienne inscription sans choix explicite est reconnue comme sans licence si son tarif est inférieur de 39 €", () => {
    reinitialiser();
    const entree = inscription("ancienne", {
        tarif: 116,
        tarifPersonnalise: false
    });
    delete entree.licenceFederaleIncluse;
    synchroniser([entree]);
    assert.equal(operationsLicence().length, 0);
});

test("le choix explicite prévaut sur une déduction à partir du tarif", () => {
    reinitialiser();
    synchroniser([inscription("choix_explicite", {
        tarif: 116,
        tarifPersonnalise: false,
        licenceFederaleIncluse: true
    })]);
    assert.equal(operationsLicence().length, 1);
});

test("la saison active corrige une ancienne part licence erronée de 35 € vers 39 €", () => {
    reinitialiser();
    const entree = inscription("ventilation_erronee", {
        licenceFederaleIncluse: true,
        paiements: [{ id: "paiement_1", date: "2026-10-10", amount: 155, method: "virement" }]
    });
    fichiers.ecrireJson("comptabilite.json", {
        operations: [{
            id: "cotisation_ventilation_erronee_paiement_1",
            date: "2026-10-10",
            type: "recette",
            libelle: "Cotisation — Test",
            categorie: "cotisations",
            montant: 155,
            modePaiement: "virement",
            saisonId: SAISON,
            source: "cotisation",
            inscriptionId: "ventilation_erronee",
            paiementId: "paiement_1",
            licenceMontant: 35,
            clubMontant: 120
        }],
        parametres: { [SAISON]: { licence: 39, compteBancaire: 1000, caisse: 0 } }
    });
    synchroniser([entree], { ...CONFIG, saisonActiveId: SAISON });
    const operation = comptabilite.obtenirOperations({ saisonId: SAISON }).find(item => item.source === "cotisation");
    assert.equal(operation.licenceMontant, 39);
    assert.equal(operation.clubMontant, 116);
});

test("le tarif enfant sans licence permet de reconnaître une ancienne inscription", () => {
    reinitialiser();
    const entree = inscription("enfant_ancien", {
        category: "enfant",
        tarif: 71,
        tarifPersonnalise: false
    });
    delete entree.licenceFederaleIncluse;
    synchroniser([entree]);
    assert.equal(operationsLicence().length, 0);
});

test("une licence décochée reste décochée après plusieurs synchronisations", () => {
    reinitialiser();
    const entree = inscription("stable", { licenceFederaleIncluse: false });
    synchroniser([entree]);
    synchroniser([entree]);
    assert.equal(operationsLicence().length, 0);
});

test("une ancienne ventilation à zéro est réparée si la licence est désormais explicitement incluse", () => {
    reinitialiser();
    const entree = inscription("ventilation_a_reparer", {
        licenceFederaleIncluse: true,
        paiements: [{ id: "paiement_1", date: "2026-10-10", amount: 155, method: "virement" }]
    });
    fichiers.ecrireJson("comptabilite.json", {
        operations: [{
            id: "cotisation_ventilation_a_reparer_paiement_1",
            date: "2026-10-10",
            type: "recette",
            libelle: "Cotisation — Test",
            categorie: "cotisations",
            montant: 155,
            modePaiement: "virement",
            saisonId: SAISON,
            source: "cotisation",
            inscriptionId: "ventilation_a_reparer",
            paiementId: "paiement_1",
            licenceMontant: 0,
            clubMontant: 155
        }],
        parametres: { [SAISON]: { licence: 39, compteBancaire: 1000, caisse: 0 } }
    });
    synchroniser([entree]);
    const operation = comptabilite.obtenirOperations({ saisonId: SAISON }).find(item => item.source === "cotisation");
    assert.equal(operation.licenceMontant, 39);
    assert.equal(operation.clubMontant, 116);
});
