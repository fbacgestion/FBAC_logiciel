function afficherAdherents() {
    if (typeof state === "undefined" || !state) {
        return;
    }

    const conteneur =
        document.getElementById("membersTable") ||
        document.getElementById("liste-adherents");

    if (!conteneur) {
        return;
    }

    const saisonCourante = state.configuration.saisonActiveId;

    if (!ui.selectedSeason || !state.saisons.some(saison => saison.id === ui.selectedSeason)) {
        ui.selectedSeason = saisonCourante;
    }

    remplirFiltreSaisonsAdherents();

    const recherche = (
        document.getElementById("memberSearch") ||
        document.getElementById("recherche-adherent")
    )?.value?.trim().toLowerCase() || "";

    const filtre =
        document.getElementById("memberStatusFilter")?.value ||
        document.getElementById("filtre-statut-adherent")?.value ||
        "all";

    const resultats = state.inscriptions
        .filter(inscription => inscription.saisonId === ui.selectedSeason)
        .map(inscription => ({
            inscription,
            personne: state.personnes.find(element => element.id === inscription.personneId)
        }))
        .filter(element => {
            if (!element.personne) {
                return false;
            }

            const nom = `${element.personne.firstName} ${element.personne.lastName}`.trim().toLowerCase();

            if (recherche && !nom.includes(recherche)) {
                return false;
            }

            const etat = calculerEtatPaiement(element.inscription);

            if (filtre === "paid" || filtre === "paye") {
                return etat === "paye";
            }

            if (filtre === "partial" || filtre === "partiel") {
                return etat === "partiel";
            }

            if (filtre === "unpaid" || filtre === "impaye") {
                return etat === "impaye";
            }

            return true;
        });

    const saison = state.saisons.find(element => element.id === ui.selectedSeason);
    const texteSaison = document.getElementById("membersSeasonText");

    if (texteSaison) {
        texteSaison.textContent =
            saison
                ? ui.selectedSeason === saisonCourante
                    ? `Inscriptions de la saison ${saison.nom}`
                    : `⚠ Consultation de la saison historique ${saison.nom} — lecture seule`
                : "";
    }

    const verrou = document.getElementById("membersLockText");

    if (verrou) {
        verrou.textContent = ui.selectedSeason === saisonCourante
            ? "● Saison active"
            : "● Saison historique — lecture seule";
    }

    if (!resultats.length) {
        conteneur.innerHTML = "<tr><td colspan=\"8\" class=\"empty-state\">Aucun adhérent trouvé pour cette saison.</td></tr>";
        return;
    }

    conteneur.innerHTML = resultats.map(({ inscription, personne }) => {
        const aides = [
            inscription.aides?.atoutNormandie?.enabled ? "Atout" : "",
            inscription.aides?.passSport?.enabled ? "Pass'Sport" : "",
            inscription.aides?.kiosk?.enabled ? "Kiosk" : "",
            inscription.aides?.spot50?.enabled ? "Spot50" : ""
        ].filter(Boolean).join(", ") || "—";

        const certificatDocumentId = inscription.certificat?.documentId || inscription.certificate?.documentId;
        const certificat = certificatDocumentId
            ? "<button type=\"button\" class=\"btn btn-small\" data-action=\"voir-certificat\" data-id=\"" + echapperHtml(inscription.id) + "\">Visualiser</button>"
            : "<span class=\"badge\">Absent</span>";

        const etatCertificat = obtenirEtatCertificat(inscription);
        const alerteCertificat =
            etatCertificat === "expire"
                ? "<span class=\"member-warning-badge\">⚠ Certificat expiré</span>"
                : etatCertificat === "manquant"
                    ? "<span class=\"member-warning-badge\">⚠ Certificat manquant</span>"
                    : "";

        const parrainagesValides = Math.min(
            3,
            state.inscriptions.filter(
                filleul =>
                    filleul.season === inscription.season &&
                    filleul.referrerId === inscription.personId
            ).length
        );
        const famille = genererAffichageFamille(inscription);

        const actions = ui.selectedSeason === saisonCourante
            ? "<button class=\"btn btn-small\" data-action=\"modifier-adherent\" data-id=\"" + echapperHtml(inscription.id) + "\">Modifier</button> " +
              "<button class=\"btn btn-small button-danger\" data-action=\"supprimer-adherent\" data-id=\"" + echapperHtml(inscription.id) + "\">Supprimer</button>"
            : "<button class=\"btn btn-small\" data-action=\"modifier-adherent\" data-id=\"" + echapperHtml(inscription.id) + "\">Voir</button>";

        return "<tr>" +
            "<td>" +
            "<div class=\"member-cell\">" +
            genererAvatarAdherent(personne) +
            "<div class=\"member-name\">" +
            "<strong>" + echapperHtml(`${personne.firstName} ${personne.lastName}`.trim()) + "</strong>" +
            (inscription.vip ? " <span class=\"badge vip\">VIP</span>" : "") +
            alerteCertificat +
            "</div>" +
            "</div>" +
            "</td>" +
            "<td>" + afficherBadgeGrade(inscription.grade || "Blanc") + "</td>" +
            "<td>" + famille + "</td>" +
            "<td>" + afficherBadgePaiement(inscription) + "</td>" +
            "<td>" + echapperHtml(aides) + "</td>" +
            "<td>" + certificat + "</td>" +
            "<td>" + (parrainagesValides > 0 ? parrainagesValides + "/3" : "—") + "</td>" +
            "<td><div class=\"actions\">" + actions + "</div></td>" +
            "</tr>";
    }).join("");

    chargerPhotosListeAdherents();
}
function genererAvatarAdherent(personne) {
    if (personne?.photo) {
        return `
            <button type="button" class="member-avatar-button" data-action="voir-photo" data-person-id="${echapperHtml(personne.id)}" title="Afficher la photo en grand">
                <span class="avatar">
                    <img data-photo-person-id="${echapperHtml(personne.id)}" alt="">
                </span>
            </button>
        `;
    }

    return `
        <span class="avatar">${echapperHtml(obtenirInitiales(personne))}</span>
    `;
}

function chargerPhotosListeAdherents() {
    document.querySelectorAll("[data-photo-person-id]").forEach(image => {
        afficherPhoto(image.dataset.photoPersonId, image);
    });
}

async function afficherPhotoEnGrand(personneId) {
    const personne = state.personnes.find(element => element.id === personneId);

    if (!personne?.photo) {
        return;
    }

    const image = document.getElementById("photoViewerImage");
    const nom = document.getElementById("photoViewerName");

    if (!image) {
        return;
    }

    if (nom) {
        nom.textContent = `${personne.firstName} ${personne.lastName}`.trim();
    }

    image.removeAttribute("src");
    image.alt = `Photo de ${personne.firstName} ${personne.lastName}`.trim();

    ouvrirModalParId("photoModal");

    await afficherPhoto(personneId, image);

    chargerPhotosListeAdherents();
}

function remplirFiltreSaisonsAdherents() {
    const select =
        document.getElementById("memberSeasonFilter");

    if (!select) {
        return;
    }

    const saisons =
        [...state.saisons].sort(
            (a, b) =>
                Number(b.anneeDebut || String(b.nom).slice(0, 4)) -
                Number(a.anneeDebut || String(a.nom).slice(0, 4))
        );

    select.innerHTML =
        saisons.map(
            saison =>
                `<option value="${echapperHtml(saison.id)}">${echapperHtml(saison.nom)}</option>`
        ).join("");

    select.value =
        ui.selectedSeason;
}

function changerSaisonAffichageAdherents(saisonId) {
    if (
        !state.saisons.some(
            saison =>
                saison.id === saisonId
        )
    ) {
        return;
    }

    ui.selectedSeason =
        saisonId;

    afficherAdherents();
}

function afficherBadgeGrade(
    grade
) {
    const nom =
        grade || "Blanc";

    const classes = {
        "Blanc": "grade-white",
        "Blanc-Jaune": "grade-white-yellow",
        "Jaune": "grade-yellow",
        "Jaune-Orange": "grade-yellow-orange",
        "Orange": "grade-orange",
        "Orange-Vert": "grade-orange-green",
        "Vert": "grade-green",
        "Vert-Bleu": "grade-green-blue",
        "Bleu": "grade-blue",
        "Bleu-Marron": "grade-blue-brown",
        "Marron": "grade-brown",
        "Noire": "grade-black"
    };

    return `
        <span class="grade-badge ${classes[nom] || "grade-white"}">
            <span class="grade-belt"></span>
            <span class="grade-name">${echapperHtml(nom)}</span>
        </span>
    `;
}

function obtenirEtatCertificat(inscription) {
    const certificat =
        inscription?.certificat ||
        inscription?.certificate ||
        {};

    if (!certificat.date && !certificat.expiry && !certificat.documentId && !certificat.fileName) {
        return "manquant";
    }

    const expiration =
        certificat.expiry ||
        calculerExpirationCertificat(certificat.date);

    if (!expiration) {
        return "manquant";
    }

    const dateExpiration =
        new Date(expiration + "T23:59:59");

    if (
        Number.isNaN(dateExpiration.getTime()) ||
        dateExpiration < new Date()
    ) {
        return "expire";
    }

    return "valide";
}

function afficherBadgePaiement(
    inscription
) {
    const etat =
        calculerEtatPaiement(
            inscription
        );

    if (etat === "paye") {
        return `
            <span class="badge success">
                Payé
            </span>
        `;
    }

    if (etat === "partiel") {
        return `
            <span class="badge warning">
                Partiel
            </span>
        `;
    }

    return `
        <span class="badge danger">
            Impayé
        </span>
    `;
}

