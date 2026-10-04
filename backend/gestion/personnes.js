const {
    lireJson,
    ecrireJson
} = require("./fichiers");

const FICHIER_PERSONNES = "personnes.json";

function obtenirPersonnes(options = {}) {
    const personnes = lireJson(FICHIER_PERSONNES);

    if (!Array.isArray(personnes)) {
        return [];
    }

    if (options.inclureArchives) {
        return personnes;
    }

    return personnes.filter(personne => !personne.archivee);
}

function obtenirPersonnesToutes() {
    return obtenirPersonnes({ inclureArchives: true });
}

function obtenirPersonne(id) {
    const personnes = obtenirPersonnes();

    return personnes.find(
        personne => personne.id === id
    ) || null;
}

function creerPersonne(donnees) {
    if (!donnees || typeof donnees !== "object") {
        throw new Error(
            "Les données de la personne sont invalides."
        );
    }

    const personnes = obtenirPersonnesToutes();

    const personne = {
        id: donnees.id || genererId(),
        firstName: donnees.firstName || "",
        lastName: donnees.lastName || "",
        birthDate: donnees.birthDate || "",
        photo: donnees.photo || null
    };

    personnes.push(personne);

    ecrireJson(
        FICHIER_PERSONNES,
        personnes
    );

    return personne;
}

function modifierPersonne(id, donnees) {
    if (!donnees || typeof donnees !== "object") {
        throw new Error(
            "Les données de la personne sont invalides."
        );
    }

    const personnes = obtenirPersonnesToutes();

    const index = personnes.findIndex(
        personne => personne.id === id
    );

    if (index === -1) {
        throw new Error(
            "Personne introuvable."
        );
    }

    personnes[index] = {
        ...personnes[index],
        ...donnees,
        id
    };

    ecrireJson(
        FICHIER_PERSONNES,
        personnes
    );

    return personnes[index];
}

function supprimerPersonne(id) {
    const personnes = obtenirPersonnesToutes();

    const index = personnes.findIndex(
        personne => personne.id === id
    );

    if (index === -1) {
        throw new Error(
            "Personne introuvable."
        );
    }

    const personneArchivee = {
        ...personnes[index],
        archivee: true,
        archiveeLe: new Date().toISOString()
    };

    personnes[index] = personneArchivee;

    ecrireJson(
        FICHIER_PERSONNES,
        personnes
    );

    return personneArchivee;
}

function genererId() {
    return (
        "personne_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .substring(2, 9)
    );
}

module.exports = {
    obtenirPersonnes,
    obtenirPersonne,
    creerPersonne,
    modifierPersonne,
    supprimerPersonne,
    obtenirPersonnesToutes
};
