function afficherPaiements() {
    if (
        typeof state === "undefined" ||
        !state
    ) {
        return;
    }

    const conteneur =
        document.getElementById(
            "paymentsTable"
        ) ||
        document.getElementById(
            "liste-paiements"
        );

    if (!conteneur) {
        return;
    }

    const saisonId =
        state.configuration.saisonActiveId;

    const inscriptions =
        state.inscriptions.filter(
            inscription =>
                inscription.saisonId ===
                saisonId
        );

    if (!inscriptions.length) {
        conteneur.innerHTML = `
            <tr>
                <td colspan="11">
                    Aucun paiement enregistré pour cette saison.
                </td>
            </tr>
        `;
        return;
    }

    conteneur.innerHTML =
        inscriptions
            .map(
                inscription => {
                    const personne =
                        state.personnes.find(
                            element =>
                                element.id ===
                                inscription.personneId
                        );

                    const donnees =
                        calculerDonneesPaiement(
                            inscription
                        );

                    return `
                        <tr>
                            <td>
                                ${echapperHtml(
                                    personne
                                        ? `${personne.firstName} ${personne.lastName}`.trim()
                                        : "Inconnu"
                                )}
                            </td>
                            <td>
                                ${donnees.tarif.toFixed(2)} €
                            </td>
                            <td>
                                -${donnees.totalAides.toFixed(2)} €
                            </td>
                            <td>
                                -${donnees.reductionFamille.toFixed(2)} €
                            </td>
                            <td>
                                -${donnees.parrainageAcquis.toFixed(2)} €
                            </td>
                            <td>
                                ${donnees.montantAPayer.toFixed(2)} €
                            </td>
                            <td>
                                ${donnees.montantPaye.toFixed(2)} €
                            </td>
                            <td>
                                ${donnees.reste.toFixed(2)} €
                            </td>
                            <td>
                                ${echapperHtml(
                                    inscription.paymentMethod ||
                                    "—"
                                )}
                            </td>
                            <td>
                                ${afficherEtatPaiement(
                                    donnees.etat
                                )}
                            </td>
                            <td>
                                <button
                                    class="btn btn-small"
                                    data-action="modifier-paiement"
                                    data-id="${echapperHtml(inscription.id)}"
                                >
                                    Modifier
                                </button>
                            </td>
                        </tr>
                    `;
                }
            )
            .join("");
}

function afficherResumePaiements() {
    if (
        typeof state === "undefined" ||
        !state
    ) {
        return;
    }

    const saisonId =
        state.configuration.saisonActiveId;

    const inscriptions =
        state.inscriptions.filter(
            inscription =>
                inscription.saisonId ===
                saisonId
        );

    const totalAttendu =
        inscriptions.reduce(
            (
                total,
                inscription
            ) =>
                total +
                calculerMontantAPayer(
                    inscription
                ),
            0
        );

    const totalPaye =
        inscriptions.reduce(
            (
                total,
                inscription
            ) =>
                total +
                (
                    Number(
                        inscription.montantPaye
                    ) || 0
                ),
            0
        );

    const reste =
        Math.max(
            0,
            totalAttendu -
            totalPaye
        );

    const elementAttendu =
        document.getElementById(
            "paymentTotalDue"
        );

    const elementPaye =
        document.getElementById(
            "paymentTotalPaid"
        );

    const elementReste =
        document.getElementById(
            "paymentRemaining"
        );

    if (elementAttendu) {
        elementAttendu.textContent =
            `${totalAttendu.toFixed(2)} €`;
    }

    if (elementPaye) {
        elementPaye.textContent =
            `${totalPaye.toFixed(2)} €`;
    }

    if (elementReste) {
        elementReste.textContent =
            `${reste.toFixed(2)} €`;
    }
}

function afficherEtatPaiement(
    etat
) {
    if (etat === "paye") {
        return `
            <span class="badge success">
                Payé
            </span>
        `;
    }

    if (etat === "partiel") {
        return `
            <span class="badge warning">
                Partiel
            </span>
        `;
    }

    return `
        <span class="badge danger">
            Impayé
        </span>
    `;
}

function ouvrirPaiement(
    inscriptionId
) {
    const inscription =
        state.inscriptions.find(
            element =>
                element.id ===
                inscriptionId
        );

    if (!inscription) {
        return;
    }

    const montant =
        calculerMontantAPayer(
            inscription
        );

    definirValeur(
        "paymentEnrollmentId",
        inscription.id
    );

    definirValeur(
        "paymentAmount",
        inscription.montantPaye || 0
    );

    definirValeur(
        "paymentMethod",
        inscription.paymentMethod || ""
    );

    const resume =
        document.getElementById(
            "paymentSummary"
        );

    if (resume) {
        resume.innerHTML = `
            Total à payer :
            <strong>
                ${montant.toFixed(2)} €
            </strong>
            <br>
            Déjà payé :
            <strong>
                ${(Number(
                    inscription.montantPaye
                ) || 0).toFixed(2)} €
            </strong>
            <br>
            Reste :
            <strong>
                ${calculerReste(
                    inscription
                ).toFixed(2)} €
            </strong>
        `;
    }

    const modal =
        document.getElementById(
            "paymentModal"
        );

    if (modal) {
        modal.classList.add(
            "active"
        );

        modal.classList.add(
            "open"
        );
    }
}

