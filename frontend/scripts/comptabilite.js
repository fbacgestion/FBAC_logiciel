let comptabilite = {
    operations: [],
    synthese: null,
    categories: { recettes: [], depenses: [] }
};

function euroCompta(montant) {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(montant) || 0);
}

function saisonComptableActive() {
    return state?.configuration?.saisonActiveId || state?.saisons?.[0]?.id || "";
}

async function chargerComptabilite() {
    if (!window.fbac) return;
    const saisonId = saisonComptableActive();
    const [operations, synthese, categories] = await Promise.all([
        window.fbac.obtenirComptabilite(saisonId),
        window.fbac.obtenirSyntheseComptable(saisonId),
        window.fbac.obtenirCategoriesComptables()
    ]);
    comptabilite.operations = operations || [];
    comptabilite.synthese = synthese || null;
    comptabilite.categories = categories || { recettes: [], depenses: [] };
}

function afficherComptabilite() {
    const synthese = comptabilite.synthese || {};
    const recettes = document.getElementById("comptaTotalRecettes");
    const depenses = document.getElementById("comptaTotalDepenses");
    const resultat = document.getElementById("comptaResultat");
    const tresorerie = document.getElementById("comptaTresorerie");
    if (recettes) recettes.textContent = euroCompta(synthese.totalRecettes);
    if (depenses) depenses.textContent = euroCompta(synthese.totalDepenses);
    if (resultat) {
        resultat.textContent = euroCompta(synthese.resultat);
        resultat.classList.toggle("amount-positive", Number(synthese.resultat) >= 0);
        resultat.classList.toggle("amount-negative", Number(synthese.resultat) < 0);
    }
    if (tresorerie) tresorerie.textContent = euroCompta((synthese.compteBancaire || 0) + (synthese.caisse || 0));
    const licence = document.getElementById("comptaLicence");
    const club = document.getElementById("comptaClub");
    if (licence) licence.textContent = euroCompta(synthese.licenceEncaissee);
    if (club) club.textContent = euroCompta(synthese.clubEncaisse);
    const table = document.getElementById("comptaOperations");
    if (table) {
        table.innerHTML = comptabilite.operations.slice(0, 30).map(operation => {
            const classe = operation.type === "recette" ? "amount-positive" : "amount-negative";
            return `<tr>
                <td>${escapeHtmlCompta(operation.date)}</td>
                <td><strong>${escapeHtmlCompta(operation.libelle)}</strong><small>${escapeHtmlCompta(operation.source === "cotisation" ? "Paiement adhérent" : "Saisie manuelle")}</small></td>
                <td>${escapeHtmlCompta(operation.categorie)}</td>
                <td>${escapeHtmlCompta(operation.modePaiement || "—")}</td>
                <td class="${classe}">${operation.type === "depense" ? "−" : "+"}${euroCompta(operation.montant)}</td>
                <td>${operation.source === "cotisation" ? '<span class="compta-badge">Auto</span>' : '<button class="btn btn-small button-danger" data-compta-delete="${operation.id}">Suppr.</button>'}</td>
            </tr>`;
        }).join("");
    }
    afficherGraphiqueCompta(synthese);
}

function escapeHtmlCompta(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}

function afficherGraphiqueCompta(synthese) {
    const zone = document.getElementById("comptaChart");
    if (!zone) return;
    const mois = Object.entries(synthese?.mois || {}).sort((a, b) => a[0].localeCompare(b[0])).slice(-10);
    if (!mois.length) {
        zone.innerHTML = '<div class="compta-empty">Les encaissements et dépenses apparaîtront ici automatiquement.</div>';
        return;
    }
    const maximum = Math.max(1, ...mois.flatMap(([, valeur]) => [valeur.recettes, valeur.depenses]));
    zone.innerHTML = mois.map(([moisId, valeur]) => {
        const recette = Math.round((valeur.recettes / maximum) * 100);
        const depense = Math.round((valeur.depenses / maximum) * 100);
        return `<div class="compta-bar-group">
            <div class="compta-bars"><span class="compta-bar recette" style="height:${Math.max(3, recette)}%"></span><span class="compta-bar depense" style="height:${Math.max(3, depense)}%"></span></div>
            <small>${escapeHtmlCompta(moisId.slice(5))}</small>
        </div>`;
    }).join("");
}

