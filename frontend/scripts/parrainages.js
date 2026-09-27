function afficherParrainages() {
    if (
        typeof state === "undefined" ||
        !state
    ) {
        return;
    }

    const conteneur =
        document.getElementById(
            "referralList"
        ) ||
        document.getElementById(
            "liste-parrainages"
        );

    if (!conteneur) {
        return;
    }

    const saisonId =
        state.configuration.saisonActiveId;

    const parrains =
        state.personnes
            .map(
                personne => {
                    const filleuls =
                        state.inscriptions.filter(
                            inscription =>
                                inscription.saisonId ===
                                    saisonId &&
                                inscription.referrerId ===
                                    personne.id
                        );

                    return {
                        personne,
                        filleuls
                    };
                }
            )
            .filter(
                element =>
                    element.filleuls.length > 0
            );

    if (!parrains.length) {
        conteneur.innerHTML = `
            <div class="empty-state">
                Aucun parrainage enregistré pour cette saison.
            </div>
        `;
        return;
    }

    conteneur.innerHTML =
        parrains
            .map(
                ({
                    personne,
                    filleuls
                }) => {
                    const nombre =
                        filleuls.length;

                    const montantParrainage =
                        Number(
                            state.configuration?.parrainage?.montantParFilleul ??
                            state.configuration?.parrainage?.montant ??
                            20
                        );

                    const avantage =
                        Math.min(
                            nombre,
                            3
                        ) * montantParrainage;

                    return `
                        <div class="referral-card">
                            <div class="referral-card-header">
                                <div>
                                    <h3>
                                        ${echapperHtml(
                                            `${personne.firstName} ${personne.lastName}`.trim()
                                        )}
                                    </h3>
                                    <span>
                                        ${nombre}
                                        parrainage(s)
                                    </span>
                                </div>
                                <strong>
                                    -${avantage.toFixed(2)} €
                                </strong>
                            </div>
                            <div class="referral-card-content">
                                ${filleuls
                                    .map(
                                        inscription => {
                                            const filleul =
                                                state.personnes.find(
                                                    element =>
                                                        element.id ===
                                                        inscription.personneId
                                                );

                                            return `
                                                <div class="referral-person">
                                                    <span>
                                                        ${echapperHtml(
                                                            filleul
                                                                ? `${filleul.firstName} ${filleul.lastName}`.trim()
                                                                : "Inconnu"
                                                        )}
                                                    </span>
                                                    <span>
                                                        +${montantParrainage.toFixed(2)} €
                                                    </span>
                                                </div>
                                            `;
                                        }
                                    )
                                    .join("")}
                            </div>
                        </div>
                    `;
                }
            )
            .join("");
}

function calculerAvantageParrainage(
    personneId,
    saisonId
) {
    if (
        !personneId ||
        !saisonId
    ) {
        return 0;
    }

    const nombre =
        state.inscriptions.filter(
            inscription =>
                inscription.saisonId ===
                    saisonId &&
                inscription.referrerId ===
                    personneId
        ).length;

    return Math.min(
        nombre,
        3
    ) * 20;
}

function obtenirNombreParrainages(
    personneId,
    saisonId
) {
    return state.inscriptions.filter(
        inscription =>
            inscription.saisonId ===
                saisonId &&
            inscription.referrerId ===
                personneId
    ).length;
}

function modifierParrainage(
    inscriptionId,
    parrainId
) {
    const inscription =
        state.inscriptions.find(
            element =>
                element.id ===
                inscriptionId
        );

    if (!inscription) {
        notificationErreur(
            "Inscription introuvable."
        );
        return;
    }

    if (
        inscription.saisonId !==
        state.configuration.saisonActiveId
    ) {
        notificationErreur(
            "Les anciennes saisons sont verrouillées."
        );
        return;
    }

    if (
        parrainId &&
        parrainId ===
            inscription.personneId
    ) {
        notificationErreur(
            "Un adhérent ne peut pas être son propre parrain."
        );
        return;
    }

    if (parrainId) {
        const nombre =
            obtenirNombreParrainages(
                parrainId,
                inscription.saisonId
            );

        if (
            inscription.referrerId !==
                parrainId &&
            nombre >= 3
        ) {
            notificationErreur(
                "Ce parrain a déjà atteint le maximum de 3 parrainages."
            );
            return;
        }
    }

    inscription.referrerId =
        parrainId || null;

    sauvegarderParrainage(
        inscription
    );
}

async function sauvegarderParrainage(
    inscription
) {
    try {
        await window.fbac.modifierInscription(
            inscription.id,
            {
                referrerId:
                    inscription.referrerId,
                referralDiscountApplied:
                    Number(
                        inscription.referralDiscountApplied ||
                        0
                    )
            }
        );

        await sauvegarderEtat();

        renderCurrentPage();

        notificationSucces(
            "Parrainage enregistré."
        );
    } catch (error) {
        console.error(
            "Erreur parrainage :",
            error
        );

        notificationErreur(
            "Impossible d'enregistrer le parrainage."
        );
    }
}

function obtenirSaisonPrecedenteId(
    saisonId
) {
    const saison =
        state.saisons.find(
            element =>
                element.id ===
                saisonId
        );

    if (!saison) {
        return null;
    }

    const match =
        String(
            saison.nom
        ).match(
            /^(\d{4})-(\d{4})$/
        );

    if (!match) {
        return null;
    }

    const nom =
        `${Number(match[1]) - 1}-${Number(match[1])}`;

    const precedente =
        state.saisons.find(
            element =>
                element.nom ===
                nom
        );

    return precedente
        ? precedente.id
        : null;
}