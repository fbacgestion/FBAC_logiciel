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

    comptabilite.synchroniserCotisations(
        [inscription],
        [{ id: "personne_aide", firstName: "Test", lastName: "Aide" }],
        [{ id: "saison_2026_2027" }],
        configuration
    );

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
