const {
    lireJson,
    ecrireJson
} = require("./fichiers");

const FICHIER_INSCRIPTIONS = "inscriptions.json";
const { obtenirSaisonActuelle } = require("./saisons");
const { lire: lireConfiguration, obtenirParametresSaison } = require("../core/configuration");

function obtenirInscriptions() {
    const inscriptions = lireJson(FICHIER_INSCRIPTIONS);

    if (!Array.isArray(inscriptions)) {
        return [];
    }

    return inscriptions;
}

function obtenirInscription(id) {
    const inscriptions = obtenirInscriptions();

    return inscriptions.find(
        inscription => inscription.id === id
    ) || null;
}

function obtenirInscriptionsSaison(idSaison) {
    const inscriptions = obtenirInscriptions();

    return inscriptions.filter(
        inscription => inscription.season === idSaison
    );
}

function obtenirInscriptionPersonneSaison(
    idPersonne,
    idSaison
) {
    const inscriptions = obtenirInscriptions();

    return inscriptions.find(
        inscription =>
            inscription.personId === idPersonne &&
            inscription.season === idSaison
    ) || null;
}

function creerInscription(donnees) {
    if (!donnees || typeof donnees !== "object") {
        throw new Error(
            "Les données de l'inscription sont invalides."
        );
    }

    if (!donnees.personId) {
        throw new Error(
            "L'identifiant de la personne est obligatoire."
        );
    }

    if (!donnees.season) {
        throw new Error(
            "La saison est obligatoire."
        );
    }

    const inscriptions = obtenirInscriptions();

    const inscriptionExistante =
        inscriptions.find(
            inscription =>
                inscription.personId === donnees.personId &&
                inscription.season === donnees.season
        );

    if (inscriptionExistante) {
        throw new Error(
            "Cette personne est déjà inscrite pour cette saison."
        );
    }

    const inscription = {
        id: donnees.id || genererId(),

        personId: donnees.personId,
        season: donnees.season,

        category: donnees.category || "adulte",
        tarif: donnees.tarif !== undefined ? Math.max(0, Number(donnees.tarif) || 0) : undefined,
        tarifPersonnalise: Boolean(donnees.tarifPersonnalise),
        licenceFederaleIncluse: donnees.licenceFederaleIncluse !== false,
        frequency: donnees.frequency || "1",
        grade: donnees.grade || "Blanc",
        vip: Boolean(donnees.vip),

        familyGroupId:
            donnees.familyGroupId || null,

        referrerId:
            donnees.referrerId || null,

        referralDiscountApplied:
            Number(
                donnees.referralDiscountApplied || 0
            ),

        aids: normaliserAides(
            donnees.aids
        ),

        familyDiscountEnabled:
            Boolean(
                donnees.familyDiscountEnabled
            ),

        familyDiscountAmount:
            Number(
                donnees.familyDiscountAmount || 0
            ),

        paiements:
            normaliserPaiements(
                donnees.paiements,
                donnees.paidAmount,
                donnees.paymentMethod
            ),

        paidAmount:
            calculerTotalPaiements(
                normaliserPaiements(
                    donnees.paiements,
                    donnees.paidAmount,
                    donnees.paymentMethod
                )
            ),

        paymentMethod:
            donnees.paymentMethod || "",

        certificate:
            normaliserCertificat(
                donnees.certificate
            ),

        parametresFinanciers:
            normaliserParametresFinanciers(
                donnees.parametresFinanciers,
                donnees.season
            )
    };

    inscriptions.push(inscription);

    ecrireJson(
        FICHIER_INSCRIPTIONS,
        inscriptions
    );

    return inscription;
}

