function changerPage(page) {
    if (!page) {
        return;
    }

    const correspondances = {
        dashboard: "dashboard",
        members: "adherents",
        payments: "paiements",
        referrals: "parrainages",
        seasons: "saisons",
        settings: "parametres",
        accounting: "accounting"
    };

    const pageInterne =
        correspondances[page] ||
        page;

    if (typeof ui !== "undefined") {
        ui.page = pageInterne;
    }

    document.querySelectorAll(".page").forEach(element => {
        element.classList.remove("active");
    });

    const pageElement =
        document.getElementById(`page-${pageInterne}`);

    if (pageElement) {
        pageElement.classList.add("active");
    }

    document.querySelectorAll(".nav button[data-page]").forEach(element => {
        element.classList.remove("active");
    });

    const navItem =
        document.querySelector(
            `.nav button[data-page="${page}"]`
        );

    if (navItem) {
        navItem.classList.add("active");
    }

    const titres = {
        dashboard: "Tableau de bord",
        members: "Adhérents",
        payments: "Paiements",
        referrals: "Parrainages",
        seasons: "Saisons",
        settings: "Paramètres",
        accounting: "Vue financière"
    };

    const titre =
        document.getElementById("pageTitle");

    if (titre && titres[page]) {
        titre.textContent = titres[page];
    }

    if (typeof renderCurrentPage === "function") {
        renderCurrentPage();
    }
}

function initialiserNavigation() {
    document.querySelectorAll(".nav button[data-page]").forEach(element => {
        element.addEventListener("click", () => {
            const page = element.dataset.page;

            if (page) {
                changerPage(page);
            }
        });
    });

    document.querySelectorAll("[data-page-link]").forEach(element => {
        element.addEventListener("click", () => {
            const page = element.dataset.pageLink;

            if (page) {
                changerPage(page);
            }
        });
    });
}