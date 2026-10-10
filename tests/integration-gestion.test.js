const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("fs");
const os = require("os");
const path = require("path");

const dossierTest = fs.mkdtempSync(path.join(os.tmpdir(), "fbac-gestion-"));
const dossierDonnees = path.join(dossierTest, "donnees");
const dossierSauvegardes = path.join(dossierTest, "sauvegardes");
fs.mkdirSync(dossierDonnees, { recursive: true });

const fichiers = require("../backend/gestion/fichiers");
fichiers.definirDossierDonnees(dossierDonnees);

const personnes = require("../backend/gestion/personnes");
const inscriptions = require("../backend/gestion/inscriptions");
const saisons = require("../backend/gestion/saisons");
const comptabilite = require("../backend/gestion/comptabilite");
const factures = require("../backend/gestion/factures");
const sauvegardes = require("../backend/gestion/sauvegardes");

function initialiserFichier(nom, donnees) {
    fichiers.ecrireJson(nom, donnees);
}

function initialiserBase() {
    initialiserFichier("personnes.json", []);
    initialiserFichier("inscriptions.json", []);
    initialiserFichier("saisons.json", []);
    initialiserFichier("configuration.json", {
        saisonActiveId: "saison_2026_2027",
        saisonActive: "2026-2027",
        tarifs: {
            child1: 110,
            adult1: 155,
            adult4: 255
        },
        aides: {
            atout: 50,
            passSport: 50,
            kiosk: 50,
            spot50: 50
        },
        reductionFamille: 20,
        parrainage: {
            montantParFilleul: 20,
            plafond: 60
        },
        licenceFederale: 39
    });
    initialiserFichier("comptabilite.json", {
        operations: [],
        parametres: {}
    });
    initialiserFichier("factures.json", []);
}

initialiserBase();

test("1. création d'un adhérent", () => {
    const personne = personnes.creerPersonne({
        firstName: "Test",
        lastName: "Adherent",
        birthDate: "1990-01-01"
    });

    assert.ok(personne.id);
    assert.equal(personne.firstName, "Test");
    assert.equal(personnes.obtenirPersonne(personne.id).lastName, "Adherent");
});

test("2. modification d'un adhérent", () => {
    const personne = personnes.obtenirPersonnes()[0];
    const modifiee = personnes.modifierPersonne(personne.id, {
        lastName: "Modifie"
    });

    assert.equal(modifiee.lastName, "Modifie");
    assert.equal(personnes.obtenirPersonne(personne.id).lastName, "Modifie");
});

test("3. création d'une inscription", () => {
    const personne = personnes.obtenirPersonnes()[0];
    const inscription = inscriptions.creerInscription({
        personId: personne.id,
        season: "saison_2026_2027",
        category: "adulte",
        frequency: "1",
        certificate: {
            date: "2026-09-01",
            expiry: "2027-09-01",
            fileName: "certificat.pdf"
        }
    });

    assert.ok(inscription.id);
    assert.equal(inscription.personId, personne.id);
    assert.equal(inscription.parametresFinanciers.licenceFederale, 39);
    assert.equal(inscription.certificate.fileName, "certificat.pdf");
});

test("4. modification d'une inscription", () => {
    const inscription = inscriptions.obtenirInscriptions()[0];
    const modifiee = inscriptions.modifierInscription(inscription.id, {
        frequency: "4",
        grade: "Jaune"
    });

    assert.equal(modifiee.frequency, "4");
    assert.equal(modifiee.grade, "Jaune");
});

test("5. paiement", () => {
    const inscription = inscriptions.obtenirInscriptions()[0];
    const modifiee = inscriptions.modifierInscription(inscription.id, {
        paiements: [{
            id: "paiement_test",
            date: "2026-10-01",
            amount: 100,
            method: "cheque"
        }]
    });

    assert.equal(modifiee.paiements.length, 1);
    assert.equal(modifiee.paidAmount, 100);
});

test("6. archivage", () => {
    const personne = personnes.obtenirPersonnes()[0];
    const archivee = personnes.supprimerPersonne(personne.id);

    assert.equal(archivee.archivee, true);
    assert.equal(personnes.obtenirPersonnes().some(p => p.id === personne.id), false);
    assert.equal(personnes.obtenirPersonne(personne.id).id, personne.id);
});

test("7. consultation d'un ancien adhérent et conservation de son inscription", () => {
    const personne = personnes.obtenirPersonnesToutes()[0];
    const inscription = inscriptions.obtenirInscriptionPersonneSaison(
        personne.id,
        "saison_2026_2027"
    );

    assert.ok(personne);
    assert.ok(inscription);
    assert.equal(inscription.personId, personne.id);
});

