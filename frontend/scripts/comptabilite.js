let comptabilite = {
    operations: [],
    synthese: null,
    categories: { recettes: [], depenses: [] },
    pageJournal: 1,
    taillePageJournal: 25,
    filtresJournal: { recherche: "", type: "tous", categorie: "toutes", mode: "tous", debut: "", fin: "" }
};

function euroCompta(montant) {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(montant) || 0);
}

function saisonComptableActive() {
    return obtenirSaisonConsulteeId() || state?.saisons?.[0]?.id || "";
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
    afficherJournalComptable();
    afficherGraphiqueCompta(synthese);
}

function obtenirOperationsJournal() {
    const filtres = comptabilite.filtresJournal;
    const terme = filtres.recherche.trim().toLocaleLowerCase("fr-FR");
    return comptabilite.operations
        .filter(operation => filtres.type === "tous" || operation.type === filtres.type)
        .filter(operation => filtres.categorie === "toutes" || operation.categorie === filtres.categorie)
        .filter(operation => filtres.mode === "tous" || (operation.modePaiement || "non-renseigne") === filtres.mode)
        .filter(operation => !filtres.debut || String(operation.date || "") >= filtres.debut)
        .filter(operation => !filtres.fin || String(operation.date || "") <= filtres.fin)
        .filter(operation => !terme || [
            operation.libelle, operation.categorie, operation.modePaiement,
            obtenirNomCategorie(operation.categorie), obtenirOrigineOperation(operation.source)
        ].some(valeur => String(valeur || "").toLocaleLowerCase("fr-FR").includes(terme)))
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.id || "").localeCompare(String(a.id || "")));
}

function obtenirNomCategorie(id) {
    const toutes = [...(comptabilite.categories.recettes || []), ...(comptabilite.categories.depenses || [])];
    return toutes.find(categorie => categorie.id === id)?.nom || String(id || "Autre");
}

function obtenirOrigineOperation(source) {
    const noms = {
        cotisation: "Paiement adhérent",
        aide: "Aide reçue",
        manuelle: "Saisie manuelle",
        "licence-vip": "Licence VIP",
        "licence-adherent": "Licence adhérent"
    };
    return noms[source] || "Saisie manuelle";
}

function formaterDateJournal(date) {
    const valeur = String(date || "");
    const correspondance = valeur.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return correspondance ? correspondance[3] + "/" + correspondance[2] + "/" + correspondance[1] : valeur || "—";
}

