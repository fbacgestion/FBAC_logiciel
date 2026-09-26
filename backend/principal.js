const {
    app,
    BrowserWindow,
    ipcMain
} = require("electron");

const path = require("path");
const fs = require("fs");

const {
    definirDossierDonnees,
    initialiserFichiers,
    lireJson,
    ecrireJson
} = require("./gestion/fichiers");

const {
    initialiserSaisonActuelle,
    obtenirSaisons,
    obtenirSaisonActuelle,
    obtenirSaison,
    creerSaison,
    definirSaisonActuelle
} = require("./gestion/saisons");

const {
    obtenirPersonnes,
    obtenirPersonne,
    creerPersonne,
    modifierPersonne,
    supprimerPersonne
} = require("./gestion/personnes");

const {
    obtenirInscriptions,
    obtenirInscription,
    obtenirInscriptionsSaison,
    obtenirInscriptionPersonneSaison,
    creerInscription,
    modifierInscription,
    supprimerInscription,
    supprimerInscriptionsPersonne
} = require("./gestion/inscriptions");

const {
    enregistrerCertificat,
    certificatExiste,
    lireCertificat,
    supprimerCertificat,
    obtenirInformationsCertificat
} = require("./gestion/certificats");

const {
    enregistrerPhoto,
    obtenirPhoto,
    obtenirInformationsPhoto,
    supprimerPhoto
} = require("./gestion/photos");

function initialiserDonnees() {
    const dossierDonnees =
        path.join(
            app.getPath("userData"),
            "donnees"
        );

    const dossierFichiers =
        path.join(
            app.getPath("userData"),
            "fichiers"
        );

    const dossierModele =
        path.join(
            __dirname,
            "donnees"
        );

    definirDossierDonnees(
        dossierDonnees
    );

    initialiserFichiers(
        dossierModele,
        [
            "configuration.json",
            "personnes.json",
            "inscriptions.json",
            "saisons.json"
        ]
    );

    fs.mkdirSync(
        path.join(
            dossierFichiers,
            "photos"
        ),
        {
            recursive: true
        }
    );

    fs.mkdirSync(
        path.join(
            dossierFichiers,
            "certificats"
        ),
        {
            recursive: true
        }
    );
}

