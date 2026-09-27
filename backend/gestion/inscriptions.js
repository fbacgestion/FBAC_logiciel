const {
    lireJson,
    ecrireJson
} = require("./fichiers");

const FICHIER_INSCRIPTIONS = "inscriptions.json";
const { obtenirSaisonActuelle } = require("./saisons");

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
        frequency: donnees.frequency || "1",
        grade: donnees.grade || "Blanc",

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

        paidAmount:
            Number(
                donnees.paidAmount || 0
            ),

        paymentMethod:
            donnees.paymentMethod || "",

        certificate:
            normaliserCertificat(
                donnees.certificate
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

    const saisonActuelle =
        obtenirSaisonActuelle();

    const saisonActive =
        saisonActuelle?.id ||
        saisonActuelle?.nom ||
        "";

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
        id,
        personId: personneId,
        season: saison
    };

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

    nouvelleInscription.paidAmount =
        Number(
            nouvelleInscription.paidAmount || 0
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

    const saisonActuelle =
        obtenirSaisonActuelle();

    const saisonActive =
        saisonActuelle?.id ||
        saisonActuelle?.nom ||
        "";

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
    supprimerInscriptionsPersonne
};