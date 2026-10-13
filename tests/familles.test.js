const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const dossierTest = fs.mkdtempSync(path.join(os.tmpdir(), "fbac-familles-"));
const fichiers = require("../backend/gestion/fichiers");
const familles = require("../backend/gestion/familles");
fichiers.definirDossierDonnees(dossierTest);

function reinitialiser({ configuration, groupes, inscriptions }) {
    fichiers.ecrireJson("configuration.json", configuration);
    fichiers.ecrireJson("familles.json", groupes);
    fichiers.ecrireJson("inscriptions.json", inscriptions);
}

test("migre les groupes familiaux historiques en utilisant le champ season du backend", () => {
    reinitialiser({
        configuration: { saisonActiveId: "saison_2026_2027" },
        groupes: [{ id: "famille_legacy", nom: "Famille Biard", saisonId: null }],
        inscriptions: [
            { id: "i1", season: "saison_2026_2027", familyGroupId: "famille_legacy" },
            { id: "i2", season: "saison_2025_2026", familyGroupId: "famille_legacy" }
        ]
    });
    familles.initialiserFamilles();
    const groupes = familles.obtenirFamilles();
    const inscriptions = fichiers.lireJson("inscriptions.json");
    assert.equal(groupes.length, 2);
    assert.notEqual(inscriptions[0].familyGroupId, inscriptions[1].familyGroupId);
    assert.ok(groupes.some(groupe => groupe.id === inscriptions[0].familyGroupId && groupe.saisonId === "saison_2026_2027"));
    assert.ok(groupes.some(groupe => groupe.id === inscriptions[1].familyGroupId && groupe.saisonId === "saison_2025_2026"));
});

test("supprimer une famille délie les inscriptions liées au champ season du backend", () => {
    reinitialiser({
        configuration: { saisonActiveId: "saison_2026_2027" },
        groupes: [{ id: "famille_active", nom: "Famille active", saisonId: "saison_2026_2027" }],
        inscriptions: [{ id: "i1", season: "saison_2026_2027", familyGroupId: "famille_active" }]
    });
    familles.supprimerFamille("famille_active");
    assert.equal(fichiers.lireJson("inscriptions.json")[0].familyGroupId, undefined);
});

test("une famille historique ne peut pas être renommée", () => {
    reinitialiser({
        configuration: { saisonActiveId: "saison_2026_2027" },
        groupes: [{ id: "famille_historique", nom: "Ancienne famille", saisonId: "saison_2025_2026" }],
        inscriptions: []
    });
    assert.throws(() => familles.modifierFamille("famille_historique", { nom: "Nouveau nom" }), /historique/);
    assert.equal(familles.obtenirFamilles()[0].nom, "Ancienne famille");
});