function ouvrirNouvelAdherent() {
    if (
        !state ||
        !state.configuration.saisonActiveId
    ) {
        return;
    }

    const saison =
        state.saisons.find(
            element =>
                element.id ===
                state.configuration.saisonActiveId
        );

    if (!saison) {
        return;
    }

    reinitialiserFormulaireAdherent();
    remplirSelectGrade("Blanc");

    const titre =
        document.getElementById(
            "memberModalTitle"
        );

    const sousTitre =
        document.getElementById(
            "memberModalSubtitle"
        );

    const bouton =
        document.getElementById(
            "memberSaveButton"
        );

    if (titre) {
        titre.textContent =
            "Nouvel adhérent";
    }

    if (sousTitre) {
        sousTitre.textContent =
            `Inscription sur la saison ${saison.nom}`;
    }

    if (bouton) {
        bouton.textContent =
            "Créer l'adhérent";
    }

    activerFormulaireAdherent(
        true
    );

    ouvrirModalAdherent();

    mettreAJourResumeAdherent();
}

function ouvrirModificationAdherent(
    inscriptionId,
    parrainageUniquement = false
) {
    const inscription =
        state.inscriptions.find(
            element =>
                element.id ===
                inscriptionId
        );

    if (!inscription) {
        return;
    }

    const personne =
        state.personnes.find(
            element =>
                element.id ===
                inscription.personneId
        );

    if (!personne) {
        return;
    }

    const saisonActive =
        state.configuration.saisonActiveId;

    const editable =
        inscription.saisonId ===
        saisonActive;

    const champInscription =
        document.getElementById(
            "memberEnrollmentId"
        );

    const champPersonne =
        document.getElementById(
            "memberPersonId"
        );

    if (champInscription) {
        champInscription.value =
            inscription.id;
    }

    if (champPersonne) {
        champPersonne.value =
            personne.id;
    }

    definirValeur(
        "memberLastName",
        personne.lastName
    );

    definirValeur(
        "memberFirstName",
        personne.firstName
    );

    definirValeur(
        "memberBirthDate",
        personne.birthDate || ""
    );

    definirValeur(
        "memberCategory",
        inscription.category
    );

    definirValeur(
        "memberFrequency",
        inscription.frequency
    );

    definirCase(
        "memberVip",
        Boolean(
            inscription.vip
        )
    );

    remplirSelectGrade(inscription.grade || "Blanc");

    remplirSelectFamille(
        inscription.familyGroupId
    );

    remplirSelectParrain(
        inscription.referrerId,
        inscription.personneId
    );

    definirValeur(
        "memberFamilyGroup",
        inscription.familyGroupId || ""
    );

    definirValeur(
        "memberReferrer",
        inscription.referrerId || ""
    );

    const montantParrainage =
        obtenirMontantParrainage();

    const nombreParrainages =
        montantParrainage > 0
            ? Math.min(
                3,
                Math.round(
                    Number(
                        inscription.referralDiscountApplied ??
                        inscription.parrainageAcquis ??
                        0
                    ) / montantParrainage
                )
            )
            : 0;

    definirValeur(
        "memberReferralCount",
        nombreParrainages
    );

    definirValeur(
        "memberPaymentMethod",
        inscription.paymentMethod || ""
    );

    definirValeur(
        "memberPaidAmount",
        inscription.montantPaye || 0
    );

    const aides =
        inscription.aides || {};

    definirAideFormulaire(
        "aidAtout",
        aides.atoutNormandie ||
        aides.atout
    );

    definirAideFormulaire(
        "aidPassSport",
        aides.passSport
    );

    definirAideFormulaire(
        "aidKiosk",
        aides.kiosk
    );

    definirAideFormulaire(
        "aidSpot50",
        aides.spot50
    );

    definirCase(
        "familyDiscountEnabled",
        inscription.familyDiscountEnabled
    );

    definirValeur(
        "familyDiscountAmount",
        inscription.familyDiscountAmount ||
        inscription.reductionFamille ||
        0
    );

    const certificat =
        inscription.certificat ||
        inscription.certificate ||
        {};

    definirValeur(
        "certificateDate",
        certificat.date || ""
    );

    definirValeur(
        "certificateExpiry",
        certificat.expiry || ""
    );

    const nomCertificat =
        document.getElementById(
            "certificateFileName"
        );

    if (nomCertificat) {
        nomCertificat.textContent =
            certificat.fileName ||
            "Aucun fichier sélectionné.";
    }

    const titre =
        document.getElementById(
            "memberModalTitle"
        );

    const sousTitre =
        document.getElementById(
            "memberModalSubtitle"
        );

    const bouton =
        document.getElementById(
            "memberSaveButton"
        );

    if (titre) {
        titre.textContent =
            parrainageUniquement
                ? "Modifier le parrainage"
                : editable
                    ? "Modifier l'adhérent"
                    : "Consulter l'adhérent";
    }

    if (sousTitre) {
        const saison =
            state.saisons.find(
                element =>
                    element.id ===
                    inscription.saisonId
            );

        sousTitre.textContent =
            saison
                ? `Inscription sur la saison ${saison.nom}`
                : "Modification de l'adhérent";
    }

    if (bouton) {
        bouton.textContent =
            "Enregistrer les modifications";
    }

    if (typeof ui !== "undefined" && ui) {
        ui.currentCertificateId =
            certificat.documentId
                ? inscription.id
                : null;
    }

    afficherEtatCertificat(
        certificat
    );

    const apercuPhoto =
        document.getElementById(
            "photoPreview"
        );

    if (apercuPhoto) {
        apercuPhoto.textContent =
            "PHOTO";

        if (personne.photo) {
            const image =
                document.createElement(
                    "img"
                );

            image.alt =
                "Photo de l'adhérent";

            apercuPhoto.innerHTML =
                "";

            apercuPhoto.appendChild(
                image
            );

            afficherPhoto(
                personne.id,
                image
            );
        }
    }

    if (
        parrainageUniquement
    ) {
        activerFormulaireAdherent(
            false
        );

        const referrer =
            document.getElementById(
                "memberReferrer"
            );

        if (referrer) {
            referrer.disabled = false;
        }

        const bouton =
            document.getElementById(
                "memberSaveButton"
            );

        if (bouton) {
            bouton.disabled = false;
        }
    } else {
        activerFormulaireAdherent(
            editable
        );

        const montantPaye =
            document.getElementById(
                "memberPaidAmount"
            );

        if (montantPaye) {
            montantPaye.disabled =
                editable &&
                Boolean(inscriptionId);
        }

        const modePaiement =
            document.getElementById(
                "memberPaymentMethod"
            );

        if (modePaiement) {
            modePaiement.disabled =
                editable &&
                Boolean(inscriptionId);
        }
    }

    ouvrirModalAdherent();

    mettreAJourResumeAdherent();
}

const GRADES = [
    "Blanc",
    "Blanc-Jaune",
    "Jaune",
    "Jaune-Orange",
    "Orange",
    "Orange-Vert",
    "Vert",
    "Vert-Bleu",
    "Bleu",
    "Bleu-Marron",
    "Marron",
    "Noire"
];

function afficherApercuGrade(grade) {
    const apercu =
        document.getElementById(
            "memberGradePreview"
        );

    if (!apercu) {
        return;
    }

    const nom =
        grade || "Blanc";

    const classes = {
        "Blanc": "grade-white",
        "Blanc-Jaune": "grade-white-yellow",
        "Jaune": "grade-yellow",
        "Jaune-Orange": "grade-yellow-orange",
        "Orange": "grade-orange",
        "Orange-Vert": "grade-orange-green",
        "Vert": "grade-green",
        "Vert-Bleu": "grade-green-blue",
        "Bleu": "grade-blue",
        "Bleu-Marron": "grade-blue-brown",
        "Marron": "grade-brown",
        "Noire": "grade-black"
    };

    apercu.innerHTML = `
        <span class="grade-badge large ${classes[nom] || "grade-white"}">
            <span class="grade-belt"></span>
            <span class="grade-name">${echapperHtml(nom)}</span>
        </span>
        <span class="grade-preview-text">Niveau actuel</span>
    `;
}

function remplirSelectGrade(valeur = "Blanc") {
    const select = document.getElementById("memberGrade");
    if (!select) {
        return;
    }

    const valeurActuelle = valeur || select.value || "Blanc";

    select.innerHTML = GRADES
        .map(grade => `<option value="${echapperHtml(grade)}">${echapperHtml(grade)}</option>`)
        .join("");

    select.value = GRADES.includes(valeurActuelle)
        ? valeurActuelle
        : "Blanc";

    afficherApercuGrade(select.value);
}

