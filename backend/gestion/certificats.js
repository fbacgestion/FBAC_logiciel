const fs = require("fs");
const path = require("path");
const { app } = require("electron");

function obtenirDossierCertificats() {
    const dossier =
        path.join(
            app.getPath("userData"),
            "fichiers",
            "certificats"
        );

    fs.mkdirSync(
        dossier,
        {
            recursive: true
        }
    );

    return dossier;
}

function obtenirCheminCertificat(
    inscriptionId
) {
    if (!inscriptionId) {
        throw new Error(
            "Identifiant d'inscription manquant."
        );
    }

    return path.join(
        obtenirDossierCertificats(),
        `${inscriptionId}.pdf`
    );
}

function enregistrerCertificat(
    inscriptionId,
    fichier
) {
    if (!inscriptionId) {
        throw new Error(
            "Identifiant d'inscription manquant."
        );
    }

    if (!fichier) {
        throw new Error(
            "Aucun certificat fourni."
        );
    }

    const destination =
        obtenirCheminCertificat(
            inscriptionId
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
            "Format de certificat invalide."
        );
    }

    return {
        inscriptionId,
        chemin: destination,
        fileName:
            `${inscriptionId}.pdf`,
        mimeType:
            "application/pdf"
    };
}

function certificatExiste(
    inscriptionId
) {
    const chemin =
        obtenirCheminCertificat(
            inscriptionId
        );

    return fs.existsSync(
        chemin
    );
}

function lireCertificat(
    inscriptionId
) {
    const chemin =
        obtenirCheminCertificat(
            inscriptionId
        );

    if (
        !fs.existsSync(chemin)
    ) {
        return null;
    }

    return fs.readFileSync(
        chemin
    );
}

function supprimerCertificat(
    inscriptionId
) {
    const chemin =
        obtenirCheminCertificat(
            inscriptionId
        );

    if (
        fs.existsSync(chemin)
    ) {
        fs.unlinkSync(
            chemin
        );
    }

    return true;
}

function obtenirInformationsCertificat(
    inscriptionId
) {
    const chemin =
        obtenirCheminCertificat(
            inscriptionId
        );

    if (
        !fs.existsSync(chemin)
    ) {
        return null;
    }

    const statistiques =
        fs.statSync(
            chemin
        );

    return {
        inscriptionId,
        chemin,
        fileName:
            path.basename(chemin),
        mimeType:
            "application/pdf",
        taille:
            statistiques.size,
        dateModification:
            statistiques.mtime.toISOString()
    };
}

module.exports = {
    obtenirDossierCertificats,
    obtenirCheminCertificat,
    enregistrerCertificat,
    certificatExiste,
    lireCertificat,
    supprimerCertificat,
    obtenirInformationsCertificat
};