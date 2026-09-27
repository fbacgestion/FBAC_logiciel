const {
    lireJson,
    ecrireJson
} = require("./fichiers");

const FICHIER_SAISONS = "saisons.json";
const FICHIER_CONFIGURATION = "configuration.json";

function obtenirSaisons() {
    const saisons = lireJson(FICHIER_SAISONS);

    if (!Array.isArray(saisons)) {
        return [];
    }

    return saisons;
}

function obtenirSaisonActuelle(date = new Date()) {
    const annee =
        date.getMonth() >= 8
            ? date.getFullYear()
            : date.getFullYear() - 1;

    const nom =
        `${annee}-${annee + 1}`;

    return obtenirSaisonParNom(nom);
}

function obtenirSaisonParNom(nom) {
    const saisons = obtenirSaisons();

    return saisons.find(
        saison =>
            obtenirNomSaison(saison) === nom
    ) || null;
}

function obtenirSaison(id) {
    const saisons = obtenirSaisons();

    return saisons.find(
        saison =>
            obtenirIdentifiantSaison(saison) === id
    ) || null;
}

function creerSaison(anneeDebut) {
    const annee = Number(anneeDebut);

    if (
        !Number.isInteger(annee) ||
        annee < 2020 ||
        annee > 2100
    ) {
        throw new Error(
            "Année de saison invalide."
        );
    }

    const nom =
        `${annee}-${annee + 1}`;

    const saisons = obtenirSaisons();

    const existe =
        saisons.some(
            saison =>
                obtenirNomSaison(saison) === nom
        );

    if (existe) {
        return obtenirSaisonParNom(nom);
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

    ecrireJson(
        FICHIER_SAISONS,
        saisons
    );

    return saison;
}

function initialiserSaisonActuelle() {
    const date = new Date();

    const annee =
        date.getMonth() >= 8
            ? date.getFullYear()
            : date.getFullYear() - 1;

    let saison =
        obtenirSaisonParNom(
            `${annee}-${annee + 1}`
        );

    if (!saison) {
        saison =
            creerSaison(annee);
    }

    const configuration =
        lireJson(FICHIER_CONFIGURATION) || {};

    configuration.saisonActiveId =
        obtenirIdentifiantSaison(saison);

    configuration.saisonActive =
        obtenirNomSaison(saison);

    ecrireJson(
        FICHIER_CONFIGURATION,
        configuration
    );

    return saison;
}

function obtenirIdentifiantSaison(
    saison
) {
    if (
        typeof saison === "string"
    ) {
        return saison;
    }

    return saison?.id ||
        saison?.nom ||
        "";
}

function obtenirNomSaison(saison) {
    if (
        typeof saison === "string"
    ) {
        return saison;
    }

    return saison?.nom ||
        saison?.id ||
        "";
}

module.exports = {
    initialiserSaisonActuelle,
    obtenirSaisons,
    obtenirSaison,
    obtenirSaisonActuelle
};
