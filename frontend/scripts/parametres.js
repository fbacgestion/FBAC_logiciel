function afficherParametres() {
    if (
        typeof state === "undefined" ||
        !state
    ) {
        return;
    }

    const configuration =
        state.configuration || {};

    remplirSelecteurSaisonsParametres();

    definirValeur(
        "settingCurrentSeason",
        configuration.saisonActiveId ||
        ""
    );

    const tarifs =
        configuration.tarifs ||
        configuration.prices ||
        {};

    definirValeur(
        "priceChild1",
        tarifs.child1 ??
        110
    );

    definirValeur(
        "priceAdult1",
        tarifs.adult1 ??
        155
    );

    definirValeur(
        "priceAdult4",
        tarifs.adult4 ??
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

function remplirSelecteurSaisonsParametres() {
    const select =
        document.getElementById(
            "settingCurrentSeason"
        );

    if (!select) {
        return;
    }

    select.innerHTML =
        state.saisons
            .map(
                saison =>
                    `
                    <option value="${echapperHtml(
                        saison.id
                    )}">
                        ${echapperHtml(
                            saison.nom
                        )}
                    </option>
                `
            )
            .join("");

    select.value =
        state.configuration.saisonActiveId;
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

    const saisonActiveId =
        obtenirValeur(
            "settingCurrentSeason"
        );

    if (
        saisonActiveId &&
        !state.saisons.some(
            saison =>
                saison.id ===
                saisonActiveId
        )
    ) {
        notificationErreur(
            "La saison sélectionnée est invalide."
        );
        return;
    }

    const configuration = {
        ...state.configuration,

        saisonActiveId,

        saisonActive:
            state.saisons.find(
                saison =>
                    saison.id ===
                    saisonActiveId
            )?.nom ||
            "",

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

    configuration.prices =
        {
            ...configuration.tarifs
        };

    configuration.aidDefaults =
        {
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

        mettreAJourSelecteurSaison();

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

function changerSaisonDepuisParametres(
    saisonId
) {
    if (!saisonId) {
        return;
    }

    const saison =
        state.saisons.find(
            element =>
                element.id ===
                saisonId
        );

    if (!saison) {
        return;
    }

    state.configuration.saisonActiveId =
        saison.id;

    state.configuration.saisonActive =
        saison.nom;

    sauvegarderEtat();

    mettreAJourSelecteurSaison();

    renderCurrentPage();
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