function modifierInscription(
    id,
    donnees
) {
    if (!donnees || typeof donnees !== "object") {
        throw new Error(
            "Les données de l'inscription sont invalides."
        );
    }

    const inscriptions = obtenirInscriptions();

    const index = inscriptions.findIndex(
        inscription => inscription.id === id
    );

    if (index === -1) {
        throw new Error(
            "Inscription introuvable."
        );
    }

    const inscriptionActuelle =
        inscriptions[index];

    const saisonActive =
        obtenirSaisonActivePourEcriture();

    const estSaisonActive =
        inscriptionActuelle.season ===
        saisonActive;

    if (!estSaisonActive) {
        const champsAutorises = [
            "referrerId",
            "referralDiscountApplied"
        ];

        const champsDemandes =
            Object.keys(donnees);

        const modificationAutorisee =
            champsDemandes.every(
                champ =>
                    champsAutorises.includes(champ)
            );

        if (!modificationAutorisee) {
            throw new Error(
                "Cette inscription appartient à une saison historique. Seul le parrainage peut être modifié."
            );
        }
    }

    const personneId =
        donnees.personId ??
        inscriptionActuelle.personId;

    const saison =
        donnees.season ??
        inscriptionActuelle.season;

    if (saison !== inscriptionActuelle.season) {
        throw new Error(
            "La saison d'une inscription ne peut pas être modifiée."
        );
    }

    const doublon = inscriptions.find(
        inscription =>
            inscription.id !== id &&
            inscription.personId === personneId &&
            inscription.season === saison
    );

    if (doublon) {
        throw new Error(
            "Cette personne est déjà inscrite pour cette saison."
        );
    }

    const nouvelleInscription = {
        ...inscriptionActuelle,
        ...donnees,
        vip:
            Boolean(
                donnees.vip ??
                inscriptionActuelle.vip
            ),
        id,
        personId: personneId,
        season: saison
    };

    if (!nouvelleInscription.parametresFinanciers) {
        nouvelleInscription.parametresFinanciers = normaliserParametresFinanciers(null, saison);
    }

    if (donnees.aids) {
        nouvelleInscription.aids =
            normaliserAides(donnees.aids);
    }

    if (donnees.certificate) {
        nouvelleInscription.certificate =
            normaliserCertificat(
                donnees.certificate
            );
    }

    nouvelleInscription.referralDiscountApplied =
        Number(
            nouvelleInscription.referralDiscountApplied || 0
        );

    nouvelleInscription.familyDiscountAmount =
        Number(
            nouvelleInscription.familyDiscountAmount || 0
        );

    if (donnees.paiements) {
        nouvelleInscription.paiements =
            normaliserPaiements(
                donnees.paiements,
                nouvelleInscription.paidAmount,
                nouvelleInscription.paymentMethod
            );
    } else {
        nouvelleInscription.paiements =
            normaliserPaiements(
                nouvelleInscription.paiements,
                nouvelleInscription.paidAmount,
                nouvelleInscription.paymentMethod
            );
    }

    nouvelleInscription.paidAmount =
        calculerTotalPaiements(
            nouvelleInscription.paiements
        );

    inscriptions[index] =
        nouvelleInscription;

    ecrireJson(
        FICHIER_INSCRIPTIONS,
        inscriptions
    );

    return nouvelleInscription;
}

function supprimerInscription(id) {
    const inscriptions = obtenirInscriptions();

    const index = inscriptions.findIndex(
        inscription => inscription.id === id
    );

    if (index === -1) {
        throw new Error(
            "Inscription introuvable."
        );
    }

    const saisonActive =
        obtenirSaisonActivePourEcriture();

    if (
        inscriptions[index].season !==
        saisonActive
    ) {
        throw new Error(
            "Une inscription historique ne peut pas être supprimée."
        );
    }

    const inscriptionSupprimee =
        inscriptions[index];

    inscriptions.splice(index, 1);

    ecrireJson(
        FICHIER_INSCRIPTIONS,
        inscriptions
    );

    return inscriptionSupprimee;
}

function supprimerInscriptionsPersonne(
    idPersonne
) {
    const inscriptions = obtenirInscriptions();

    const inscriptionsConservees =
        inscriptions.filter(
            inscription =>
                inscription.personId !== idPersonne
        );

    const nombreSupprime =
        inscriptions.length -
        inscriptionsConservees.length;

    if (nombreSupprime > 0) {
        ecrireJson(
            FICHIER_INSCRIPTIONS,
            inscriptionsConservees
        );
    }

    return nombreSupprime;
}

