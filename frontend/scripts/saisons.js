function afficherSaisons() {
    if (typeof state === "undefined" || !state) {
        return;
    }

    const conteneur =
        document.getElementById("liste-saisons");

    if (!conteneur) {
        return;
    }

    const saisons =
        [...state.saisons].sort(
            (a, b) =>
                Number(b.anneeDebut) -
                Number(a.anneeDebut)
        );

    if (saisons.length === 0) {
        conteneur.innerHTML = `
            <div class="empty-state">
                Aucune saison enregistrée.
            </div>
        `;
        return;
    }

    conteneur.innerHTML =
        saisons.map(saison => {
            const inscriptions =
                state.inscriptions.filter(
                    inscription =>
                        inscription.saisonId === saison.id
                );

            const total =
                inscriptions.reduce(
                    (somme, inscription) =>
                        somme +
                        calculerMontantAPayer(inscription),
                    0
                );

            const encaisse =
                inscriptions.reduce(
                    (somme, inscription) =>
                        somme +
                        (Number(inscription.montantPaye) || 0),
                    0
                );

            const active =
                saison.id ===
                state.configuration.saisonActiveId;

            return `
                <div class="season-card">
                    <div class="season-card-header">
                        <div>
                            <h3>${echapperHtml(saison.nom)}</h3>
                            ${
                                active
                                    ? `<span class="badge success">Saison active</span>`
                                    : ""
                            }
                        </div>
                        <strong>
                            ${inscriptions.length} adhérent(s)
                        </strong>
                    </div>
                    <div class="season-card-content">
                        <div>
                            <span>Total attendu</span>
                            <strong>${total.toFixed(2)} €</strong>
                        </div>
                        <div>
                            <span>Encaissé</span>
                            <strong>${encaisse.toFixed(2)} €</strong>
                        </div>
                        <div>
                            <span>Reste</span>
                            <strong>
                                ${Math.max(0, total - encaisse).toFixed(2)} €
                            </strong>
                        </div>
                    </div>
                    <div class="season-card-actions">
                        <button
                            class="button button-small"
                            data-action="selectionner-saison"
                            data-id="${echapperHtml(saison.id)}"
                        >
                            ${
                                active
                                    ? "Saison active"
                                    : "Sélectionner"
                            }
                        </button>
                    </div>
                </div>
            `;
        }).join("");
}

async function selectionnerSaison(saisonId) {
    if (!state || !saisonId) {
        return;
    }

    const saison =
        state.saisons.find(
            saison => saison.id === saisonId
        );

    if (!saison) {
        return;
    }

    try {
        if (
            typeof window.fbac === "undefined" ||
            typeof window.fbac.definirSaisonActuelle !== "function"
        ) {
            throw new Error(
                "Le pont Electron de gestion des saisons est indisponible."
            );
        }

        await window.fbac.definirSaisonActuelle(
            saison.id
        );

        state.configuration.saisonActiveId =
            saison.id;

        mettreAJourSelecteurSaison();

        renderCurrentPage();

        notificationSucces(
            `Saison ${saison.nom} sélectionnée.`
        );
    } catch (error) {
        console.error(
            "Erreur lors de la sélection de la saison :",
            error
        );

        notificationErreur(
            "Impossible de sélectionner cette saison."
        );
    }
}

async function creerNouvelleSaison(nom) {
    if (!state || !nom) {
        return null;
    }

    const nomSaison =
        String(nom).trim();

    if (!nomSaison) {
        return null;
    }

    const existe =
        state.saisons.some(
            saison =>
                saison.nom.toLowerCase() ===
                nomSaison.toLowerCase()
        );

    if (existe) {
        notificationErreur(
            "Cette saison existe déjà."
        );

        return null;
    }

    const anneeDebut =
        Number(
            nomSaison.slice(0, 4)
        );

    if (
        !Number.isInteger(anneeDebut)
    ) {
        notificationErreur(
            "Le nom de la saison doit commencer par une année."
        );

        return null;
    }

    try {
        if (
            typeof window.fbac === "undefined" ||
            typeof window.fbac.creerSaison !== "function"
        ) {
            throw new Error(
                "Le pont Electron de gestion des saisons est indisponible."
            );
        }

        const saison =
            await window.fbac.creerSaison(
                anneeDebut
            );

        const saisonNormalisee =
            normaliserSaison(saison);

        state.saisons.push(
            saisonNormalisee
        );

        await window.fbac.definirSaisonActuelle(
            saisonNormalisee.id
        );

        state.configuration.saisonActiveId =
            saisonNormalisee.id;

        mettreAJourSelecteurSaison();
        afficherSaisons();

        notificationSucces(
            `Saison ${saisonNormalisee.nom} créée.`
        );

        return saisonNormalisee;
    } catch (error) {
        console.error(
            "Erreur lors de la création de la saison :",
            error
        );

        notificationErreur(
            error.message ||
            "Impossible de créer la saison."
        );

        return null;
    }
}

document.addEventListener("change", event => {
    if (
        event.target.id ===
        "selecteur-saison"
    ) {
        selectionnerSaison(
            event.target.value
        );
    }
});

document.addEventListener("click", event => {
    const bouton =
        event.target.closest(
            '[data-action="selectionner-saison"]'
        );

    if (!bouton) {
        return;
    }

    selectionnerSaison(
        bouton.dataset.id
    );
});