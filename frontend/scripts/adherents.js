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
        texteSaison.textContent = saison ? `Inscriptions de la saison ${saison.nom}` : "";
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
            inscription.aides?.spot50?.enabled ? "Spot50" : ""
        ].filter(Boolean).join(", ") || "—";

        const certificat = inscription.certificat?.documentId || inscription.certificate?.documentId
            ? "Présent"
            : "Absent";

        const parrainage = Number(inscription.referralDiscountApplied ?? inscription.parrainageAcquis ?? 0);
        const famille = inscription.familyGroupId ? "Oui" : "—";

        const actions = ui.selectedSeason === saisonCourante
            ? "<button class=\"btn btn-small\" data-action=\"modifier-adherent\" data-id=\"" + echapperHtml(inscription.id) + "\">Modifier</button> " +
              "<button class=\"btn btn-small button-danger\" data-action=\"supprimer-adherent\" data-id=\"" + echapperHtml(inscription.id) + "\">Supprimer</button>"
            : "<button class=\"btn btn-small\" data-action=\"modifier-adherent\" data-id=\"" + echapperHtml(inscription.id) + "\">Voir</button>";

        return "<tr>" +
            "<td><strong>" + echapperHtml(`${personne.firstName} ${personne.lastName}`.trim()) + "</strong>" +
            (inscription.vip ? " <span class=\"badge success\">VIP</span>" : "") + "</td>" +
            "<td>" + echapperHtml(inscription.grade || "Blanc") + "</td>" +
            "<td>" + famille + "</td>" +
            "<td>" + afficherBadgePaiement(inscription) + "</td>" +
            "<td>" + echapperHtml(aides) + "</td>" +
            "<td>" + echapperHtml(certificat) + "</td>" +
            "<td>" + (parrainage > 0 ? "-" + parrainage + " €" : "—") + "</td>" +
            "<td><div class=\"actions\">" + actions + "</div></td>" +
            "</tr>";
    }).join("");
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
                parrainageAcquis:
                    calculerMontantParrainage(
                        obtenirNombreParrainagesSelectionne()
                    ),
                referralDiscountApplied:
                    calculerMontantParrainage(
                        obtenirNombreParrainagesSelectionne()
                    ),
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

            inscription.parrainageAcquis =
                calculerMontantParrainage(
                    obtenirNombreParrainagesSelectionne()
                );

            inscription.referralDiscountApplied =
                inscription.parrainageAcquis;

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
            ancienne.familyGroupId ||
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
    const dateNaissance = obtenirValeur("memberBirthDate");
    const categorieAutomatique = determinerCategorieDepuisDateNaissance(dateNaissance);
    if (categorieAutomatique) {
        definirValeur("memberCategory", categorieAutomatique);
    }

    const categorie = categorieAutomatique || obtenirValeur("memberCategory");
    if (categorie === "enfant") {
        definirValeur("memberFrequency", "1");
    }

    const frequence = obtenirValeur("memberFrequency");
    const vip = obtenirCase("memberVip");
    const aides = {
        atoutNormandie: {
            enabled: obtenirCase("aidAtoutEnabled"),
            amount: Number(obtenirValeur("aidAtoutAmount") || 0)
        },
        passSport: {
            enabled: obtenirCase("aidPassSportEnabled"),
            amount: Number(obtenirValeur("aidPassSportAmount") || 0)
        },
        spot50: {
            enabled: obtenirCase("aidSpot50Enabled"),
            amount: Number(obtenirValeur("aidSpot50Amount") || 0)
        }
    };
    const reductionFamille = obtenirCase("familyDiscountEnabled")
        ? Number(obtenirValeur("familyDiscountAmount") || 0)
        : 0;
    const parrainageAcquis =
        calculerMontantParrainage(
            obtenirNombreParrainagesSelectionne()
        );
    const montantPaye = Number(obtenirValeur("memberPaidAmount") || 0);
    const inscription = {
        category: categorie,
        frequency: frequence,
        vip,
        aides,
        reductionFamille,
        parrainageAcquis,
        referralDiscountApplied: parrainageAcquis,
        montantPaye
    };
    const tarif = vip
        ? 0
        : categorie
            ? calculerTarif(categorie, frequence)
            : 0;
    inscription.tarif = tarif;
    const montant = calculerMontantAPayer(inscription);
    const reste = Math.max(0, montant - montantPaye);
    const totalAides = calculerTotalAides(aides);
    const surpaiement = Math.max(0, montantPaye - montant);
    definirValeur("summaryBasePrice", `${tarif.toFixed(2)} €`);
    definirValeur("summaryAids", `-${totalAides.toFixed(2)} €`);
    definirValeur("summaryFamily", `-${reductionFamille.toFixed(2)} €`);
    definirValeur("summaryReferral", `-${parrainageAcquis.toFixed(2)} €`);
    definirValeur("summaryDue", `${montant.toFixed(2)} €`);
    definirValeur("summaryPaid", `${montantPaye.toFixed(2)} €`);
    definirValeur("summaryRemaining", `${reste.toFixed(2)} €`);
    const ligneSurpaiement = document.getElementById("summaryOverpaymentLine");
    if (ligneSurpaiement) {
        ligneSurpaiement.classList.toggle("hidden", surpaiement <= 0);
    }
    definirValeur("summaryOverpayment", `${surpaiement.toFixed(2)} €`);
}
function remplirSelectFamille(
    familleId
) {
    const select =
        document.getElementById(
            "memberFamilyGroup"
        );

    if (!select) {
        return;
    }

    const familles = [
        ...new Set(
            state.inscriptions
                .map(
                    inscription =>
                        inscription.familyGroupId
                )
                .filter(Boolean)
        )
    ];

    select.innerHTML =
        `
            <option value="">
                Aucune famille
            </option>
        ` +
        familles
            .map(
                id =>
                    `
                    <option value="${echapperHtml(
                        id
                    )}">
                        ${echapperHtml(
                            id
                        )}
                    </option>
                `
            )
            .join("");

    select.value =
        familleId ||
        "";
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

        window.open(
            url,
            "_blank"
        );

        setTimeout(
            () =>
                URL.revokeObjectURL(
                    url
                ),
            60000
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

        imageElement.src =
            url;

        imageElement.onload =
            () => {
                URL.revokeObjectURL(
                    url
                );
            };
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

    [
        "memberBirthDate",
        "memberFrequency",
        "memberVip",
        "aidAtoutEnabled",
        "aidAtoutAmount",
        "aidPassSportEnabled",
        "aidPassSportAmount",
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