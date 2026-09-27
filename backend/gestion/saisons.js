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

function obtenirSaisonActuelle() {
    const configuration =
        lireJson(FICHIER_CONFIGURATION);

    if (
        configuration &&
        configuration.saisonActiveId
    ) {
        const saisons = obtenirSaisons();

        const saison = saisons.find(
            element =>
                obtenirIdentifiantSaison(element) ===
                configuration.saisonActiveId
        );

        if (saison) {
            return saison;
        }
    }

    if (
        configuration &&
        configuration.saisonActive
    ) {
        return configuration.saisonActive;
    }

    const saisons = obtenirSaisons();

    if (!saisons.length) {
        return null;
    }

    return saisons
        .slice()
        .sort((a, b) => {
            return obtenirNomSaison(b)
                .localeCompare(
                    obtenirNomSaison(a)
                );
        })[0];
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

    const existe = saisons.some(
        saison =>
            obtenirNomSaison(saison) === nom
    );

    if (existe) {
        throw new Error(
            "Cette saison existe déjà."
        );
    }

    const saison = {
        id: genererId(),
        nom,
        anneeDebut: annee,
        anneeFin: annee + 1,
        debut: String(annee) + "-09-01",
        fin: String(annee + 1) + "-06-30"
    };

    saisons.push(saison);

    ecrireJson(
        FICHIER_SAISONS,
        saisons
    );

    return saison;
}

function definirSaisonActuelle(idSaison) {
    const saison = obtenirSaison(idSaison);

    if (!saison) {
        throw new Error(
            "Saison introuvable."
        );
    }

    const saisons =
        obtenirSaisons();

    const derniereSaison =
        saisons
            .slice()
            .sort(
                (a, b) =>
                    Number(b.anneeDebut) -
                    Number(a.anneeDebut)
            )[0];

    if (
        derniereSaison &&
        obtenirIdentifiantSaison(
            derniereSaison
        ) !==
        obtenirIdentifiantSaison(saison)
    ) {
        throw new Error(
            "Une saison historique ne peut pas devenir la saison active."
        );
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

function initialiserSaisonActuelle() {
    const saisons = obtenirSaisons();

    if (!saisons.length) {
        const saison =
            creerSaison(
                new Date().getFullYear()
            );

        definirSaisonActuelle(
            obtenirIdentifiantSaison(saison)
        );

        return saison;
    }

    const actuelle =
        obtenirSaisonActuelle();

    if (actuelle) {
        return actuelle;
    }

    const derniere =
        saisons
            .slice()
            .sort((a, b) => {
                return obtenirNomSaison(b)
                    .localeCompare(
                        obtenirNomSaison(a)
                    );
            })[0];

    return definirSaisonActuelle(
        obtenirIdentifiantSaison(derniere)
    );
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

function genererId() {
    return (
        "saison_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .substring(2, 9)
    );
}

module.exports = {
    initialiserSaisonActuelle,
    obtenirSaisons,
    obtenirSaison,
    obtenirSaisonActuelle,
    creerSaison,
    definirSaisonActuelle
};