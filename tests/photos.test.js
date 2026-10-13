const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const dossierPhotos = fs.mkdtempSync(path.join(os.tmpdir(), "fbac-photos-"));
const photos = require("../backend/gestion/photos");
photos.definirDossierPhotos(dossierPhotos);

test("un format de photo invalide ne supprime pas la photo existante", () => {
    photos.enregistrerPhoto("personne_test", Buffer.from("photo-originale"), "photo.png", "image/png");
    assert.throws(() => photos.enregistrerPhoto("personne_test", { invalide: true }, "nouvelle.png", "image/png"), /Format de photo invalide/);
    assert.equal(photos.obtenirPhoto("personne_test").toString("utf8"), "photo-originale");
});

test("le remplacement d'une photo réussit et supprime l'ancien fichier", () => {
    photos.enregistrerPhoto("personne_test", Buffer.from("photo-originale"), "photo.png", "image/png");
    const resultat = photos.enregistrerPhoto("personne_test", Buffer.from("photo-remplacee"), "nouvelle.jpg", "image/jpeg");
    assert.equal(resultat.fileName, "personne_test.jpg");
    assert.equal(photos.obtenirPhoto("personne_test").toString("utf8"), "photo-remplacee");
    assert.deepEqual(fs.readdirSync(dossierPhotos), ["personne_test.jpg"]);
});

test("la suppression d'une photo retire bien le fichier stocké", () => {
    photos.enregistrerPhoto("personne_test", Buffer.from("photo"), "photo.png", "image/png");
    assert.equal(photos.supprimerPhoto("personne_test"), true);
    assert.equal(photos.obtenirPhoto("personne_test"), null);
});
