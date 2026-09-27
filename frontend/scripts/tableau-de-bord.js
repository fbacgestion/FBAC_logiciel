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

    const totalAdherents = inscriptions.length;

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

    const certificatsManquants = inscriptions.filter(
        inscription => !(inscription.certificat?.documentId || inscription.certificat?.fileName)
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
        elementAdherents.textContent = totalAdherents;
    }

    if (elementEncaisse) {
        elementEncaisse.textContent =
            `${totalEncaisse.toFixed(2)} €`;
    }

    if (elementReste) {
        elementReste.textContent =
            `${resteAEncaisser.toFixed(2)} €`;
    }

    if (elementCertificats) {
        elementCertificats.textContent =
            certificatsManquants;
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
        inscription => !inscription.certificat
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