async function enregistrerPaiement(
    event
) {
    if (event) {
        event.preventDefault();
    }

    const inscriptionId =
        obtenirValeur(
            "paymentEnrollmentId"
        );

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

    const montant =
        Number(
            obtenirValeur(
                "paymentAmount"
            ) || 0
        );

    if (
        !Number.isFinite(
            montant
        ) ||
        montant < 0
    ) {
        notificationErreur(
            "Montant de paiement invalide."
        );
        return;
    }

    inscription.montantPaye =
        montant;

    inscription.paidAmount =
        montant;

    inscription.paymentMethod =
        obtenirValeur(
            "paymentMethod"
        );

    try {
        await window.fbac.modifierInscription(
            inscription.id,
            convertirInscriptionPaiementBackend(
                inscription
            )
        );

        await sauvegarderEtat();

        const modal =
            document.getElementById(
                "paymentModal"
            );

        if (modal) {
            modal.classList.remove(
                "active"
            );

            modal.classList.remove(
                "open"
            );
        }

        renderCurrentPage();

        notificationSucces(
            "Paiement enregistré."
        );
    } catch (error) {
        console.error(
            "Erreur paiement :",
            error
        );

        notificationErreur(
            "Impossible d'enregistrer le paiement."
        );
    }
}

function convertirInscriptionPaiementBackend(
    inscription
) {
    const saison =
        state.saisons.find(
            element =>
                element.id ===
                inscription.saisonId
        );

    return {
        personId:
            inscription.personneId,
        season:
            saison
                ? saison.id
                : inscription.saisonId,
        category:
            inscription.category,
        frequency:
            String(
                inscription.frequency
            ),
        grade:
            inscription.grade,
        familyGroupId:
            inscription.familyGroupId ||
            null,
        referrerId:
            inscription.referrerId ||
            null,
        referralDiscountApplied:
            Number(
                inscription.referralDiscountApplied ??
                inscription.parrainageAcquis ??
                0
            ),
        aids: {
            atout:
                inscription.aides?.atoutNormandie ||
                inscription.aides?.atout ||
                {
                    enabled: false,
                    amount: 0
                },
            passSport:
                inscription.aides?.passSport ||
                {
                    enabled: false,
                    amount: 0
                },
            spot50:
                inscription.aides?.spot50 ||
                {
                    enabled: false,
                    amount: 0
                }
        },
        familyDiscountEnabled:
            Boolean(
                inscription.familyDiscountEnabled
            ),
        familyDiscountAmount:
            Number(
                inscription.familyDiscountAmount ??
                inscription.reductionFamille ??
                0
            ),
        paidAmount:
            Number(
                inscription.montantPaye
            ) || 0,
        paymentMethod:
            inscription.paymentMethod ||
            "",
        certificate:
            inscription.certificat ||
            inscription.certificate ||
            {}
    };
}

function initialiserPaiements() {
    const formulaire = document.getElementById("paymentForm");

    if (formulaire && !formulaire.dataset.initialise) {
        formulaire.addEventListener("submit", enregistrerPaiement);
        formulaire.dataset.initialise = "true";
    }

    if (!document.body.dataset.paiementActionsInitialises) {
        document.addEventListener("click", event => {
            const bouton = event.target.closest('[data-action="modifier-paiement"]');

            if (!bouton) {
                return;
            }

            ouvrirPaiement(bouton.dataset.id);
        });

        document.body.dataset.paiementActionsInitialises = "true";
    }

    const exportButton = document.querySelector('[data-action="export-csv"]');

    if (exportButton && !exportButton.dataset.initialise) {
        exportButton.addEventListener("click", exporterPaiementsCsv);
        exportButton.dataset.initialise = "true";
    }
}
if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initialiserPaiements
    );
} else {
    initialiserPaiements();
}
function exporterPaiementsCsv() {
    const saisonId =
        state.configuration.saisonActiveId;

    const inscriptions =
        state.inscriptions.filter(
            inscription =>
                inscription.saisonId === saisonId
        );

    const lignes = [
        [
            "Nom",
            "Prénom",
            "Saison",
            "Grade",
            "Catégorie",
            "Fréquence",
            "Tarif",
            "Aides",
            "Réduction famille",
            "Parrainage",
            "Total à payer",
            "Payé",
            "Reste",
            "Mode paiement",
            "Certificat",
            "Validité"
        ]
    ];

    inscriptions.forEach(inscription => {
        const personne =
            state.personnes.find(
                element =>
                    element.id === inscription.personneId
            );

        const saison =
            state.saisons.find(
                element =>
                    element.id === inscription.saisonId
            );

        const donnees =
            calculerDonneesPaiement(inscription);

        const certificat =
            inscription.certificat ||
            inscription.certificate ||
            {};

        lignes.push([
            personne?.lastName || "",
            personne?.firstName || "",
            saison?.nom || "",
            inscription.grade || "",
            inscription.category || "",
            inscription.frequency || "",
            donnees.tarif.toFixed(2),
            donnees.totalAides.toFixed(2),
            donnees.reductionFamille.toFixed(2),
            donnees.parrainageAcquis.toFixed(2),
            donnees.montantAPayer.toFixed(2),
            donnees.montantPaye.toFixed(2),
            donnees.reste.toFixed(2),
            inscription.paymentMethod || "",
            certificat.fileName || "",
            certificat.expiry || ""
        ]);
    });

    const csv =
        lignes
            .map(
                ligne =>
                    ligne
                        .map(
                            valeur =>
                                `"${String(
                                    valeur ?? ""
                                ).replace(/"/g, '""')}"`
                        )
                        .join(";")
            )
            .join("\r\n");

    const blob =
        new Blob(
            ["\ufeff" + csv],
            {
                type: "text/csv;charset=utf-8;"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const lien =
        document.createElement("a");

    lien.href = url;
    lien.download =
        `fbac-paiements-${saisonId || "export"}.csv`;

    document.body.appendChild(lien);
    lien.click();
    lien.remove();

    URL.revokeObjectURL(url);

    notificationSucces(
        "Export CSV terminé."
    );
}