function reinitialiserFormulaireAdherent() {
    const formulaire =
        document.getElementById(
            "memberForm"
        );

    if (formulaire) {
        formulaire.reset();
    }

    definirValeur(
        "memberEnrollmentId",
        ""
    );

    definirValeur(
        "memberPersonId",
        ""
    );

    definirValeur(
        "memberGrade",
        "Blanc"
    );

    definirValeur(
        "memberCategory",
        ""
    );

    definirCase(
        "memberVip",
        false
    );

    definirValeur(
        "familyDiscountAmount",
        state.configuration?.reductionFamille ??
        state.configuration?.familyDiscount ??
        20
    );

    definirValeur(
        "aidAtoutAmount",
        state.configuration?.aides?.atout ??
        state.configuration?.aides?.atoutNormandie ??
        50
    );

    definirValeur(
        "aidPassSportAmount",
        state.configuration?.aides?.passSport ??
        50
    );

    definirValeur(
        "aidKioskAmount",
        state.configuration?.aides?.kiosk ??
        50
    );

    definirValeur(
        "aidSpot50Amount",
        state.configuration?.aides?.spot50 ??
        50
    );

    remplirSelectFamille(
        null
    );

    remplirSelectParrain(
        null
    );

    definirValeur(
        "memberReferralCount",
        "0"
    );

    definirCase(
        "aidAtoutEnabled",
        false
    );

    definirCase(
        "aidPassSportEnabled",
        false
    );

    definirCase(
        "aidKioskEnabled",
        false
    );

    definirCase(
        "aidSpot50Enabled",
        false
    );

    definirCase(
        "familyDiscountEnabled",
        false
    );

    const certificatNom =
        document.getElementById(
            "certificateFileName"
        );

    if (certificatNom) {
        certificatNom.textContent =
            "Aucun fichier sélectionné.";
    }

    const certificatTitre =
        document.getElementById(
            "certificateStatusTitle"
        );

    if (certificatTitre) {
        certificatTitre.textContent =
            "Aucun certificat enregistré";
    }

    const certificatTexte =
        document.getElementById(
            "certificateStatusText"
        );

    if (certificatTexte) {
        certificatTexte.textContent =
            "Ajoutez le PDF du certificat médical.";
    }

    const boutonCertificat =
        document.getElementById(
            "viewCertificateButton"
        );

    if (boutonCertificat) {
        boutonCertificat.classList.add(
            "hidden"
        );
    }

    const photo =
        document.getElementById(
            "photoPreview"
        );

    if (photo) {
        photo.textContent =
            "PHOTO";
    }

    if (
        typeof ui !== "undefined" &&
        ui
    ) {
        ui.editingEnrollmentId =
            null;

        ui.memberPhotoData =
            null;

        ui.currentCertificateId =
            null;
    }
}

async function enregistrerAdherentDepuisFormulaire(
    event
) {
    if (event) {
        event.preventDefault();
    }

    if (
        !state ||
        typeof window.fbac === "undefined"
    ) {
        notificationErreur(
            "Le système de sauvegarde est indisponible."
        );
        return;
    }

    const saisonId =
        state.configuration.saisonActiveId;

    if (!saisonId) {
        notificationErreur(
            "Aucune saison active."
        );
        return;
    }

    const saison =
        state.saisons.find(
            element =>
                element.id ===
                saisonId
        );

    if (!saison) {
        notificationErreur(
            "Saison active introuvable."
        );
        return;
    }

    const inscriptionId =
        obtenirValeur(
            "memberEnrollmentId"
        );

    const personneId =
        obtenirValeur(
            "memberPersonId"
        );

    const inscriptionExistante =
        inscriptionId
            ? state.inscriptions.find(
                inscription =>
                    inscription.id ===
                    inscriptionId
            )
            : null;

    if (
        inscriptionExistante &&
        inscriptionExistante.saisonId !==
            saisonId
    ) {
        try {
            await window.fbac.modifierInscription(
                inscriptionExistante.id,
                {
                    referrerId:
                        obtenirValeur(
                            "memberReferrer"
                        ) || null
                }
            );

            inscriptionExistante.referrerId =
                obtenirValeur(
                    "memberReferrer"
                ) || null;

            await sauvegarderEtat();

            fermerModalAdherent();
            renderCurrentPage();

            notificationSucces(
                "Parrainage modifié avec succès."
            );
        } catch (error) {
            console.error(
                "Erreur lors de la modification du parrainage :",
                error
            );

            notificationErreur(
                error.message ||
                "Impossible de modifier le parrainage."
            );
        }

        return;
    }

    const nom =
        obtenirValeur(
            "memberLastName"
        ).trim();

    const prenom =
        obtenirValeur(
            "memberFirstName"
        ).trim();

    if (!nom || !prenom) {
        notificationErreur(
            "Le nom et le prénom sont obligatoires."
        );
        return;
    }

    const dateNaissance =
        obtenirValeur(
            "memberBirthDate"
        ) || "";

    const categorie =
        obtenirValeur(
            "memberCategory"
        ) || "adulte";

    const frequence =
        obtenirValeur(
            "memberFrequency"
        ) || "1";

    const grade =
        obtenirValeur(
            "memberGrade"
        ) || "Blanc";

    const famille =
        obtenirValeur(
            "memberFamilyGroup"
        ) || null;

    const parrain =
        obtenirValeur(
            "memberReferrer"
        ) || null;

    const paiement =
        obtenirValeur(
            "memberPaymentMethod"
        ) || "";

    const montantPaye =
        Number(
            obtenirValeur(
                "memberPaidAmount"
            ) || 0
        );

    const aides = {
        atoutNormandie: {
            enabled:
                obtenirCase(
                    "aidAtoutEnabled"
                ),
            amount:
                Number(
                    obtenirValeur(
                        "aidAtoutAmount"
                    ) || 0
                )
        },
        passSport: {
            enabled:
                obtenirCase(
                    "aidPassSportEnabled"
                ),
            amount:
                Number(
                    obtenirValeur(
                        "aidPassSportAmount"
                    ) || 0
                )
        },
        kiosk: {
            enabled:
                obtenirCase(
                    "aidKioskEnabled"
                ),
            amount:
                Number(
                    obtenirValeur(
                        "aidKioskAmount"
                    ) || 0
                )
        },
        spot50: {
            enabled:
                obtenirCase(
                    "aidSpot50Enabled"
                ),
            amount:
                Number(
                    obtenirValeur(
                        "aidSpot50Amount"
                    ) || 0
                )
        }
    };

    const reductionFamilleActive =
        obtenirCase(
            "familyDiscountEnabled"
        );

    const reductionFamille =
        Number(
            obtenirValeur(
                "familyDiscountAmount"
            ) || 0
        );

    const dateCertificat =
        obtenirValeur(
            "certificateDate"
        );

    const expirationCertificat =
        dateCertificat
            ? calculerExpirationCertificat(
                dateCertificat
            )
            : "";

    let personne = null;

    try {
        if (personneId) {
            personne =
                state.personnes.find(
                    element =>
                        element.id ===
                        personneId
                );

            if (!personne) {
                throw new Error(
                    "Personne introuvable."
                );
            }

            personne.firstName =
                prenom;

            personne.lastName =
                nom;

            personne.birthDate =
                dateNaissance;

            await window.fbac.modifierPersonne(
                personne.id,
                convertirPersonnePourBackend(
                    personne
                )
            );
        } else {
            personne =
                await window.fbac.creerPersonne({
                    firstName: prenom,
                    lastName: nom,
                    birthDate: dateNaissance,
                    photo: null
                });

            personne =
                normaliserPersonneLocale(
                    personne
                );

            state.personnes.push(
                personne
            );
        }

        let inscription = inscriptionId
            ? state.inscriptions.find(
                element =>
                    element.id ===
                    inscriptionId
            )
            : null;

        if (!inscription) {
            inscription = {
                id: genererIdentifiant(
                    "inscription"
                ),
                personneId:
                    personne.id,
                saisonId:
                    saisonId,
                category:
                    categorie,
                frequency:
                    frequence,
                grade,
                vip:
                    obtenirCase(
                        "memberVip"
                    ),
                familyGroupId:
                    famille,
                referrerId:
                    parrain,
                parrainageAcquis: 0,
                referralDiscountApplied: 0,
                aides,
                reductionFamille:
                    reductionFamilleActive
                        ? reductionFamille
                        : 0,
                familyDiscountEnabled:
                    reductionFamilleActive,
                familyDiscountAmount:
                    reductionFamilleActive
                        ? reductionFamille
                        : 0,
                montantPaye:
                    montantPaye,
                paiements:
                    montantPaye > 0
                        ? [{
                            id:
                                genererIdentifiant("paiement"),
                            date:
                                new Date().toISOString().slice(0, 10),
                            amount:
                                montantPaye,
                            method:
                                paiement
                        }]
                        : [],
                paidAmount:
                    montantPaye,
                paymentMethod:
                    paiement,
                certificat: {
                    date:
                        dateCertificat,
                    expiry:
                        expirationCertificat,
                    fileName: "",
                    documentId:
                        null,
                    mimeType:
                        ""
                }
            };

            const backend =
                await window.fbac.creerInscription(
                    convertirInscriptionPourBackend(
                        inscription
                    )
                );

            inscription.id =
                backend?.id ||
                inscription.id;

            state.inscriptions.push(
                inscription
            );
        } else {
            inscription.personneId =
                personne.id;

            inscription.saisonId =
                saisonId;

            inscription.category =
                categorie;

            inscription.frequency =
                frequence;

            inscription.grade =
                grade;

            inscription.vip =
                obtenirCase(
                    "memberVip"
                );

            inscription.familyGroupId =
                famille;

            inscription.referrerId =
                parrain;

            inscription.parrainageAcquis = 0;

            inscription.referralDiscountApplied = 0;

            inscription.aides =
                aides;

            inscription.reductionFamille =
                reductionFamilleActive
                    ? reductionFamille
                    : 0;

            inscription.familyDiscountEnabled =
                reductionFamilleActive;

            inscription.familyDiscountAmount =
                reductionFamilleActive
                    ? reductionFamille
                    : 0;

            inscription.montantPaye =
                montantPaye;

            inscription.paidAmount =
                montantPaye;

            inscription.paymentMethod =
                paiement;

            inscription.certificat =
                inscription.certificat ||
                {
                    date: "",
                    expiry: "",
                    fileName: "",
                    documentId: null,
                    mimeType: ""
                };

            inscription.certificat.date =
                dateCertificat;

            inscription.certificat.expiry =
                expirationCertificat;

            await window.fbac.modifierInscription(
                inscription.id,
                convertirInscriptionPourBackend(
                    inscription
                )
            );
        }

        await enregistrerPhotoDepuisFormulaire(
            personne
        );

        await enregistrerCertificatDepuisFormulaire(
            inscription
        );

        if (
            inscription.certificat
        ) {
            await window.fbac.modifierInscription(
                inscription.id,
                convertirInscriptionPourBackend(
                    inscription
                )
            );
        }

        await sauvegarderEtat();

        fermerModalAdherent();

        renderCurrentPage();

        notificationSucces(
            inscriptionId
                ? "Adhérent modifié avec succès."
                : "Adhérent créé avec succès."
        );
    } catch (error) {
        console.error(
            "Erreur lors de l'enregistrement de l'adhérent :",
            error
        );

        notificationErreur(
            error.message ||
            "Impossible d'enregistrer l'adhérent."
        );
    }
}

