document.addEventListener("DOMContentLoaded", () => {
    initialiserApplication();
});

let state = {
    configuration: {},
    personnes: [],
    inscriptions: [],
    saisons: [],
    familles: []
};

let ui = {
    page: "dashboard",
    selectedSeason: "",
    editingEnrollmentId: null,
    memberPhotoData: null,
    currentCertificateId: null
};

let donneesInitiales = null;
let sauvegardeEnCours = false;
let sauvegardeEnAttente = false;

async function initialiserApplication() {
    try {
        await chargerDonnees();

        if (
            typeof initialiserNavigation ===
            "function"
        ) {
            initialiserNavigation();
        }

        if (
            typeof initialiserEvenementsAdherents ===
            "function"
        ) {
            initialiserEvenementsAdherents();
        }

        if (
            typeof renderCurrentPage ===
            "function"
        ) {
            renderCurrentPage();
        }

    } catch (error) {
        console.error(
            "Erreur lors de l'initialisation de l'application :",
            error
        );

        notificationErreur(
            "Impossible de charger les données de FBAC Gestion."
        );
    }
}

async function chargerDonnees() {
    if (
        typeof window.fbac ===
        "undefined"
    ) {
        throw new Error(
            "Le pont Electron FBAC est indisponible."
        );
    }

    const [
        configuration,
        personnes,
        inscriptions,
        saisons,
        familles
    ] = await Promise.all([
        window.fbac.lireConfiguration(),
        window.fbac.obtenirPersonnes(),
        window.fbac.obtenirInscriptions(),
        window.fbac.obtenirSaisons(),
        window.fbac.obtenirFamilles()
    ]);

    state =
        normaliserEtat(
            configuration,
            personnes,
            inscriptions,
            saisons,
            familles
        );

    sauvegarderEtatInitial();

    ui.page =
        "dashboard";

    ui.selectedSeason =
        state.configuration.saisonActiveId;

    return state;
}

function normaliserEtat(
    configuration,
    personnes,
    inscriptions,
    saisons,
    familles
) {
    const listeSaisons =
        Array.isArray(saisons)
            ? saisons.map(
                normaliserSaison
            )
            : [];

    const listePersonnes =
        Array.isArray(personnes)
            ? personnes.map(
                normaliserPersonne
            )
            : [];

    const listeInscriptions =
        Array.isArray(inscriptions)
            ? inscriptions.map(
                inscription =>
                    normaliserInscription(
                        inscription,
                        listeSaisons
                    )
            )
            : [];

    const configurationNormale =
        normaliserConfiguration(
            configuration,
            listeSaisons
        );

    const listeFamilles =
        Array.isArray(familles)
            ? familles.map(normaliserFamille)
            : [];

    return {
        configuration:
            configurationNormale,
        personnes:
            listePersonnes,
        inscriptions:
            listeInscriptions,
        saisons:
            listeSaisons,
        familles:
            listeFamilles
    };
}

function normaliserConfiguration(
    configuration,
    saisons
) {
    const source =
        configuration &&
        typeof configuration ===
            "object"
            ? configuration
            : {};

    let saisonActiveId =
        source.saisonActiveId ||
        "";

    if (saisons.length) {
        const date = new Date();
        const annee = date.getMonth() >= 8
            ? date.getFullYear()
            : date.getFullYear() - 1;

        const saisonDate =
            saisons.find(saison =>
                Number(saison.anneeDebut) === annee ||
                saison.nom === `${annee}-${annee + 1}`
            );

        if (saisonDate) {
            saisonActiveId = saisonDate.id;
        }
    }

    const tarifs =
        source.tarifs ||
        source.prices ||
        {};

    const aides =
        source.aides ||
        source.aidDefaults ||
        {};

    return {
        ...source,

        saisonActiveId,

        saisonActive:
            source.saisonActive ||
            saisons.find(
                saison =>
                    saison.id ===
                    saisonActiveId
            )?.nom ||
            "",

        tarifs: {
            child1:
                Number(
                    tarifs.child1 ??
                    tarifs.enfant1Cours ??
                    110
                ),

            adult1:
                Number(
                    tarifs.adult1 ??
                    tarifs.adulte1Cours ??
                    155
                ),

            adult4:
                Number(
                    tarifs.adult4 ??
                    tarifs.adulte4Cours ??
                    255
                )
        },

        aides: {
            atout:
                Number(
                    aides.atout ??
                    aides.atoutNormandie ??
                    50
                ),

            passSport:
                Number(
                    aides.passSport ??
                    50
                ),

            kiosk:
                Number(
                    aides.kiosk ??
                    50
                ),

            spot50:
                Number(
                    aides.spot50 ??
                    50
                )
        },

        reductionFamille:
            Number(
                source.reductionFamille ??
                source.familyDiscount ??
                20
            ),

        parrainage: {
            ...(source.parrainage || {}),
            montantParFilleul:
                Number(
                    source.parrainage?.montantParFilleul ??
                    source.parrainage?.montant ??
                    20
                ),
            plafond:
                Number(
                    source.parrainage?.plafond ??
                    3
                )
        }
    };
}

