const {
    contextBridge,
    ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld(
    "fbac",
    {
        version: "1.0.0",

        lireConfiguration: () => {
            return ipcRenderer.invoke(
                "lire-configuration"
            );
        },

        enregistrerConfiguration: (
            configuration
        ) => {
            return ipcRenderer.invoke(
                "enregistrer-configuration",
                configuration
            );
        },

        obtenirPersonnes: () => {
            return ipcRenderer.invoke(
                "obtenir-personnes"
            );
        },

        obtenirPersonne: (
            id
        ) => {
            return ipcRenderer.invoke(
                "obtenir-personne",
                id
            );
        },

        creerPersonne: (
            donnees
        ) => {
            return ipcRenderer.invoke(
                "creer-personne",
                donnees
            );
        },

        modifierPersonne: (
            id,
            donnees
        ) => {
            return ipcRenderer.invoke(
                "modifier-personne",
                id,
                donnees
            );
        },

        supprimerPersonne: (
            id
        ) => {
            return ipcRenderer.invoke(
                "supprimer-personne",
                id
            );
        },

        obtenirInscriptions: () => {
            return ipcRenderer.invoke(
                "obtenir-inscriptions"
            );
        },

        obtenirInscription: (
            id
        ) => {
            return ipcRenderer.invoke(
                "obtenir-inscription",
                id
            );
        },

        obtenirInscriptionsSaison: (
            idSaison
        ) => {
            return ipcRenderer.invoke(
                "obtenir-inscriptions-saison",
                idSaison
            );
        },

        obtenirInscriptionPersonneSaison: (
            idPersonne,
            idSaison
        ) => {
            return ipcRenderer.invoke(
                "obtenir-inscription-personne-saison",
                idPersonne,
                idSaison
            );
        },

        creerInscription: (
            donnees
        ) => {
            return ipcRenderer.invoke(
                "creer-inscription",
                donnees
            );
        },

        modifierInscription: (
            id,
            donnees
        ) => {
            return ipcRenderer.invoke(
                "modifier-inscription",
                id,
                donnees
            );
        },

        supprimerInscription: (
            id
        ) => {
            return ipcRenderer.invoke(
                "supprimer-inscription",
                id
            );
        },

        obtenirSaisons: () => {
            return ipcRenderer.invoke(
                "obtenir-saisons"
            );
        },

        obtenirSaison: (
            id
        ) => {
            return ipcRenderer.invoke(
                "obtenir-saison",
                id
            );
        },

        obtenirSaisonActuelle: () => {
            return ipcRenderer.invoke(
                "obtenir-saison-actuelle"
            );
        },

        creerSaison: (
            anneeDebut
        ) => {
            return ipcRenderer.invoke(
                "creer-saison",
                anneeDebut
            );
        },

        definirSaisonActuelle: (
            idSaison
        ) => {
            return ipcRenderer.invoke(
                "definir-saison-actuelle",
                idSaison
            );
        },

        enregistrerCertificat: (
            inscriptionId,
            fichier
        ) => {
            return ipcRenderer.invoke(
                "enregistrer-certificat",
                inscriptionId,
                fichier
            );
        },

        certificatExiste: (
            inscriptionId
        ) => {
            return ipcRenderer.invoke(
                "certificat-existe",
                inscriptionId
            );
        },

        lireCertificat: (
            inscriptionId
        ) => {
            return ipcRenderer.invoke(
                "lire-certificat",
                inscriptionId
            );
        },

        supprimerCertificat: (
            inscriptionId
        ) => {
            return ipcRenderer.invoke(
                "supprimer-certificat",
                inscriptionId
            );
        },

        obtenirInformationsCertificat: (
            inscriptionId
        ) => {
            return ipcRenderer.invoke(
                "obtenir-informations-certificat",
                inscriptionId
            );
        },

        enregistrerPhoto: (
            personneId,
            fichier,
            nomFichier,
            mimeType
        ) => {
            return ipcRenderer.invoke(
                "enregistrer-photo",
                personneId,
                fichier,
                nomFichier,
                mimeType
            );
        },

        obtenirPhoto: (
            personneId
        ) => {
            return ipcRenderer.invoke(
                "obtenir-photo",
                personneId
            );
        },

        obtenirInformationsPhoto: (
            personneId
        ) => {
            return ipcRenderer.invoke(
                "obtenir-informations-photo",
                personneId
            );
        },

        supprimerPhoto: (
            personneId
        ) => {
            return ipcRenderer.invoke(
                "supprimer-photo",
                personneId
            );
        }
    }
);