async function enregistrerPhotoDepuisFormulaire(
    personne
) {
    const champ =
        document.getElementById(
            "memberPhoto"
        );

    if (
        !champ ||
        !champ.files ||
        !champ.files[0]
    ) {
        return;
    }

    const fichier =
        champ.files[0];

    const contenu =
        await fichierEnDataUrl(
            fichier
        );

    const resultat =
        await window.fbac.enregistrerPhoto(
            personne.id,
            contenu,
            fichier.name,
            fichier.type
        );

    personne.photo =
        resultat.fileName ||
        personne.photo ||
        null;

    await window.fbac.modifierPersonne(
        personne.id,
        convertirPersonnePourBackend(
            personne
        )
    );
}

async function enregistrerCertificatDepuisFormulaire(
    inscription
) {
    const champ =
        document.getElementById(
            "certificateFile"
        );

    if (
        !champ ||
        !champ.files ||
        !champ.files[0]
    ) {
        return;
    }

    const fichier =
        champ.files[0];

    if (
        fichier.type &&
        fichier.type !==
            "application/pdf"
    ) {
        throw new Error(
            "Le certificat doit être un fichier PDF."
        );
    }

    const contenu =
        await fichierEnDataUrl(
            fichier
        );

    const resultat =
        await window.fbac.enregistrerCertificat(
            inscription.id,
            contenu
        );

    inscription.certificat =
        inscription.certificat ||
        {};

    inscription.certificat.documentId =
        inscription.id;

    inscription.certificat.fileName =
        fichier.name;

    inscription.certificat.mimeType =
        fichier.type ||
        resultat.mimeType ||
        "application/pdf";
}

async function supprimerAdherent(
    inscriptionId
) {
    const inscription =
        state.inscriptions.find(
            element =>
                element.id ===
                inscriptionId
        );

    if (!inscription) {
        return;
    }

    if (
        inscription.saisonId !==
        state.configuration.saisonActiveId
    ) {
        notificationErreur(
            "Impossible de supprimer une inscription historique."
        );
        return;
    }

    const personne =
        state.personnes.find(
            element =>
                element.id ===
                inscription.personneId
        );

    const nom =
        personne
            ? `${personne.firstName} ${personne.lastName}`.trim()
            : "cet adhérent";

    if (
        !window.confirm(
            `Supprimer l'inscription de ${nom} pour la saison active ?\n\nLa personne et son historique resteront conservés.`
        )
    ) {
        return;
    }

    try {
        await window.fbac.supprimerInscription(
            inscriptionId
        );

        state.inscriptions =
            state.inscriptions.filter(
                element =>
                    element.id !==
                    inscriptionId
            );

        await sauvegarderEtat();

        renderCurrentPage();

        notificationSucces(
            "Inscription supprimée. L'adhérent reste dans l'historique."
        );
    } catch (error) {
        console.error(
            "Erreur lors de la suppression :",
            error
        );

        notificationErreur(
            error.message ||
            "Impossible de supprimer l'inscription."
        );
    }
}

function ouvrirReinscription() {
    const select =
        document.getElementById(
            "reenrollPersonSelect"
        );

    if (!select) {
        return;
    }

    const saisonActive =
        state.configuration.saisonActiveId;

    const personnesDisponibles =
        state.personnes.filter(
            personne =>
                !state.inscriptions.some(
                    inscription =>
                        inscription.personneId ===
                            personne.id &&
                        inscription.saisonId ===
                            saisonActive
                ) &&
                state.inscriptions.some(
                    inscription =>
                        inscription.personneId ===
                        personne.id
                )
        );

    select.innerHTML =
        `
            <option value="">
                Sélectionner un adhérent
            </option>
        ` +
        personnesDisponibles
            .map(
                personne =>
                    `
                    <option value="${echapperHtml(
                        personne.id
                    )}">
                        ${echapperHtml(
                            `${personne.firstName} ${personne.lastName}`.trim()
                        )}
                    </option>
                `
            )
            .join("");

    mettreAJourInformationReinscription();

    ouvrirModalParId(
        "reenrollModal"
    );
}

async function confirmerReinscription() {
    const personneId =
        obtenirValeur(
            "reenrollPersonSelect"
        );

    if (!personneId) {
        notificationErreur(
            "Sélectionnez un adhérent."
        );
        return;
    }

    const saisonId =
        state.configuration.saisonActiveId;

    if (!saisonId) {
        return;
    }

    if (
        state.inscriptions.some(
            inscription =>
                inscription.personneId ===
                    personneId &&
                inscription.saisonId ===
                    saisonId
        )
    ) {
        notificationErreur(
            "Cet adhérent est déjà inscrit pour cette saison."
        );
        return;
    }

    const anciennes =
        state.inscriptions
            .filter(
                inscription =>
                    inscription.personneId ===
                    personneId
            )
            .sort(
                (a, b) =>
                    obtenirNomSaisonDepuisId(
                        b.saisonId
                    ).localeCompare(
                        obtenirNomSaisonDepuisId(
                            a.saisonId
                        )
                    )
            );

    const ancienne =
        anciennes[0];

    if (!ancienne) {
        notificationErreur(
            "Aucune ancienne inscription trouvée."
        );
        return;
    }

    const saisonPrecedente =
        obtenirSaisonPrecedente(
            saisonId
        );

    const parrainage =
        calculerParrainageAcquis(
            personneId,
            saisonPrecedente
        );

    const nouvelle = {
        id:
            genererIdentifiant(
                "inscription"
            ),
        personneId,
        saisonId,
        category:
            ancienne.category ||
            "adulte",
        frequency:
            ancienne.frequency ||
            "1",
        grade:
            ancienne.grade ||
            "Blanc",
        familyGroupId:
            null,
        referrerId:
            null,
        parrainageAcquis:
            parrainage,
        referralDiscountApplied:
            parrainage,
        aides: {
            atoutNormandie: {
                enabled: false,
                amount: 50
            },
            passSport: {
                enabled: false,
                amount: 50
            },
            kiosk: {
                enabled: false,
                amount: 50
            },
            spot50: {
                enabled: false,
                amount: 50
            }
        },
        reductionFamille: 20,
        familyDiscountEnabled:
            false,
        familyDiscountAmount:
            20,
        montantPaye:
            0,
        paiements:
            [],
        paidAmount:
            0,
        paymentMethod:
            "",
        certificat: {
            date: "",
            expiry: "",
            fileName: "",
            documentId: null,
            mimeType: ""
        }
    };

    try {
        const backend =
            await window.fbac.creerInscription(
                convertirInscriptionPourBackend(
                    nouvelle
                )
            );

        nouvelle.id =
            backend.id ||
            nouvelle.id;

        state.inscriptions.push(
            nouvelle
        );

        await sauvegarderEtat();

        fermerModalParId(
            "reenrollModal"
        );

        renderCurrentPage();

        notificationSucces(
            "Adhérent réinscrit avec succès."
        );
    } catch (error) {
        console.error(
            "Erreur lors de la réinscription :",
            error
        );

        notificationErreur(
            error.message ||
            "Impossible de réinscrire cet adhérent."
        );
    }
}

function mettreAJourInformationReinscription() {
    const personneId =
        obtenirValeur(
            "reenrollPersonSelect"
        );

    const conteneur =
        document.getElementById(
            "reenrollInfo"
        );

    if (!conteneur) {
        return;
    }

    if (!personneId) {
        conteneur.textContent =
            "Sélectionnez un ancien adhérent.";
        return;
    }

    const personne =
        state.personnes.find(
            element =>
                element.id ===
                personneId
        );

    const anciennes =
        state.inscriptions
            .filter(
                inscription =>
                    inscription.personneId ===
                    personneId
            )
            .sort(
                (a, b) =>
                    obtenirNomSaisonDepuisId(
                        b.saisonId
                    ).localeCompare(
                        obtenirNomSaisonDepuisId(
                            a.saisonId
                        )
                    )
            );

    const ancienne =
        anciennes[0];

    const saisonPrecedente =
        obtenirSaisonPrecedente(
            state.configuration.saisonActiveId
        );

    const avantage =
        calculerParrainageAcquis(
            personneId,
            saisonPrecedente
        );

    conteneur.innerHTML = `
        <strong>
            ${echapperHtml(
                personne
                    ? `${personne.firstName} ${personne.lastName}`.trim()
                    : ""
            )}
        </strong>
        <br><br>
        Dernier grade :
        ${echapperHtml(
            ancienne?.grade || "—"
        )}
        <br>
        Dernière saison :
        ${echapperHtml(
            obtenirNomSaisonDepuisId(
                ancienne?.saisonId
            ) || "—"
        )}
        <br>
        Fréquence :
        ${echapperHtml(
            ancienne?.frequency || "—"
        )}
        cours/semaine
        <br><br>
        ${
            avantage
                ? `<span class="badge success">Avantage parrainage applicable : -${avantage.toFixed(2)} €</span>`
                : `<span class="badge">Aucun avantage de parrainage applicable</span>`
        }
    `;
}

