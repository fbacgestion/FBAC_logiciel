const fs = require("fs");
const path = require("path");
const { app } = require("electron");

function obtenirDossierPhotos() {
    const dossier =
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

    const extension =
        obtenirExtension(
            nomFichier,
            mimeType
        );

    supprimerAnciennesPhotos(
        personneId
    );

    const destination =
        obtenirCheminPhoto(
            personneId,
            extension
        );

    if (
        Buffer.isBuffer(fichier)
    ) {
        fs.writeFileSync(
            destination,
            fichier
        );
    } else if (
        typeof fichier === "string"
    ) {
        const base64 =
            fichier.includes(",")
                ? fichier.split(",")[1]
                : fichier;

        fs.writeFileSync(
            destination,
            Buffer.from(
                base64,
                "base64"
            )
        );
    } else {
        throw new Error(
            "Format de photo invalide."
        );
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
    obtenirDossierPhotos,
    obtenirCheminPhoto,
    enregistrerPhoto,
    obtenirPhoto,
    obtenirInformationsPhoto,
    supprimerPhoto
};