function afficherJournalComptable() {
    const table = document.getElementById("comptaOperations");
    const compteur = document.getElementById("comptaJournalCompteur");
    const pagination = document.getElementById("comptaPagination");
    const filtreCategorie = document.getElementById("comptaFiltreCategorie");
    const filtreMode = document.getElementById("comptaFiltreMode");
    if (!table) return;

    const categories = [...new Set(comptabilite.operations
        .map(operation => operation.categorie).filter(Boolean))].sort((a, b) => obtenirNomCategorie(a).localeCompare(obtenirNomCategorie(b), "fr"));
    if (filtreCategorie) {
        const valeur = comptabilite.filtresJournal.categorie;
        filtreCategorie.innerHTML = '<option value="toutes">Toutes les catégories</option>' + categories.map(id =>
            '<option value="' + escapeHtmlCompta(id) + '">' + escapeHtmlCompta(obtenirNomCategorie(id)) + '</option>'
        ).join("");
        filtreCategorie.value = categories.includes(valeur) ? valeur : "toutes";
        comptabilite.filtresJournal.categorie = filtreCategorie.value;
    }
    const modes = [...new Set(comptabilite.operations
        .map(operation => operation.modePaiement || "non-renseigne"))].sort((a, b) => a.localeCompare(b, "fr"));
    if (filtreMode) {
        const valeur = comptabilite.filtresJournal.mode;
        filtreMode.innerHTML = '<option value="tous">Tous les moyens</option>' + modes.map(mode =>
            '<option value="' + escapeHtmlCompta(mode) + '">' + escapeHtmlCompta(mode === "non-renseigne" ? "Non renseigné" : mode) + '</option>'
        ).join("");
        filtreMode.value = modes.includes(valeur) ? valeur : "tous";
        comptabilite.filtresJournal.mode = filtreMode.value;
    }

    const operations = obtenirOperationsJournal();
    const nombrePages = Math.max(1, Math.ceil(operations.length / comptabilite.taillePageJournal));
    comptabilite.pageJournal = Math.min(comptabilite.pageJournal, nombrePages);
    const debut = (comptabilite.pageJournal - 1) * comptabilite.taillePageJournal;
    const visibles = operations.slice(debut, debut + comptabilite.taillePageJournal);
    const totalRecettesFiltrees = operations.filter(operation => operation.type === "recette").reduce((total, operation) => total + Number(operation.montant || 0), 0);
    const totalDepensesFiltrees = operations.filter(operation => operation.type === "depense").reduce((total, operation) => total + Number(operation.montant || 0), 0);

    if (compteur) {
        compteur.innerHTML = '<span><strong>' + operations.length + '</strong> opération' + (operations.length > 1 ? 's' : '') + ' affichée' + (operations.length > 1 ? 's' : '') + '</span>' +
            '<span class="journal-totaux"><span class="journal-recettes">Recettes ' + escapeHtmlCompta(euroCompta(totalRecettesFiltrees)) + '</span><span class="journal-depenses">Dépenses ' + escapeHtmlCompta(euroCompta(totalDepensesFiltrees)) + '</span></span>';
    }

    if (!visibles.length) {
        table.innerHTML = '<tr><td colspan="6"><div class="compta-empty journal-empty"><strong>Aucune opération trouvée</strong><span>Modifie les filtres ou efface la recherche pour retrouver des opérations.</span></div></td></tr>';
    } else {
        table.innerHTML = visibles.map(operation => {
            const automatique = ["cotisation", "aide", "licence-adherent", "licence-vip"].includes(operation.source);
            const classeMontant = operation.type === "recette" ? "amount-positive" : "amount-negative";
            const signe = operation.type === "depense" ? "−" : "+";
            const typeLabel = operation.type === "depense" ? (operation.source === "licence-vip" || operation.source === "licence-adherent" ? "Licence FFK" : "Dépense") : (operation.source === "aide" ? "Aide reçue" : "Encaissement");
            const action = automatique
                ? '<span class="compta-badge">Auto</span>'
                : (saisonConsulteeEstHistorique() ? '<span class="journal-indisponible">Lecture seule</span>' : '<button class="btn btn-small button-danger" data-compta-delete="' + escapeHtmlCompta(operation.id) + '" aria-label="Supprimer ' + escapeHtmlCompta(operation.libelle) + '" title="Supprimer cette opération">Supprimer</button>');
            return '<tr>' +
                '<td class="journal-date">' + escapeHtmlCompta(formaterDateJournal(operation.date)) + '</td>' +
                '<td class="journal-libelle"><strong>' + escapeHtmlCompta(operation.libelle || "Opération sans libellé") + '</strong><span class="journal-origine">' + escapeHtmlCompta(obtenirOrigineOperation(operation.source)) + '</span></td>' +
                '<td><span class="journal-categorie">' + escapeHtmlCompta(obtenirNomCategorie(operation.categorie)) + '</span></td>' +
                '<td class="journal-mode">' + escapeHtmlCompta(operation.modePaiement || "—") + '</td>' +
                '<td class="journal-montant ' + classeMontant + '"><strong>' + signe + escapeHtmlCompta(euroCompta(operation.montant)) + '</strong><span>' + escapeHtmlCompta(typeLabel) + '</span></td>' +
                '<td class="journal-action">' + action + '</td>' +
                '</tr>';
        }).join("");
    }

    if (pagination) {
        pagination.innerHTML = '<span>Page ' + comptabilite.pageJournal + ' / ' + nombrePages + '</span><div class="journal-pagination-actions">' +
            '<button class="btn btn-small" data-journal-page="' + (comptabilite.pageJournal - 1) + '"' + (comptabilite.pageJournal <= 1 ? ' disabled' : '') + '>← Précédent</button>' +
            '<button class="btn btn-small" data-journal-page="' + (comptabilite.pageJournal + 1) + '"' + (comptabilite.pageJournal >= nombrePages ? ' disabled' : '') + '>Suivant →</button>' +
            '</div>';
    }
}