function enregistrerHandlersIpc() {
    ipcMain.handle(
        "lire-configuration",
        () => {
            return lireJson(
                "configuration.json"
            );
        }
    );

    ipcMain.handle(
        "enregistrer-configuration",
        (_, configuration) => {
            const donnees =
                configuration &&
                typeof configuration === "object"
                    ? configuration
                    : {};

            ecrireJson(
                "configuration.json",
                donnees
            );

            return donnees;
        }
    );

    ipcMain.handle(
        "obtenir-personnes",
        () => {
            return obtenirPersonnes();
        }
    );

    ipcMain.handle(
        "obtenir-personne",
        (_, id) => {
            return obtenirPersonne(
                id
            );
        }
    );

    ipcMain.handle(
        "creer-personne",
        (_, donnees) => {
            return creerPersonne(
                donnees
            );
        }
    );

    ipcMain.handle(
        "modifier-personne",
        (_, id, donnees) => {
            return modifierPersonne(
                id,
                donnees
            );
        }
    );

    ipcMain.handle(
        "supprimer-personne",
        (_, id) => {
            const nombreInscriptions =
                supprimerInscriptionsPersonne(
                    id
                );

            const photoSupprimee =
                supprimerPhoto(
                    id
                );

            const personne =
                supprimerPersonne(
                    id
                );

            return {
                personne,
                nombreInscriptions,
                photoSupprimee
            };
        }
    );

    ipcMain.handle(
        "obtenir-inscriptions",
        () => {
            return obtenirInscriptions();
        }
    );

    ipcMain.handle(
        "obtenir-inscription",
        (_, id) => {
            return obtenirInscription(
                id
            );
        }
    );

    ipcMain.handle(
        "obtenir-inscriptions-saison",
        (_, idSaison) => {
            return obtenirInscriptionsSaison(
                idSaison
            );
        }
    );

    ipcMain.handle(
        "obtenir-inscription-personne-saison",
        (_, idPersonne, idSaison) => {
            return obtenirInscriptionPersonneSaison(
                idPersonne,
                idSaison
            );
        }
    );

    ipcMain.handle(
        "creer-inscription",
        (_, donnees) => {
            return creerInscription(
                donnees
            );
        }
    );

    ipcMain.handle(
        "modifier-inscription",
        (_, id, donnees) => {
            return modifierInscription(
                id,
                donnees
            );
        }
    );

    ipcMain.handle(
        "supprimer-inscription",
        (_, id) => {
            const inscription =
                obtenirInscription(
                    id
                );

            if (!inscription) {
                throw new Error(
                    "Inscription introuvable."
                );
            }

            supprimerCertificat(
                id
            );

            return supprimerInscription(
                id
            );
        }
    );

    ipcMain.handle(
        "obtenir-saisons",
        () => {
            return obtenirSaisons();
        }
    );

    ipcMain.handle(
        "obtenir-saison",
        (_, id) => {
            return obtenirSaison(
                id
            );
        }
    );

    ipcMain.handle(
        "obtenir-saison-actuelle",
        () => {
            return obtenirSaisonActuelle();
        }
    );

    ipcMain.handle(
        "creer-saison",
        (_, anneeDebut) => {
            return creerSaison(
                anneeDebut
            );
        }
    );

    ipcMain.handle(
        "definir-saison-actuelle",
        (_, idSaison) => {
            return definirSaisonActuelle(
                idSaison
            );
        }
    );

    ipcMain.handle(
        "enregistrer-certificat",
        (_, inscriptionId, fichier) => {
            return enregistrerCertificat(
                inscriptionId,
                fichier
            );
        }
    );

    ipcMain.handle(
        "certificat-existe",
        (_, inscriptionId) => {
            return certificatExiste(
                inscriptionId
            );
        }
    );

    ipcMain.handle(
        "lire-certificat",
        (_, inscriptionId) => {
            return lireCertificat(
                inscriptionId
            );
        }
    );

    ipcMain.handle(
        "supprimer-certificat",
        (_, inscriptionId) => {
            return supprimerCertificat(
                inscriptionId
            );
        }
    );

    ipcMain.handle(
        "obtenir-informations-certificat",
        (_, inscriptionId) => {
            return obtenirInformationsCertificat(
                inscriptionId
            );
        }
    );

    ipcMain.handle(
        "enregistrer-photo",
        (
            _,
            personneId,
            fichier,
            nomFichier,
            mimeType
        ) => {
            return enregistrerPhoto(
                personneId,
                fichier,
                nomFichier,
                mimeType
            );
        }
    );

    ipcMain.handle(
        "obtenir-photo",
        (_, personneId) => {
            return obtenirPhoto(
                personneId
            );
        }
    );

    ipcMain.handle(
        "obtenir-informations-photo",
        (_, personneId) => {
            return obtenirInformationsPhoto(
                personneId
            );
        }
    );

    ipcMain.handle(
        "supprimer-photo",
        (_, personneId) => {
            return supprimerPhoto(
                personneId
            );
        }
    );
}

function creerFenetre() {
    const fenetre =
        new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1100,
            minHeight: 700,
            backgroundColor: "#0b0b0b",
            webPreferences: {
                preload:
                    path.join(
                        __dirname,
                        "pont.js"
                    ),
                contextIsolation: true,
                nodeIntegration: false
            }
        });

    fenetre.loadFile(
        path.join(
            __dirname,
            "../frontend/index.html"
        )
    );
}

app.whenReady().then(() => {
    initialiserDonnees();

    initialiserSaisonActuelle();

    enregistrerHandlersIpc();

    creerFenetre();

    app.on(
        "activate",
        () => {
            if (
                BrowserWindow.getAllWindows()
                    .length === 0
            ) {
                creerFenetre();
            }
        }
    );
});

app.on(
    "window-all-closed",
    () => {
        if (
            process.platform !==
            "darwin"
        ) {
            app.quit();
        }
    }
);