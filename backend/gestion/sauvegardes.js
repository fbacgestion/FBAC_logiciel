const fs = require("fs");
const path = require("path");

let dossierDonnees = "";
let dossierSauvegardes = "";
let intervalle = null;

function initialiserSauvegardes(donnees, sauvegardes) {
    dossierDonnees = donnees;
    dossierSauvegardes = sauvegardes;
    fs.mkdirSync(dossierSauvegardes, { recursive: true });
}

function creerSauvegarde(type = "automatique") {
    if (!dossierDonnees || !fs.existsSync(dossierDonnees)) {
        throw new Error("Le dossier de données est introuvable.");
    }

    fs.mkdirSync(dossierSauvegardes, { recursive: true });

    const horodatage = new Date()
        .toISOString()
        .replace(/[:.]/g, "-");

    const destination = path.join(
        dossierSauvegardes,
        `${horodatage}_${type}`
    );

    fs.cpSync(dossierDonnees, destination, {
        recursive: true
    });

    nettoyerAnciennesSauvegardes();

    return destination;
}

function obtenirSauvegardes() {
    if (!dossierSauvegardes || !fs.existsSync(dossierSauvegardes)) {
        return [];
    }

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

    if (!sauvegardes.length) {
        throw new Error("Aucune sauvegarde disponible.");
    }

    const derniere = sauvegardes[0];

    creerSauvegarde("avant-restauration");

    fs.rmSync(dossierDonnees, {
        recursive: true,
        force: true
    });

    fs.mkdirSync(dossierDonnees, { recursive: true });

    fs.cpSync(derniere.chemin, dossierDonnees, {
        recursive: true
    });

    return derniere;
}

function nettoyerAnciennesSauvegardes() {
    const sauvegardes = obtenirSauvegardes();

    sauvegardes.slice(12).forEach(sauvegarde => {
        fs.rmSync(sauvegarde.chemin, {
            recursive: true,
            force: true
        });
    });
}

function demarrerSauvegardesAutomatiques() {
    if (intervalle) {
        clearInterval(intervalle);
    }

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
