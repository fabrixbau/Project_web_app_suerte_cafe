(() => {
    var select = document.querySelector("#id_user");
    var accessPanel = document.querySelector("[data-login-access]");
    var password = document.querySelector("#id_password");
    var passwordHelp = document.querySelector("[data-password-help]");
    var cards = Array.prototype.slice.call(document.querySelectorAll("[data-login-profile]"));
    if (!select || !accessPanel || !cards.length) return;

    function selectProfile(card, moveFocus) {
        if (typeof moveFocus === "undefined") moveFocus = true;
        select.value = card.getAttribute("data-login-profile");
        cards.forEach((item) => {
            var selected = item === card;
            if (selected) item.classList.add("is-selected");
            else item.classList.remove("is-selected");
            item.setAttribute("aria-selected", selected ? "true" : "false");
        });
        var requiresPassword = card.getAttribute("data-requires-password") === "true";
        accessPanel.hidden = false;
        accessPanel.removeAttribute("hidden");
        accessPanel.setAttribute("aria-hidden", "false");
        accessPanel.classList.add("is-visible");
        passwordHelp.textContent = requiresPassword
            ? "Este perfil necesita contraseña."
            : "Este perfil puede entrar sin contraseña.";
        if (moveFocus) {
            var focusTarget = requiresPassword ? password : accessPanel.querySelector("button[type='submit']");
            if (focusTarget && typeof focusTarget.focus === "function") focusTarget.focus();
        }
    }

    cards.forEach((card) => card.addEventListener("click", () => selectProfile(card)));
    var selectedCard = null;
    cards.some((card) => {
        if (card.getAttribute("data-login-profile") !== select.value) return false;
        selectedCard = card;
        return true;
    });
    if (selectedCard) selectProfile(selectedCard, false);
})();
