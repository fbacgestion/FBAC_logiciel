const { lireJson, ecrireJson } = require("./fichiers");

const FICHIER_SAISONS = "saisons.json";
const FICHIER_CONFIGURATION = "configuration.json";
const { figerParametresSaison } = require("../core/configuration");

function obtenirSaisons() {
    const saisons = lireJson(FICHIER_SAISONS);
    return Array.isArray(saisons) ? saisons : [];
}

function obtenirSaisonActuelle(date = new Date()) {
    const annee = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
    return obtenirSaisonParNom(`${annee}-${annee + 1}`);
}

function obtenirSaisonParNom(nom) {
    return obtenirSaisonParNomInterne(nom);
}

function obtenirSaisonParNomInterne(nom) {
    const saisons = obtenirSaisons();
    return saisons.find(saison => obtenirNomSaison(saison) === nom) || null;
}

function obtenirSaison(id) {
    const saisons = obtenirSaisons();
    return saisons.find(saison => obtenirIdentifiantSaison(saison) === id) || null;
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
    configuration.saisonActiveId = obtenirIdentifiantSaison(saison);
    configuration.saisonActive = obtenirNomSaison(saison);
    const configurationAvecSaison = figerParametresSaison(
        obtenirIdentifiantSaison(saison),
        configuration
    );
    ecrireJson(FICHIER_CONFIGURATION, configurationAvecSaison);
    return saison;
}

function creerSaison(anneeDebut) {
    const annee = Number(anneeDebut);

    if (!Number.isInteger(annee) || annee < 2020 || annee > 2100) {
        throw new Error("Année de saison invalide.");
    }

    const nom = `${annee}-${annee + 1}`;
    const saisons = obtenirSaisons();
    const existe = saisons.some(saison => obtenirNomSaison(saison) === nom);

    if (existe) {
        return obtenirSaisonParNomInterne(nom);
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

        saisonActive = obtenirSaisonParNomInterne(`${annee}-${annee + 1}`);

        if (!saisonActive) {
            saisonActive = creerSaison(annee);
            saisons = obterSaisons();
        }

        definirSaisonActive(obtenirIdentifiantSaison(saisonActive));
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

function obtenirIdentifiantSaison(saison) {
    if (typeof saison === "string") return saison;
    return saison?.id || saison?.nom || "";
}

function obtenirNomSaison(saison) {
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
