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
    },
    comptabilite: {
        licenceFederale: 39,
        soldeBancaireInitial: 0,
        soldeCaisseInitial: 0
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

function extraireParametresFinanciers(configuration = {}) {
    const source = configuration && typeof configuration === "object" ? configuration : {};
    const tarifs = normaliserTarifs(source.tarifs || source.prices || {});
    const aides = normaliserAides(source.aides || source.aidDefaults || {});
    const parrainage = source.parrainage || {};
    const comptabilite = source.comptabilite || {};

    return {
        tarifs,
        aides,
        reductionFamille: nombre(source.reductionFamille ?? source.familyDiscount, VALEURS_DEFAUT.reductionFamille),
        parrainage: {
            montantParFilleul: nombre(
                parrainage.montantParFilleul ?? parrainage.montant,
                VALEURS_DEFAUT.parrainage.montantParFilleul
            ),
            plafond: nombre(parrainage.plafond, VALEURS_DEFAUT.parrainage.plafond)
        },
        licenceFederale: nombre(
            comptabilite.licenceFederale,
            VALEURS_DEFAUT.comptabilite.licenceFederale
        )
    };
}

function normaliser(configuration = {}) {
    const source = configuration && typeof configuration === "object"
        ? configuration
        : {};

    const tarifs = normaliserTarifs(source.tarifs || source.prices || {});
    const aides = normaliserAides(source.aides || source.aidDefaults || {});
    const parrainage = source.parrainage || {};
    const comptabilite = source.comptabilite || {};

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
        },
        comptabilite: {
            ...comptabilite,
            licenceFederale: nombre(
                comptabilite.licenceFederale,
                VALEURS_DEFAUT.comptabilite.licenceFederale
            ),
            soldeBancaireInitial: nombre(
                comptabilite.soldeBancaireInitial,
                VALEURS_DEFAUT.comptabilite.soldeBancaireInitial
            ),
            soldeCaisseInitial: nombre(
                comptabilite.soldeCaisseInitial,
                VALEURS_DEFAUT.comptabilite.soldeCaisseInitial
            )
        },
        parametresSaisons:
            source.parametresSaisons &&
            typeof source.parametresSaisons === "object"
                ? source.parametresSaisons
                : {}
    };
}

function obtenirParametresSaison(saisonId, configuration = {}) {
    const normalisee = normaliser(configuration);
    const saison = normalisee.parametresSaisons?.[saisonId];

    if (saison && typeof saison === "object") {
        return {
            ...extraireParametresFinanciers(normalisee),
            ...saison,
            tarifs: {
                ...extraireParametresFinanciers(normalisee).tarifs,
                ...(saison.tarifs || {})
            },
            aides: {
                ...extraireParametresFinanciers(normalisee).aides,
                ...(saison.aides || {})
            },
            parrainage: {
                ...extraireParametresFinanciers(normalisee).parrainage,
                ...(saison.parrainage || {})
            }
        };
    }

    return extraireParametresFinanciers(normalisee);
}

function figerParametresSaison(saisonId, configuration = {}, forcer = false) {
    if (!saisonId) return normaliser(configuration);

    const normalisee = normaliser(configuration);
    normalisee.parametresSaisons = {
        ...(normalisee.parametresSaisons || {})
    };

    if (!normalisee.parametresSaisons[saisonId] || forcer) {
        normalisee.parametresSaisons[saisonId] =
            extraireParametresFinanciers(normalisee);
    }

    return normalisee;
}

function initialiserParametresSaisons(saisons = [], configuration = {}) {
    let normalisee = normaliser(configuration);

    for (const saison of saisons || []) {
        const id = saison?.id || saison?.nom;
        if (id) {
            normalisee = figerParametresSaison(id, normalisee);
        }
    }

    ecrireJson(FICHIER, normalisee);
    return normalisee;
}

function lire() {
    return normaliser(lireJson(FICHIER) || {});
}

function enregistrer(configuration) {
    const normalisee = normaliser(configuration);
    const saisonActiveId = normalisee.saisonActiveId || "";

    if (saisonActiveId) {
        normalisee.parametresSaisons = {
            ...(normalisee.parametresSaisons || {}),
            [saisonActiveId]: extraireParametresFinanciers(normalisee)
        };
    }

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

if (typeof module !== "undefined") {
    module.exports = {
        VALEURS_DEFAUT,
        normaliser,
        lire,
        enregistrer,
        obtenirSaisonActiveId,
        extraireParametresFinanciers,
        obtenirParametresSaison,
        figerParametresSaison,
        initialiserParametresSaisons
    };
}

if (typeof window !== "undefined") {
    window.FBACConfiguration = {
        VALEURS_DEFAUT,
        normaliser,
        extraireParametresFinanciers,
        obtenirParametresSaison
    };
}