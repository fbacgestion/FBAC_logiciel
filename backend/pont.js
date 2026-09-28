const {
    contextBridge,
    ipcRenderer
} = require("electron");

contextBridge.exposeInMainWorld(
    "fbac",
    {
        version: "1.1.0",
        obtenirComptabilite: () => {
            return ipcRenderer.invoke("obtenir-comptabilite");
        },

        obtenirSyntheseComptable: saisonId => {
            return ipcRenderer.invoke("obtenir-synthese-comptable", saisonId);
        },

        creerOperationComptable: donnees => {
            return ipcRenderer.invoke("creer-operation-comptable", donnees);
        },

        modifierOperationComptable: (id, donnees) => {
            return ipcRenderer.invoke("modifier-operation-comptable", id, donnees);
        },

        supprimerOperationComptable: id => {
            return ipcRenderer.invoke("supprimer-operation-comptable", id);
        },

        obtenirParametresComptables: saisonId => {
            return ipcRenderer.invoke("obtenir-parametres-comptables", saisonId);
        },

        enregistrerParametresComptables: (saisonId, donnees) => {
            return ipcRenderer.invoke("enregistrer-parametres-comptables", saisonId, donnees);
        },

        obtenirCategoriesComptables: () => {
            return ipcRenderer.invoke("obtenir-categories-comptables");
        },


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

        obtenirFamilles: () => {
            return ipcRenderer.invoke("obtenir-familles");
        },

        creerFamille: donnees => {
            return ipcRenderer.invoke("creer-famille", donnees);
        },

        modifierFamille: (id, donnees) => {
            return ipcRenderer.invoke("modifier-famille", id, donnees);
        },

        supprimerFamille: id => {
            return ipcRenderer.invoke("supprimer-famille", id);
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

        creerSauvegardeDonnees: () => {
            return ipcRenderer.invoke(
                "creer-sauvegarde-donnees"
            );
        },

        obtenirSauvegardes: () => {
            return ipcRenderer.invoke(
                "obtenir-sauvegardes"
            );
        },

        restaurerDerniereSauvegarde: () => {
            return ipcRenderer.invoke(
                "restaurer-derniere-sauvegarde"
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

        imprimerCertificat: (
            inscriptionId
        ) => {
            return ipcRenderer.invoke(
                "imprimer-certificat",
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