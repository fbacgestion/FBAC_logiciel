const {
    app,
    BrowserWindow,
    ipcMain,
    dialog,
    Menu
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
    initialiserSaisonsSansChangement,
    obtenirSaisons,
    obtenirSaisonActuelle,
    obtenirSaison,
    creerSaison,
    definirSaisonActive,
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
    supprimerInscription
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

const {
    initialiserFamilles,
    obtenirFamilles,
    creerFamille,
    modifierFamille,
    supprimerFamille
} = require("./gestion/familles");

const {
    initialiserSauvegardes,
    creerSauvegarde,
    obtenirSauvegardes,
    restaurerDerniereSauvegarde,
    demarrerSauvegardesAutomatiques
} = require("./gestion/sauvegardes");


const {
    initialiser: initialiserComptabilite,
    obtenirOperations: obtenirOperationsComptables,
    obtenirOperation: obtenirOperationComptable,
    creerOperation: creerOperationComptable,
    modifierOperation: modifierOperationComptable,
    supprimerOperation: supprimerOperationComptable,
    obtenirParametres: obtenirParametresComptables,
    enregistrerParametres: enregistrerParametresComptables,
    synchroniserCotisations,
    obtenirSynthese: obtenirSyntheseComptable
} = require("./gestion/comptabilite");
const { initialiserFactures, obtenirFactures, obtenirFacture, creerFacture, modifierFacture, supprimerFacture, enregistrerPdf, obtenirCheminPdf, genererHtmlFacture, prochain, numero } = require("./gestion/factures");
const {
    lire: lireConfigurationCentrale,
    enregistrer: enregistrerConfigurationCentrale
} = require("./core/configuration");

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

    const dossierSauvegardes =
        path.join(
            app.getPath("userData"),
            "sauvegardes"
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
            "saisons.json",
            "familles.json",
            "comptabilite.json",
            "factures.json"
        ]
    );

    initialiserFamilles();
    initialiserComptabilite();
    initialiserFactures(dossierDonnees, path.join(dossierFichiers, "factures"));

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

    initialiserSauvegardes(
        dossierDonnees,
        dossierSauvegardes
    );

    try {
        creerSauvegarde("demarrage");
    } catch (error) {
        console.error("Erreur lors de la sauvegarde de démarrage :", error);
    }

    demarrerSauvegardesAutomatiques();
}