function mettreAJourResumeAdherent() {
    const dateNaissance =
        obtenirValeur("memberBirthDate");

    const categorieAutomatique =
        determinerCategorieDepuisDateNaissance(
            dateNaissance
        );

    if (categorieAutomatique) {
        definirValeur(
            "memberCategory",
            categorieAutomatique
        );
    }

    const categorie =
        categorieAutomatique ||
        obtenirValeur("memberCategory");

    if (categorie === "enfant") {
        definirValeur(
            "memberFrequency",
            "1"
        );
    }

    const frequence =
        obtenirValeur("memberFrequency");

    const vip =
        obtenirCase("memberVip");

    const aides = {
        atoutNormandie: {
            enabled:
                obtenirCase("aidAtoutEnabled"),
            amount:
                Number(
                    obtenirValeur(
                        "aidAtoutAmount"
                    ) || 0
                )
        },
        passSport: {
            enabled:
                obtenirCase("aidPassSportEnabled"),
            amount:
                Number(
                    obtenirValeur(
                        "aidPassSportAmount"
                    ) || 0
                )
        },
        kiosk: {
            enabled:
                obtenirCase("aidKioskEnabled"),
            amount:
                Number(
                    obtenirValeur(
                        "aidKioskAmount"
                    ) || 0
                )
        },
        spot50: {
            enabled:
                obtenirCase("aidSpot50Enabled"),
            amount:
                Number(
                    obtenirValeur(
                        "aidSpot50Amount"
                    ) || 0
                )
        }
    };

    const reductionFamille =
        obtenirCase("familyDiscountEnabled")
            ? Number(
                obtenirValeur(
                    "familyDiscountAmount"
                ) || 0
            )
            : 0;

    const parrainageAcquis = 0;

    const montantPaye =
        Number(
            obtenirValeur(
                "memberPaidAmount"
            ) || 0
        );

    const inscription = {
        category: categorie,
        frequency: frequence,
        vip,
        aides,
        reductionFamille,
        parrainageAcquis,
        referralDiscountApplied:
            parrainageAcquis,
        montantPaye
    };

    const tarif =
        vip
            ? 0
            : categorie
                ? calculerTarif(
                    categorie,
                    frequence
                )
                : 0;

    inscription.tarif =
        tarif;

    const aidesEffectives =
        obtenirAidesEffectives(
            inscription
        );

    const nomsAides = [
        ["aidAtoutAmount", "atoutNormandie"],
        ["aidPassSportAmount", "passSport"],
        ["aidKioskAmount", "kiosk"],
        ["aidSpot50Amount", "spot50"]
    ];

    nomsAides.forEach(
        ([id, nom]) => {
            const montant =
                aidesEffectives.details[nom] || 0;

            if (
                aides[nom]?.enabled &&
                Number(
                    obtenirValeur(id) || 0
                ) !== montant
            ) {
                definirValeur(
                    id,
                    montant
                );
            }
        }
    );

    const montant =
        calculerMontantAPayer(
            inscription
        );

    const reste =
        Math.max(
            0,
            montant -
            montantPaye
        );

    const surpaiement =
        Math.max(
            0,
            montantPaye -
            montant
        );

    document
        .getElementById(
            "summaryBasePrice"
        )
        ?.replaceChildren(
            document.createTextNode(
                `${tarif.toFixed(2)} €`
            )
        );

    document
        .getElementById(
            "summaryAids"
        )
        ?.replaceChildren(
            document.createTextNode(
                `${aidesEffectives.total.toFixed(2)} €`
            )
        );

    document
        .getElementById(
            "summaryAidAtout"
        )
        ?.replaceChildren(
            document.createTextNode(
                `${(aidesEffectives.details.atoutNormandie || 0).toFixed(2)} €`
            )
        );

    document
        .getElementById(
            "summaryAidPassSport"
        )
        ?.replaceChildren(
            document.createTextNode(
                `${(aidesEffectives.details.passSport || 0).toFixed(2)} €`
            )
        );

    document
        .getElementById(
            "summaryAidKiosk"
        )
        ?.replaceChildren(
            document.createTextNode(
                `${(aidesEffectives.details.kiosk || 0).toFixed(2)} €`
            )
        );

    document
        .getElementById(
            "summaryAidSpot50"
        )
        ?.replaceChildren(
            document.createTextNode(
                `${(aidesEffectives.details.spot50 || 0).toFixed(2)} €`
            )
        );

    document
        .getElementById(
            "summaryFamily"
        )
        ?.replaceChildren(
            document.createTextNode(
                `-${reductionFamille.toFixed(2)} €`
            )
        );

    document
        .getElementById(
            "summaryReferral"
        )
        ?.replaceChildren(
            document.createTextNode(
                `-${parrainageAcquis.toFixed(2)} €`
            )
        );

    document
        .getElementById(
            "summaryDue"
        )
        ?.replaceChildren(
            document.createTextNode(
                `${montant.toFixed(2)} €`
            )
        );

    document
        .getElementById(
            "summaryPaid"
        )
        ?.replaceChildren(
            document.createTextNode(
                `${montantPaye.toFixed(2)} €`
            )
        );

    document
        .getElementById(
            "summaryRemaining"
        )
        ?.replaceChildren(
            document.createTextNode(
                `${reste.toFixed(2)} €`
            )
        );

    const ligneSurpaiement =
        document.getElementById(
            "summaryOverpaymentLine"
        );

    if (ligneSurpaiement) {
        ligneSurpaiement.classList.toggle(
            "hidden",
            surpaiement <= 0
        );
    }

    document
        .getElementById(
            "summaryOverpayment"
        )
        ?.replaceChildren(
            document.createTextNode(
                `${surpaiement.toFixed(2)} €`
            )
        );
}

function obtenirFamille(familleId, saisonId = state.configuration.saisonActiveId) {
    if (!familleId) {
        return null;
    }

    return state.familles?.find(
        famille =>
            famille.id === familleId &&
            (!saisonId || famille.saisonId === saisonId)
    ) || null;
}

function obtenirMembresFamille(familleId, saisonId = state.configuration.saisonActiveId) {
    if (!familleId) {
        return [];
    }

    return state.inscriptions
        .filter(
            inscription =>
                inscription.familyGroupId === familleId &&
                (!saisonId || inscription.saisonId === saisonId)
        )
        .map(
            inscription => {
                const personne =
                    state.personnes.find(
                        element =>
                            element.id === inscription.personneId
                    );

                return personne
                    ? {
                        inscription,
                        personne
                    }
                    : null;
            }
        )
        .filter(Boolean);
}

function obtenirNomFamille(familleId) {
    return obtenirFamille(familleId)?.nom || "Famille";
}

function genererAffichageFamille(inscription) {
    if (!inscription.familyGroupId) {
        return "—";
    }

    const famille =
        obtenirFamille(
            inscription.familyGroupId,
            inscription.saisonId
        );

    const membres =
        obtenirMembresFamille(
            inscription.familyGroupId,
            inscription.saisonId
        );

    const libelle =
        famille?.nom ||
        "Famille";

    return `
        <button type="button" class="family-link" data-action="voir-famille" data-id="${echapperHtml(inscription.familyGroupId)}">
            <span class="family-name">${echapperHtml(libelle)}</span>
            <span class="family-count">${membres.length} membre${membres.length > 1 ? "s" : ""}</span>
        </button>
    `;
}

function remplirSelectFamille(familleId) {
    const select =
        document.getElementById(
            "memberFamilyGroup"
        );

    if (!select) {
        return;
    }

    const saisonId = state.configuration.saisonActiveId;

    let familles =
        Array.isArray(state.familles)
            ? [...state.familles]
                .filter(famille => famille.saisonId === saisonId)
                .sort((a, b) =>
                    String(a.nom).localeCompare(
                        String(b.nom),
                        "fr",
                        { sensitivity: "base" }
                    )
                )
            : [];

    const inscriptionId = document.getElementById("memberEnrollmentId")?.value;
    const inscription = state.inscriptions.find(element => element.id === inscriptionId);
    const familleHistorique = inscription?.familyGroupId
        ? state.familles.find(famille =>
            famille.id === inscription.familyGroupId &&
            famille.saisonId === inscription.saisonId
        )
        : null;

    if (
        familleHistorique &&
        !familles.some(famille => famille.id === familleHistorique.id)
    ) {
        familles = [familleHistorique, ...familles];
    }

    select.innerHTML =
        `
            <option value="">
                Aucune famille
            </option>
        ` +
        familles
            .map(
                famille => {
                    const membres =
                        obtenirMembresFamille(
                            famille.id,
                            state.configuration.saisonActiveId
                        );

                    const noms =
                        membres
                            .slice(0, 3)
                            .map(
                                membre =>
                                    `${membre.personne.firstName} ${membre.personne.lastName}`.trim()
                            )
                            .join(", ");

                    const suffixe =
                        membres.length > 3
                            ? ` + ${membres.length - 3}`
                            : "";

                    return `
                        <option value="${echapperHtml(famille.id)}">
                            ${echapperHtml(famille.nom)} — ${echapperHtml(noms || "aucun membre")}${echapperHtml(suffixe)}
                        </option>
                    `;
                }
            )
            .join("");

    select.value =
        familleId || "";
    mettreAJourBoutonSuppressionFamille();
}

