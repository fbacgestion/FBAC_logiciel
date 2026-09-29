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
        "aidKiosk",
        aides.kiosk ??
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

    const comptabilite =
        configuration.comptabilite || {};

    definirValeur(
        "comptaLicenceParam",
        comptabilite.licenceFederale ?? 39
    );

    definirValeur(
        "comptaBanqueParam",
        comptabilite.soldeBancaireInitial ?? 0
    );

    definirValeur(
        "comptaCaisseParam",
        comptabilite.soldeCaisseInitial ?? 0
    );

    const saison =
        configuration.saisonActuelle ||
        configuration.saisonActiveId ||
        "";

    const saisonElement =
        document.getElementById("settingCurrentSeason");

    if (saisonElement) {
        saisonElement.textContent = saison || "Aucune saison définie";
    }

    const parrainage =
        configuration.parrainage || {};

    const montantParrainage =
        Number(
            parrainage.montantParFilleul ??
            parrainage.montant ??
            20
        );

    definirValeur(
        "referralAmount",
        montantParrainage
    );

    mettreAJourAffichageParrainage(
        montantParrainage
    );
}

function mettreAJourAffichageParrainage(
    montant
) {
    const valeur =
        Number(montant) || 0;

    const montant1 =
        document.getElementById(
            "referralAmount1"
        );

    const montant2 =
        document.getElementById(
            "referralAmount2"
        );

    const montant3 =
        document.getElementById(
            "referralAmount3"
        );

    if (montant1) {
        montant1.textContent =
            `-${valeur.toFixed(2)} €`;
    }

    if (montant2) {
        montant2.textContent =
            `-${(valeur * 2).toFixed(2)} €`;
    }

    if (montant3) {
        montant3.textContent =
            `-${(valeur * 3).toFixed(2)} €`;
    }
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
                ),
            enfant1Cours:
                Number(
                    obtenirValeur(
                        "priceChild1"
                    ) || 0
                ),
            adulte1Cours:
                Number(
                    obtenirValeur(
                        "priceAdult1"
                    ) || 0
                ),
            adulte4Cours:
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
            atoutNormandie:
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
            kiosk:
                Number(
                    obtenirValeur(
                        "aidKiosk"
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
            ),
        parrainage: {
            ...(state.configuration?.parrainage || {}),
            montantParFilleul:
                Number(
                    obtenirValeur(
                        "referralAmount"
                    ) || 0
                ),
            plafond:
                Number(
                    state.configuration?.parrainage?.plafond
                ) || 60
        },
        comptabilite: {
            ...(state.configuration?.comptabilite || {}),
            licenceFederale:
                Number(
                    obtenirValeur(
                        "comptaLicenceParam"
                    ) || 0
                ),
            soldeBancaireInitial:
                Number(
                    obtenirValeur(
                        "comptaBanqueParam"
                    ) || 0
                ),
            soldeCaisseInitial:
                Number(
                    obtenirValeur(
                        "comptaCaisseParam"
                    ) || 0
                )
        }
    };

    configuration.prices = {
        ...configuration.tarifs
    };

    configuration.aidDefaults = {
        ...configuration.aides
    };

    configuration.familyDiscount =
        configuration.reductionFamille;

    configuration.parrainage = {
        ...(configuration.parrainage || {}),
        montantParFilleul:
            configuration.parrainage.montantParFilleul
    };

    mettreAJourAffichageParrainage(
        configuration.parrainage.montantParFilleul
    );

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
    const champParrainage =
        document.getElementById(
            "referralAmount"
        );

    if (
        champParrainage &&
        !champParrainage.dataset.initialise
    ) {
        champParrainage.addEventListener(
            "input",
            () =>
                mettreAJourAffichageParrainage(
                    champParrainage.value
                )
        );

        champParrainage.dataset.initialise =
            "true";
    }

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