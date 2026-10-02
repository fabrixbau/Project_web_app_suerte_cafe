(() => {
    const themeKey = "suerteCafeTheme";
    const paletteKey = "suerteCafePalette";
    const toggle = document.querySelector("#appearance-toggle");
    const panel = document.querySelector("#appearance-panel");

    if (!toggle || !panel) return;

    const themes = ["light", "dark"];
    const palettes = ["coffee", "terracotta", "green"];

    function storedValue(key, allowed, fallback) {
        const value = localStorage.getItem(key);
        return allowed.includes(value) ? value : fallback;
    }

    function applyAppearance() {
        const theme = storedValue(themeKey, themes, "light");
        const palette = storedValue(paletteKey, palettes, "coffee");
        document.documentElement.dataset.theme = theme;
        document.documentElement.dataset.palette = palette;
        panel.querySelector(`[name="theme"][value="${theme}"]`).checked = true;
        panel.querySelector(`[name="palette"][value="${palette}"]`).checked = true;
    }

    function closePanel() {
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", () => {
        const willOpen = panel.hidden;
        panel.hidden = !willOpen;
        toggle.setAttribute("aria-expanded", String(willOpen));
    });

    panel.addEventListener("change", (event) => {
        if (event.target.name === "theme") {
            localStorage.setItem(themeKey, event.target.value);
        } else if (event.target.name === "palette") {
            localStorage.setItem(paletteKey, event.target.value);
        }
        applyAppearance();
    });

    document.addEventListener("click", (event) => {
        if (!panel.hidden && !panel.contains(event.target) && event.target !== toggle) {
            closePanel();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closePanel();
    });

    applyAppearance();
})();
