function obtenirPaiementsInscription(inscription) {
    if (!Array.isArray(inscription.paiements)) {
        inscription.paiements = [];
    }

    if (
        inscription.paiements.length === 0 &&
        Number(inscription.montantPaye ?? inscription.paidAmount ?? 0) > 0
    ) {
        inscription.paiements.push({
            id: genererIdentifiant("paiement"),
            date: new Date().toISOString().slice(0, 10),
            amount: Number(inscription.montantPaye ?? inscription.paidAmount) || 0,
            method: inscription.paymentMethod || ""
        });
    }

    return inscription.paiements;
}

function calculerTotalPaiementsInscription(inscription) {
    return obtenirPaiementsInscription(inscription).reduce(
        (total, paiement) =>
            total + (Number(paiement.amount) || 0),
        0
    );
}

function synchroniserTotalPaiements(inscription) {
    const total =
        calculerTotalPaiementsInscription(
            inscription
        );

    inscription.montantPaye =
        total;

    inscription.paidAmount =
        total;

    return total;
}

function afficherPaiements() {
    if (
        typeof state === "undefined" ||
        !state
    ) {
        return;
    }

    const conteneur =
        document.getElementById("paymentsTable") ||
        document.getElementById("liste-paiements");

    if (!conteneur) {
        return;
    }

    const saisonId =
        state.configuration.saisonActiveId;

    const inscriptions =
        state.inscriptions.filter(
            inscription =>
                inscription.saisonId === saisonId
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
        inscriptions.map(inscription => {
            synchroniserTotalPaiements(inscription);

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

            const paiements =
                obtenirPaiementsInscription(
                    inscription
                );

            const mode =
                paiements.length === 1
                    ? paiements[0].method || "—"
                    : paiements.length > 1
                        ? `${paiements.length} paiements`
                        : "—";

            const etat =
                donnees.surpaiement > 0
                    ? '<span class="badge warning">Surpaiement</span>'
                    : afficherEtatPaiement(
                        donnees.etat
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
                    <td>${donnees.tarif.toFixed(2)} €</td>
                    <td>${donnees.totalAides.toFixed(2)} €</td>
                    <td>-${donnees.reductionFamille.toFixed(2)} €</td>
                    <td>-${donnees.parrainageAcquis.toFixed(2)} €</td>
                    <td>${donnees.montantAPayer.toFixed(2)} €</td>
                    <td>${donnees.montantPaye.toFixed(2)} €</td>
                    <td>${donnees.reste.toFixed(2)} €</td>
                    <td>${echapperHtml(mode)}</td>
                    <td>${etat}</td>
                    <td>
                        <button
                            class="btn btn-small"
                            data-action="modifier-paiement"
                            data-id="${echapperHtml(inscription.id)}"
                        >
                            Ajouter
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
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
                inscription.saisonId === saisonId
        );

    let totalAttendu = 0;
    let totalPaye = 0;
    let totalSurpaiement = 0;
    let nombreImpayes = 0;

    inscriptions.forEach(inscription => {
        synchroniserTotalPaiements(inscription);

        const donnees =
            calculerDonneesPaiement(
                inscription
            );

        totalAttendu +=
            donnees.montantAPayer;

        totalPaye +=
            donnees.montantPaye;

        totalSurpaiement +=
            donnees.surpaiement;

        if (donnees.etat !== "paye") {
            nombreImpayes++;
        }
    });

    const reste =
        inscriptions.reduce(
            (total, inscription) =>
                total +
                calculerDonneesPaiement(
                    inscription
                ).reste,
            0
        );

    document.getElementById("paymentTotalDue")?.replaceChildren(
        document.createTextNode(
            `${totalAttendu.toFixed(2)} €`
        )
    );

    document.getElementById("paymentTotalPaid")?.replaceChildren(
        document.createTextNode(
            `${totalPaye.toFixed(2)} €`
        )
    );

    document.getElementById("paymentRemaining")?.replaceChildren(
        document.createTextNode(
            `${reste.toFixed(2)} €`
        )
    );

    const impayes =
        document.getElementById(
            "paymentUnpaid"
        );

    if (impayes) {
        impayes.textContent =
            nombreImpayes;

        impayes.parentElement?.querySelector(
            ".kpi-extra"
        )?.replaceChildren(
            document.createTextNode(
                totalSurpaiement > 0
                    ? `${totalSurpaiement.toFixed(2)} € de surpaiements`
                    : "Aucun surpaiement"
            )
        );
    }
}

function afficherEtatPaiement(
    etat
) {
    if (etat === "paye") {
        return '<span class="badge success">Payé</span>';
    }

    if (etat === "partiel") {
        return '<span class="badge warning">Partiel</span>';
    }

    return '<span class="badge danger">Impayé</span>';
}

function formaterDatePaiement(date) {
    if (!date) {
        return "Date inconnue";
    }

    const valeur =
        new Date(`${date}T00:00:00`);

    return Number.isNaN(valeur.getTime())
        ? date
        : valeur.toLocaleDateString("fr-FR");
}

function afficherHistoriquePaiements(inscription) {
    const conteneur =
        document.getElementById(
            "paymentHistory"
        );

    if (!conteneur) {
        return;
    }

    const paiements =
        obtenirPaiementsInscription(
            inscription
        );

    if (!paiements.length) {
        conteneur.innerHTML =
            "<strong>Historique des paiements</strong><br>Aucun paiement enregistré.";
        return;
    }

    conteneur.innerHTML =
        "<strong>Historique des paiements</strong>" +
        paiements.map((paiement, index) => `
            <div class="summary-line">
                <span>
                    ${formaterDatePaiement(paiement.date)}
                    — ${echapperHtml(paiement.method || "Mode non renseigné")}
                </span>
                <strong>${(Number(paiement.amount) || 0).toFixed(2)} €</strong>
            </div>
        `).join("");
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

    synchroniserTotalPaiements(
        inscription
    );

    const donnees =
        calculerDonneesPaiement(
            inscription
        );

    definirValeur(
        "paymentEnrollmentId",
        inscription.id
    );

    definirValeur(
        "paymentAmount",
        ""
    );

    definirValeur(
        "paymentMethod",
        ""
    );

    const resume =
        document.getElementById(
            "paymentSummary"
        );

    if (resume) {
        resume.innerHTML = `
            Total à payer :
            <strong>${donnees.montantAPayer.toFixed(2)} €</strong>
            <br>
            Total déjà payé :
            <strong>${donnees.montantPaye.toFixed(2)} €</strong>
            <br>
            Reste à payer :
            <strong>${donnees.reste.toFixed(2)} €</strong>
            <br>
            Surpaiement :
            <strong>${donnees.surpaiement.toFixed(2)} €</strong>
        `;
    }

    afficherHistoriquePaiements(
        inscription
    );

    const modal =
        document.getElementById(
            "paymentModal"
        );

    if (modal) {
        modal.classList.add("active");
        modal.classList.add("open");
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
        !Number.isFinite(montant) ||
        montant <= 0
    ) {
        notificationErreur(
            "Saisissez un montant de paiement supérieur à 0 €."
        );
        return;
    }

    const mode =
        obtenirValeur(
            "paymentMethod"
        ) || "";

    obtenirPaiementsInscription(
        inscription
    ).push({
        id:
            genererIdentifiant("paiement"),
        date:
            new Date().toISOString().slice(0, 10),
        amount:
            montant,
        method:
            mode
    });

    synchroniserTotalPaiements(
        inscription
    );

    inscription.paymentMethod =
        mode ||
        inscription.paymentMethod ||
        "";

    try {
        await window.fbac.modifierInscription(
            inscription.id,
            convertirInscriptionPourBackend(
                inscription
            )
        );

        await sauvegarderEtat();

        const modal =
            document.getElementById(
                "paymentModal"
            );

        if (modal) {
            modal.classList.remove("active");
            modal.classList.remove("open");
        }

        renderCurrentPage();

        notificationSucces(
            `Paiement de ${montant.toFixed(2)} € enregistré.`
        );
    } catch (error) {
        console.error(
            "Erreur paiement :",
            error
        );

        notificationErreur(
            error.message ||
            "Impossible d'enregistrer le paiement."
        );
    }
}

function initialiserPaiements() {
    const formulaire =
        document.getElementById(
            "paymentForm"
        );

    if (
        formulaire &&
        !formulaire.dataset.initialise
    ) {
        formulaire.addEventListener(
            "submit",
            enregistrerPaiement
        );

        formulaire.dataset.initialise =
            "true";
    }

    if (
        !document.body.dataset.paiementActionsInitialises
    ) {
        document.addEventListener(
            "click",
            event => {
                const bouton =
                    event.target.closest(
                        '[data-action="modifier-paiement"]'
                    );

                if (!bouton) {
                    return;
                }

                ouvrirPaiement(
                    bouton.dataset.id
                );
            }
        );

        document.body.dataset.paiementActionsInitialises =
            "true";
    }

    const exportButton =
        document.querySelector(
            '[data-action="export-csv"]'
        );

    if (
        exportButton &&
        !exportButton.dataset.initialise
    ) {
        exportButton.addEventListener(
            "click",
            exporterPaiementsCsv
        );

        exportButton.dataset.initialise =
            "true";
    }
}

function exporterPaiementsCsv() {
    const saisonId =
        state.configuration.saisonActiveId;

    const inscriptions =
        state.inscriptions.filter(
            inscription =>
                inscription.saisonId ===
                saisonId
        );

    const lignes = [[
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
        "Surpaiement",
        "Nombre de paiements",
        "Mode paiement",
        "Certificat",
        "Validité"
    ]];

    inscriptions.forEach(inscription => {
        synchroniserTotalPaiements(
            inscription
        );

        const personne =
            state.personnes.find(
                element =>
                    element.id ===
                    inscription.personneId
            );

        const saison =
            state.saisons.find(
                element =>
                    element.id ===
                    inscription.saisonId
            );

        const donnees =
            calculerDonneesPaiement(
                inscription
            );

        const certificat =
            inscription.certificat ||
            inscription.certificate ||
            {};

        const paiements =
            obtenirPaiementsInscription(
                inscription
            );

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
            donnees.surpaiement.toFixed(2),
            paiements.length,
            paiements.length === 1
                ? paiements[0].method || ""
                : paiements.length > 1
                    ? "Plusieurs"
                    : "",
            certificat.fileName || "",
            certificat.expiry || ""
        ]);
    });

    const csv =
        lignes
            .map(ligne =>
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
                type:
                    "text/csv;charset=utf-8;"
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const lien =
        document.createElement(
            "a"
        );

    lien.href =
        url;

    lien.download =
        `fbac-paiements-${saisonId || "export"}.csv`;

    document.body.appendChild(
        lien
    );

    lien.click();

    lien.remove();

    URL.revokeObjectURL(
        url
    );

    notificationSucces(
        "Export CSV terminé."
    );
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
