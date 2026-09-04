(() => {
    const select = document.querySelector("#id_user");
    const accessPanel = document.querySelector("[data-login-access]");
    const password = document.querySelector("#id_password");
    const passwordHelp = document.querySelector("[data-password-help]");
    const cards = [...document.querySelectorAll("[data-login-profile]")];
    if (!select || !accessPanel || !cards.length) return;

    function selectProfile(card, moveFocus = true) {
        select.value = card.dataset.loginProfile;
        cards.forEach((item) => {
            const selected = item === card;
            item.classList.toggle("is-selected", selected);
            item.setAttribute("aria-selected", selected ? "true" : "false");
        });
        const requiresPassword = card.dataset.requiresPassword === "true";
        accessPanel.hidden = false;
        passwordHelp.textContent = requiresPassword
            ? "Este perfil necesita contraseña."
            : "Este perfil puede entrar sin contraseña.";
        if (moveFocus) {
            (requiresPassword ? password : accessPanel.querySelector("button[type='submit']"))?.focus();
        }
    }

    cards.forEach((card) => card.addEventListener("click", () => selectProfile(card)));
    const selectedCard = cards.find((card) => card.dataset.loginProfile === select.value);
    if (selectedCard) selectProfile(selectedCard, false);
})();