function normaliserFamille(famille) {
    return {
        ...famille,
        id: famille?.id || "",
        nom: famille?.nom || famille?.name || "Famille",
        saisonId: famille?.saisonId || famille?.season || ""
    };
}

function normaliserSaison(
    saison
) {
    if (
        typeof saison ===
        "string"
    ) {
        return {
            id: saison,
            nom: saison,
            anneeDebut:
                Number(
                    String(
                        saison
                    ).substring(
                        0,
                        4
                    )
                ),
            anneeFin:
                Number(
                    String(
                        saison
                    ).substring(
                        5,
                        9
                    )
                )
        };
    }

    const nom =
        saison.nom ||
        saison.id ||
        "";

    const correspondance =
        String(
            nom
        ).match(
            /^(\d{4})-(\d{4})$/
        );

    return {
        ...saison,

        id:
            saison.id ||
            nom,

        nom,

        anneeDebut:
            Number(
                saison.anneeDebut ??
                correspondance?.[1] ??
                0
            ),

        anneeFin:
            Number(
                saison.anneeFin ??
                correspondance?.[2] ??
                0
            )
    };
}

function normaliserPersonne(
    personne
) {
    return {
        ...personne,

        id:
            personne.id,

        firstName:
            personne.firstName ||
            personne.prenom ||
            "",

        lastName:
            personne.lastName ||
            personne.nom ||
            "",

        birthDate:
            personne.birthDate ||
            personne.dateNaissance ||
            "",

        photo:
            personne.photo ||
            null
    };
}

function normaliserInscription(
    inscription,
    saisons
) {
    const saisonId =
        inscription.saisonId ||
        trouverIdSaison(
            inscription.season,
            saisons
        );

    const sourceAides =
        inscription.aides ||
        inscription.aids ||
        {};

    return {
        ...inscription,

        id:
            inscription.id,

        personneId:
            inscription.personneId ||
            inscription.personId ||
            "",

        saisonId,

        category:
            inscription.category ||
            "adulte",

        frequency:
            String(
                inscription.frequency ||
                "1"
            ),

        grade:
            inscription.grade ||
            "Blanc",

        vip:
            Boolean(
                inscription.vip
            ),

        familyGroupId:
            inscription.familyGroupId ||
            null,

        referrerId:
            inscription.referrerId ||
            null,

        parrainageAcquis:
            Number(
                inscription.parrainageAcquis ??
                inscription.referralDiscountApplied ??
                0
            ),

        referralDiscountApplied:
            Number(
                inscription.referralDiscountApplied ??
                inscription.parrainageAcquis ??
                0
            ),

        aides:
            normaliserAides(
                sourceAides
            ),

        reductionFamille:
            Number(
                inscription.reductionFamille ??
                inscription.familyDiscountAmount ??
                0
            ),

        familyDiscountEnabled:
            Boolean(
                inscription.familyDiscountEnabled
            ),

        familyDiscountAmount:
            Number(
                inscription.familyDiscountAmount ??
                inscription.reductionFamille ??
                0
            ),

        montantPaye:
            Number(
                inscription.montantPaye ??
                inscription.paidAmount ??
                0
            ),

        paiements:
            Array.isArray(inscription.paiements)
                ? inscription.paiements
                : [],
        paidAmount:
            Number(
                inscription.paidAmount ??
                inscription.montantPaye ??
                0
            ),
        paymentMethod:
            inscription.paymentMethod ||
            "",

        certificat:
            normaliserCertificat(
                inscription.certificat ||
                inscription.certificate
            ),

        certificate:
            normaliserCertificat(
                inscription.certificate ||
                inscription.certificat
            )
    };
}

