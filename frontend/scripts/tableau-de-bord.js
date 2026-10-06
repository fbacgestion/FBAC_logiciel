async function afficherTableauDeBord() {
    if (typeof state === "undefined" || !state) {
        return;
    }

    const saison = state.saisons.find(
        saison => saison.id === obtenirSaisonConsulteeId()
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
    await afficherGraphiquesTableauDeBord();
}

async function afficherGraphiquesTableauDeBord() {
    let synthese = null;
    const syntheseElement = document.getElementById("dashboardEnrollmentChart");
    const donutElement = document.getElementById("dashboardCategoryChart");
    const legendElement = document.getElementById("dashboardCategoryLegend");
    const saisonId = state?.configuration?.saisonActiveId || "";
    if (!syntheseElement || !donutElement || !legendElement) return;
    try {
        synthese = typeof window.fbac?.obtenirSyntheseComptable === "function"
            ? await window.fbac.obtenirSyntheseComptable(saisonId)
            : null;
        const mois = Object.entries(synthese?.mois || {}).sort((a, b) => a[0].localeCompare(b[0])).slice(-8);
        if (!mois.length) {
            syntheseElement.innerHTML = '<div class="dashboard-chart-empty">Les encaissements apparaîtront ici automatiquement.</div>';
        } else {
            const maximum = Math.max(1, ...mois.flatMap(([, valeur]) => [Number(valeur.recettes) || 0, Number(valeur.depenses) || 0]));
            syntheseElement.innerHTML = mois.map(([id, valeur]) => {
                const recettes = Number(valeur.recettes) || 0;
                const depenses = Number(valeur.depenses) || 0;
                return `<div class="dashboard-month"><div class="dashboard-bars"><span class="dashboard-bar income" style="height:${Math.max(4, recettes / maximum * 100)}%" title="Recettes : ${recettes.toFixed(2)} €"></span><span class="dashboard-bar expense" style="height:${Math.max(4, depenses / maximum * 100)}%" title="Dépenses : ${depenses.toFixed(2)} €"></span></div><small>${echapperDashboard(id.slice(5))}</small></div>`;
            }).join("");
        }
    } catch (error) {
        console.error("Erreur graphiques dashboard :", error);
        syntheseElement.innerHTML = '<div class="dashboard-chart-empty">Graphique indisponible.</div>';
    }
    const saison = state.saisons.find(saison => saison.id === saisonId);
    const inscriptions = saison ? state.inscriptions.filter(inscription => inscription.saisonId === saison.id) : [];
    const enfants = inscriptions.filter(inscription => inscription.category === "enfant").length;
    const adultes = inscriptions.length - enfants;
    const total = enfants + adultes;
    const enfantDegres = total ? enfants / total * 360 : 0;
    donutElement.style.setProperty("--dashboard-enfant", `${enfantDegres}deg`);
    donutElement.style.setProperty("--dashboard-adulte", `${360 - enfantDegres}deg`);
    donutElement.innerHTML = `<div class="dashboard-donut-center"><strong>${total}</strong><span>adhérents</span></div>`;
    legendElement.innerHTML = `<span><i class="legend-dot child"></i>Enfants <strong>${enfants}</strong></span><span><i class="legend-dot adult"></i>Adultes <strong>${adultes}</strong></span>`;
    const income = Number(synthese?.totalRecettes) || 0;
    const expense = Number(synthese?.totalDepenses) || 0;
    const result = Number(synthese?.resultat) || income - expense;
    const cash = Number(synthese?.compteBancaire || 0) + Number(synthese?.caisse || 0);
    const set = (id, value) => { const element = document.getElementById(id); if (element) element.textContent = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value); };
    set("dashboardFinancialIncome", income);
    set("dashboardFinancialExpense", expense);
    set("dashboardFinancialResult", result);
    set("dashboardFinancialCash", cash);
}

function echapperDashboard(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}

function afficherAlertesTableauDeBord(inscriptions) {
    const conteneur =
        document.getElementById("dashboardAlerts");

    if (!conteneur) {
        return;
    }

    const alertes = [];

    const paiementsEnAttente = inscriptions.filter(
        inscription => {
            const etat = calculerEtatPaiement(inscription);
            return etat === "impaye" || etat === "partiel";
        }
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
        );

    if (certificatsExpires.length > 0) {
        const noms =
            certificatsExpires
                .map(inscription => {
                    const personne =
                        state.personnes.find(
                            personne =>
                                personne.id === inscription.personneId
                        );

                    return personne
                        ? (personne.firstName + " " + personne.lastName).trim()
                        : "Adhérent inconnu";
                });

        const nomsAffiches =
            noms.length <= 3
                ? noms.join(", ")
                : noms.slice(0, 3).join(", ") + " et " + (noms.length - 3) + " autre(s)";

        alertes.push({
            type: "warning",
            titre: "Certificats expirés",
            texte:
                certificatsExpires.length + " certificat(s) à renouveler : " + nomsAffiches + "."
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