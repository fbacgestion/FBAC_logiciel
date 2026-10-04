function nombre(valeur, defaut = 0) {
    const resultat = Number(valeur);
    return Number.isFinite(resultat) ? resultat : defaut;
}

function obtenirTarif(inscription, configuration = {}) {
    if (inscription?.vip) {
        return 0;
    }

    if (inscription?.tarif !== undefined && inscription?.tarif !== null && inscription?.tarif !== "") {
        const tarif = nombre(inscription.tarif, NaN);
        if (Number.isFinite(tarif)) {
            return Math.max(0, tarif);
        }
    }

    const tarifs = configuration.tarifs || {};
    const categorie = inscription?.category || inscription?.typeAdherent || "";
    const frequence = Number(inscription?.frequency ?? inscription?.coursParSemaine ?? 0);

    if (categorie === "enfant" && frequence === 1) return nombre(tarifs.child1, 110);
    if (categorie === "adulte" && frequence === 1) return nombre(tarifs.adult1, 155);
    if (categorie === "adulte" && frequence === 4) return nombre(tarifs.adult4, 255);

    return 0;
}

function obtenirMontantAide(aide) {
    if (aide && typeof aide === "object") {
        return aide.enabled ? Math.max(0, nombre(aide.amount)) : 0;
    }
    return Math.max(0, nombre(aide));
}

function obtenirAidesEffectives(inscription, tarif) {
    const aides = inscription?.aides || inscription?.aids || {};
    let reste = Math.max(0, tarif);
    const details = {};

    const sources = [
        ["atoutNormandie", aides.atoutNormandie ?? aides.atout],
        ["passSport", aides.passSport],
        ["kiosk", aides.kiosk],
        ["spot50", aides.spot50]
    ];

    for (const [nom, aide] of sources) {
        const demande = obtenirMontantAide(aide);
        const montant = Math.min(demande, reste);
        details[nom] = montant;
        reste -= montant;
    }

    return {
        total: Object.values(details).reduce((total, montant) => total + montant, 0),
        details
    };
}

function obtenirReduction(inscription, configuration = {}) {
    return Math.max(
        0,
        nombre(
            inscription?.reductionFamille ??
            inscription?.familyDiscountAmount,
            0
        )
    );
}

function obtenirParrainage(inscription) {
    return Math.max(
        0,
        nombre(
            inscription?.parrainageAcquis ??
            inscription?.referralDiscountApplied,
            0
        )
    );
}

function obtenirPaiements(inscription) {
    if (Array.isArray(inscription?.paiements)) {
        return inscription.paiements
            .filter(paiement => paiement && typeof paiement === "object")
            .map(paiement => ({
                id: paiement.id || "",
                date: paiement.date || "",
                amount: Math.max(0, nombre(paiement.amount)),
                method: paiement.method || paiement.paymentMethod || ""
            }))
            .filter(paiement => paiement.amount > 0);
    }

    const montantLegacy = nombre(inscription?.montantPaye ?? inscription?.paidAmount);
    return montantLegacy > 0
        ? [{ id: "legacy", date: "", amount: montantLegacy, method: inscription?.paymentMethod || "" }]
        : [];
}

function totalPaiements(inscription) {
    return obtenirPaiements(inscription).reduce(
        (total, paiement) => total + paiement.amount,
        0
    );
}

function calculerSituationFinanciere(inscription, configuration = {}) {
    const tarif = obtenirTarif(inscription, configuration);

    if (inscription?.vip) {
        return {
            tarif: 0,
            remiseFamille: 0,
            remiseParrainage: 0,
            aides: 0,
            aidesEffectives: {},
            montantAPayer: 0,
            montantPaye: totalPaiements(inscription),
            reste: 0,
            surpaiement: totalPaiements(inscription),
            etat: totalPaiements(inscription) > 0 ? "paye" : "impaye"
        };
    }

    const remiseFamille = Math.min(obtenirReduction(inscription, configuration), tarif);
    const baseApresFamille = Math.max(0, tarif - remiseFamille);
    const remiseParrainage = Math.min(obtenirParrainage(inscription), baseApresFamille);
    const baseAvantAides = Math.max(0, baseApresFamille - remiseParrainage);
    const aides = obtenirAidesEffectives(inscription, baseAvantAides);
    const montantAPayer = Math.max(0, baseAvantAides - aides.total);
    const montantPaye = totalPaiements(inscription);
    const reste = Math.max(0, montantAPayer - montantPaye);
    const surpaiement = Math.max(0, montantPaye - montantAPayer);

    return {
        tarif,
        remiseFamille,
        remiseParrainage,
        aides: aides.total,
        aidesEffectives: aides.details,
        montantAPayer,
        montantPaye,
        reste,
        surpaiement,
        etat: montantPaye >= montantAPayer ? "paye" : montantPaye > 0 ? "partiel" : "impaye"
    };
}

module.exports = {
    obtenirTarif,
    obtenirMontantAide,
    obtenirAidesEffectives,
    obtenirPaiements,
    totalPaiements,
    calculerSituationFinanciere
};
