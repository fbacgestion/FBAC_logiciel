function afficherNotification(message, type = "info") {
    const conteneur = document.getElementById("toastContainer");

    if (!conteneur) {
        console.warn(message);
        return;
    }

    conteneur.className = "toast";
    conteneur.classList.add(`toast-${type}`);
    conteneur.textContent = message;
    conteneur.classList.add("visible");

    clearTimeout(conteneur._timeout);

    conteneur._timeout = setTimeout(() => {
        conteneur.classList.remove("visible");
    }, 3500);
}

function notificationSucces(message) {
    afficherNotification(message, "succes");
}

function notificationErreur(message) {
    afficherNotification(message, "erreur");
}

function notificationAvertissement(message) {
    afficherNotification(message, "avertissement");
}

function notificationInfo(message) {
    afficherNotification(message, "info");
}