function normaliserAides(
    aides
) {
    const source =
        aides &&
        typeof aides ===
            "object"
            ? aides
            : {};

    return {
        atoutNormandie:
            normaliserAide(
                source.atoutNormandie ||
                source.atout
            ),

        passSport:
            normaliserAide(
                source.passSport
            ),

        kiosk:
            normaliserAide(
                source.kiosk
            ),
        spot50:
            normaliserAide(
                source.spot50
            )
    };
}

function normaliserAide(
    aide
) {
    if (
        typeof aide ===
        "number"
    ) {
        return {
            enabled:
                aide > 0,
            amount:
                aide
        };
    }

    if (
        !aide ||
        typeof aide !==
            "object"
    ) {
        return {
            enabled:
                false,
            amount:
                0
        };
    }

    return {
        enabled:
            Boolean(
                aide.enabled
            ),

        amount:
            Number(
                aide.amount ||
                0
            )
    };
}

function normaliserCertificat(
    certificat
) {
    if (
        !certificat ||
        typeof certificat !==
            "object"
    ) {
        return {
            date: "",
            expiry: "",
            fileName: "",
            documentId: null,
            mimeType: ""
        };
    }

    return {
        date:
            certificat.date ||
            "",

        expiry:
            certificat.expiry ||
            "",

        fileName:
            certificat.fileName ||
            "",

        documentId:
            certificat.documentId ||
            null,

        mimeType:
            certificat.mimeType ||
            ""
    };
}

function trouverIdSaison(
    valeur,
    saisons
) {
    if (!valeur) {
        return "";
    }

    const saison =
        saisons.find(
            element =>
                element.id ===
                    valeur ||
                element.nom ===
                    valeur
        );

    return saison
        ? saison.id
        : valeur;
}

function sauvegarderEtatInitial() {
    donneesInitiales = {
        configuration:
            JSON.parse(
                JSON.stringify(
                    state.configuration
                )
            ),

        personnes:
            JSON.parse(
                JSON.stringify(
                    state.personnes
                )
            ),

        inscriptions:
            JSON.parse(
                JSON.stringify(
                    state.inscriptions
                )
            ),

        saisons:
            JSON.parse(
                JSON.stringify(
                    state.saisons
                )
            )
    };
}

async function sauvegarderEtat() {
    if (
        !state ||
        typeof window.fbac ===
            "undefined"
    ) {
        return;
    }

    if (
        sauvegardeEnCours
    ) {
        sauvegardeEnAttente =
            true;
        return;
    }

    sauvegardeEnCours =
        true;

    try {
        await synchroniserConfiguration();

        sauvegarderEtatInitial();
        if (ui.page === "comptabilite" && typeof rafraichirComptabilite === "function") {
            await rafraichirComptabilite();
        }
    } catch (error) {
        console.error(
            "Erreur lors de la sauvegarde :",
            error
        );

        notificationErreur(
            "Une erreur est survenue lors de l'enregistrement des données."
        );
    } finally {
        sauvegardeEnCours =
            false;

        if (
            sauvegardeEnAttente
        ) {
            sauvegardeEnAttente =
                false;

            await sauvegarderEtat();
        }
    }
}

