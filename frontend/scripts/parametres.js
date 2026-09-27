function afficherParametres() {
    if (
        typeof state === "undefined" ||
        !state
    ) {
        return;
    }

    const configuration =
        state.configuration || {};

    const tarifs =
        configuration.tarifs ||
        configuration.prices ||
        {};

    definirValeur(
        "priceChild1",
        tarifs.child1 ??
        tarifs.enfant1Cours ??
        110
    );

    definirValeur(
        "priceAdult1",
        tarifs.adult1 ??
        tarifs.adulte1Cours ??
        155
    );

    definirValeur(
        "priceAdult4",
        tarifs.adult4 ??
        tarifs.adulte4Cours ??
        255
    );

    const aides =
        configuration.aides ||
        configuration.aidDefaults ||
        {};

    definirValeur(
        "aidAtout",
        aides.atout ??
        aides.atoutNormandie ??
        50
    );

    definirValeur(
        "aidPassSport",
        aides.passSport ??
        50
    );

    definirValeur(
        "aidSpot50",
        aides.spot50 ??
        50
    );

    definirValeur(
        "familyDiscount",
        configuration.reductionFamille ??
        configuration.familyDiscount ??
        20
    );
}

async function enregistrerParametres() {
    if (
        typeof window.fbac ===
            "undefined"
    ) {
        notificationErreur(
            "Le pont Electron est indisponible."
        );
        return;
    }

    const configuration = {
        ...(state.configuration || {}),
        tarifs: {
            child1:
                Number(
                    obtenirValeur(
                        "priceChild1"
                    ) || 0
                ),
            adult1:
                Number(
                    obtenirValeur(
                        "priceAdult1"
                    ) || 0
                ),
            adult4:
                Number(
                    obtenirValeur(
                        "priceAdult4"
                    ) || 0
                )
        },
        aides: {
            atout:
                Number(
                    obtenirValeur(
                        "aidAtout"
                    ) || 0
                ),
            passSport:
                Number(
                    obtenirValeur(
                        "aidPassSport"
                    ) || 0
                ),
            spot50:
                Number(
                    obtenirValeur(
                        "aidSpot50"
                    ) || 0
                )
        },
        reductionFamille:
            Number(
                obtenirValeur(
                    "familyDiscount"
                ) || 0
            )
    };

    configuration.prices = {
        ...configuration.tarifs
    };

    configuration.aidDefaults = {
        ...configuration.aides
    };

    configuration.familyDiscount =
        configuration.reductionFamille;

    try {
        await window.fbac.enregistrerConfiguration(
            configuration
        );

        state.configuration =
            configuration;

        renderCurrentPage();

        notificationSucces(
            "Paramètres enregistrés."
        );
    } catch (error) {
        console.error(
            "Erreur lors de l'enregistrement des paramètres :",
            error
        );

        notificationErreur(
            error.message ||
            "Impossible d'enregistrer les paramètres."
        );
    }
}

function initialiserParametres() {
    const bouton =
        document.querySelector(
            '[data-action="enregistrer-parametres"]'
        );

    if (
        bouton &&
        !bouton.dataset.initialise
    ) {
        bouton.addEventListener(
            "click",
            enregistrerParametres
        );

        bouton.dataset.initialise =
            "true";
    }

    const autreBouton =
        document.querySelector(
            '[data-action="save-settings"]'
        );

    if (
        autreBouton &&
        !autreBouton.dataset.initialise
    ) {
        autreBouton.addEventListener(
            "click",
            enregistrerParametres
        );

        autreBouton.dataset.initialise =
            "true";
    }
}

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initialiserParametres
    );
} else {
    initialiserParametres();
}