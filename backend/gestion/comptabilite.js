const { lireJson, ecrireJson } = require("./fichiers");
const { calculerSituationFinanciere } = require("../core/finances");

const FICHIER = "comptabilite.json";
const CATEGORIES_RECETTES = [
    { id: "cotisations", nom: "Cotisations" },
    { id: "licences", nom: "Licences encaissées" },
    { id: "materiel", nom: "Matériel / équipement" },
    { id: "stages", nom: "Stages" },
    { id: "sponsors", nom: "Sponsors" },
    { id: "dons", nom: "Dons" },
    { id: "subventions", nom: "Subventions" },
    { id: "evenements", nom: "Événements" },
    { id: "aide-atout", nom: "Atout Normandie" },
    { id: "aide-passsport", nom: "Pass'Sport" },
    { id: "aide-kiosk", nom: "Kiosk" },
    { id: "aide-spot50", nom: "Spot50" },
    { id: "autres-recettes", nom: "Autres recettes" }
];
const CATEGORIES_DEPENSES = [
    { id: "licences-federales", nom: "Licences fédérales" },
    { id: "materiel", nom: "Matériel" },
    { id: "assurance", nom: "Assurance" },
    { id: "location", nom: "Location salle" },
    { id: "deplacements", nom: "Déplacements" },
    { id: "communication", nom: "Communication" },
    { id: "equipement", nom: "Équipement" },
    { id: "frais-bancaires", nom: "Frais bancaires" },
    { id: "evenements", nom: "Événements" },
    { id: "formations", nom: "Formations" },
    { id: "autres-depenses", nom: "Autres dépenses" }
];
function obtenirDonnees() {
    const donnees = lireJson(FICHIER);
    if (!donnees || typeof donnees !== "object") return { operations: [], parametres: {} };
    return {
        operations: Array.isArray(donnees.operations) ? donnees.operations : [],
        parametres: donnees.parametres && typeof donnees.parametres === "object" ? donnees.parametres : {}
    };
}
function sauvegarder(donnees) { ecrireJson(FICHIER, donnees); return donnees; }
function genererId(prefix = "operation") { return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9); }
function normaliserOperation(operation) {
    return {
        id: operation.id || genererId(),
        date: operation.date || new Date().toISOString().slice(0, 10),
        type: operation.type === "depense" ? "depense" : "recette",
        libelle: operation.libelle || "",
        categorie: operation.categorie || (operation.type === "depense" ? "autres-depenses" : "autres-recettes"),
        montant: Math.max(0, Number(operation.montant) || 0),
        modePaiement: operation.modePaiement || "",
        saisonId: operation.saisonId || "",
        source: operation.source || "manuelle",
        inscriptionId: operation.inscriptionId || null,
        personneId: operation.personneId || null,
        paiementId: operation.paiementId || null,
        licenceMontant: Math.max(0, Number(operation.licenceMontant) || 0),
        clubMontant: Math.max(0, Number(operation.clubMontant) || 0),
        note: operation.note || "",
        aideType: operation.aideType || "",
        document: operation.document || null
    };
}
function obtenirOperations(filtres = {}) {
    let operations = obtenirDonnees().operations.map(normaliserOperation);
    if (filtres.saisonId) operations = operations.filter(operation => operation.saisonId === filtres.saisonId);
    if (filtres.type) operations = operations.filter(operation => operation.type === filtres.type);
    if (filtres.debut) operations = operations.filter(operation => operation.date >= filtres.debut);
    if (filtres.fin) operations = operations.filter(operation => operation.date <= filtres.fin);
    return operations.sort((a, b) => (String(b.date) + b.id).localeCompare(String(a.date) + a.id));
}
function obtenirOperation(id) { return obtenirDonnees().operations.find(operation => operation.id === id) || null; }
function creerOperation(donnees) {
    const operation = normaliserOperation(donnees || {});
    if (!operation.libelle) throw new Error("Le libellé de l’opération est obligatoire.");
    if (operation.montant <= 0) throw new Error("Le montant doit être supérieur à 0.");
    const data = obtenirDonnees(); data.operations.push(operation); sauvegarder(data); return operation;
}
function modifierOperation(id, donnees) {
    const data = obtenirDonnees(); const index = data.operations.findIndex(operation => operation.id === id);
    if (index === -1) throw new Error("Opération introuvable.");
    const actuelle = normaliserOperation(data.operations[index]);
    if (actuelle.source === "cotisation") throw new Error("Les opérations issues des paiements sont gérées automatiquement depuis les inscriptions.");
    data.operations[index] = normaliserOperation({ ...actuelle, ...(donnees || {}), id });
    sauvegarder(data); return data.operations[index];
}
function supprimerOperation(id) {
    const data = obtenirDonnees(); const operation = data.operations.find(element => element.id === id);
    if (!operation) throw new Error("Opération introuvable.");
    if (operation.source === "cotisation") throw new Error("Une recette issue d’un paiement ne peut pas être supprimée depuis la comptabilité.");
    data.operations = data.operations.filter(element => element.id !== id); sauvegarder(data); return operation;
}
function obtenirParametres(saisonId, configuration = {}) {
    const global = configuration.comptabilite || {};
    const saison = obtenirDonnees().parametres?.[saisonId] || {};
    const snapshot = configuration.parametresSaisons?.[saisonId] || {};
    return {
        licence: Number(saison.licence ?? snapshot.licenceFederale ?? global.licenceFederale ?? 39),
        compteBancaire: Number(saison.compteBancaire ?? global.soldeBancaireInitial ?? 0),
        caisse: Number(saison.caisse ?? global.soldeCaisseInitial ?? 0)
    };
}
function enregistrerParametres(saisonId, parametres) {
    if (!saisonId) throw new Error("La saison est obligatoire.");
    const data = obtenirDonnees(); data.parametres[saisonId] = { ...(data.parametres[saisonId] || {}), licence: Math.max(0, Number(parametres.licence) || 0), compteBancaire: Math.max(0, Number(parametres.compteBancaire) || 0), caisse: Math.max(0, Number(parametres.caisse) || 0) };
    sauvegarder(data); return data.parametres[saisonId];
}
function synchroniserCotisations(inscriptions, personnes, saisons, configuration = {}) {
    const data = obtenirDonnees(); const automatiques = []; const saisonParametres = {};
    for (const saison of saisons || []) saisonParametres[saison.id] = obtenirParametres(saison.id, configuration);
    for (const inscription of inscriptions || []) {
        const personne = (personnes || []).find(element => element.id === inscription.personId);
        const saisonId = inscription.season || inscription.saisonId || "";
        const licence = Math.max(0, Number(inscription.parametresFinanciers?.licenceFederale ?? saisonParametres[saisonId]?.licence) || 0);

        if (inscription.vip) {
            if (licence > 0) {
                automatiques.push({
                    id: "licence_vip_" + inscription.id,
                    date: new Date().toISOString().slice(0, 10),
                    type: "depense",
                    libelle: "Licence fédérale VIP — " + (personne ? (personne.firstName + " " + personne.lastName).trim() : "Adhérent"),
                    categorie: "licences-federales",
                    montant: licence,
                    modePaiement: "",
                    saisonId,
                    source: "licence-vip",
                    inscriptionId: inscription.id,
                    personneId: inscription.personId || null,
                    paiementId: null,
                    licenceMontant: 0,
                    clubMontant: 0,
                    note: "Licence fédérale prise en charge par le club pour un adhérent VIP."
                });
            }
            continue;
        }

        const paiements = Array.isArray(inscription.paiements) ? inscription.paiements.slice().sort((a, b) => String(a.date || "").localeCompare(String(b.date || ""))) : [];
        const situation = calculerSituationFinanciere(inscription, configuration);
        const dateAide = paiements[0]?.date || inscription.dateInscription || inscription.date || inscription.createdAt || new Date().toISOString().slice(0, 10);
        const aides = [
            ["atoutNormandie", "aide-atout", "Atout Normandie"],
            ["passSport", "aide-passsport", "Pass'Sport"],
            ["kiosk", "aide-kiosk", "Kiosk"],
            ["spot50", "aide-spot50", "Spot50"]
        ];
        for (const [aideType, categorie, nom] of aides) {
            const montant = Math.max(0, Number(situation.aidesEffectives?.[aideType]) || 0);
            if (!montant) continue;
            automatiques.push({
                id: "aide_" + inscription.id + "_" + aideType,
                date: dateAide,
                type: "recette",
                libelle: nom + " — " + (personne ? (personne.firstName + " " + personne.lastName).trim() : "Adhérent"),
                categorie,
                montant,
                modePaiement: "",
                saisonId,
                source: "aide",
                inscriptionId: inscription.id,
                personneId: inscription.personId || null,
                paiementId: null,
                licenceMontant: 0,
                clubMontant: 0,
                aideType,
                note: "Prise en charge de la cotisation par " + nom + "."
            });
        }
        let licenceDejaAffectee = 0;
        for (const paiement of paiements) {
            const montant = Math.max(0, Number(paiement.amount) || 0);
            if (!montant) continue;
            const id = "cotisation_" + inscription.id + "_" + paiement.id;
            const ancienne = data.operations.find(operation => operation.id === id && operation.source === "cotisation");
            const licenceIncluse =
                inscription.licenceFederaleIncluse !== false;
            const partLicence = !licenceIncluse
                ? 0
                : ancienne
                    ? Math.min(Math.max(0, Number(ancienne.licenceMontant) || 0), montant)
                    : Math.min(Math.max(0, licence - licenceDejaAffectee), montant);
            const partClub = Math.max(0, montant - partLicence);
            licenceDejaAffectee += partLicence;
            automatiques.push({
                id,
                date: paiement.date || new Date().toISOString().slice(0, 10),
                type: "recette",
                libelle: "Cotisation — " + (personne ? (personne.firstName + " " + personne.lastName).trim() : "Adhérent"),
                categorie: "cotisations",
                montant,
                modePaiement: paiement.method || "",
                saisonId: inscription.season || "",
                source: "cotisation",
                inscriptionId: inscription.id,
                personneId: inscription.personId || null,
                paiementId: paiement.id || null,
                licenceMontant: partLicence,
                clubMontant: partClub,
                note: partLicence > 0 ? "Ventilation : " + partLicence.toFixed(2) + " € licence / " + partClub.toFixed(2) + " € club." : ""
            });
        }
    }
    data.operations = data.operations.filter(operation => operation.source !== "cotisation" && operation.source !== "licence-vip" && operation.source !== "aide").concat(automatiques); sauvegarder(data); return automatiques;
}
function obtenirSynthese(saisonId, configuration = {}) {
    const operations = obtenirOperations({ saisonId });
    const recettes = operations.filter(operation => operation.type === "recette");
    const depenses = operations.filter(operation => operation.type === "depense");
    const totalRecettes = recettes.reduce((total, operation) => total + operation.montant, 0);
    const totalDepenses = depenses.reduce((total, operation) => total + operation.montant, 0);
    const categories = {};
    const mois = {};
    for (const operation of operations) {
        categories[operation.categorie] = (categories[operation.categorie] || 0) + operation.montant;
        const cle = String(operation.date || "").slice(0, 7) || "inconnu";
        if (!mois[cle]) mois[cle] = { recettes: 0, depenses: 0 };
        mois[cle][operation.type === "recette" ? "recettes" : "depenses"] += operation.montant;
    }
    const parametres = obtenirParametres(saisonId, configuration);
    const modesBanque = new Set(["cheque", "virement", "carte", "cb", "prélèvement", "prelevement"]);
    const modesCaisse = new Set(["espèces", "especes"]);
    const calculerSolde = (initial, modes) => operations.reduce((solde, operation) => {
        const mode = String(operation.modePaiement || "").trim().toLowerCase();
        if (!modes.has(mode)) return solde;
        const montant = Number(operation.montant) || 0;
        return solde + (operation.type === "depense" ? -montant : montant);
    }, Number(initial) || 0);
    const compteBancaire = calculerSolde(parametres.compteBancaire, modesBanque);
    const caisse = calculerSolde(parametres.caisse, modesCaisse);
    const operationsNonAffectees = operations.filter(operation => {
        if (operation.source === "aide" || operation.source === "licence-vip") return false;
        const mode = String(operation.modePaiement || "").trim().toLowerCase();
        return !modesBanque.has(mode) && !modesCaisse.has(mode);
    });
    return {
        saisonId,
        totalRecettes,
        totalDepenses,
        resultat: totalRecettes - totalDepenses,
        licenceEncaissee: recettes.reduce((total, operation) => total + operation.licenceMontant, 0),
        clubEncaisse: recettes.reduce((total, operation) => total + operation.clubMontant, 0),
        licenceParametee: parametres.licence,
        compteBancaire,
        caisse,
        tresorerie: compteBancaire + caisse,
        operationsNonAffectees: operationsNonAffectees.slice(0, 100),
        categories,
        mois,
        operations: operations.slice(0, 100)
    };
}
function initialiser() { sauvegarder(obtenirDonnees()); }
module.exports = { CATEGORIES_RECETTES, CATEGORIES_DEPENSES, initialiser, obtenirOperations, obtenirOperation, creerOperation, modifierOperation, supprimerOperation, obtenirParametres, enregistrerParametres, synchroniserCotisations, obtenirSynthese };