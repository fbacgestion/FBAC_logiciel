const { lireJson, ecrireJson } = require("../gestion/fichiers");

const FICHIER = "configuration.json";

const VALEURS_DEFAUT = {
    tarifs: {
        child1: 110,
        adult1: 155,
        adult4: 255
    },
    aides: {
        atout: 50,
        passSport: 50,
        kiosk: 50,
        spot50: 50
    },
    reductionFamille: 20,
    parrainage: {
        montantParFilleul: 20,
        plafond: 3
    }
};

function nombre(valeur, defaut = 0) {
    const resultat = Number(valeur);
    return Number.isFinite(resultat) ? resultat : defaut;
}

function normaliserTarifs(source = {}) {
    return {
        child1: nombre(source.child1 ?? source.enfant1Cours, VALEURS_DEFAUT.tarifs.child1),
        adult1: nombre(source.adult1 ?? source.adulte1Cours, VALEURS_DEFAUT.tarifs.adult1),
        adult4: nombre(source.adult4 ?? source.adulte4Cours, VALEURS_DEFAUT.tarifs.adult4)
    };
}

function normaliserAides(source = {}) {
    return {
        atout: nombre(source.atout ?? source.atoutNormandie, VALEURS_DEFAUT.aides.atout),
        passSport: nombre(source.passSport, VALEURS_DEFAUT.aides.passSport),
        kiosk: nombre(source.kiosk, VALEURS_DEFAUT.aides.kiosk),
        spot50: nombre(source.spot50, VALEURS_DEFAUT.aides.spot50)
    };
}

function normaliser(configuration = {}) {
    const source = configuration && typeof configuration === "object"
        ? configuration
        : {};

    const tarifs = normaliserTarifs(source.tarifs || source.prices || {});
    const aides = normaliserAides(source.aides || source.aidDefaults || {});
    const parrainage = source.parrainage || {};

    return {
        ...source,
        tarifs,
        aides,
        reductionFamille: nombre(
            source.reductionFamille ?? source.familyDiscount,
            VALEURS_DEFAUT.reductionFamille
        ),
        parrainage: {
            ...parrainage,
            montantParFilleul: nombre(
                parrainage.montantParFilleul ?? parrainage.montant,
                VALEURS_DEFAUT.parrainage.montantParFilleul
            ),
            plafond: nombre(
                parrainage.plafond,
                VALEURS_DEFAUT.parrainage.plafond
            )
        }
    };
}

function lire() {
    return normaliser(lireJson(FICHIER) || {});
}

function enregistrer(configuration) {
    const normalisee = normaliser(configuration);
    ecrireJson(FICHIER, normalisee);
    return normalisee;
}

function obtenirSaisonActiveId(configuration, saisons = []) {
    const source = configuration && typeof configuration === "object"
        ? configuration
        : {};

    const saisonId = source.saisonActiveId || "";
    if (saisonId && saisons.some(saison => saison?.id === saisonId)) {
        return saisonId;
    }

    return "";
}

module.exports = {
    VALEURS_DEFAUT,
    normaliser,
    lire,
    enregistrer,
    obtenirSaisonActiveId
};
