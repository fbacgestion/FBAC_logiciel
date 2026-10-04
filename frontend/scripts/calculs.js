function nombre(valeur, defaut = 0) {
    const resultat = Number(valeur);
    return Number.isFinite(resultat) ? resultat : defaut;
}

function calculerTarif(typeAdherent, coursParSemaine) {
    const cours = Number(coursParSemaine);
    const tarifs = state?.configuration?.tarifs || {};

    if (typeAdherent === "enfant" && cours === 1) {
        return nombre(tarifs.child1 ?? tarifs.enfant1Cours, 110);
    }

    if (typeAdherent === "adulte" && cours === 1) {
        return nombre(tarifs.adult1 ?? tarifs.adulte1Cours, 155);
    }

    if (typeAdherent === "adulte" && cours === 4) {
        return nombre(tarifs.adult4 ?? tarifs.adulte4Cours, 255);
    }

    throw new Error("Combinaison type d'adhérent / nombre de cours invalide.");
}

function obtenirMontantAide(aide) {
    if (aide && typeof aide === "object") {
        return aide.enabled ? Math.max(0, nombre(aide.amount)) : 0;
    }

    return Math.max(0, nombre(aide));
}

function calculerTotalAides(aides = {}) {
    return [
        aides.atoutNormandie ?? aides.atout,
        aides.passSport,
        aides.kiosk,
        aides.spot50
    ].reduce((total, aide) => total + obtenirMontantAide(aide), 0);
}

function obtenirTarifInscription(inscription) {
    if (inscription?.vip) {
        return 0;
    }

    if (inscription?.tarif !== undefined && inscription?.tarif !== null && inscription?.tarif !== "") {
        const tarif = Number(inscription.tarif);
        if (Number.isFinite(tarif)) {
            return Math.max(0, tarif);
        }
    }

    if (!inscription?.category || !inscription?.frequency) {
        return 0;
    }

    return calculerTarif(inscription.category, inscription.frequency);
}

function obtenirAidesEffectives(inscription, montantDisponible = obtenirTarifInscription(inscription)) {
    let reste = Math.max(0, nombre(montantDisponible));
    const sources = [
        ["atoutNormandie", inscription?.aides?.atoutNormandie ?? inscription?.aides?.atout],
        ["passSport", inscription?.aides?.passSport],
        ["kiosk", inscription?.aides?.kiosk],
        ["spot50", inscription?.aides?.spot50]
    ];
    const details = {};

    for (const [nom, aide] of sources) {
        const montant = Math.min(obtenirMontantAide(aide), reste);
        details[nom] = montant;
        reste -= montant;
    }

    return {
        total: Object.values(details).reduce((total, montant) => total + montant, 0),
        details
    };
}

function obtenirPaiementsInscriptionPourCalcul(inscription) {
    if (Array.isArray(inscription?.paiements)) {
        return inscription.paiements
            .filter(paiement => paiement && typeof paiement === "object")
            .map(paiement => ({
                amount: Math.max(0, nombre(paiement.amount)),
                method: paiement.method || paiement.paymentMethod || "",
                date: paiement.date || "",
                id: paiement.id || ""
            }))
            .filter(paiement => paiement.amount > 0);
    }

    const montantLegacy = Math.max(0, nombre(inscription?.montantPaye ?? inscription?.paidAmount));
    return montantLegacy > 0
        ? [{ amount: montantLegacy, method: inscription?.paymentMethod || "", date: "", id: "legacy" }]
        : [];
}

function calculerTotalPaiements(inscription) {
    return obtenirPaiementsInscriptionPourCalcul(inscription)
        .reduce((total, paiement) => total + paiement.amount, 0);
}

function obtenirRemiseFamille(inscription) {
    return Math.max(
        0,
        nombre(
            inscription?.reductionFamille ??
            inscription?.familyDiscountAmount
        )
    );
}

function obtenirRemiseParrainage(inscription) {
    return Math.max(
        0,
        nombre(
            inscription?.parrainageAcquis ??
            inscription?.referralDiscountApplied
        )
    );
}

function calculerSituationFinanciere(inscription) {
    const tarif = obtenirTarifInscription(inscription);
    const montantPaye = calculerTotalPaiements(inscription);

    if (inscription?.vip) {
        return {
            tarif: 0,
            totalAides: 0,
            aidesEffectives: {},
            reductionFamille: 0,
            parrainageAcquis: 0,
            montantAPayer: 0,
            montantPaye,
            reste: 0,
            surpaiement: montantPaye,
            etat: montantPaye > 0 ? "paye" : "impaye"
        };
    }

    const reductionFamille = Math.min(obtenirRemiseFamille(inscription), tarif);
    const apresFamille = Math.max(0, tarif - reductionFamille);
    const parrainageAcquis = Math.min(obtenirRemiseParrainage(inscription), apresFamille);
    const apresParrainage = Math.max(0, apresFamille - parrainageAcquis);
    const aides = obtenirAidesEffectives(inscription, apresParrainage);
    const montantAPayer = Math.max(0, apresParrainage - aides.total);
    const reste = Math.max(0, montantAPayer - montantPaye);
    const surpaiement = Math.max(0, montantPaye - montantAPayer);

    return {
        tarif,
        totalAides: aides.total,
        aidesEffectives: aides.details,
        reductionFamille,
        parrainageAcquis,
        montantAPayer,
        montantPaye,
        reste,
        surpaiement,
        etat: montantPaye >= montantAPayer
            ? "paye"
            : montantPaye > 0
                ? "partiel"
                : "impaye"
    };
}

function calculerMontantAPayer(inscription) {
    return calculerSituationFinanciere(inscription).montantAPayer;
}

function calculerReste(inscription) {
    return calculerSituationFinanciere(inscription).reste;
}

function calculerEtatPaiement(inscription) {
    return calculerSituationFinanciere(inscription).etat;
}

function calculerSurpaiement(inscription) {
    return calculerSituationFinanciere(inscription).surpaiement;
}

function calculerDonneesPaiement(inscription) {
    return calculerSituationFinanciere(inscription);
}
