const fs = require("fs");
const path = require("path");
const { app } = require("electron");

let dossierPhotosConfigure = "";

function definirDossierPhotos(chemin) {
    dossierPhotosConfigure = chemin || "";
    if (dossierPhotosConfigure) fs.mkdirSync(dossierPhotosConfigure, { recursive: true });
}

function obtenirDossierPhotos() {
    const dossier = dossierPhotosConfigure ||
        path.join(
            app.getPath("userData"),
            "fichiers",
            "photos"
        );

    fs.mkdirSync(
        dossier,
        {
            recursive: true
        }
    );

    return dossier;
}

function obtenirExtension(
    nomFichier,
    mimeType = ""
) {
    const extension =
        path.extname(
            nomFichier || ""
        ).toLowerCase();

    if (extension) {
        return extension;
    }

    const extensions = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp"
    };

    return extensions[mimeType] || ".jpg";
}

function obtenirCheminPhoto(
    personneId,
    extension = ".jpg"
) {
    if (!personneId) {
        throw new Error(
            "Identifiant de personne manquant."
        );
    }

    return path.join(
        obtenirDossierPhotos(),
        `${personneId}${extension}`
    );
}

function supprimerAnciennesPhotos(
    personneId
) {
    const dossier =
        obtenirDossierPhotos();

    const fichiers =
        fs.readdirSync(
            dossier
        );

    fichiers
        .filter(
            fichier =>
                path.basename(
                    fichier,
                    path.extname(fichier)
                ) === personneId
        )
        .forEach(
            fichier => {
                fs.unlinkSync(
                    path.join(
                        dossier,
                        fichier
                    )
                );
            }
        );
}

function enregistrerPhoto(
    personneId,
    fichier,
    nomFichier = "",
    mimeType = ""
) {
    if (!personneId) {
        throw new Error(
            "Identifiant de personne manquant."
        );
    }

    if (!fichier) {
        throw new Error(
            "Aucune photo fournie."
        );
    }

    const extension = obtenirExtension(nomFichier, mimeType);
    let contenu;
    if (Buffer.isBuffer(fichier)) {
        contenu = fichier;
    } else if (typeof fichier === "string") {
        const base64 = fichier.includes(",") ? fichier.split(",")[1] : fichier;
        contenu = Buffer.from(base64, "base64");
    } else {
        throw new Error("Format de photo invalide.");
    }
    if (!contenu.length) throw new Error("Le fichier photo est vide.");

    const dossier = obtenirDossierPhotos();
    const destination = path.join(dossier, `${personneId}${extension}`);
    const suffixe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const temporaire = path.join(dossier, `.${personneId}-${suffixe}.tmp`);
    fs.writeFileSync(temporaire, contenu);

    const anciens = fs.readdirSync(dossier)
        .filter(nom => path.basename(nom, path.extname(nom)) === personneId)
        .map(nom => path.join(dossier, nom));
    const sauvegardes = [];
    try {
        for (const ancien of anciens) {
            const sauvegarde = `${ancien}.${suffixe}.bak`;
            fs.renameSync(ancien, sauvegarde);
            sauvegardes.push({ ancien, sauvegarde });
        }
        fs.renameSync(temporaire, destination);
    } catch (error) {
        if (fs.existsSync(destination)) {
            try { fs.unlinkSync(destination); } catch {}
        }
        for (const entree of sauvegardes.reverse()) {
            if (fs.existsSync(entree.sauvegarde)) {
                try { fs.renameSync(entree.sauvegarde, entree.ancien); } catch {}
            }
        }
        if (fs.existsSync(temporaire)) {
            try { fs.unlinkSync(temporaire); } catch {}
        }
        throw error;
    }
    for (const entree of sauvegardes) {
        try { fs.unlinkSync(entree.sauvegarde); } catch {}
    }

    return {
        personneId,
        chemin: destination,
        fileName:
            path.basename(destination),
        mimeType:
            mimeType ||
            obtenirMimeType(extension)
    };
}

function obtenirPhoto(
    personneId
) {
    const dossier =
        obtenirDossierPhotos();

    if (
        !fs.existsSync(dossier)
    ) {
        return null;
    }

    const fichier =
        fs.readdirSync(
            dossier
        ).find(
            nom =>
                path.basename(
                    nom,
                    path.extname(nom)
                ) === personneId
        );

    if (!fichier) {
        return null;
    }

    return fs.readFileSync(
        path.join(
            dossier,
            fichier
        )
    );
}

function obtenirInformationsPhoto(
    personneId
) {
    const dossier =
        obtenirDossierPhotos();

    if (
        !fs.existsSync(dossier)
    ) {
        return null;
    }

    const fichier =
        fs.readdirSync(
            dossier
        ).find(
            nom =>
                path.basename(
                    nom,
                    path.extname(nom)
                ) === personneId
        );

    if (!fichier) {
        return null;
    }

    const chemin =
        path.join(
            dossier,
            fichier
        );

    const statistiques =
        fs.statSync(
            chemin
        );

    return {
        personneId,
        chemin,
        fileName: fichier,
        mimeType:
            obtenirMimeType(
                path.extname(fichier)
                    .toLowerCase()
            ),
        taille:
            statistiques.size,
        dateModification:
            statistiques.mtime.toISOString()
    };
}

function supprimerPhoto(
    personneId
) {
    supprimerAnciennesPhotos(
        personneId
    );

    return true;
}

function obtenirMimeType(
    extension
) {
    const types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp"
    };

    return types[extension] ||
        "application/octet-stream";
}

module.exports = {
    definirDossierPhotos,
    obtenirDossierPhotos,
    obtenirCheminPhoto,
    enregistrerPhoto,
    obtenirPhoto,
    obtenirInformationsPhoto,
    supprimerPhoto
};