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
    const saisons = obtenirSaisons();

    if (!saisons.length) {
        return null;
    }

    const dateActuelle = formaterDate(date);
    const saisonEnCours = saisons.find(saison => {
        const debut = saison.debut || `${saison.anneeDebut}-09-01`;
        const fin = saison.fin || `${saison.anneeFin}-06-30`;

        return dateActuelle >= debut && dateActuelle <= fin;
    });

    if (saisonEnCours) {
        return saisonEnCours;
    }

    const saisonsPassees = saisons
        .filter(saison => {
            const debut = saison.debut || `${saison.anneeDebut}-09-01`;
            return debut <= dateActuelle;
        })
        .sort((a, b) => Number(b.anneeDebut) - Number(a.anneeDebut));

    return saisonsPassees[0] || null;
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

    const saisonActuelle =
        obtenirSaisonActuelle();

    if (
        !saisonActuelle ||
        obtenirIdentifiantSaison(saisonActuelle) !==
            obtenirIdentifiantSaison(saison)
    ) {
        throw new Error(
            "La saison active est déterminée automatiquement par la date actuelle."
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
    let saisons = obtenirSaisons();

    if (!saisons.length) {
        const date = new Date();
        const annee =
            date.getMonth() >= 8
                ? date.getFullYear()
                : date.getFullYear() - 1;

        const saison =
            creerSaison(annee);

        definirSaisonActuelle(
            obtenirIdentifiantSaison(saison)
        );

        return saison;
    }

    const actuelle =
        obtenirSaisonActuelle();

    if (!actuelle) {
        return null;
    }

    const configuration =
        lireJson(FICHIER_CONFIGURATION) || {};

    const idActuel =
        obtenirIdentifiantSaison(actuelle);

    if (
        configuration.saisonActiveId !== idActuel ||
        configuration.saisonActive !== obtenirNomSaison(actuelle)
    ) {
        configuration.saisonActiveId = idActuel;
        configuration.saisonActive = obtenirNomSaison(actuelle);

        ecrireJson(
            FICHIER_CONFIGURATION,
            configuration
        );
    }

    return actuelle;
}

function formaterDate(date) {
    const annee = date.getFullYear();
    const mois = String(date.getMonth() + 1).padStart(2, "0");
    const jour = String(date.getDate()).padStart(2, "0");

    return `${annee}-${mois}-${jour}`;
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