function reinitialiserFiltresJournal() {
    comptabilite.filtresJournal = { recherche: "", type: "tous", categorie: "toutes", mode: "tous", debut: "", fin: "" };
    comptabilite.pageJournal = 1;
    const ids = {
        comptaRechercheJournal: "",
        comptaFiltreType: "tous",
        comptaFiltreCategorie: "toutes",
        comptaFiltreMode: "tous",
        comptaFiltreDebut: "",
        comptaFiltreFin: ""
    };
    Object.entries(ids).forEach(([id, valeur]) => {
        const element = document.getElementById(id);
        if (element) element.value = valeur;
    });
    afficherJournalComptable();
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

function actualiserLibelleOperation(type) {
    const select = document.getElementById("comptaLibelleSelect");
    const autreField = document.getElementById("comptaLibelleAutreField");
    const autreInput = document.getElementById("comptaLibelleAutre");
    const depenseField = document.getElementById("comptaLibelleDepenseField");
    const depenseInput = document.getElementById("comptaLibelleDepense");
    if (!select || !autreField || !autreInput || !depenseField || !depenseInput) return;
    const estRecette = type === "recette";
    select.required = estRecette;
    autreInput.required = estRecette && select.value === "__autre__";
    depenseInput.required = !estRecette;
    autreField.classList.toggle("hidden", !estRecette || select.value !== "__autre__");
    depenseField.classList.toggle("hidden", estRecette);
}

function obtenirLibelleOperation(type) {
    if (type === "recette") {
        const select = document.getElementById("comptaLibelleSelect");
        const autre = document.getElementById("comptaLibelleAutre");
        return select?.value === "__autre__" ? autre?.value.trim() : select?.value || "";
    }
    return document.getElementById("comptaLibelleDepense")?.value.trim() || "";
}

function ouvrirOperationComptable(type) {
    if (saisonConsulteeEstHistorique()) {
        notificationErreur("Cette saison historique est en lecture seule.");
        return;
    }
    const modal = document.getElementById("comptaOperationModal");
    if (!modal) return;
    const formulaire = document.getElementById("comptaOperationForm");
    if (formulaire) {
        formulaire.reset();
    }

    document.getElementById("comptaOperationType").value = type;
    document.getElementById("comptaOperationTitle").textContent = type === "depense" ? "Nouvelle dépense" : "Nouvelle recette";
    const select = document.getElementById("comptaCategorie");
    const categories = type === "depense" ? comptabilite.categories.depenses : comptabilite.categories.recettes;
    select.innerHTML = categories.map(categorie => `<option value="${escapeHtmlCompta(categorie.id)}">${escapeHtmlCompta(categorie.nom)}</option>`).join("");
    const selectLibelle = document.getElementById("comptaLibelleSelect");
    const autreLibelle = document.getElementById("comptaLibelleAutre");
    const depenseLibelle = document.getElementById("comptaLibelleDepense");
    if (selectLibelle) selectLibelle.value = "";
    if (autreLibelle) autreLibelle.value = "";
    if (depenseLibelle) depenseLibelle.value = "";
    actualiserLibelleOperation(type);
    const date = document.getElementById("comptaDate");
    if (date) date.value = new Date().toISOString().slice(0, 10);
    modal.classList.add("active", "open");
}

async function enregistrerOperationComptable(event) {
    event.preventDefault();
    if (saisonConsulteeEstHistorique()) {
        notificationErreur("Cette saison historique est en lecture seule.");
        return;
    }
    const type = document.getElementById("comptaOperationType").value;
    const donnees = {
        type,
        date: document.getElementById("comptaDate").value,
        libelle: obtenirLibelleOperation(type),
        categorie: document.getElementById("comptaCategorie").value,
        montant: Number(document.getElementById("comptaMontant").value),
        modePaiement: document.getElementById("comptaMode").value,
        saisonId: saisonComptableActive(),
        note: document.getElementById("comptaNote").value.trim()
    };
    const mode = String(donnees.modePaiement || "").trim().toLocaleLowerCase("fr-FR");
    const modesBanque = ["cheque", "chèque", "virement", "carte", "cb", "prélèvement", "prelevement"];
    const modesCaisse = ["espèces", "especes"];
    if (![...modesBanque, ...modesCaisse].includes(mode)) {
        const continuer = window.confirm(
            "Attention : ce mode de paiement ne sera pas intégré à la trésorerie calculée. " +
            "Choisissez Chèque, Virement, Carte, Prélèvement ou Espèces si cette opération a été encaissée ou payée par l'un de ces moyens.\n\n" +
            "Voulez-vous tout de même enregistrer l'opération ?"
        );
        if (!continuer) return;
    }
    try {
        await window.fbac.creerOperationComptable(donnees);
        document.getElementById("comptaOperationModal").classList.remove("active", "open");
        event.target.reset();
        actualiserLibelleOperation("recette");
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
    if (saisonConsulteeEstHistorique()) {
        notificationErreur("Cette saison historique est en lecture seule.");
        return;
    }
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
    const selectLibelle = document.getElementById("comptaLibelleSelect");
    if (selectLibelle && !selectLibelle.dataset.initialise) {
        selectLibelle.addEventListener("change", () => actualiserLibelleOperation("recette"));
        selectLibelle.dataset.initialise = "true";
    }
    if (formulaire && !formulaire.dataset.initialise) {
        formulaire.addEventListener("submit", enregistrerOperationComptable);
        formulaire.dataset.initialise = "true";
    }
    if (!document.body.dataset.comptaInitialisee) {
        document.addEventListener("click", event => {
            const bouton = event.target.closest("[data-compta-delete]");
            if (bouton) supprimerOperationComptableDepuisInterface(bouton.dataset.comptaDelete);
            const page = event.target.closest("[data-journal-page]");
            if (page && !page.disabled) {
                comptabilite.pageJournal = Math.max(1, Number(page.dataset.journalPage) || 1);
                afficherJournalComptable();
            }
            const action = event.target.closest("[data-action]");
            if (action?.dataset.action === "nouvelle-recette") ouvrirOperationComptable("recette");
            if (action?.dataset.action === "nouvelle-depense") ouvrirOperationComptable("depense");
            if (action?.dataset.action === "rafraichir-comptabilite") rafraichirComptabilite();
            if (action?.dataset.action === "generer-rapport-financier") genererRapportFinancierDepuisInterface();
            if (action?.dataset.action === "reinitialiser-filtres-journal") reinitialiserFiltresJournal();
        });
        const champsJournal = [
            ["comptaRechercheJournal", "recherche"],
            ["comptaFiltreType", "type"],
            ["comptaFiltreCategorie", "categorie"],
            ["comptaFiltreMode", "mode"],
            ["comptaFiltreDebut", "debut"],
            ["comptaFiltreFin", "fin"]
        ];
        champsJournal.forEach(([id, cle]) => {
            const champ = document.getElementById(id);
            if (!champ) return;
            const evenement = champ.tagName === "INPUT" && champ.type === "search" ? "input" : "change";
            champ.addEventListener(evenement, () => {
                comptabilite.filtresJournal[cle] = champ.value;
                comptabilite.pageJournal = 1;
                afficherJournalComptable();
            });
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
