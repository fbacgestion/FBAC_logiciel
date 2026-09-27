async function lancerRestaurationDonnees() {
    const resultat =
        await window.fbac.restaurerDerniereSauvegarde();

    return resultat;
}

function initialiserInterfaceSauvegardes() {
    const bouton =
        document.querySelector(
            '[data-action="backup-data"]'
        );

    if (bouton && !bouton.dataset.initialise) {
        bouton.addEventListener(
            "click",
            async () => {
                try {
                    const resultat =
                        await window.fbac.creerSauvegardeDonnees();

                    const statut =
                        document.getElementById("backupStatus");

                    if (statut) {
                        statut.textContent =
                            `Dernière sauvegarde : ${resultat.nom}`;
                    }

                    notificationSucces(
                        "Sauvegarde des données créée."
                    );
                } catch (error) {
                    notificationErreur(
                        "Impossible de créer la sauvegarde."
                    );
                }
            }
        );

        bouton.dataset.initialise = "true";
    }
}