async function rafraichirComptabilite() {
    try {
        await chargerComptabilite();
        afficherComptabilite();
    } catch (error) {
        console.error("Erreur comptabilité :", error);
        notificationErreur(error.message || "Impossible de charger la comptabilité.");
    }
}

function ouvrirOperationComptable(type) {
    const modal = document.getElementById("comptaOperationModal");
    if (!modal) return;
    document.getElementById("comptaOperationType").value = type;
    document.getElementById("comptaOperationTitle").textContent = type === "depense" ? "Nouvelle dépense" : "Nouvelle recette";
    const select = document.getElementById("comptaCategorie");
    const categories = type === "depense" ? comptabilite.categories.depenses : comptabilite.categories.recettes;
    select.innerHTML = categories.map(categorie => `<option value="${escapeHtmlCompta(categorie.id)}">${escapeHtmlCompta(categorie.nom)}</option>`).join("");
    modal.classList.add("active", "open");
}

async function enregistrerOperationComptable(event) {
    event.preventDefault();
    const type = document.getElementById("comptaOperationType").value;
    const donnees = {
        type,
        date: document.getElementById("comptaDate").value,
        libelle: document.getElementById("comptaLibelle").value.trim(),
        categorie: document.getElementById("comptaCategorie").value,
        montant: Number(document.getElementById("comptaMontant").value),
        modePaiement: document.getElementById("comptaMode").value,
        saisonId: saisonComptableActive(),
        note: document.getElementById("comptaNote").value.trim()
    };
    try {
        await window.fbac.creerOperationComptable(donnees);
        document.getElementById("comptaOperationModal").classList.remove("active", "open");
        event.target.reset();
        await rafraichirComptabilite();
        notificationSucces(type === "depense" ? "Dépense enregistrée." : "Recette enregistrée.");
    } catch (error) {
        notificationErreur(error.message || "Impossible d'enregistrer l'opération.");
    }
}

async function genererRapportFinancierDepuisInterface() {
    try {
        const chemin = await window.fbac.genererRapportFinancier(saisonComptableActive());
        if (chemin) {
            notificationSucces("Rapport financier PDF généré.");
        }
    } catch (error) {
        notificationErreur(error.message || "Impossible de générer le rapport financier.");
    }
}

async function supprimerOperationComptableDepuisInterface(id) {
    if (!confirm("Supprimer cette opération ?")) return;
    try {
        await window.fbac.supprimerOperationComptable(id);
        await rafraichirComptabilite();
        notificationSucces("Opération supprimée.");
    } catch (error) {
        notificationErreur(error.message || "Impossible de supprimer l'opération.");
    }
}

function initialiserComptabilite() {
    const formulaire = document.getElementById("comptaOperationForm");
    if (formulaire && !formulaire.dataset.initialise) {
        formulaire.addEventListener("submit", enregistrerOperationComptable);
        formulaire.dataset.initialise = "true";
    }
    if (!document.body.dataset.comptaInitialisee) {
        document.addEventListener("click", event => {
            const bouton = event.target.closest("[data-compta-delete]");
            if (bouton) supprimerOperationComptableDepuisInterface(bouton.dataset.comptaDelete);
            const action = event.target.closest("[data-action]");
            if (action?.dataset.action === "nouvelle-recette") ouvrirOperationComptable("recette");
            if (action?.dataset.action === "nouvelle-depense") ouvrirOperationComptable("depense");
            if (action?.dataset.action === "rafraichir-comptabilite") rafraichirComptabilite();
            if (action?.dataset.action === "generer-rapport-financier") genererRapportFinancierDepuisInterface();
        });
        document.body.dataset.comptaInitialisee = "true";
    }
}

const afficherPageComptabiliteOriginale = typeof renderCurrentPage === "function" ? renderCurrentPage : null;

async function actualiserPageComptabilite() {
    await rafraichirComptabilite();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialiserComptabilite);
} else {
    initialiserComptabilite();
}
