const { lireJson, ecrireJson } = require("./fichiers");

const FICHIER_SAISONS = "saisons.json";
const FICHIER_CONFIGURATION = "configuration.json";

function obtenirSaisons() {
    const saisons = lireJson(FICHIER_SAISONS);
    return Array.isArray(saisons) ? saisons : [];
}

function obtenirSaisonActuelle(date = new Date()) {
    const annee = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
    return obtenirSaisonParNom(`${annee}-${annee + 1}`);
}

function obtenirSaisonParNom(nom) {
    return obterSaisonParNomInterne(nom);
}

function obterSaisonParNomInterne(nom) {
    const saisons = obtenirSaisons();
    return saisons.find(saison => obterNomSaison(saison) === nom) || null;
}

function obtenirSaison(id) {
    const saisons = obtenirSaisons();
    return saisons.find(saison => obterIdentifiantSaison(saison) === id) || null;
}

function obtenirSaisonActive() {
    const configuration = lireJson(FICHIER_CONFIGURATION) || {};
    const id = configuration.saisonActiveId || "";
    return id ? obtenirSaison(id) : null;
}

function definirSaisonActive(id) {
    const saison = obtenirSaison(id);
    if (!saison) {
        throw new Error("Saison introuvable.");
    }

    const configuration = lireJson(FICHIER_CONFIGURATION) || {};
    configuration.saisonActiveId = obterIdentifiantSaison(saison);
    configuration.saisonActive = obterNomSaison(saison);
    ecrireJson(FICHIER_CONFIGURATION, configuration);
    return saison;
}

function creerSaison(anneeDebut) {
    const annee = Number(anneeDebut);

    if (!Number.isInteger(annee) || annee < 2020 || annee > 2100) {
        throw new Error("Année de saison invalide.");
    }

    const nom = `${annee}-${annee + 1}`;
    const saisons = obtenirSaisons();
    const existe = saisons.some(saison => obterNomSaison(saison) === nom);

    if (existe) {
        return obterSaisonParNomInterne(nom);
    }

    const saison = {
        id: `saison_${annee}_${annee + 1}`,
        nom,
        anneeDebut: annee,
        anneeFin: annee + 1,
        debut: `${annee}-09-01`,
        fin: `${annee + 1}-06-30`
    };

    saisons.push(saison);
    ecrireJson(FICHIER_SAISONS, saisons);
    return saison;
}

function initialiserSaisonsSansChangement() {
    let saisons = obtenirSaisons();
    let saisonActive = obtenirSaisonActive();

    if (!saisonActive) {
        const annee = new Date().getMonth() >= 8
            ? new Date().getFullYear()
            : new Date().getFullYear() - 1;

        saisonActive = obterSaisonParNomInterne(`${annee}-${annee + 1}`);

        if (!saisonActive) {
            saisonActive = creerSaison(annee);
            saisons = obterSaisons();
        }

        definirSaisonActive(obterIdentifiantSaison(saisonActive));
    }

    return saisonActive;
}

/*
 * Compatibilité avec l'ancien démarrage.
 * Cette fonction ne change plus une saison active déjà définie.
 */
function initialiserSaisonActuelle() {
    return initialiserSaisonsSansChangement();
}

function obterIdentifiantSaison(saison) {
    if (typeof saison === "string") return saison;
    return saison?.id || saison?.nom || "";
}

function obterNomSaison(saison) {
    if (typeof saison === "string") return saison;
    return saison?.nom || saison?.id || "";
}

module.exports = {
    initialiserSaisonActuelle,
    initialiserSaisonsSansChangement,
    obtenirSaisons,
    obtenirSaison,
    obtenirSaisonActuelle,
    obtenirSaisonActive,
    definirSaisonActive,
    creerSaison
};
