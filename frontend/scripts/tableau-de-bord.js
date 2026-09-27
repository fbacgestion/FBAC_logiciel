function afficherTableauDeBord() {
    if (typeof state === "undefined" || !state) {
        return;
    }

    const saison = state.saisons.find(
        saison => saison.id === state.configuration.saisonActiveId
    );

    const inscriptions = saison
        ? state.inscriptions.filter(
            inscription => inscription.saisonId === saison.id
        )
        : [];

    const totalAdherents =
        inscriptions.length;

    const enfants =
        inscriptions.filter(
            inscription =>
                inscription.category === "enfant"
        ).length;

    const adultes =
        inscriptions.filter(
            inscription =>
                inscription.category === "adulte"
        ).length;

    const totalAides =
        inscriptions.reduce(
            (total, inscription) =>
                total +
                calculerDonneesPaiement(
                    inscription
                ).totalAides,
            0
        );

    const totalEncaisse = inscriptions.reduce(
        (total, inscription) =>
            total + (Number(inscription.montantPaye) || 0),
        0
    );

    const totalAttendu = inscriptions.reduce(
        (total, inscription) =>
            total + calculerMontantAPayer(inscription),
        0
    );

    const resteAEncaisser = Math.max(
        0,
        totalAttendu - totalEncaisse
    );

    const aujourdHui =
        new Date();

    const certificatsManquants =
        inscriptions.filter(
            inscription =>
                !(
                    inscription.certificat?.documentId ||
                    inscription.certificat?.fileName
                )
        ).length;

    const certificatsExpires =
        inscriptions.filter(
            inscription => {
                const expiration =
                    inscription.certificat?.expiry ||
                    inscription.certificate?.expiry ||
                    "";

                if (!expiration) {
                    return false;
                }

                const dateExpiration =
                    new Date(
                        `${expiration}T23:59:59`
                    );

                return (
                    !Number.isNaN(
                        dateExpiration.getTime()
                    ) &&
                    dateExpiration < aujourdHui
                );
            }
        ).length;

    const elementAdherents =
        document.getElementById("kpiMembers");

    const elementEncaisse =
        document.getElementById("kpiPaid");

    const elementReste =
        document.getElementById("kpiDue");

    const elementCertificats =
        document.getElementById("kpiCertificates");

    if (elementAdherents) {
        elementAdherents.textContent =
            totalAdherents;
    }

    const extraAdherents =
        document.getElementById(
            "kpiMembers"
        )?.parentElement?.querySelector(
            ".kpi-extra"
        );

    if (extraAdherents) {
        extraAdherents.textContent =
            `${enfants} enfants • ${adultes} adultes`;
    }

    if (elementEncaisse) {
        elementEncaisse.textContent =
            `${totalEncaisse.toFixed(2)} €`;
    }

    const extraPaiements =
        document.getElementById(
            "kpiPaymentExtra"
        );

    if (extraPaiements) {
        extraPaiements.textContent =
            `Aides utilisées : -${totalAides.toFixed(2)} €`;
    }

    if (elementReste) {
        elementReste.textContent =
            `${resteAEncaisser.toFixed(2)} €`;
    }

    if (elementCertificats) {
        elementCertificats.textContent =
            certificatsManquants;
    }

    const extraCertificats =
        document.getElementById(
            "kpiCertificateExtra"
        );

    if (extraCertificats) {
        extraCertificats.textContent =
            certificatsExpires > 0
                ? `${certificatsExpires} expiré(s)`
                : "Aucun certificat expiré";
    }

    afficherAlertesTableauDeBord(inscriptions);
}

function afficherAlertesTableauDeBord(inscriptions) {
    const conteneur =
        document.getElementById("dashboardAlerts");

    if (!conteneur) {
        return;
    }

    const alertes = [];

    const paiementsEnAttente = inscriptions.filter(
        inscription =>
            calculerEtatPaiement(inscription) !== "paye"
    );

    if (paiementsEnAttente.length > 0) {
        alertes.push({
            type: "warning",
            titre: "Paiements en attente",
            texte:
                `${paiementsEnAttente.length} inscription(s) ` +
                `présente(nt) encore un reste à payer.`
        });
    }

    const certificatsManquants = inscriptions.filter(
        inscription => !(inscription.certificat?.documentId || inscription.certificat?.fileName)
    );

    if (certificatsManquants.length > 0) {
        alertes.push({
            type: "danger",
            titre: "Certificats manquants",
            texte:
                `${certificatsManquants.length} certificat(s) ` +
                `ne sont pas encore enregistré(s).`
        });
    }

    const certificatsExpires =
        inscriptions.filter(
            inscription => {
                const expiration =
                    inscription.certificat?.expiry ||
                    inscription.certificate?.expiry ||
                    "";

                if (!expiration) {
                    return false;
                }

                const dateExpiration =
                    new Date(
                        `${expiration}T23:59:59`
                    );

                return (
                    !Number.isNaN(
                        dateExpiration.getTime()
                    ) &&
                    dateExpiration < new Date()
                );
            }
        ).length;

    if (certificatsExpires > 0) {
        alertes.push({
            type: "warning",
            titre: "Certificats expirés",
            texte:
                `${certificatsExpires} certificat(s) ont dépassé leur date de validité.`
        });
    }

    if (alertes.length === 0) {
        conteneur.innerHTML = `
            <div class="alert success">
                <div class="alert-icon">✓</div>
                <div>
                    <strong>Tout est à jour</strong>
                    <span>Aucune alerte à signaler.</span>
                </div>
            </div>
        `;
        return;
    }

    conteneur.innerHTML = alertes.map(alerte => `
        <div class="alert ${alerte.type}">
            <div class="alert-icon">!</div>
            <div>
                <strong>${alerte.titre}</strong>
                <span>${alerte.texte}</span>
            </div>
        </div>
    `).join("");
}