function normaliserParametresFinanciers(parametres, saisonId) {
    const configuration = lireConfiguration();
    const source = parametres && typeof parametres === "object"
        ? parametres
        : obtenirParametresSaison(saisonId, configuration);

    return {
        tarifs: { ...(source.tarifs || {}) },
        aides: { ...(source.aides || {}) },
        reductionFamille: Number(source.reductionFamille) || 0,
        parrainage: { ...(source.parrainage || {}) },
        licenceFederale: Number(source.licenceFederale) || 0
    };
}

function initialiserParametresFinanciers() {
    const inscriptions = obtenirInscriptions();
    let modifie = false;

    for (const inscription of inscriptions) {
        if (inscription.parametresFinanciers) continue;
        inscription.parametresFinanciers = normaliserParametresFinanciers(null, inscription.season);
        modifie = true;
    }

    if (modifie) {
        ecrireJson(FICHIER_INSCRIPTIONS, inscriptions);
    }

    return inscriptions;
}

function obtenirSaisonActivePourEcriture() {
    const configuration = lireJson("configuration.json") || {};
    if (configuration.saisonActiveId) {
        return configuration.saisonActiveId;
    }

    const saisonActuelle = obtenirSaisonActuelle();
    return saisonActuelle?.id || saisonActuelle?.nom || "";
}

function normaliserAides(aides) {
    const source =
        aides && typeof aides === "object"
            ? aides
            : {};

    return {
        atout: normaliserAide(
            source.atout
        ),
        passSport: normaliserAide(
            source.passSport
        ),
        kiosk: normaliserAide(
            source.kiosk
        ),
        spot50: normaliserAide(
            source.spot50
        )
    };
}

function normaliserAide(aide) {
    if (!aide || typeof aide !== "object") {
        return {
            enabled: false,
            amount: 0
        };
    }

    return {
        enabled: Boolean(aide.enabled),
        amount: Number(aide.amount || 0)
    };
}

function normaliserPaiements(
    paiements,
    montantLegacy = 0,
    modeLegacy = ""
) {
    if (Array.isArray(paiements)) {
        return paiements
            .filter(paiement => paiement && typeof paiement === "object")
            .map(paiement => ({
                id: paiement.id || genererId(),
                date: paiement.date || new Date().toISOString().slice(0, 10),
                amount: Math.max(0, Number(paiement.amount) || 0),
                method: paiement.method || paiement.paymentMethod || ""
            }))
            .filter(paiement => paiement.amount > 0);
    }

    const montant = Math.max(0, Number(montantLegacy) || 0);

    if (!montant) {
        return [];
    }

    return [{
        id: genererId(),
        date: new Date().toISOString().slice(0, 10),
        amount: montant,
        method: modeLegacy || ""
    }];
}

function calculerTotalPaiements(paiements) {
    return (Array.isArray(paiements) ? paiements : [])
        .reduce(
            (total, paiement) =>
                total + (Number(paiement.amount) || 0),
            0
        );
}

function normaliserCertificat(
    certificat
) {
    if (
        !certificat ||
        typeof certificat !== "object"
    ) {
        return {
            date: "",
            expiry: "",
            fileName: "",
            documentId: null
        };
    }

    return {
        date: certificat.date || "",
        expiry: certificat.expiry || "",
        fileName: certificat.fileName || "",
        documentId:
            certificat.documentId || null,
        mimeType:
            certificat.mimeType || ""
    };
}

function genererId() {
    return (
        "inscription_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .substring(2, 9)
    );
}

module.exports = {
    obtenirInscriptions,
    obtenirInscription,
    obtenirInscriptionsSaison,
    obtenirInscriptionPersonneSaison,
    creerInscription,
    modifierInscription,
    supprimerInscription,
    supprimerInscriptionsPersonne,
    initialiserParametresFinanciers
};