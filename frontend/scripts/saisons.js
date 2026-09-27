function afficherSaisons() {
    if (typeof state === "undefined" || !state) {
        return;
    }

    const conteneur = document.getElementById("seasonList");

    if (!conteneur) {
        return;
    }

    const saisonActiveId = state.configuration.saisonActiveId;
    const saisons = [...state.saisons].sort((a, b) => Number(b.anneeDebut || String(b.nom).slice(0, 4)) - Number(a.anneeDebut || String(a.nom).slice(0, 4)));
    const saisonActive = saisons.find(saison => saison.id === saisonActiveId);
    const historiques = saisons.filter(saison => saison.id !== saisonActiveId);

    conteneur.innerHTML = `
        <div class="card season-admin-card">
            <div class="card-header">
                <div>
                    <strong>Saison actuelle</strong>
                    <p class="season-admin-description">La saison active est déterminée automatiquement selon le calendrier.</p>
                </div>
                <span class="badge success">ACTIVE</span>
            </div>
            <div class="card-body">
                <div class="season-current-name">${echapperHtml(saisonActive?.nom || "Aucune saison")}</div>
                <div class="season-stats">
                    ${afficherStatSaison("Adhérents", obtenirNombreInscriptions(saisonActive?.id))}
                    ${afficherStatSaison("À payer", formatEuro(obtenirTotalDu(saisonActive?.id)))}
                    ${afficherStatSaison("Encaissé", formatEuro(obtenirTotalPaye(saisonActive?.id)))}
                </div>
            </div>
        </div>
        <div class="card season-admin-card">
            <div class="card-header">
                <div>
                    <strong>Historique des saisons</strong>
                    <p class="season-admin-description">Les anciennes saisons restent disponibles en consultation et ne sont pas modifiables.</p>
                </div>
                <button class="btn btn-primary" data-action="new-season">+ Nouvelle saison</button>
            </div>
            <div class="card-body">
                ${historiques.length ? historiques.map(afficherCarteSaison).join("") : `<div class="empty-state">Aucune saison historique.</div>`}
            </div>
        </div>
    `;
}

function afficherStatSaison(libelle, valeur) {
    return `
        <div class="season-stat">
            <span>${libelle}</span>
            <strong>${echapperHtml(valeur)}</strong>
        </div>
    `;
}

function afficherCarteSaison(saison) {
    const nombre = obtenirNombreInscriptions(saison.id);
    const total = obtenirTotalDu(saison.id);
    const encaisse = obtenirTotalPaye(saison.id);
    const reste = Math.max(0, total - encaisse);

    return `
        <div class="season-history-row">
            <div>
                <strong>${echapperHtml(saison.nom)}</strong>
                <span>Saison historique · ${nombre} adhérent(s)</span>
            </div>
            <div class="season-history-values">
                <span>À payer <strong>${formatEuro(total)}</strong></span>
                <span>Encaissé <strong>${formatEuro(encaisse)}</strong></span>
                <span>Reste <strong>${formatEuro(reste)}</strong></span>
            </div>
        </div>
    `;
}

function obtenirNombreInscriptions(saisonId) {
    if (!saisonId) {
        return 0;
    }
    return state.inscriptions.filter(inscription => inscription.saisonId === saisonId).length;
}

function obtenirTotalDu(saisonId) {
    if (!saisonId) {
        return 0;
    }
    return state.inscriptions.filter(inscription => inscription.saisonId === saisonId).reduce((total, inscription) => total + calculerMontantAPayer(inscription), 0);
}

function obtenirTotalPaye(saisonId) {
    if (!saisonId) {
        return 0;
    }
    return state.inscriptions.filter(inscription => inscription.saisonId === saisonId).reduce((total, inscription) => total + Number(inscription.montantPaye || inscription.paidAmount || 0), 0);
}

function formatEuro(montant) {
    return `${Number(montant || 0).toFixed(2)} €`;
}

function ouvrirNouvelleSaison() {
    const champ = document.getElementById("newSeasonYear");
    if (champ) {
        champ.value = new Date().getFullYear() + 1;
    }
    ouvrirModalParId("seasonModal");
}

async function confirmerNouvelleSaison() {
    const champ = document.getElementById("newSeasonYear");
    const annee = Number(champ?.value);

    if (!Number.isInteger(annee) || annee < 2020 || annee > 2100) {
        notificationErreur("L'année de début de saison est invalide.");
        return;
    }

    try {
        const saison = await window.fbac.creerSaison(annee);
        const existante = state.saisons.find(element => element.id === saison.id);

        if (existante) {
            Object.assign(existante, saison);
        } else {
            state.saisons.push(normaliserSaisonLocale(saison));
        }

        fermerModalParId("seasonModal");
        renderCurrentPage();
        notificationSucces(`Saison ${saison.nom} enregistrée.`);
    } catch (error) {
        console.error("Erreur lors de la création de la saison :", error);
        notificationErreur(error.message || "Impossible de créer la saison.");
    }
}

function normaliserSaisonLocale(saison) {
    const nom = saison?.nom || saison?.id || "";
    const correspondance = String(nom).match(/^(\d{4})-(\d{4})$/);
    return {
        ...saison,
        id: saison?.id || nom,
        nom,
        anneeDebut: Number(saison?.anneeDebut || correspondance?.[1] || 0),
        anneeFin: Number(saison?.anneeFin || correspondance?.[2] || 0)
    };
}

function initialiserEvenementsSaisons() {
    document.addEventListener("click", event => {
        const bouton = event.target.closest("[data-action]");
        if (!bouton) {
            return;
        }
        if (bouton.dataset.action === "new-season") {
            ouvrirNouvelleSaison();
        }
        if (bouton.dataset.action === "confirm-new-season") {
            confirmerNouvelleSaison();
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiserEvenementsSaisons);
} else {
    initialiserEvenementsSaisons();
}