async function synchroniserConfiguration() {
    if (
        typeof window.fbac
            .enregistrerConfiguration !==
        "function"
    ) {
        return;
    }

    const configuration =
        convertirConfigurationBackend(
            state.configuration
        );

    const ancienne =
        donneesInitiales
            ?.configuration || {};

    if (
        JSON.stringify(
            configuration
        ) ===
        JSON.stringify(
            ancienne
        )
    ) {
        return;
    }

    await window.fbac.enregistrerConfiguration(
        configuration
    );
}

async function synchroniserPersonnes() {
    const anciennesPersonnes =
        donneesInitiales
            ?.personnes || [];

    const personnesActuelles =
        state.personnes || [];

    for (
        const personne
        of personnesActuelles
    ) {
        const ancienne =
            anciennesPersonnes.find(
                element =>
                    element.id ===
                    personne.id
            );

        const donnees =
            convertirPersonneBackend(
                personne
            );

        if (!ancienne) {
            const creee =
                await window.fbac.creerPersonne(
                    donnees
                );

            if (
                creee?.id &&
                creee.id !==
                    personne.id
            ) {
                personne.id =
                    creee.id;
            }

            continue;
        }

        if (
            JSON.stringify(
                donnees
            ) !==
            JSON.stringify(
                convertirPersonneBackend(
                    ancienne
                )
            )
        ) {
            await window.fbac.modifierPersonne(
                personne.id,
                donnees
            );
        }
    }

    for (
        const ancienne
        of anciennesPersonnes
    ) {
        const existe =
            personnesActuelles.some(
                personne =>
                    personne.id ===
                    ancienne.id
            );

        if (!existe) {
            await window.fbac.supprimerPersonne(
                ancienne.id
            );
        }
    }
}

async function synchroniserInscriptions() {
    const anciennesInscriptions =
        donneesInitiales
            ?.inscriptions || [];

    const inscriptionsActuelles =
        state.inscriptions || [];

    for (
        const inscription
        of inscriptionsActuelles
    ) {
        const ancienne =
            anciennesInscriptions.find(
                element =>
                    element.id ===
                    inscription.id
            );

        const donnees =
            convertirInscriptionBackend(
                inscription
            );

        if (!ancienne) {
            const creee =
                await window.fbac.creerInscription(
                    donnees
                );

            if (
                creee?.id &&
                creee.id !==
                    inscription.id
            ) {
                inscription.id =
                    creee.id;
            }

            continue;
        }

        if (
            JSON.stringify(
                donnees
            ) !==
            JSON.stringify(
                convertirInscriptionBackend(
                    ancienne
                )
            )
        ) {
            await window.fbac.modifierInscription(
                inscription.id,
                donnees
            );
        }
    }

    for (
        const ancienne
        of anciennesInscriptions
    ) {
        const existe =
            inscriptionsActuelles.some(
                inscription =>
                    inscription.id ===
                    ancienne.id
            );

        if (!existe) {
            const saisonActiveId =
                state.configuration?.saisonActiveId;

            if (
                ancienne.saisonId ===
                saisonActiveId
            ) {
                await window.fbac.supprimerInscription(
                    ancienne.id
                );
            }
        }
    }
}

async function synchroniserSaisons() {
    return;
}

function convertirConfigurationBackend(
    configuration
) {
    return {
        ...configuration,

        saisonActiveId:
            configuration.saisonActiveId ||
            "",

        saisonActive:
            configuration.saisonActive ||
            "",

        tarifs: {
            ...(configuration.tarifs ||
                {})
        },

        prices: {
            ...(configuration.tarifs ||
                configuration.prices ||
                {})
        },

        aides: {
            ...(configuration.aides ||
                {})
        },

        aidDefaults: {
            ...(configuration.aides ||
                configuration.aidDefaults ||
                {})
        },

        reductionFamille:
            Number(
                configuration.reductionFamille ??
                configuration.familyDiscount ??
                20
            ),

        familyDiscount:
            Number(
                configuration.reductionFamille ??
                configuration.familyDiscount ??
                20
            )
    };
}

function convertirPersonneBackend(
    personne
) {
    return {
        firstName:
            personne.firstName ||
            personne.prenom ||
            "",

        lastName:
            personne.lastName ||
            personne.nom ||
            "",

        birthDate:
            personne.birthDate ||
            "",

        photo:
            personne.photo ||
            null
    };
}

