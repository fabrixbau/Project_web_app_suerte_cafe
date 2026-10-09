(() => {
    const toggle = document.querySelector("#user-menu-toggle");
    const panel = document.querySelector("#user-menu");
    if (!toggle || !panel) return;

    function closeMenu() {
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
    }

    function toggleMenu(event) {
        event.preventDefault();
        event.stopPropagation();
        const willOpen = panel.hidden;
        panel.hidden = !willOpen;
        toggle.setAttribute("aria-expanded", String(willOpen));
    }

    toggle.addEventListener("click", toggleMenu);
    toggle.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") toggleMenu(event);
    });

    document.addEventListener("click", (event) => {
        if (!panel.hidden && !panel.contains(event.target) && !toggle.contains(event.target)) {
            closeMenu();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenu();
    });
})();
