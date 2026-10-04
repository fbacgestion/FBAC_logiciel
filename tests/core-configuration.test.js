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
