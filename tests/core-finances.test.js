const assert = require("node:assert/strict");
const test = require("node:test");

const {
    calculerSituationFinanciere
} = require("../backend/core/finances");

const configuration = {
    tarifs: {
        child1: 110,
        adult1: 155,
        adult4: 255
    }
};

test("calcule une inscription adulte sans remise", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            paiements: []
        },
        configuration
    );

    assert.equal(situation.tarif, 155);
    assert.equal(situation.montantAPayer, 155);
    assert.equal(situation.reste, 155);
    assert.equal(situation.etat, "impaye");
});

test("applique les aides sans dépasser le montant dû", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            aides: {
                kiosk: { enabled: true, amount: 50 },
                spot50: { enabled: true, amount: 50 }
            },
            paiements: []
        },
        configuration
    );

    assert.equal(situation.aides, 100);
    assert.equal(situation.montantAPayer, 55);
});

test("utilise les paiements détaillés comme source de vérité", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            montantPaye: 999,
            paiements: [
                { amount: 50, method: "Chèque" },
                { amount: 25, method: "Espèces" }
            ]
        },
        configuration
    );

    assert.equal(situation.montantPaye, 75);
    assert.equal(situation.reste, 80);
    assert.equal(situation.surpaiement, 0);
    assert.equal(situation.etat, "partiel");
});

test("conserve et signale un surpaiement", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            paiements: [
                { amount: 100, method: "Chèque" },
                { amount: 100, method: "Espèces" }
            ]
        },
        configuration
    );

    assert.equal(situation.montantPaye, 200);
    assert.equal(situation.reste, 0);
    assert.equal(situation.surpaiement, 45);
    assert.equal(situation.etat, "paye");
});

test("fige le montant de parrainage présent dans l'inscription", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            parrainageAcquis: 20,
            paiements: []
        },
        configuration
    );

    assert.equal(situation.remiseParrainage, 20);
    assert.equal(situation.montantAPayer, 135);
});


test("utilise les tarifs figes de la saison et ignore les nouveaux tarifs globaux", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            parametresFinanciers: {
                tarifs: { adult1: 155 },
                aides: { kiosk: 50 },
                reductionFamille: 20,
                parrainage: { montantParFilleul: 20 }
            },
            paiements: []
        },
        {
            tarifs: { adult1: 200 },
            aides: { kiosk: 100 }
        }
    );

    assert.equal(situation.tarif, 155);
    assert.equal(situation.montantAPayer, 155);
});

test("un VIP reste adherent mais ne genere aucune dette financiere", () => {
    const situation = calculerSituationFinanciere(
        {
            vip: true,
            category: "adulte",
            frequency: "4",
            paiements: []
        },
        {
            tarifs: { adult4: 255 }
        }
    );

    assert.equal(situation.tarif, 0);
    assert.equal(situation.montantAPayer, 0);
    assert.equal(situation.reste, 0);
    assert.equal(situation.surpaiement, 0);
    assert.equal(situation.etat, "gratuit");
});


test("calcule le tarif enfant 1 cours", () => {
    const situation = calculerSituationFinanciere(
        { category: "enfant", frequency: "1", paiements: [] },
        configuration
    );
    assert.equal(situation.tarif, 110);
    assert.equal(situation.montantAPayer, 110);
});

test("calcule le tarif adulte 4 cours", () => {
    const situation = calculerSituationFinanciere(
        { category: "adulte", frequency: "4", paiements: [] },
        configuration
    );
    assert.equal(situation.tarif, 255);
    assert.equal(situation.montantAPayer, 255);
});

test("cumule famille, parrainage et aides dans le bon ordre", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            reductionFamille: 20,
            parrainageAcquis: 20,
            aides: {
                kiosk: { enabled: true, amount: 50 }
            },
            paiements: []
        },
        configuration
    );
    assert.equal(situation.remiseFamille, 20);
    assert.equal(situation.remiseParrainage, 20);
    assert.equal(situation.aides, 50);
    assert.equal(situation.montantAPayer, 65);
});

test("signale un paiement partiel", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            paiements: [{ amount: 100, method: "Chèque" }]
        },
        configuration
    );
    assert.equal(situation.montantAPayer, 155);
    assert.equal(situation.montantPaye, 100);
    assert.equal(situation.reste, 55);
    assert.equal(situation.etat, "partiel");
});

test("une aide supérieure au reste ne crée jamais de montant négatif", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            aides: {
                kiosk: { enabled: true, amount: 200 },
                spot50: { enabled: true, amount: 200 }
            },
            paiements: []
        },
        configuration
    );
    assert.equal(situation.aides, 155);
    assert.equal(situation.montantAPayer, 0);
    assert.equal(situation.reste, 0);
});


test("calcule une inscription avec tarif personnalise", () => {
    const situation = calculerSituationFinanciere(
        { category: "adulte", frequency: "1", tarif: 180, paiements: [] },
        configuration
    );
    assert.equal(situation.tarif, 180);
    assert.equal(situation.montantAPayer, 180);
});

test("ignore un tarif personnalise negatif", () => {
    const situation = calculerSituationFinanciere(
        { category: "adulte", frequency: "1", tarif: -20, paiements: [] },
        configuration
    );
    assert.equal(situation.tarif, 0);
    assert.equal(situation.montantAPayer, 0);
});

test("une remise famille ne peut pas dépasser le tarif", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            reductionFamille: 300,
            paiements: []
        },
        configuration
    );
    assert.equal(situation.remiseFamille, 155);
    assert.equal(situation.montantAPayer, 0);
});

test("un parrainage ne peut pas dépasser le montant restant après remise famille", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            reductionFamille: 140,
            parrainageAcquis: 50,
            paiements: []
        },
        configuration
    );
    assert.equal(situation.remiseFamille, 140);
    assert.equal(situation.remiseParrainage, 15);
    assert.equal(situation.montantAPayer, 0);
});

