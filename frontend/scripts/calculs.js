function calculerTarif(
    typeAdherent,
    coursParSemaine
) {
    const cours =
        Number(
            coursParSemaine
        );

    const tarifs =
        typeof state !== "undefined" &&
        state?.configuration?.tarifs
            ? state.configuration.tarifs
            : {};

    if (
        typeAdherent === "enfant" &&
        cours === 1
    ) {
        return Number(
            tarifs.child1 ||
            tarifs.enfant1Cours ||
            110
        );
    }

    if (
        typeAdherent === "adulte" &&
        cours === 1
    ) {
        return Number(
            tarifs.adult1 ||
            tarifs.adulte1Cours ||
            155
        );
    }

    if (
        typeAdherent === "adulte" &&
        cours === 4
    ) {
        return Number(
            tarifs.adult4 ||
            tarifs.adulte4Cours ||
            255
        );
    }

    throw new Error(
        "Combinaison type d'adhérent / nombre de cours invalide."
    );
}

function calculerTotalAides(
    aides = {}
) {
    const atout =
        aides.atoutNormandie ||
        aides.atout;

    const passSport =
        aides.passSport;

    const kiosk =
        aides.kiosk;

    const spot50 =
        aides.spot50;

    return (
        obtenirMontantAide(
            atout
        ) +
        obtenirMontantAide(
            passSport
        ) +
        obtenirMontantAide(
            kiosk
        ) +
        obtenirMontantAide(
            spot50
        )
    );
}

function obtenirMontantAide(
    aide
) {
    if (
        aide &&
        typeof aide === "object"
    ) {
        if (
            !aide.enabled
        ) {
            return 0;
        }

        return Number(
            aide.amount
        ) || 0;
    }

    return Number(
        aide
    ) || 0;
}

function obtenirTarifInscription(inscription) {
    if (inscription?.vip) {
        return 0;
    }

    if (inscription?.tarif !== undefined && inscription?.tarif !== null && inscription?.tarif !== "") {
        const tarif = Number(inscription.tarif);
        if (Number.isFinite(tarif)) {
            return tarif;
        }
    }

    if (!inscription?.category || !inscription?.frequency) {
        return 0;
    }

    return calculerTarif(
        inscription.category,
        inscription.frequency
    );
}

function obtenirAidesEffectives(inscription) {
    const tarif =
        obtenirTarifInscription(inscription);

    let reste =
        Math.max(
            0,
            tarif -
            Number(
                inscription.reductionFamille ??
                inscription.familyDiscountAmount ??
                0
            ) -
            Number(
                inscription.parrainageAcquis ??
                inscription.referralDiscountApplied ??
                0
            )
        );

    const sources = [
        ["atoutNormandie", inscription.aides?.atoutNormandie || inscription.aides?.atout],
        ["passSport", inscription.aides?.passSport],
        ["kiosk", inscription.aides?.kiosk],
        ["spot50", inscription.aides?.spot50]
    ];

    const details = {};

    for (const [nom, aide] of sources) {
        const demande =
            aide && aide.enabled
                ? Math.max(0, Number(aide.amount) || 0)
                : 0;

        const montant =
            Math.min(
                demande,
                reste
            );

        details[nom] = montant;
        reste -= montant;
    }

    return {
        total:
            sources.reduce(
                (total, [nom]) =>
                    total +
                    (details[nom] || 0),
                0
            ),
        details
    };
}

function calculerMontantAPayer(
    inscription
) {
    if (
        inscription.vip
    ) {
        return 0;
    }

    const tarif =
        obtenirTarifInscription(inscription);

    const aides =
        obtenirAidesEffectives(
            inscription
        ).total;

    const reductionFamille =
        Number(
            inscription.reductionFamille ??
            inscription.familyDiscountAmount ??
            0
        );

    const parrainageAcquis =
        Number(
            inscription.parrainageAcquis ??
            inscription.referralDiscountApplied ??
            0
        );

    return Math.max(
        0,
        tarif -
        aides -
        reductionFamille -
        parrainageAcquis
    );
}

function calculerReste(
    inscription
) {
    const montantAPayer =
        calculerMontantAPayer(
            inscription
        );

    const montantPaye =
        Number(
            inscription.montantPaye ??
            inscription.paidAmount ??
            0
        );

    return Math.max(
        0,
        montantAPayer -
        montantPaye
    );
}

function calculerEtatPaiement(
    inscription
) {
    const montantAPayer =
        calculerMontantAPayer(
            inscription
        );

    const montantPaye =
        Number(
            inscription.montantPaye ??
            inscription.paidAmount ??
            0
        );

    if (
        montantPaye >=
        montantAPayer
    ) {
        return "paye";
    }

    if (
        montantPaye > 0
    ) {
        return "partiel";
    }

    return "impaye";
}

function calculerSurpaiement(
    inscription
) {
    const montantAPayer =
        calculerMontantAPayer(
            inscription
        );

    const montantPaye =
        Number(
            inscription.montantPaye ??
            inscription.paidAmount ??
            0
        );

    return Math.max(
        0,
        montantPaye -
        montantAPayer
    );
}

function calculerDonneesPaiement(
    inscription
) {
    const montantAPayer =
        calculerMontantAPayer(
            inscription
        );

    const montantPaye =
        Number(
            inscription.montantPaye ??
            inscription.paidAmount ??
            0
        );

    return {
        tarif:
            obtenirTarifInscription(inscription),

        totalAides:
            obtenirAidesEffectives(
                inscription
            ).total,

        aidesEffectives:
            obtenirAidesEffectives(
                inscription
            ).details,

        reductionFamille:
            Number(
                inscription.reductionFamille ??
                inscription.familyDiscountAmount ??
                0
            ),

        parrainageAcquis:
            Number(
                inscription.parrainageAcquis ??
                inscription.referralDiscountApplied ??
                0
            ),

        montantAPayer,

        montantPaye,

        reste:
            calculerReste(
                inscription
            ),

        surpaiement:
            calculerSurpaiement(
                inscription
            ),

        etat:
            calculerEtatPaiement(
                inscription
            )
    };
}