test("8. changement de saison et gel des paramètres", () => {
    const saison = saisons.creerSaison(2027);
    const configuration = require("../backend/core/configuration");
    const actuelle = configuration.lire();

    actuelle.tarifs.adult1 = 170;
    actuelle.comptabilite.licenceFederale = 42;
    configuration.enregistrer(actuelle);

    saisons.definirSaisonActive(saison.id);

    const apres = configuration.lire();
    assert.equal(apres.saisonActiveId, saison.id);
    assert.equal(apres.parametresSaisons[saison.id].tarifs.adult1, 170);
    assert.equal(apres.parametresSaisons[saison.id].licenceFederale, 42);
});

test("9. comptabilité : création, synthèse et trésorerie", () => {
    comptabilite.initialiser();
    comptabilite.enregistrerParametres("saison_2026_2027", {
        licence: 39,
        compteBancaire: 1000,
        caisse: 100
    });

    const recette = comptabilite.creerOperation({
        date: "2026-10-01",
        type: "recette",
        libelle: "Stage",
        categorie: "stages",
        montant: 200,
        modePaiement: "virement",
        saisonId: "saison_2026_2027"
    });

    const depense = comptabilite.creerOperation({
        date: "2026-10-02",
        type: "depense",
        libelle: "Matériel",
        categorie: "materiel",
        montant: 50,
        modePaiement: "carte",
        saisonId: "saison_2026_2027"
    });

    const synthese = comptabilite.obtenirSynthese("saison_2026_2027", {});
    assert.ok(recette.id);
    assert.ok(depense.id);
    assert.equal(synthese.totalRecettes, 200);
    assert.equal(synthese.totalDepenses, 50);
    assert.equal(synthese.resultat, 150);
    assert.equal(synthese.compteBancaire, 1150);
});

test("10. facturation : création, numéro, total et HTML", () => {
    const dossierFactures = path.join(dossierTest, "factures");
    factures.initialiserFactures(dossierDonnees, dossierFactures);

    const configuration = {
        facturation: {
            association: {
                nom: "FBAC - Full Boxe Américaine Club"
            },
            mentionTva: "TVA non applicable (article 293 B du CGI)"
        }
    };

    const facture = factures.creerFacture({
        numero: "FBAC-2026-012",
        date: "2026-10-03",
        saisonId: "saison_2026_2027",
        saisonNom: "2026-2027",
        client: {
            personneId: "personne_test",
            nom: "DUPONT",
            prenom: "Jean"
        },
        lignes: [{
            designation: "Forfait annuel",
            quantite: 1,
            prixUnitaire: 155
        }]
    }, configuration);

    assert.equal(facture.numero, "FBAC-2026-012");
    assert.equal(facture.pdfNom, "2026-DUPONT-JEAN-FBAC-2026-012.pdf");
    assert.match(factures.genererHtmlFacture(facture), /84536859600035/);
    assert.equal(facture.total, 155);
    assert.ok(facture.pdfNom.endsWith(".pdf"));
    assert.match(factures.genererHtmlFacture(facture), /155/);
});

test("11. certificat : données de certificat conservées avec l'inscription", () => {
    const personne = personnes.creerPersonne({
        firstName: "Certificat",
        lastName: "Test"
    });

    const inscription = inscriptions.creerInscription({
        personId: personne.id,
        season: "saison_2026_2027",
        certificate: {
            date: "2026-10-01",
            expiry: "2027-10-01",
            fileName: "certificat-medical.pdf",
            mimeType: "application/pdf",
            documentId: "doc_test"
        }
    });

    assert.equal(inscription.certificate.date, "2026-10-01");
    assert.equal(inscription.certificate.expiry, "2027-10-01");
    assert.equal(inscription.certificate.fileName, "certificat-medical.pdf");
    assert.equal(inscription.certificate.documentId, "doc_test");
});

test("12. sauvegarde et restauration", () => {
    sauvegardes.initialiserSauvegardes(
        dossierDonnees,
        dossierSauvegardes
    );

    initialiserFichier("test-restauration.json", {
        valeur: "avant"
    });

    const sauvegarde = sauvegardes.creerSauvegarde("test");
    assert.ok(fs.existsSync(sauvegarde));

    initialiserFichier("test-restauration.json", {
        valeur: "apres"
    });

    sauvegardes.restaurerDerniereSauvegarde();

    const restaure = fichiers.lireJson("test-restauration.json");
    assert.equal(restaure.valeur, "avant");
});