function mettreAJourBoutonSuppressionFamille() {
    const select = document.getElementById("memberFamilyGroup");
    const bouton = document.getElementById("deleteFamilyFromMemberButton");
    if (!select || !bouton) {
        return;
    }
    const familleId = select.value;
    const famille = state.familles.find(element =>
        element.id === familleId &&
        element.saisonId === state.configuration.saisonActiveId
    );
    bouton.disabled = !familleId || !famille;
}

async function supprimerFamilleDepuisFormulaire() {
    const select = document.getElementById("memberFamilyGroup");
    if (!select || !select.value) {
        return;
    }
    const familleId = select.value;
    const famille = state.familles.find(element =>
        element.id === familleId &&
        element.saisonId === state.configuration.saisonActiveId
    );
    if (!famille) {
        notificationErreur("Cette famille ne peut pas être supprimée.");
        mettreAJourBoutonSuppressionFamille();
        return;
    }
    if (!confirm("Supprimer le groupe famille « " + famille.nom + " » ? Les adhérents seront conservés, mais ne seront plus rattachés à ce groupe.")) {
        return;
    }
    try {
        await window.fbac.supprimerFamille(familleId);
        state.familles = state.familles.filter(element => element.id !== familleId);
        select.value = "";
        remplirSelectFamille("");
        mettreAJourBoutonSuppressionFamille();
        mettreAJourResumeAdherent();
        notificationSucces("La famille « " + famille.nom + " » a été supprimée.");
    } catch (error) {
        console.error("Erreur lors de la suppression de la famille depuis la fiche :", error);
        notificationErreur(error?.message || "Impossible de supprimer la famille.");
    }
}

async function creerNouvelleFamilleDepuisFormulaire() {
    const nomInput =
        document.getElementById(
            "newFamilyName"
        );

    const nom =
        nomInput?.value?.trim() || "";

    if (!nom) {
        notificationErreur("Le nom de la famille est obligatoire.");
        return;
    }

    try {
        const saisonId =
            state.configuration.saisonActiveId;

        if (!saisonId) {
            notificationErreur("Aucune saison active n'est disponible.");
            return;
        }

        const famille =
            await window.fbac.creerFamille({
                nom,
                saisonId
            });

        state.familles =
            Array.isArray(state.familles)
                ? [...state.familles, famille]
                : [famille];

        fermerModalParId("familyCreateModal");

        if (nomInput) {
            nomInput.value = "";
        }

        remplirSelectFamille(famille.id);
        mettreAJourResumeAdherent();

        notificationSucces(
            `La famille « ${famille.nom} » a été créée.`
        );
    } catch (error) {
        console.error(
            "Erreur lors de la création de la famille :",
            error
        );

        notificationErreur(
            error?.message ||
            "Impossible de créer la famille."
        );
    }
}
function ouvrirCreationFamille() {
    const saisonActiveId = state.configuration.saisonActiveId;
    const inscriptionId = document.getElementById("memberEnrollmentId")?.value;
    const inscription = state.inscriptions.find(element => element.id === inscriptionId);

    if (inscription && inscription.saisonId !== saisonActiveId) {
        notificationErreur("Une famille ne peut être créée que pour la saison active.");
        return;
    }

    const input =
        document.getElementById("newFamilyName");

    if (input) {
        input.value = "";
        setTimeout(
            () => input.focus(),
            0
        );
    }

    ouvrirModalParId("familyCreateModal");
}

function afficherFamille(familleId) {
    const saisonId = ui.selectedSeason || state.configuration.saisonActiveId;
    const famille =
        obtenirFamille(familleId, saisonId);

    if (!famille) {
        notificationErreur("Famille introuvable.");
        return;
    }

    const membres =
        obtenirMembresFamille(
            familleId,
            saisonId
        );

    const contenu =
        document.getElementById("familyViewerBody");

    const nom =
        document.getElementById("familyViewerName");

    if (nom) {
        nom.textContent =
            `${famille.nom} — ${membres.length} membre${membres.length > 1 ? "s" : ""}`;
    }

    if (contenu) {
        contenu.innerHTML =
            membres.length
                ? membres.map(
                    ({ inscription, personne }) => `
                        <div class="family-member-row">
                            <div>
                                <strong>${echapperHtml(`${personne.firstName} ${personne.lastName}`.trim())}</strong>
                                <span>${echapperHtml(inscription.category === "enfant" ? "Enfant" : "Adulte")} · ${echapperHtml(inscription.frequency || "1")} cours/semaine</span>
                            </div>
                            <button type="button" class="btn btn-small" data-action="modifier-adherent" data-id="${echapperHtml(inscription.id)}">Voir</button>
                        </div>
                    `
                ).join("")
                : `
                    <div class="empty-state">
                        Aucun membre dans cette famille pour la saison sélectionnée.
                    </div>
                `;
    }

    const supprimer = document.getElementById("deleteFamilyButton");
    if (supprimer) {
        supprimer.dataset.familyId = familleId;
        supprimer.disabled =
            famille.saisonId !== state.configuration.saisonActiveId;
        supprimer.title =
            famille.saisonId !== state.configuration.saisonActiveId
                ? "Les familles historiques ne peuvent pas être supprimées."
                : "Supprimer cette famille et retirer son rattachement aux adhérents";
    }

    ouvrirModalParId("familyViewerModal");
}

async function supprimerFamilleDepuisInterface(familleId) {
    const famille = obtenirFamille(familleId, state.configuration.saisonActiveId);
    if (!famille) {
        notificationErreur("Famille introuvable.");
        return;
    }

    if (famille.saisonId !== state.configuration.saisonActiveId) {
        notificationErreur("Une famille historique ne peut pas être supprimée.");
        return;
    }

    if (!confirm("Supprimer le groupe famille « " + famille.nom + " » ? Les adhérents seront conservés, mais ne seront plus rattachés à ce groupe.")) {
        return;
    }

    try {
        await window.fbac.supprimerFamille(familleId);
        state.familles = state.familles.filter(element => element.id !== familleId);
        fermerModalParId("familyViewerModal");
        renderCurrentPage();
        notificationSucces("La famille « " + famille.nom + " » a été supprimée.");
    } catch (error) {
        console.error("Erreur lors de la suppression de la famille :", error);
        notificationErreur(error?.message || "Impossible de supprimer la famille.");
    }
}

function remplirSelectParrain(
    parrainId,
    personneExclueId = null
) {
    const select =
        document.getElementById(
            "memberReferrer"
        );

    if (!select) {
        return;
    }

    const saisonId =
        state.configuration.saisonActiveId;

    select.innerHTML =
        `
            <option value="">
                Aucun parrain
            </option>
        ` +
        state.personnes
            .filter(
                personne =>
                    personne.id !==
                    personneExclueId
            )
            .map(
                personne =>
                    `
                    <option value="${echapperHtml(
                        personne.id
                    )}">
                        ${echapperHtml(
                            `${personne.firstName} ${personne.lastName}`.trim()
                        )}
                    </option>
                `
            )
            .join("");

    if (parrainId) {
        select.value =
            parrainId;
    }
}

function remplirSelectSaisonVue() {
    const select =
        document.getElementById(
            "viewSeasonSelect"
        );

    if (!select) {
        return;
    }

    select.innerHTML =
        state.saisons
            .map(
                saison =>
                    `
                    <option value="${echapperHtml(
                        saison.id
                    )}">
                        ${echapperHtml(
                            saison.nom
                        )}
                    </option>
                `
            )
            .join("");

    select.value =
        state.configuration.saisonActiveId;
}

function afficherEtatCertificat(
    certificat
) {
    const titre =
        document.getElementById(
            "certificateStatusTitle"
        );

    const texte =
        document.getElementById(
            "certificateStatusText"
        );

    const bouton =
        document.getElementById(
            "viewCertificateButton"
        );

    if (
        certificat &&
        certificat.documentId
    ) {
        if (titre) {
            titre.textContent =
                "Certificat enregistré";
        }

        if (texte) {
            texte.textContent =
                certificat.fileName ||
                "Certificat PDF enregistré.";
        }

        if (bouton) {
            bouton.classList.remove(
                "hidden"
            );
        }

        return;
    }

    if (titre) {
        titre.textContent =
            "Aucun certificat enregistré";
    }

    if (texte) {
        texte.textContent =
            "Ajoutez le PDF du certificat médical.";
    }

    if (bouton) {
        bouton.classList.add(
            "hidden"
        );
    }
}