function enregistrerHandlersIpc() {
    ipcMain.handle(
        "lire-configuration",
        () => {
            return lireConfigurationCentrale();
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

            return enregistrerConfigurationCentrale(donnees);
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
            const personne =
                obtenirPersonne(
                    id
                );

            if (!personne) {
                throw new Error(
                    "Personne introuvable."
                );
            }

            const inscriptions =
                obtenirInscriptions().filter(
                    inscription =>
                        inscription.personId ===
                        id
                );

            if (inscriptions.length > 0) {
                throw new Error(
                    "Cette personne possède encore des inscriptions. Supprimez uniquement les inscriptions nécessaires afin de conserver l'historique."
                );
            }

            const personneArchivee =
                supprimerPersonne(
                    id
                );

            return {
                personne: personneArchivee,
                nombreInscriptions: 0,
                archivee: true,
                photoSupprimee: false
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

    ipcMain.handle("obtenir-factures", () => obtenirFactures());
    ipcMain.handle("obtenir-facture", (_, id) => obtenirFacture(id));
    ipcMain.handle("apercu-facture", (_, donnees) => {
        const configuration = lireJson("configuration.json") || {};
        return genererHtmlFacture(construireApercuFacture(donnees, configuration));
    });
    ipcMain.handle("creer-facture", async (_, donnees) => {
        const configuration = lireJson("configuration.json") || {};
        const facture = creerFacture(donnees, configuration);
        await genererPdfFacture(facture);
        incrementerNumerotationFacture(configuration);
        return facture;
    });
    ipcMain.handle("modifier-facture", async (_, id, donnees) => {
        const configuration = lireJson("configuration.json") || {};
        const facture = modifierFacture(id, donnees, configuration);
        await genererPdfFacture(facture);
        return facture;
    });
    ipcMain.handle("supprimer-facture", (_, id) => supprimerFacture(id));

    ipcMain.handle("enregistrer-facture-sous", async (_, id) => {
        const facture = obtenirFacture(id);
        const chemin = obtenirCheminPdf(facture);
        if (!chemin || !fs.existsSync(chemin)) throw new Error("Fichier PDF introuvable.");
        const resultat = await dialog.showSaveDialog({
            title: "Enregistrer la facture",
            defaultPath: path.join(app.getPath("documents"), facture.pdfNom),
            filters: [{ name: "Document PDF", extensions: ["pdf"] }]
        });
        if (resultat.canceled || !resultat.filePath) return false;
        fs.copyFileSync(chemin, resultat.filePath);
        return resultat.filePath;
    });

    ipcMain.handle("imprimer-facture", async (_, id) => {
        const facture = obtenirFacture(id);
        const chemin = obtenirCheminPdf(facture);
        if (!chemin || !fs.existsSync(chemin)) throw new Error("Fichier PDF introuvable.");
        const fenetre = new BrowserWindow({
            show: false,
            width: 900,
            height: 1280,
            webPreferences: { contextIsolation: true, nodeIntegration: false }
        });
        return new Promise(resolve => {
            const terminer = resultat => {
                if (!fenetre.isDestroyed()) fenetre.close();
                resolve(resultat);
            };
            fenetre.webContents.once("did-finish-load", () => {
                fenetre.webContents.print({ silent: false, printBackground: true }, terminer);
            });
            fenetre.webContents.once("did-fail-load", () => terminer(false));
            fenetre.loadFile(chemin);
        });
    });

    ipcMain.handle(
        "obtenir-comptabilite",
        (_, saisonId) => {
            const configuration = lireJson("configuration.json") || {};
            synchroniserCotisations(
                obtenirInscriptions(),
                obtenirPersonnes(),
                obtenirSaisons(),
                configuration
            );
            return obtenirOperationsComptables(saisonId ? { saisonId } : {});
        }
    );

    ipcMain.handle(
        "obtenir-synthese-comptable",
        (_, saisonId) => {
            synchroniserCotisations(
                obtenirInscriptions(),
                obtenirPersonnes(),
                obtenirSaisons(),
                lireJson("configuration.json") || {}
            );
            return obtenirSyntheseComptable(saisonId, lireJson("configuration.json") || {});
        }
    );

    ipcMain.handle(
        "generer-rapport-financier",
        async (_, saisonId) => {
            const configuration = lireJson("configuration.json") || {};
            synchroniserCotisations(
                obtenirInscriptions(),
                obtenirPersonnes(),
                obtenirSaisons(),
                configuration
            );
            const synthese = obtenirSyntheseComptable(saisonId, configuration);
            const saison = obtenirSaison(saisonId);
            const resultat = await dialog.showSaveDialog({
                title: "Enregistrer le rapport financier",
                defaultPath: path.join(app.getPath("documents"), "FBAC-Rapport-financier-" + (saison?.nom || saisonId || "saison") + ".pdf"),
                filters: [{ name: "Document PDF", extensions: ["pdf"] }]
            });
            if (resultat.canceled || !resultat.filePath) return false;
            const html = creerHtmlRapportFinancier(synthese, saison);
            const fenetre = new BrowserWindow({
                show: false,
                width: 1200,
                height: 1600,
                webPreferences: { contextIsolation: true, nodeIntegration: false }
            });
            try {
                await fenetre.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
                const pdf = await fenetre.webContents.printToPDF({
                    printBackground: true,
                    pageSize: "A4",
                    margins: { marginType: "default" }
                });
                fs.writeFileSync(resultat.filePath, pdf);
                return resultat.filePath;
            } finally {
                if (!fenetre.isDestroyed()) fenetre.close();
            }
        }
    );

    ipcMain.handle(
        "creer-operation-comptable",
        (_, donnees) => creerOperationComptable(donnees)
    );

    ipcMain.handle(
        "modifier-operation-comptable",
        (_, id, donnees) => modifierOperationComptable(id, donnees)
    );

    ipcMain.handle(
        "supprimer-operation-comptable",
        (_, id) => supprimerOperationComptable(id)
    );

    ipcMain.handle(
        "obtenir-parametres-comptables",
        (_, saisonId) => obtenirParametresComptables(saisonId, lireJson("configuration.json") || {})
    );

    ipcMain.handle(
        "enregistrer-parametres-comptables",
        (_, saisonId, donnees) => enregistrerParametresComptables(saisonId, donnees)
    );

    ipcMain.handle(
        "obtenir-categories-comptables",
        () => ({
            recettes: require("./gestion/comptabilite").CATEGORIES_RECETTES,
            depenses: require("./gestion/comptabilite").CATEGORIES_DEPENSES
        })
    );

    ipcMain.handle(
        "obtenir-familles",
        () => {
            return obtenirFamilles();
        }
    );

    ipcMain.handle(
        "creer-famille",
        (_, donnees) => {
            return creerFamille(donnees);
        }
    );

    ipcMain.handle(
        "modifier-famille",
        (_, id, donnees) => {
            return modifierFamille(id, donnees);
        }
    );

    ipcMain.handle(
        "supprimer-famille",
        (_, id) => supprimerFamille(id)
    );

    ipcMain.handle(
        "obtenir-saisons",
        () => {
            return obtenirSaisons();
        }
    );

    ipcMain.handle(
        "creer-sauvegarde-donnees",
        () => {
            const chemin = creerSauvegarde("manuelle");
            return {
                nom: path.basename(chemin)
            };
        }
    );

    ipcMain.handle(
        "obtenir-sauvegardes",
        () => {
            return obtenirSauvegardes().map(sauvegarde => sauvegarde.nom);
        }
    );

    ipcMain.handle(
        "restaurer-derniere-sauvegarde",
        () => {
            return restaurerDerniereSauvegarde();
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
            return creerSaison(anneeDebut);
        }
    );

    ipcMain.handle(
        "definir-saison-actuelle",
        (_, idSaison) => {
            return definirSaisonActive(idSaison);
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
        "imprimer-certificat",
        async (_, inscriptionId) => {
            const informations =
                obtenirInformationsCertificat(
                    inscriptionId
                );

            if (
                !informations ||
                !informations.chemin ||
                !fs.existsSync(informations.chemin)
            ) {
                return false;
            }

            const fenetreImpression =
                new BrowserWindow({
                    show: false,
                    width: 900,
                    height: 1200,
                    webPreferences: {
                        contextIsolation: true,
                        nodeIntegration: false
                    }
                });

            return new Promise(resolve => {
                let termine = false;

                const terminer =
                    resultat => {
                        if (termine) {
                            return;
                        }

                        termine = true;

                        if (
                            !fenetreImpression.isDestroyed()
                        ) {
                            fenetreImpression.close();
                        }

                        resolve(resultat);
                    };

                fenetreImpression.webContents.once(
                    "did-fail-load",
                    () => {
                        terminer(false);
                    }
                );

                fenetreImpression.webContents.once(
                    "did-finish-load",
                    () => {
                        setTimeout(
                            () => {
                                if (
                                    fenetreImpression.isDestroyed()
                                ) {
                                    terminer(false);
                                    return;
                                }

                                fenetreImpression.webContents.print(
                                    {
                                        silent: false,
                                        printBackground: true
                                    },
                                    success => {
                                        terminer(
                                            success
                                        );
                                    }
                                );
                            },
                            500
                        );
                    }
                );

                fenetreImpression.loadFile(
                    informations.chemin
                );
            });
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

function construireApercuFacture(donnees, configuration) {
    const facturation = configuration.facturation || {};
    const association = facturation.association || {};
    const saison = obtenirSaison(donnees.saisonId);
    return {
        ...donnees,
        id: "apercu",
        numero: numero(configuration, donnees.date || new Date().toISOString().slice(0, 10), prochain(configuration)),
        saisonNom: donnees.saisonNom || saison?.nom || "",
        association: {
            nom: association.nom || "FBAC - Full Boxe Américaine Club",
            adresse: association.adresse || "24 le Haut du Bingard",
            codePostal: association.codePostal || "50490",
            ville: association.ville || "Muneville-le-Bingard",
            siret: association.siret || "",
            email: association.email || "",
            telephone: association.telephone || "",
            site: association.site || ""
        },
        lignes: donnees.lignes || [],
        total: (donnees.lignes || []).reduce((s, l) => s + Math.max(0, (Number(l.quantite) || 0) * (Number(l.prixUnitaire) || 0) - (Number(l.remise) || 0)), 0),
        remiseTotale: (donnees.lignes || []).reduce((s, l) => s + Math.max(0, Number(l.remise) || 0), 0),
        mentionTva: facturation.mentionTva || "TVA non applicable (article 293 B du CGI)",
        mentions: facturation.mentions || ""
    };
}

async function genererPdfFacture(facture) {
    const fenetre = new BrowserWindow({
        show: false,
        width: 900,
        height: 1280,
        webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    try {
        await fenetre.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(genererHtmlFacture(facture)));
        const pdf = await fenetre.webContents.printToPDF({
            printBackground: true,
            pageSize: "A4",
            margins: { marginType: "none" }
        });
        enregistrerPdf(facture, pdf);
    } finally {
        if (!fenetre.isDestroyed()) fenetre.close();
    }
}

function incrementerNumerotationFacture(configuration) {
    configuration.facturation = configuration.facturation || {};
    configuration.facturation.numerotation = configuration.facturation.numerotation || {};
    configuration.facturation.numerotation.prochainNumero = (Number(configuration.facturation.numerotation.prochainNumero) || 1) + 1;
    ecrireJson("configuration.json", configuration);
}

function echapperRapport(valeur) {
    return String(valeur ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[caractere]));
}

function creerHtmlRapportFinancier(synthese, saison) {
    const euro = valeur => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(valeur) || 0);
    const mois = Object.entries(synthese?.mois || {}).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
    const maximum = Math.max(1, ...mois.flatMap(([, valeur]) => [valeur.recettes || 0, valeur.depenses || 0]));
    const graphique = mois.map(([id, valeur]) => {
        const recettes = Number(valeur.recettes) || 0;
        const depenses = Number(valeur.depenses) || 0;
        return '<div class="month"><div class="bars"><i class="income" style="height:' + Math.max(4, recettes / maximum * 100) + '%"></i><i class="expense" style="height:' + Math.max(4, depenses / maximum * 100) + '%"></i></div><small>' + echapperRapport(id.slice(5)) + '</small></div>';
    }).join("");
    const recettes = Number(synthese?.totalRecettes) || 0;
    const depenses = Number(synthese?.totalDepenses) || 0;
    const operations = (synthese?.operations || []).map(operation => '<tr><td>' + echapperRapport(operation.date) + '</td><td>' + echapperRapport(operation.libelle) + '</td><td>' + echapperRapport(operation.categorie) + '</td><td>' + echapperRapport(operation.modePaiement || "—") + '</td><td class="' + (operation.type === "recette" ? "positive" : "negative") + '">' + (operation.type === "depense" ? "−" : "+") + euro(operation.montant) + '</td></tr>').join("");
    const categories = Object.entries(synthese?.categories || {}).sort((a, b) => b[1] - a[1]).map(([categorie, montant]) => { const part = recettes > 0 ? Number(montant) / recettes * 100 : 0; return '<tr><td>' + echapperRapport(categorie) + '</td><td class="right">' + euro(montant) + '</td><td class="right">' + part.toFixed(1) + ' %</td></tr>'; }).join("");
    const resultat = Number(synthese?.resultat) || recettes - depenses;
    const tresorerie = (Number(synthese?.compteBancaire) || 0) + (Number(synthese?.caisse) || 0);
    const nonAffectees = Array.isArray(synthese?.operationsNonAffectees) ? synthese.operationsNonAffectees.length : 0;
    const alertes = [];
    if (resultat < 0) alertes.push("Le résultat de la saison est déficitaire.");
    if (nonAffectees > 0) alertes.push(nonAffectees + " opération(s) ne permettent pas d’identifier clairement le compte de trésorerie.");
    if (!alertes.length) alertes.push("Aucun point financier critique détecté dans les données comptables.");
    const resumeCategories = Object.entries(synthese?.categories || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([categorie, montant]) => '<div class="mini-row"><span>' + echapperRapport(categorie) + '</span><strong>' + euro(montant) + '</strong></div>').join("");
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;color:#20242b;margin:0;padding:34px;font-size:11px}h1{font-size:26px;margin:0 0 4px;color:#111}h2{font-size:15px;margin:24px 0 10px;border-bottom:2px solid #e30613;padding-bottom:6px}.head{display:flex;justify-content:space-between;border-bottom:3px solid #e30613;padding-bottom:18px}.brand{font-size:12px;color:#e30613;font-weight:700}.muted{color:#68707d}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:18px 0}.kpi{border:1px solid #e0e3e8;border-radius:8px;padding:12px}.kpi span{display:block;color:#68707d;font-size:10px}.kpi strong{display:block;font-size:17px;margin-top:5px}.kpi.accent{border-top:3px solid #e30613}.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0 18px}.summary-card{background:#f7f8fa;border:1px solid #e3e6ea;border-radius:7px;padding:9px}.summary-card span{display:block;color:#68707d;font-size:9px}.summary-card strong{display:block;font-size:13px;margin-top:3px}.report-two-columns{display:grid;grid-template-columns:1fr 1fr;gap:18px}.mini-row{display:flex;justify-content:space-between;border-bottom:1px solid #e7e9ed;padding:6px}.attention{border-left:4px solid #e30613;background:#f7f8fa;padding:8px;margin:5px 0}.muted{color:#68707d}.positive{color:#16844d}.negative{color:#c0392b}.chart{height:190px;display:flex;align-items:flex-end;gap:9px;border-bottom:1px solid #dfe3e8;padding:10px}.month{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px}.bars{height:100%;width:100%;display:flex;align-items:flex-end;justify-content:center;gap:2px}.bars i{display:block;width:8px;border-radius:4px 4px 0 0}.income{background:#e30613}.expense{background:#606875}.legend{margin:7px 0;color:#68707d}.legend b{color:#e30613}.legend i{display:inline-block;width:7px;height:7px;background:#606875;border-radius:50%;margin-left:12px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:7px 6px;border-bottom:1px solid #e7e9ed}th{font-size:10px;color:#68707d;text-transform:uppercase}.right{text-align:right}.footer{margin-top:28px;color:#68707d;font-size:9px;text-align:center}
</style></head><body>
<div class="head"><div><div class="brand">FBAC — FULL BOXE AMÉRICAINE CLUB</div><h1>Rapport financier</h1><div class="muted">Saison ${echapperRapport(saison?.nom || synthese?.saisonId || "")}</div></div><div class="muted">Généré le ${new Date().toLocaleDateString("fr-FR")}</div></div>
<div class="kpis"><div class="kpi accent"><span>RECETTES</span><strong>${euro(recettes)}</strong></div><div class="kpi"><span>DÉPENSES</span><strong>${euro(depenses)}</strong></div><div class="kpi"><span>RÉSULTAT</span><strong class="${resultat >= 0 ? "positive" : "negative"}">${euro(resultat)}</strong></div><div class="kpi"><span>TRÉSORERIE</span><strong>${euro(tresorerie)}</strong></div></div>
<div class="summary-grid"><div class="summary-card"><span>Solde bancaire</span><strong>${euro(synthese?.compteBancaire)}</strong></div><div class="summary-card"><span>Caisse</span><strong>${euro(synthese?.caisse)}</strong></div><div class="summary-card"><span>Opérations</span><strong>${(synthese?.operations || []).length}</strong></div><div class="summary-card"><span>Opérations non affectées</span><strong>${nonAffectees}</strong></div></div>
<h2>Évolution mensuelle</h2><div class="chart">${graphique}</div><div class="legend"><b>■ Recettes</b><i></i> Dépenses</div>
<h2>Ventilation des cotisations</h2><table><tr><th>Élément</th><th class="right">Montant</th></tr><tr><td>Licences encaissées</td><td class="right">${euro(synthese?.licenceEncaissee)}</td></tr><tr><td>Part club</td><td class="right">${euro(synthese?.clubEncaisse)}</td></tr><tr><td>Licence paramétrée pour la saison</td><td class="right">${euro(synthese?.licenceParametree)}</td></tr></table>
<h2>Répartition par catégorie</h2><table><tr><th>Catégorie</th><th class="right">Montant</th><th class="right">Part des recettes</th></tr>${categories || '<tr><td colspan="3">Aucune opération</td></tr>'}</table>
<div class="report-two-columns"><div><h2>Principales catégories</h2><div class="mini-list">${resumeCategories || '<div class="muted">Aucune opération</div>'}</div></div><div><h2>Points de contrôle</h2>${alertes.map(alerte => '<div class="attention">' + echapperRapport(alerte) + '</div>').join("")}</div></div>
<h2>Journal des opérations</h2><table><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Mode</th><th class="right">Montant</th></tr>${operations || '<tr><td colspan="5">Aucune opération</td></tr>'}</table>
<div class="footer">FBAC Gestion — Rapport généré automatiquement à partir des données comptables de la saison.</div>
</body></html>`;
}

let menuApplication = null;
let menuVisible = false;

function initialiserMenuApplication() {
    if (menuApplication) return;
    menuApplication = Menu.getApplicationMenu();
    menuVisible = Boolean(menuApplication);
    if (menuApplication) {
        Menu.setApplicationMenu(null);
        menuVisible = false;
    }
}

function basculerMenuApplication() {
    if (!menuApplication) return;
    menuVisible = !menuVisible;
    Menu.setApplicationMenu(menuVisible ? menuApplication : null);
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

    fenetre.webContents.on("before-input-event", (_, input) => {
        if (input.type === "keyDown" && input.key === "F10") {
            basculerMenuApplication();
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

    initialiserSaisonsSansChangement();

    enregistrerHandlersIpc();
    initialiserMenuApplication();

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