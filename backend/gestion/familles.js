const { lireJson, ecrireJson } = require("./fichiers");
const crypto = require("crypto");

function genererIdFamille() {
    return `famille_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function normaliserFamille(famille) {
    return {
        id: famille?.id || genererIdFamille(),
        nom: String(famille?.nom || "").trim()
    };
}

function obtenirFamilles() {
    const familles = lireJson("familles.json");
    return Array.isArray(familles) ? familles.map(normaliserFamille) : [];
}

function enregistrerFamilles(familles) {
    ecrireJson("familles.json", familles.map(normaliserFamille));
}

function initialiserFamilles() {
    let familles = obtenirFamilles();
    const inscriptions = lireJson("inscriptions.json");
    const groupesExistants = new Set(familles.map(famille => famille.id));

    if (Array.isArray(inscriptions)) {
        for (const inscription of inscriptions) {
            const groupe = inscription?.familyGroupId;
            if (!groupe || groupesExistants.has(groupe)) {
                continue;
            }
            familles.push({
                id: groupe,
                nom: String(groupe)
            });
            groupesExistants.add(groupe);
        }
    }

    enregistrerFamilles(familles);
}

function creerFamille(donnees) {
    const nom = String(donnees?.nom || "").trim();
    if (!nom) {
        throw new Error("Le nom de la famille est obligatoire.");
    }

    const familles = obtenirFamilles();
    const famille = {
        id: genererIdFamille(),
        nom
    };

    familles.push(famille);
    enregistrerFamilles(familles);
    return famille;
}

function modifierFamille(id, donnees) {
    const familles = obtenirFamilles();
    const index = familles.findIndex(famille => famille.id === id);
    if (index === -1) {
        throw new Error("Famille introuvable.");
    }

    const nom = String(donnees?.nom || "").trim();
    if (!nom) {
        throw new Error("Le nom de la famille est obligatoire.");
    }

    familles[index].nom = nom;
    enregistrerFamilles(familles);
    return familles[index];
}

module.exports = {
    initialiserFamilles,
    obtenirFamilles,
    creerFamille,
    modifierFamille
};