async function afficherCertificat(
    inscriptionId
) {
    try {
        const donnees =
            await window.fbac.lireCertificat(
                inscriptionId
            );

        if (!donnees) {
            notificationErreur(
                "Certificat introuvable."
            );
            return;
        }

        const octets =
            convertirDonneesEnUint8Array(
                donnees
            );

        const blob =
            new Blob(
                [
                    octets
                ],
                {
                    type:
                        "application/pdf"
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const inscription =
            state.inscriptions.find(
                element =>
                    element.id ===
                    inscriptionId
            );

        const personne =
            inscription
                ? state.personnes.find(
                    element =>
                        element.id ===
                        inscription.personneId
                )
                : null;

        const nom =
            personne
                ? `${personne.firstName} ${personne.lastName}`.trim()
                : "Adhérent";

        const nomElement =
            document.getElementById(
                "certificateViewerName"
            );

        const corps =
            document.getElementById(
                "certificateViewerBody"
            );

        if (!corps) {
            URL.revokeObjectURL(url);
            return;
        }

        if (nomElement) {
            nomElement.textContent =
                nom;
        }

        corps.innerHTML = "";

        const iframe =
            document.createElement(
                "iframe"
            );

        iframe.className =
            "certificate-viewer";

        iframe.title =
            `Certificat médical de ${nom}`;

        iframe.src =
            url;

        corps.appendChild(
            iframe
        );

        const modal =
            document.getElementById(
                "certificateModal"
            );

        if (modal) {
            modal.dataset.inscriptionId =
                inscriptionId;

            ouvrirModalParId(
                "certificateModal"
            );
        }

        setTimeout(
            () =>
                URL.revokeObjectURL(
                    url
                ),
            600000
        );
    } catch (error) {
        console.error(
            "Erreur lors de l'ouverture du certificat :",
            error
        );

        notificationErreur(
            "Impossible d'ouvrir le certificat."
        );
    }
}

async function imprimerCertificatActuel() {
    const modal =
        document.getElementById(
            "certificateModal"
        );

    const inscriptionId =
        modal?.dataset?.inscriptionId;

    if (!inscriptionId) {
        notificationErreur(
            "Aucun certificat à imprimer."
        );
        return;
    }

    try {
        const resultat =
            await window.fbac.imprimerCertificat(
                inscriptionId
            );

        if (resultat === false) {
            notificationErreur(
                "Impossible d'imprimer le certificat."
            );
        }
    } catch (error) {
        console.error(
            "Erreur lors de l'impression du certificat :",
            error
        );

        notificationErreur(
            "Impossible d'imprimer le certificat."
        );
    }
}
async function afficherPhoto(
    personneId,
    imageElement
) {
    if (
        !imageElement ||
        !personneId
    ) {
        return;
    }

    try {
        const donnees =
            await window.fbac.obtenirPhoto(
                personneId
            );

        if (!donnees) {
            return;
        }

        const informations =
            await window.fbac.obtenirInformationsPhoto(
                personneId
            );

        const octets =
            convertirDonneesEnUint8Array(
                donnees
            );

        const blob =
            new Blob(
                [
                    octets
                ],
                {
                    type:
                        informations?.mimeType ||
                        "image/jpeg"
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        imageElement.onload =
            () => {
                URL.revokeObjectURL(
                    url
                );
            };

        imageElement.src =
            url;
    } catch (error) {
        console.error(
            "Erreur lors du chargement de la photo :",
            error
        );
    }
}

function activerFormulaireAdherent(
    actif
) {
    const formulaire =
        document.getElementById(
            "memberForm"
        );

    if (!formulaire) {
        return;
    }

    formulaire
        .querySelectorAll(
            "input, select, textarea, button"
        )
        .forEach(
            element => {
                if (
                    element.id ===
                    "memberSaveButton"
                ) {
                    element.disabled =
                        !actif;
                    return;
                }

                if (
                    element.id ===
                    "memberCategory"
                ) {
                    element.disabled =
                        true;
                    return;
                }

                if (
                    element.type ===
                    "button"
                ) {
                    return;
                }

                element.disabled =
                    !actif;
            }
        );
}

function ouvrirModalAdherent() {
    ouvrirModalParId(
        "memberModal"
    );
}

function fermerModalAdherent() {
    fermerModalParId(
        "memberModal"
    );
}

function ouvrirModalParId(
    id
) {
    const modal =
        document.getElementById(
            id
        );

    if (!modal) {
        return;
    }

    modal.classList.add("open");
}

function fermerModalParId(
    id
) {
    const modal =
        document.getElementById(
            id
        );

    if (!modal) {
        return;
    }

    modal.classList.remove("open");
}

function definirValeur(
    id,
    valeur
) {
    const element =
        document.getElementById(
            id
        );

    if (element) {
        element.value =
            valeur ?? "";
    }
}

function obtenirValeur(
    id
) {
    const element =
        document.getElementById(
            id
        );

    return element
        ? element.value
        : "";
}

function definirCase(
    id,
    valeur
) {
    const element =
        document.getElementById(
            id
        );

    if (element) {
        element.checked =
            Boolean(valeur);
    }
}

function obtenirCase(
    id
) {
    const element =
        document.getElementById(
            id
        );

    return Boolean(
        element?.checked
    );
}

function definirAideFormulaire(
    prefixe,
    aide
) {
    const source =
        aide || {
            enabled: false,
            amount: 0
        };

    definirCase(
        `${prefixe}Enabled`,
        source.enabled
    );

    definirValeur(
        `${prefixe}Amount`,
        source.amount || 0
    );
}

function normaliserPersonneLocale(
    personne
) {
    return {
        ...personne,
        id:
            personne.id,
        firstName:
            personne.firstName ||
            "",
        lastName:
            personne.lastName ||
            "",
        birthDate:
            personne.birthDate ||
            "",
        photo:
            personne.photo ||
            null
    };
}

function convertirPersonnePourBackend(
    personne
) {
    return {
        firstName:
            personne.firstName ||
            "",
        lastName:
            personne.lastName ||
            "",
        birthDate:
            personne.birthDate ||
            "",
        photo:
            personne.photo ||
            null
    };
}

function convertirInscriptionPourBackend(
    inscription
) {
    return {
        personId:
            inscription.personneId,
        season:
            inscription.saisonId,
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
        aids: {
            atout:
                convertirAideBackend(
                    inscription.aides
                        ?.atoutNormandie ||
                    inscription.aides
                        ?.atout
                ),
            passSport:
                convertirAideBackend(
                    inscription.aides
                        ?.passSport
                ),
            kiosk:
                convertirAideBackend(
                    inscription.aides
                        ?.kiosk
                ),
            spot50:
                convertirAideBackend(
                    inscription.aides
                        ?.spot50
                )
        },
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
                inscription.certificat
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
                aide?.amount || 0
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

function calculerExpirationCertificat(
    date
) {
    if (!date) {
        return "";
    }

    const valeur =
        new Date(
            `${date}T00:00:00`
        );

    if (
        Number.isNaN(
            valeur.getTime()
        )
    ) {
        return "";
    }

    valeur.setFullYear(
        valeur.getFullYear() + 1
    );

    return valeur
        .toISOString()
        .slice(
            0,
            10
        );
}

function determinerCategorieDepuisDateNaissance(dateNaissance) {
    if (!dateNaissance) {
        return "";
    }

    const naissance = new Date(dateNaissance + "T00:00:00");
    if (Number.isNaN(naissance.getTime())) {
        return "";
    }

    const dateReference = new Date();
    const debutSaison = dateReference.getMonth() >= 8
        ? new Date(dateReference.getFullYear(), 8, 1)
        : new Date(dateReference.getFullYear() - 1, 8, 1);

    let age = debutSaison.getFullYear() - naissance.getFullYear();
    const anniversaireCetteAnnee = new Date(
        debutSaison.getFullYear(),
        naissance.getMonth(),
        naissance.getDate()
    );

    if (anniversaireCetteAnnee > debutSaison) {
        age--;
    }

    return age >= 18 ? "adulte" : "enfant";
}

function obtenirMontantParrainage() {
    const configuration =
        state.configuration || {};

    const parrainage =
        configuration.parrainage || {};

    return Number(
        parrainage.montantParFilleul ??
        parrainage.montant ??
        20
    );
}

function calculerMontantParrainage(
    nombre
) {
    const quantite =
        Math.min(
            3,
            Math.max(
                0,
                Number(nombre) || 0
            )
        );

    return quantite * obtenirMontantParrainage();
}

function obtenirNombreParrainagesSelectionne() {
    return Math.min(
        3,
        Math.max(
            0,
            Number(
                obtenirValeur(
                    "memberReferralCount"
                ) || 0
            )
        )
    );
}

function calculerParrainageAcquis(
    personneId,
    saisonId
) {
    if (
        !personneId ||
        !saisonId
    ) {
        return 0;
    }

    const nombre =
        state.inscriptions.filter(
            inscription =>
                inscription.saisonId ===
                    saisonId &&
                inscription.referrerId ===
                    personneId
        ).length;

    return calculerMontantParrainage(
        nombre
    );
}

function obtenirSaisonPrecedente(
    saisonId
) {
    const saison =
        state.saisons.find(
            element =>
                element.id ===
                saisonId
        );

    if (!saison) {
        return null;
    }

    const match =
        String(
            saison.nom
        ).match(
            /^(\d{4})-(\d{4})$/
        );

    if (!match) {
        return null;
    }

    const debut =
        Number(
            match[1]
        ) - 1;

    const nom =
        `${debut}-${debut + 1}`;

    const precedente =
        state.saisons.find(
            element =>
                element.nom ===
                nom
        );

    return precedente
        ? precedente.id
        : null;
}

function obtenirNomSaisonDepuisId(
    saisonId
) {
    if (!saisonId) {
        return "";
    }

    const saison =
        state.saisons.find(
            element =>
                element.id ===
                saisonId
        );

    return saison
        ? saison.nom
        : saisonId;
}

function genererIdentifiant(
    prefixe
) {
    return (
        `${prefixe}_` +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .substring(
                2,
                9
            )
    );
}

function obtenirInitiales(
    personne
) {
    return (
        (
            personne?.firstName ||
            ""
        ).charAt(0) +
        (
            personne?.lastName ||
            ""
        ).charAt(0)
    )
        .toUpperCase() ||
        "?";
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

function convertirDonneesEnUint8Array(
    donnees
) {
    if (
        donnees instanceof Uint8Array
    ) {
        return donnees;
    }

    if (
        donnees &&
        donnees.type ===
            "Buffer" &&
        Array.isArray(
            donnees.data
        )
    ) {
        return new Uint8Array(
            donnees.data
        );
    }

    if (
        Array.isArray(donnees)
    ) {
        return new Uint8Array(
            donnees
        );
    }

    return new Uint8Array(
        donnees || []
    );
}

function fichierEnDataUrl(
    fichier
) {
    return new Promise(
        (
            resolve,
            reject
        ) => {
            const lecteur =
                new FileReader();

            lecteur.onload =
                () =>
                    resolve(
                        lecteur.result
                    );

            lecteur.onerror =
                () =>
                    reject(
                        lecteur.error ||
                        new Error(
                            "Impossible de lire le fichier."
                        )
                    );

            lecteur.readAsDataURL(
                fichier
            );
        }
    );
}

function gererChangementPhoto(
    event
) {
    const fichier =
        event.target.files?.[0];

    if (!fichier) {
        return;
    }

    const lecteur =
        new FileReader();

    lecteur.onload =
        () => {
            const preview =
                document.getElementById(
                    "photoPreview"
                );

            if (
                preview
            ) {
                preview.innerHTML =
                    `<img src="${lecteur.result}" alt="">`;
            }

            if (
                typeof ui !==
                    "undefined" &&
                ui
            ) {
                ui.memberPhotoData =
                    lecteur.result;
            }
        };

    lecteur.readAsDataURL(
        fichier
    );
}

function gererChangementCertificat(
    event
) {
    const fichier =
        event.target.files?.[0];

    const nom =
        document.getElementById(
            "certificateFileName"
        );

    if (!nom) {
        return;
    }

    nom.textContent =
        fichier
            ? fichier.name
            : "Aucun fichier sélectionné.";
}

function initialiserEvenementsAdherents() {
    if (document.body.dataset.adherentsEvenementsInitialises === "true") {
        return;
    }

    document.body.dataset.adherentsEvenementsInitialises = "true";

    const selectSaison =
        document.getElementById("memberSeasonFilter");

    if (
        selectSaison &&
        !selectSaison.dataset.initialise
    ) {
        selectSaison.addEventListener(
            "change",
            event =>
                changerSaisonAffichageAdherents(
                    event.target.value
                )
        );

        selectSaison.dataset.initialise =
            "true";
    }


    remplirSelectGrade("Blanc");

    const formulaire =
        document.getElementById(
            "memberForm"
        );

    if (
        formulaire &&
        !formulaire.dataset.initialise
    ) {
        formulaire.addEventListener(
            "submit",
            enregistrerAdherentDepuisFormulaire
        );

        formulaire.dataset.initialise =
            "true";
    }

    const recherche =
        document.getElementById(
            "recherche-adherent"
        ) ||
        document.getElementById(
            "memberSearch"
        );

    if (
        recherche &&
        !recherche.dataset.initialise
    ) {
        recherche.addEventListener(
            "input",
            afficherAdherents
        );

        recherche.dataset.initialise =
            "true";
    }

    const filtre =
        document.getElementById(
            "filtre-statut-adherent"
        ) ||
        document.getElementById(
            "memberStatusFilter"
        );

    if (
        filtre &&
        !filtre.dataset.initialise
    ) {
        filtre.addEventListener(
            "change",
            afficherAdherents
        );

        filtre.dataset.initialise =
            "true";
    }

    const photo =
        document.getElementById(
            "memberPhoto"
        );

    if (
        photo &&
        !photo.dataset.initialise
    ) {
        photo.addEventListener(
            "change",
            gererChangementPhoto
        );

        photo.dataset.initialise =
            "true";
    }

    const selectFamille = document.getElementById("memberFamilyGroup");
    if (selectFamille && !selectFamille.dataset.initialise) {
        selectFamille.addEventListener("change", mettreAJourBoutonSuppressionFamille);
        selectFamille.dataset.initialise = "true";
    }

    const boutonSupprimerFamille = document.getElementById("deleteFamilyFromMemberButton");
    if (boutonSupprimerFamille && !boutonSupprimerFamille.dataset.initialise) {
        boutonSupprimerFamille.addEventListener("click", supprimerFamilleDepuisFormulaire);
        boutonSupprimerFamille.dataset.initialise = "true";
    }

    const boutonNouvelleFamille = document.getElementById("createFamilyButton");
    if (boutonNouvelleFamille && !boutonNouvelleFamille.dataset.initialise) {
        boutonNouvelleFamille.addEventListener("click", ouvrirCreationFamille);
        boutonNouvelleFamille.dataset.initialise = "true";
    }

    const formulaireNouvelleFamille = document.getElementById("familyCreateForm");
    if (formulaireNouvelleFamille && !formulaireNouvelleFamille.dataset.initialise) {
        formulaireNouvelleFamille.addEventListener("submit", event => {
            event.preventDefault();
            creerNouvelleFamilleDepuisFormulaire();
        });
        formulaireNouvelleFamille.dataset.initialise = "true";
    }

    const boutonCertificat =
        document.getElementById(
            "viewCertificateButton"
        );

    if (
        boutonCertificat &&
        !boutonCertificat.dataset.initialise
    ) {
        boutonCertificat.addEventListener(
            "click",
            () => {
                if (
                    typeof ui !== "undefined" &&
                    ui?.currentCertificateId
                ) {
                    afficherCertificat(
                        ui.currentCertificateId
                    );
                }
            }
        );

        boutonCertificat.dataset.initialise =
            "true";
    }

    const certificat =
        document.getElementById(
            "certificateFile"
        );

    if (
        certificat &&
        !certificat.dataset.initialise
    ) {
        certificat.addEventListener(
            "change",
            gererChangementCertificat
        );

        certificat.dataset.initialise =
            "true";
    }

    const selectGrade =
        document.getElementById("memberGrade");

    if (selectGrade && !selectGrade.dataset.apercuInitialise) {
        selectGrade.addEventListener("change", event => {
            afficherApercuGrade(event.target.value);
            mettreAJourResumeAdherent();
        });
        selectGrade.dataset.apercuInitialise = "true";
    }

    [
        "memberBirthDate",
        "memberFrequency",
        "memberGrade",
        "memberVip",
        "aidAtoutEnabled",
        "aidAtoutAmount",
        "aidPassSportEnabled",
        "aidPassSportAmount",
        "aidKioskEnabled",
        "aidKioskAmount",
        "aidSpot50Enabled",
        "aidSpot50Amount",
        "familyDiscountEnabled",
        "familyDiscountAmount",
        "memberPaidAmount",
        "memberReferralCount"
    ].forEach(
        id => {
            const element =
                document.getElementById(
                    id
                );

            if (
                !element ||
                element.dataset.initialise
            ) {
                return;
            }

            element.addEventListener(
                "input",
                mettreAJourResumeAdherent
            );

            element.addEventListener(
                "change",
                mettreAJourResumeAdherent
            );

            element.dataset.initialise =
                "true";
        }
    );

    const selectReinscription =
        document.getElementById(
            "reenrollPersonSelect"
        );

    if (
        selectReinscription &&
        !selectReinscription.dataset.initialise
    ) {
        selectReinscription.addEventListener(
            "change",
            mettreAJourInformationReinscription
        );

        selectReinscription.dataset.initialise =
            "true";
    }

    document.addEventListener(
        "click",
        event => {
            const boutonFermeture = event.target.closest("[data-close-modal]");

            if (boutonFermeture) {
                event.preventDefault();
                fermerModalParId(boutonFermeture.dataset.closeModal);
                return;
            }

            const bouton = event.target.closest("[data-action]");

            if (!bouton) {
                return;
            }

            const action = bouton.dataset.action;
            const id = bouton.dataset.id;

            if (action === "modifier-adherent") {
                ouvrirModificationAdherent(id);
            }

            if (action === "supprimer-adherent") {
                supprimerAdherent(id);
            }

            if (action === "nouvel-adherent" || action === "new-member") {
                ouvrirNouvelAdherent();
            }

            if (action === "reinscription" || action === "reenroll") {
                ouvrirReinscription();
            }

            if (action === "confirmer-reinscription" || action === "confirm-reenroll") {
                confirmerReinscription();
            }

            if (action === "voir-certificat") {
                afficherCertificat(id);
            }

            if (action === "voir-photo") {
                afficherPhotoEnGrand(bouton.dataset.personId);
            }

            if (action === "voir-famille") {
                afficherFamille(id);
            }

            if (action === "supprimer-famille") {
                supprimerFamilleDepuisInterface(bouton.dataset.familyId || id);
            }

            if (action === "imprimer-certificat") {
                imprimerCertificatActuel();
            }
        }
    );

    document.addEventListener(
        "click",
        event => {
            if (
                event.target.classList.contains(
                    "modal-backdrop"
                )
            ) {
                fermerModalParId(
                    event.target.id
                );
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key ===
                "Escape"
            ) {
                document
                    .querySelectorAll(
                        ".modal-backdrop.open"
                    )
                    .forEach(
                        modal =>
                            fermerModalParId(
                                modal.id
                            )
                    );
            }
        }
    );
}

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initialiserEvenementsAdherents
    );
} else {
    initialiserEvenementsAdherents();
}