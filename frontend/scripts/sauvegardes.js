async function lancerRestaurationDonnees() {
    const resultat =
        await window.fbac.restaurerDerniereSauvegarde();

    return resultat;
}
