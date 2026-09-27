function afficherSaisons() {
    if (typeof state === "undefined" || !state) {
        return;
    }

    const conteneur =
        document.getElementById("seasonList");

    if (!conteneur) {
        return;
    }

    const saisons =
        [...state.saisons].sort(
            (a, b) =>
                Number(b.anneeDebut) -
                Number(a.anneeDebut)
        );

    if (saisons.length === 0) {
        conteneur.innerHTML = `
            <div class="empty-state">
                Aucune saison enregistrée.
            </div>
        `;
        return;
    }

    conteneur.innerHTML =
        saisons.map(saison => {
            const inscriptions =
                state.inscriptions.filter(
                    inscription =>
                        inscription.saisonId === saison.id
                );

            const total =
                inscriptions.reduce(
                    (somme, inscription) =>
                        somme +
                        calculerMontantAPayer(inscription),
                    0
                );

            const encaisse =
                inscriptions.reduce(
                    (somme, inscription) =>
                        somme +
                        (Number(inscription.montantPaye) || 0),
                    0
                );

            const active =
                saison.id ===
                state.configuration.saisonActiveId;

            return `
                <div class="season-card">
                    <div class="season-card-header">
                        <div>
                            <h3>${echapperHtml(saison.nom)}</h3>
                            ${
                                active
                                    ? `<span class="badge success">Saison active</span>`
                                    : ""
                            }
                        </div>
                        <strong>
                            ${inscriptions.length} adhérent(s)
                        </strong>
                    </div>
                    <div class="season-card-content">
                        <div>
                            <span>Total attendu</span>
                            <strong>${total.toFixed(2)} €</strong>
                        </div>
                        <div>
                            <span>Encaissé</span>
                            <strong>${encaisse.toFixed(2)} €</strong>
                        </div>
                        <div>
                            <span>Reste</span>
                            <strong>
                                ${Math.max(0, total - encaisse).toFixed(2)} €
                            </strong>
                        </div>
                    </div>
                    <div class="season-card-actions">
                        <span class="season-card-status">
                            ${
                                active
                                    ? "Saison active automatiquement"
                                    : "Saison historique"
                            }
                        </span>
                    </div>
                </div>
            `;
        }).join("");
}

