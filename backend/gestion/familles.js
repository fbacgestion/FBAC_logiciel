const { lireJson, ecrireJson } = require("./fichiers");
const crypto = require("crypto");

function genererIdFamille() {
    return `famille_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function normaliserFamille(famille) {
    return {
        id: famille?.id || genererIdFamille(),
        nom: String(famille?.nom || "").trim(),
        saisonId: famille?.saisonId || null
    };
}

function obtenirFamilles() {
    const familles = lireJson("familles.json");
    return Array.isArray(familles) ? familles.map(normaliserFamille) : [];
}

function enregistrerFamilles(familles) {
    ecrireJson("familles.json", familles.map(normaliserFamille));
}

function initialiserFamilles() {
    let familles = obtenirFamilles();
    let inscriptions = lireJson("inscriptions.json");
    const groupesExistants = new Map(familles.map(famille => [famille.id, famille]));
    const famillesFinales = [];
    const correspondances = new Map();

    for (const famille of familles) {
        if (famille.saisonId) {
            famillesFinales.push(famille);
            correspondances.set(`${famille.id}::${famille.saisonId}`, famille.id);
        }
    }

    if (Array.isArray(inscriptions)) {
        const groupesLegacy = new Set(
            inscriptions
                .map(inscription => inscription?.familyGroupId)
                .filter(Boolean)
        );

        for (const groupeId of groupesLegacy) {
            const familleExistante = groupesExistants.get(groupeId);
            const saisons = [
                ...new Set(
                    inscriptions
                        .filter(inscription => inscription?.familyGroupId === groupeId)
                        .map(inscription => inscription?.saisonId)
                        .filter(Boolean)
                )
            ];

            if (!saisons.length) {
                continue;
            }

            for (let index = 0; index < saisons.length; index += 1) {
                const saisonId = saisons[index];
                const cle = `${groupeId}::${saisonId}`;
                let familleId = correspondances.get(cle);

                if (!familleId) {
                    if (index === 0 && familleExistante && !familleExistante.saisonId) {
                        familleExistante.saisonId = saisonId;
                        familleId = familleExistante.id;
                    } else {
                        familleId = genererIdFamille();
                        famillesFinales.push({
                            id: familleId,
                            nom: familleExistante?.nom || String(groupeId),
                            saisonId
                        });
                    }

                    correspondances.set(cle, familleId);
                }

                for (const inscription of inscriptions) {
                    if (
                        inscription?.familyGroupId === groupeId &&
                        inscription?.saisonId === saisonId
                    ) {
                        inscription.familyGroupId = familleId;
                    }
                }
            }
        }
    }

    for (const famille of familles) {
        if (famille.saisonId && !famillesFinales.some(element => element.id === famille.id)) {
            famillesFinales.push(famille);
        }
    }

    enregistrerFamilles(famillesFinales);

    if (Array.isArray(inscriptions)) {
        ecrireJson("inscriptions.json", inscriptions);
    }
}

function creerFamille(donnees) {
    const nom = String(donnees?.nom || "").trim();
    const saisonId = String(donnees?.saisonId || "").trim();

    if (!nom) {
        throw new Error("Le nom de la famille est obligatoire.");
    }

    if (!saisonId) {
        throw new Error("La saison de la famille est obligatoire.");
    }

    const configuration = lireJson("configuration.json");
    if (
        configuration?.saisonActiveId &&
        configuration.saisonActiveId !== saisonId
    ) {
        throw new Error("Une famille ne peut être créée que pour la saison active.");
    }

    const familles = obtenirFamilles();
    const famille = {
        id: genererIdFamille(),
        nom,
        saisonId
    };

    familles.push(famille);
    enregistrerFamilles(familles);
    return famille;
}

function supprimerFamille(id) {
    const familles = obtenirFamilles();
    const index = familles.findIndex(famille => famille.id === id);

    if (index === -1) {
        throw new Error("Famille introuvable.");
    }

    const famille = familles[index];
    const configuration = lireJson("configuration.json");

    if (
        configuration?.saisonActiveId &&
        famille.saisonId !== configuration.saisonActiveId
    ) {
        throw new Error("Une famille historique ne peut pas être supprimée.");
    }

    const inscriptions = lireJson("inscriptions.json");
    const utilisee = Array.isArray(inscriptions) &&
        inscriptions.some(inscription => (
            inscription?.familyGroupId === id &&
            inscription?.saisonId === famille.saisonId
        ));

    if (utilisee) {
        throw new Error("Cette famille contient encore des adhérents. Retirez d'abord les adhérents de cette famille avant de la supprimer.");
    }

    const [supprimee] = familles.splice(index, 1);
    enregistrerFamilles(familles);
    return supprimee;
}

function modifierFamille(id, donnees) {
    const familles = obtenirFamilles();
    const index = familles.findIndex(famille => famille.id === id);

    if (index === -1) {
        throw new Error("Famille introuvable.");
    }

    const nom = String(donnees?.nom || "").trim();

    if (!nom) {
        throw new Error("Le nom de la famille est obligatoire.");
    }

    familles[index].nom = nom;
    enregistrerFamilles(familles);
    return familles[index];
}

module.exports = {
    initialiserFamilles,
    obtenirFamilles,
    creerFamille,
    modifierFamille,
    supprimerFamille
};
