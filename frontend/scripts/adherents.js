function afficherAdherents() {
    if (
        typeof state === "undefined" ||
        !state
    ) {
        return;
    }

    const conteneur =
        document.getElementById("liste-adherents") ||
        document.getElementById("membersList");

    if (!conteneur) {
        return;
    }

    const saisonActive =
        state.configuration.saisonActiveId;

    const inscriptions =
        state.inscriptions.filter(
            inscription =>
                inscription.saisonId === saisonActive
        );

    const recherche =
        (
            document.getElementById("recherche-adherent") ||
            document.getElementById("memberSearch")
        )?.value
            ?.trim()
            .toLowerCase() || "";

    const filtre =
        (
            document.getElementById("filtre-statut-adherent") ||
            document.getElementById("memberStatusFilter")
        )?.value || "tous";

    const resultats =
        inscriptions
            .map(inscription => {
                const personne =
                    state.personnes.find(
                        element =>
                            element.id ===
                            inscription.personneId
                    );

                return {
                    inscription,
                    personne
                };
            })
            .filter(element => {
                if (!element.personne) {
                    return false;
                }

                const nom =
                    `${element.personne.firstName} ${element.personne.lastName}`
                        .toLowerCase();

                if (
                    recherche &&
                    !nom.includes(recherche)
                ) {
                    return false;
                }

                if (
                    filtre === "paye" &&
                    calculerEtatPaiement(
                        element.inscription
                    ) !== "paye"
                ) {
                    return false;
                }

                if (
                    filtre === "impaye" &&
                    calculerEtatPaiement(
                        element.inscription
                    ) === "paye"
                ) {
                    return false;
                }

                return true;
            });

    if (!resultats.length) {
        conteneur.innerHTML = `
            <div class="empty-state">
                Aucun adhérent trouvé pour cette saison.
            </div>
        `;
        return;
    }

    conteneur.innerHTML =
        resultats
            .map(
                ({
                    inscription,
                    personne
                }) =>
                    `
                    <div class="member-row">
                        <div class="member-avatar">
                            ${
                                personne.photo
                                    ? `<img src="${echapperHtml(personne.photo)}" alt="">`
                                    : echapperHtml(
                                        obtenirInitiales(
                                            personne
                                        )
                                    )
                            }
                        </div>
                        <div class="member-main">
                            <strong>
                                ${echapperHtml(
                                    `${personne.firstName} ${personne.lastName}`.trim()
                                )}
                            </strong>
                            <span>
                                ${echapperHtml(
                                    inscription.category ===
                                        "enfant"
                                        ? "Enfant"
                                        : "Adulte"
                                )}
                                ·
                                ${echapperHtml(
                                    inscription.frequency
                                )}
                                cours/semaine
                                ·
                                ${echapperHtml(
                                    inscription.grade
                                )}
                            </span>
                        </div>
                        <div class="member-payment">
                            ${afficherBadgePaiement(
                                inscription
                            )}
                        </div>
                        <div class="member-actions">
                            <button
                                class="button button-small"
                                data-action="modifier-adherent"
                                data-id="${echapperHtml(
                                    inscription.id
                                )}"
                            >
                                Modifier
                            </button>
                            <button
                                class="button button-small button-danger"
                                data-action="supprimer-adherent"
                                data-id="${echapperHtml(
                                    inscription.id
                                )}"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                `
            )
            .join("");
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

    if (
        !editable &&
        !parrainageUniquement
    ) {
        notificationAvertissement(
            "Cette saison est historique et ne peut pas être modifiée."
        );
        return;
    }

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
        "memberCategory",
        inscription.category
    );

    definirValeur(
        "memberFrequency",
        inscription.frequency
    );

    definirValeur(
        "memberGrade",
        inscription.grade
    );

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
            "Modifier l'adhérent";
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
    } else {
        activerFormulaireAdherent(
            editable
        );
    }

    ouvrirModalAdherent();

    mettreAJourResumeAdherent();
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
        "familyDiscountAmount",
        state.configuration?.familyDiscount ||
        20
    );

    definirValeur(
        "aidAtoutAmount",
        50
    );

    definirValeur(
        "aidPassSportAmount",
        50
    );

    definirValeur(
        "aidSpot50Amount",
        50
    );

    remplirSelectFamille(
        null
    );

    remplirSelectParrain(
        null
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
                familyGroupId:
                    famille,
                referrerId:
                    parrain,
                parrainageAcquis:
                    calculerParrainageAcquis(
                        personne.id,
                        saisonId
                    ),
                referralDiscountApplied:
                    calculerParrainageAcquis(
                        personne.id,
                        saisonId
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

            state.inscriptions.push(
                inscription
            );

            await window.fbac.creerInscription(
                convertirInscriptionPourBackend(
                    inscription
                )
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

            inscription.familyGroupId =
                famille;

            inscription.referrerId =
                parrain;

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
    const categorie =
        obtenirValeur(
            "memberCategory"
        );

    const frequence =
        obtenirValeur(
            "memberFrequency"
        );

    const inscription = {
        category:
            categorie,
        frequency:
            frequence,
        aides: {
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
        },
        reductionFamille:
            obtenirCase(
                "familyDiscountEnabled"
            )
                ? Number(
                    obtenirValeur(
                        "familyDiscountAmount"
                    ) || 0
                )
                : 0,
        parrainageAcquis:
            0,
        montantPaye:
            Number(
                obtenirValeur(
                    "memberPaidAmount"
                ) || 0
            )
    };

    const tarif =
        calculerTarif(
            categorie,
            frequence
        );

    inscription.tarif =
        tarif;

    const montant =
        calculerMontantAPayer(
            inscription
        );

    const reste =
        Math.max(
            0,
            montant -
            inscription.montantPaye
        );

    const element =
        document.getElementById(
            "memberPaymentSummary"
        );

    if (!element) {
        return;
    }

    element.innerHTML = `
        <div>
            <span>Tarif</span>
            <strong>${tarif.toFixed(2)} €</strong>
        </div>
        <div>
            <span>Total à payer</span>
            <strong>${montant.toFixed(2)} €</strong>
        </div>
        <div>
            <span>Reste</span>
            <strong>${reste.toFixed(2)} €</strong>
        </div>
    `;
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

    modal.classList.add(
        "active"
    );

    modal.classList.add(
        "open"
    );
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

    modal.classList.remove(
        "active"
    );

    modal.classList.remove(
        "open"
    );
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

    return Math.min(
        nombre,
        3
    ) * 20;
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
        "memberCategory",
        "memberFrequency",
        "aidAtoutEnabled",
        "aidAtoutAmount",
        "aidPassSportEnabled",
        "aidPassSportAmount",
        "aidSpot50Enabled",
        "aidSpot50Amount",
        "familyDiscountEnabled",
        "familyDiscountAmount",
        "memberPaidAmount"
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
            const bouton =
                event.target.closest(
                    "[data-action]"
                );

            if (!bouton) {
                return;
            }

            const action =
                bouton.dataset.action;

            const id =
                bouton.dataset.id;

            if (
                action ===
                "modifier-adherent"
            ) {
                ouvrirModificationAdherent(
                    id
                );
            }

            if (
                action ===
                "supprimer-adherent"
            ) {
                supprimerAdherent(
                    id
                );
            }

            if (
                action ===
                "nouvel-adherent"
            ) {
                ouvrirNouvelAdherent();
            }

            if (
                action ===
                "reinscription"
            ) {
                ouvrirReinscription();
            }

            if (
                action ===
                "confirmer-reinscription"
            ) {
                confirmerReinscription();
            }

            if (
                action ===
                "voir-certificat"
            ) {
                afficherCertificat(
                    id
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