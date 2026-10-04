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
