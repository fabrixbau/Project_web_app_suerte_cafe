(() => {
    const root = document.documentElement;
    const button = document.querySelector("[data-sidebar-toggle]");
    if (!button) return;

    function refresh() {
        const expanded = root.dataset.sidebar !== "collapsed";
        button.setAttribute("aria-expanded", String(expanded));
        button.setAttribute("aria-label", expanded ? "Plegar barra lateral" : "Desplegar barra lateral");
        document.querySelectorAll(".sidebar nav a, .sidebar nav button").forEach((item) => {
            const label = item.textContent.trim().replace(/\s+/g, " ");
            if (label) item.title = expanded ? "" : label;
        });
    }

    button.addEventListener("click", () => {
        const next = root.dataset.sidebar === "collapsed" ? "expanded" : "collapsed";
        root.dataset.sidebar = next;
        try { window.localStorage.setItem("suerteCafeSidebar", next); } catch (_) { /* Preferencia opcional. */ }
        refresh();
    });
    refresh();
})();
