document.addEventListener("DOMContentLoaded", () => {
    const profileButton = document.getElementById("profile-button");
    const profileModal = document.getElementById("profile-modal");
    const closeModal = document.getElementById("close-modal");

    if (profileButton) {
        profileButton.addEventListener("click", () => {
            // Aqui você pode buscar os dados do usuário e preencher o modal
            const user = JSON.parse(localStorage.getItem("user"));
            if (user) {
                document.getElementById("user-name").textContent = user.fullName;
                document.getElementById("user-email").textContent = user.email;
                document.getElementById("user-whatsapp").textContent = user.whatsapp;
            }
            profileModal.style.display = "flex";
        });
    }

    if (closeModal) {
        closeModal.addEventListener("click", () => {
            profileModal.style.display = "none";
        });
    }

    window.addEventListener("click", (event) => {
        if (event.target == profileModal) {
            profileModal.style.display = "none";
        }
    });
});

