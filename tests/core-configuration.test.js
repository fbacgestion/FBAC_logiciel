const assert = require("node:assert/strict");
const test = require("node:test");

const {
    normaliser,
    extraireParametresFinanciers,
    obtenirParametresSaison,
    figerParametresSaison
} = require("../backend/core/configuration");

test("fige les parametres financiers sans ecraser une saison existante", () => {
    const configuration = normaliser({
        tarifs: { child1: 110, adult1: 200, adult4: 300 },
        aides: { kiosk: 50 },
        comptabilite: { licenceFederale: 42 },
        parametresSaisons: {
            saison_2025_2026: {
                tarifs: { child1: 100, adult1: 150, adult4: 250 },
                aides: { kiosk: 40 },
                reductionFamille: 15,
                parrainage: { montantParFilleul: 15, plafond: 3 },
                licenceFederale: 39
            }
        }
    });

    const resultat = figerParametresSaison("saison_2025_2026", configuration);

    assert.equal(resultat.parametresSaisons.saison_2025_2026.tarifs.adult1, 150);
    assert.equal(resultat.parametresSaisons.saison_2025_2026.licenceFederale, 39);
});

test("recupere les parametres d une saison avant les parametres globaux", () => {
    const configuration = normaliser({
        tarifs: { adult1: 200 },
        comptabilite: { licenceFederale: 42 },
        parametresSaisons: {
            saison_2026_2027: {
                tarifs: { adult1: 155 },
                aides: { kiosk: 50 },
                reductionFamille: 20,
                parrainage: { montantParFilleul: 20, plafond: 3 },
                licenceFederale: 39
            }
        }
    });

    const saison = obtenirParametresSaison("saison_2026_2027", configuration);

    assert.equal(saison.tarifs.adult1, 155);
    assert.equal(saison.licenceFederale, 39);
    assert.equal(extraireParametresFinanciers(configuration).tarifs.adult1, 200);
});


test("applique les tarifs financiers par défaut", () => {
    const configuration = normaliser({});
    assert.equal(configuration.tarifs.child1, 110);
    assert.equal(configuration.tarifs.adult1, 155);
    assert.equal(configuration.tarifs.adult4, 255);
});

test("applique les paramètres financiers par défaut", () => {
    const configuration = normaliser({});
    assert.equal(configuration.reductionFamille, 20);
    assert.equal(configuration.parrainage.montantParFilleul, 20);
    assert.equal(configuration.parrainage.plafond, 3);
    assert.equal(configuration.comptabilite.licenceFederale, 39);
});

test("normalise les anciens noms de paramètres", () => {
    const configuration = normaliser({
        tarifs: {
            enfant1Cours: 120,
            adulte1Cours: 160,
            adulte4Cours: 260
        },
        aides: {
            atoutNormandie: 60
        },
        familyDiscount: 25,
        parrainage: {
            montant: 25
        }
    });

    assert.equal(configuration.tarifs.child1, 120);
    assert.equal(configuration.tarifs.adult1, 160);
    assert.equal(configuration.tarifs.adult4, 260);
    assert.equal(configuration.aides.atout, 60);
    assert.equal(configuration.reductionFamille, 25);
    assert.equal(configuration.parrainage.montantParFilleul, 25);
});

test("conserve les paramètres de saison inconnus sans les supprimer", () => {
    const configuration = normaliser({
        parametresSaisons: {
            saison_test: {
                tarifs: { adult1: 150 },
                informationHistorique: "conservee"
            }
        }
    });

    assert.equal(configuration.parametresSaisons.saison_test.informationHistorique, "conservee");
});

test("retombe sur les paramètres globaux pour une saison inconnue", () => {
    const configuration = normaliser({
        tarifs: { adult1: 180 },
        comptabilite: { licenceFederale: 41 }
    });

    const saison = obtenirParametresSaison("saison_inconnue", configuration);

    assert.equal(saison.tarifs.adult1, 180);
    assert.equal(saison.licenceFederale, 41);
});

test("fusionne les paramètres partiels d'une saison avec les paramètres globaux", () => {
    const configuration = normaliser({
        tarifs: { adult1: 180, adult4: 280 },
        aides: { kiosk: 60 },
        parametresSaisons: {
            saison_test: {
                tarifs: { adult1: 155 },
                aides: { kiosk: 50 }
            }
        }
    });

    const saison = obtenirParametresSaison("saison_test", configuration);

    assert.equal(saison.tarifs.adult1, 155);
    assert.equal(saison.tarifs.adult4, 280);
    assert.equal(saison.aides.kiosk, 50);
});

test("forcer le gel remplace volontairement une saison existante", () => {
    const configuration = normaliser({
        tarifs: { adult1: 200 },
        parametresSaisons: {
            saison_test: {
                tarifs: { adult1: 155 }
            }
        }
    });

    const resultat = figerParametresSaison("saison_test", configuration, true);

    assert.equal(resultat.parametresSaisons.saison_test.tarifs.adult1, 200);
});

test("le gel sans identifiant de saison ne crée pas de snapshot", () => {
    const configuration = normaliser({
        tarifs: { adult1: 180 }
    });

    const resultat = figerParametresSaison("", configuration);

    assert.deepEqual(resultat.parametresSaisons, {});
});

test("une configuration non objet est normalisée proprement", () => {
    const configuration = normaliser(null);
    assert.equal(configuration.tarifs.adult1, 155);
    assert.equal(configuration.aides.kiosk, 50);
    assert.equal(configuration.comptabilite.licenceFederale, 39);
});