function convertirInscriptionBackend(
    inscription
) {
    return {
        personId:
            inscription.personneId ||
            inscription.personId ||
            "",

        season:
            inscription.saisonId ||
            inscription.season ||
            "",

        category:
            inscription.category ||
            "adulte",

        frequency:
            String(
                inscription.frequency ||
                "1"
            ),

        grade:
            inscription.grade ||
            "Blanc",

        vip:
            Boolean(
                inscription.vip
            ),

        familyGroupId:
            inscription.familyGroupId ||
            null,

        referrerId:
            inscription.referrerId ||
            null,

        referralDiscountApplied:
            Number(
                inscription.referralDiscountApplied ??
                inscription.parrainageAcquis ??
                0
            ),

        aids:
            convertirAidesBackend(
                inscription.aides
            ),

        familyDiscountEnabled:
            Boolean(
                inscription.familyDiscountEnabled
            ),

        familyDiscountAmount:
            Number(
                inscription.familyDiscountAmount ??
                inscription.reductionFamille ??
                0
            ),

        paiements:
            Array.isArray(inscription.paiements)
                ? inscription.paiements
                : [],
        paidAmount:
            Number(
                inscription.paidAmount ??
                inscription.montantPaye ??
                0
            ),

        paymentMethod:
            inscription.paymentMethod ||
            "",

        certificate:
            convertirCertificatBackend(
                inscription.certificat ||
                inscription.certificate
            )
    };
}

function convertirAidesBackend(
    aides
) {
    const source =
        aides || {};

    return {
        atout:
            convertirAideBackend(
                source.atoutNormandie ||
                source.atout
            ),

        passSport:
            convertirAideBackend(
                source.passSport
            ),

        kiosk:
            convertirAideBackend(
                source.kiosk
            ),
        spot50:
            convertirAideBackend(
                source.spot50
            )
    };
}

function convertirAideBackend(
    aide
) {
    return {
        enabled:
            Boolean(
                aide?.enabled
            ),

        amount:
            Number(
                aide?.amount ||
                0
            )
    };
}

function convertirCertificatBackend(
    certificat
) {
    return {
        date:
            certificat?.date ||
            "",

        expiry:
            certificat?.expiry ||
            "",

        fileName:
            certificat?.fileName ||
            "",

        documentId:
            certificat?.documentId ||
            null,

        mimeType:
            certificat?.mimeType ||
            ""
    };
}

function renderCurrentPage() {
    if (
        typeof ui ===
        "undefined"
    ) {
        return;
    }

    switch (
        ui.page
    ) {
        case "dashboard":
            if (
                typeof afficherTableauDeBord ===
                "function"
            ) {
                afficherTableauDeBord();
            }
            break;

        case "adherents":
            if (
                typeof afficherAdherents ===
                "function"
            ) {
                afficherAdherents();
            }
            break;

        case "paiements":
            if (
                typeof afficherPaiements ===
                "function"
            ) {
                afficherPaiements();
            }

            if (
                typeof afficherResumePaiements ===
                "function"
            ) {
                afficherResumePaiements();
            }
            break;

        case "parrainages":
            if (
                typeof afficherParrainages ===
                "function"
            ) {
                afficherParrainages();
            }
            break;

        case "saisons":
            if (
                typeof afficherSaisons ===
                "function"
            ) {
                afficherSaisons();
            }
            break;

        case "accounting":
        case "comptabilite":
            if (typeof afficherComptabilite === "function") {
                rafraichirComptabilite();
            }
            break;

        case "settings":
        case "parametres":
            if (
                typeof afficherParametres ===
                "function"
            ) {
                afficherParametres();
            }
            break;
    }
}

function echapperHtml(
    valeur
) {
    return String(
        valeur ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}

window.sauvegarderEtat =
    sauvegarderEtat;

window.chargerDonnees =
    chargerDonnees;

window.renderCurrentPage =
    renderCurrentPage;