test("une aide désactivée ne réduit pas le montant à payer", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            aides: {
                kiosk: { enabled: false, amount: 50 }
            },
            paiements: []
        },
        configuration
    );
    assert.equal(situation.aides, 0);
    assert.equal(situation.montantAPayer, 155);
});

test("une aide négative est ramenée à zéro", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            aides: {
                kiosk: { enabled: true, amount: -50 }
            },
            paiements: []
        },
        configuration
    );
    assert.equal(situation.aides, 0);
    assert.equal(situation.montantAPayer, 155);
});

test("les aides sont consommées dans leur ordre de priorité", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            aides: {
                atoutNormandie: { enabled: true, amount: 100 },
                passSport: { enabled: true, amount: 100 },
                kiosk: { enabled: true, amount: 50 }
            },
            paiements: []
        },
        configuration
    );
    assert.equal(situation.aidesEffectives.atoutNormandie, 100);
    assert.equal(situation.aidesEffectives.passSport, 55);
    assert.equal(situation.aidesEffectives.kiosk, 0);
    assert.equal(situation.aides, 155);
});

test("reconnaît l'ancien nom de l'aide Atout", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            aides: {
                atout: { enabled: true, amount: 50 }
            },
            paiements: []
        },
        configuration
    );
    assert.equal(situation.aidesEffectives.atoutNormandie, 50);
    assert.equal(situation.aides, 50);
});

test("ignore les paiements négatifs et nuls", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            paiements: [
                { amount: -50, method: "Espèces" },
                { amount: 0, method: "Chèque" },
                { amount: 25, method: "Espèces" }
            ]
        },
        configuration
    );
    assert.equal(situation.montantPaye, 25);
    assert.equal(situation.reste, 130);
});

test("ignore les paiements mal formés", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            paiements: [
                null,
                "100",
                { amount: "abc", method: "Espèces" },
                { amount: 40, method: "Chèque" }
            ]
        },
        configuration
    );
    assert.equal(situation.montantPaye, 40);
});

test("utilise le montant payé historique si aucun paiement détaillé n'existe", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            montantPaye: 50,
            paymentMethod: "Espèces"
        },
        configuration
    );
    assert.equal(situation.montantPaye, 50);
    assert.equal(situation.reste, 105);
});

test("les paiements détaillés remplacent le montant payé historique", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            montantPaye: 150,
            paiements: [{ amount: 20, method: "Espèces" }]
        },
        configuration
    );
    assert.equal(situation.montantPaye, 20);
    assert.equal(situation.reste, 135);
});

test("une inscription sans catégorie valide ne génère pas de tarif", () => {
    const situation = calculerSituationFinanciere(
        { category: "inconnu", frequency: "1", paiements: [] },
        configuration
    );
    assert.equal(situation.tarif, 0);
    assert.equal(situation.montantAPayer, 0);
    assert.equal(situation.etat, "paye");
});

test("une inscription enfant avec quatre cours ne génère pas le tarif adulte", () => {
    const situation = calculerSituationFinanciere(
        { category: "enfant", frequency: "4", paiements: [] },
        configuration
    );
    assert.equal(situation.tarif, 0);
    assert.equal(situation.montantAPayer, 0);
});

test("un paiement exact met l'inscription à jour comme payée", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            paiements: [{ amount: 155, method: "Virement" }]
        },
        configuration
    );
    assert.equal(situation.reste, 0);
    assert.equal(situation.surpaiement, 0);
    assert.equal(situation.etat, "paye");
});

test("plusieurs paiements sont correctement cumulés", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            paiements: [
                { amount: 50, method: "Chèque" },
                { amount: 50, method: "Espèces" },
                { amount: 55, method: "Virement" }
            ]
        },
        configuration
    );
    assert.equal(situation.montantPaye, 155);
    assert.equal(situation.reste, 0);
    assert.equal(situation.etat, "paye");
});

test("une inscription VIP reste gratuite même avec un paiement historique", () => {
    const situation = calculerSituationFinanciere(
        {
            vip: true,
            category: "adulte",
            frequency: "1",
            paiements: [{ amount: 100, method: "Chèque" }]
        },
        configuration
    );
    assert.equal(situation.montantPaye, 100);
    assert.equal(situation.montantAPayer, 0);
    assert.equal(situation.reste, 0);
    assert.equal(situation.surpaiement, 0);
    assert.equal(situation.etat, "gratuit");
});

test("les paramètres financiers de l'inscription remplacent les paramètres globaux", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            parametresFinanciers: {
                tarifs: { adult1: 175 },
                aides: { kiosk: 25 },
                reductionFamille: 10,
                parrainage: { montantParFilleul: 20 }
            },
            paiements: []
        },
        {
            tarifs: { adult1: 300 },
            aides: { kiosk: 100 }
        }
    );
    assert.equal(situation.tarif, 175);
    assert.equal(situation.montantAPayer, 175);
});

test("une aide ne peut pas annuler une remise déjà appliquée", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            reductionFamille: 100,
            aides: {
                kiosk: { enabled: true, amount: 100 }
            },
            paiements: []
        },
        configuration
    );
    assert.equal(situation.remiseFamille, 100);
    assert.equal(situation.aides, 55);
    assert.equal(situation.montantAPayer, 0);
});

test("le montant restant ne devient jamais négatif", () => {
    const situation = calculerSituationFinanciere(
        {
            category: "adulte",
            frequency: "1",
            paiements: [{ amount: 1000, method: "Virement" }]
        },
        configuration
    );
    assert.equal(situation.reste, 0);
    assert.ok(situation.surpaiement > 0);
});
