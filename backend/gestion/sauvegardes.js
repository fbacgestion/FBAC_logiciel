const fs = require("fs");
const path = require("path");

let dossierDonnees = "";
let dossierFichiers = "";
let dossierSauvegardes = "";
let intervalle = null;

function initialiserSauvegardes(donnees, sauvegardes, fichiers = "") {
    dossierDonnees = donnees;
    dossierFichiers = fichiers;
    dossierSauvegardes = sauvegardes;
    fs.mkdirSync(dossierSauvegardes, { recursive: true });
}

function creerSauvegarde(type = "automatique") {
    if (!dossierDonnees || !fs.existsSync(dossierDonnees)) {
        throw new Error("Le dossier de données est introuvable.");
    }

    fs.mkdirSync(dossierSauvegardes, { recursive: true });
    const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
    const destination = path.join(dossierSauvegardes, `${horodatage}_${type}`);
    fs.mkdirSync(destination, { recursive: true });
    fs.cpSync(dossierDonnees, path.join(destination, "donnees"), { recursive: true });

    if (dossierFichiers && fs.existsSync(dossierFichiers)) {
        fs.cpSync(dossierFichiers, path.join(destination, "fichiers"), { recursive: true });
    }

    nettoyerAnciennesSauvegardes();
    return destination;
}

function obtenirSauvegardes() {
    if (!dossierSauvegardes || !fs.existsSync(dossierSauvegardes)) return [];
    return fs.readdirSync(dossierSauvegardes, { withFileTypes: true })
        .filter(element => element.isDirectory())
        .map(element => ({
            nom: element.name,
            chemin: path.join(dossierSauvegardes, element.name)
        }))
        .sort((a, b) => b.nom.localeCompare(a.nom));
}

function restaurerDerniereSauvegarde() {
    const sauvegardes = obtenirSauvegardes();
    if (!sauvegardes.length) throw new Error("Aucune sauvegarde disponible.");

    const derniere = sauvegardes[0];
    creerSauvegarde("avant-restauration");

    const donneesSauvegardees = path.join(derniere.chemin, "donnees");
    const sourceDonnees = fs.existsSync(donneesSauvegardees) ? donneesSauvegardees : derniere.chemin;
    fs.rmSync(dossierDonnees, { recursive: true, force: true });
    fs.mkdirSync(dossierDonnees, { recursive: true });
    fs.cpSync(sourceDonnees, dossierDonnees, { recursive: true });

    const fichiersSauvegardes = path.join(derniere.chemin, "fichiers");
    if (dossierFichiers && fs.existsSync(fichiersSauvegardes)) {
        fs.rmSync(dossierFichiers, { recursive: true, force: true });
        fs.mkdirSync(dossierFichiers, { recursive: true });
        fs.cpSync(fichiersSauvegardes, dossierFichiers, { recursive: true });
    }

    return derniere;
}

function nettoyerAnciennesSauvegardes() {
    obtenirSauvegardes().slice(12).forEach(sauvegarde => {
        fs.rmSync(sauvegarde.chemin, { recursive: true, force: true });
    });
}

function demarrerSauvegardesAutomatiques() {
    if (intervalle) clearInterval(intervalle);
    intervalle = setInterval(() => {
        try {
            creerSauvegarde("automatique");
        } catch (error) {
            console.error("Erreur de sauvegarde automatique :", error);
        }
    }, 10 * 60 * 1000);
}

module.exports = {
    initialiserSauvegardes,
    creerSauvegarde,
    obtenirSauvegardes,
    restaurerDerniereSauvegarde,
    demarrerSauvegardesAutomatiques
};
