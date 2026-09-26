const fs = require("fs");
const path = require("path");

let dossierDonnees = null;

function definirDossierDonnees(chemin) {
    dossierDonnees = chemin;

    if (!fs.existsSync(dossierDonnees)) {
        fs.mkdirSync(dossierDonnees, { recursive: true });
    }
}

function initialiserFichiers(source, fichiers) {
    verifierInitialisation();

    for (const nomFichier of fichiers) {
        const sourceFichier = path.join(source, nomFichier);
        const destinationFichier = path.join(dossierDonnees, nomFichier);

        if (!fs.existsSync(destinationFichier)) {
            fs.copyFileSync(sourceFichier, destinationFichier);
        }
    }
}

function verifierInitialisation() {
    if (!dossierDonnees) {
        throw new Error("Le dossier de données n'a pas été initialisé.");
    }
}

function obtenirCheminDonnees(nomFichier) {
    verifierInitialisation();

    return path.join(dossierDonnees, nomFichier);
}

function lireJson(nomFichier) {
    const chemin = obtenirCheminDonnees(nomFichier);

    if (!fs.existsSync(chemin)) {
        throw new Error(`Fichier introuvable : ${nomFichier}`);
    }

    const contenu = fs.readFileSync(chemin, "utf8");

    if (!contenu.trim()) {
        return null;
    }

    return JSON.parse(contenu);
}

function ecrireJson(nomFichier, donnees) {
    const chemin = obtenirCheminDonnees(nomFichier);
    const contenu = JSON.stringify(donnees, null, 4);

    fs.writeFileSync(chemin, contenu, "utf8");
}

function creerDossier(dossier) {
    verifierInitialisation();

    const chemin = path.join(dossierDonnees, dossier);

    if (!fs.existsSync(chemin)) {
        fs.mkdirSync(chemin, { recursive: true });
    }

    return chemin;
}

module.exports = {
    definirDossierDonnees,
    initialiserFichiers,
    lireJson,
    ecrireJson,
    creerDossier
};