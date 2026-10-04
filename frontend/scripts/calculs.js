function obtenirMoteurFinancier() {
    if (typeof FBACFinances === "undefined") {
        throw new Error("Le moteur financier FBAC est indisponible.");
    }
    return FBACFinances;
}

function obtenirConfigurationCalcul() {
    return typeof state !== "undefined" && state?.configuration
        ? state.configuration
        : {};
}

function calculerTarif(typeAdherent, coursParSemaine) {
    const inscription = {
        category: typeAdherent,
        frequency: coursParSemaine
    };
    return obtenirMoteurFinancier().obtenirTarif(
        inscription,
        obtenirConfigurationCalcul()
    );
}

function obtenirMontantAide(aide) {
    return obtenirMoteurFinancier().obtenirMontantAide(aide);
}

function calculerTotalAides(aides = {}) {
    return obtenirMoteurFinancier()
        .obtenirAidesEffectives(
            { aides },
            obtenirMoteurFinancier().obtenirTarif(
                { category: "adulte", frequency: 1 },
                obtenirConfigurationCalcul()
            ),
            obtenirConfigurationCalcul()
        ).total;
}

function obtenirTarifInscription(inscription) {
    return obtenirMoteurFinancier().obtenirTarif(
        inscription,
        obtenirConfigurationCalcul()
    );
}

function obtenirAidesEffectives(inscription, montantDisponible) {
    const tarif = montantDisponible === undefined
        ? obtenirTarifInscription(inscription)
        : Number(montantDisponible) || 0;

    return obtenirMoteurFinancier().obtenirAidesEffectives(
        inscription,
        tarif,
        obtenirConfigurationCalcul()
    );
}

function obtenirPaiementsInscriptionPourCalcul(inscription) {
    return obtenirMoteurFinancier().obtenirPaiements(inscription);
}

function calculerTotalPaiements(inscription) {
    return obtenirMoteurFinancier().totalPaiements(inscription);
}

function obtenirRemiseFamille(inscription) {
    return Math.max(
        0,
        Number(
            inscription?.reductionFamille ??
            inscription?.familyDiscountAmount ??
            0
        ) || 0
    );
}

function obtenirRemiseParrainage(inscription) {
    return Math.max(
        0,
        Number(
            inscription?.parrainageAcquis ??
            inscription?.referralDiscountApplied ??
            0
        ) || 0
    );
}

function calculerSituationFinanciere(inscription) {
    const situation = obtenirMoteurFinancier().calculerSituationFinanciere(
        inscription,
        obtenirConfigurationCalcul()
    );

    return {
        ...situation,
        totalAides: situation.aides,
        reductionFamille: situation.remiseFamille,
        parrainageAcquis: situation.remiseParrainage
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