(() => {
    const control = document.querySelector("[data-menu-product-search]");
    if (!control) return;

    const form = control.closest("form");
    const input = control.querySelector("input[name='q']");
    const list = control.querySelector(".menu-product-suggestions");
    const compactToggle = control.querySelector(".menu-search-toggle");
    const compactMedia = window.matchMedia("(max-width: 600px), (min-width: 601px) and (max-width: 900px) and (orientation: portrait)");
    const allOptions = Array.from(list.querySelectorAll(".menu-product-suggestion"));
    let visibleOptions = [];
    let activeIndex = -1;

    function normalize(value) {
        const text = String(value || "").toLocaleLowerCase("es-MX");
        return text.normalize ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : text;
    }

    function closeList() {
        list.hidden = true;
        input.setAttribute("aria-expanded", "false");
        control.classList.remove("opens-up");
        activeIndex = -1;
    }

    function closeCompactSearch() {
        control.classList.remove("is-search-open");
        if (compactToggle) compactToggle.setAttribute("aria-expanded", "false");
        input.removeAttribute("style");
        list.removeAttribute("style");
        closeList();
    }

    function positionCompactSearch() {
        if (!compactMedia.matches || !control.classList.contains("is-search-open")) return;

        const viewportWidth = document.documentElement.clientWidth;
        const toggleRect = compactToggle.getBoundingClientRect();
        const width = Math.min(320, viewportWidth - 24);
        const left = Math.max(12, Math.min(toggleRect.left, viewportWidth - width - 12));
        const top = toggleRect.bottom + 7;

        input.style.position = "fixed";
        input.style.left = `${left}px`;
        input.style.top = `${top}px`;
        input.style.width = `${width}px`;
        input.style.maxWidth = `${width}px`;
    }

    function positionList() {
        if (list.hidden) return;
        control.classList.remove("opens-up");
        positionCompactSearch();
        const rect = input.getBoundingClientRect();
        const desiredHeight = Math.min(list.scrollHeight || 300, 300) + 12;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const opensUp = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
        control.classList.toggle("opens-up", opensUp);

        if (compactMedia.matches) {
            const maxHeight = Math.max(96, Math.min(300, (opensUp ? spaceAbove : spaceBelow) - 16));
            list.style.position = "fixed";
            list.style.left = `${rect.left}px`;
            list.style.width = `${rect.width}px`;
            list.style.maxWidth = `${rect.width}px`;
            list.style.maxHeight = `${maxHeight}px`;
            list.style.top = opensUp ? "auto" : `${rect.bottom + 7}px`;
            list.style.bottom = opensUp ? `${window.innerHeight - rect.top + 7}px` : "auto";
        } else {
            list.removeAttribute("style");
        }
    }

    function refreshActive() {
        visibleOptions.forEach((option, index) => {
            const active = index === activeIndex;
            option.classList.toggle("is-active", active);
            option.setAttribute("aria-selected", String(active));
            if (active) option.scrollIntoView({block: "nearest"});
        });
    }

    function showMatches() {
        const query = normalize(input.value.trim());
        activeIndex = -1;
        visibleOptions = [];
        allOptions.forEach((option) => {
            const matches = query && normalize(option.textContent).includes(query) && visibleOptions.length < 8;
            option.hidden = !matches;
            option.classList.remove("is-active");
            option.setAttribute("aria-selected", "false");
            if (matches) visibleOptions.push(option);
        });
        list.hidden = visibleOptions.length === 0;
        input.setAttribute("aria-expanded", String(visibleOptions.length > 0));
        if (visibleOptions.length) window.requestAnimationFrame(positionList);
        else control.classList.remove("opens-up");
    }

    function submitOption(option) {
        input.value = option.dataset.searchValue;
        closeList();
        if (form.requestSubmit) form.requestSubmit();
        else form.submit();
    }

    allOptions.forEach((option) => {
        option.addEventListener("mousedown", (event) => event.preventDefault());
        option.addEventListener("click", () => submitOption(option));
    });

    if (compactToggle) {
        compactToggle.addEventListener("click", (event) => {
            event.preventDefault();
            const willOpen = !control.classList.contains("is-search-open");
            control.classList.toggle("is-search-open", willOpen);
            compactToggle.setAttribute("aria-expanded", String(willOpen));
            if (willOpen) {
                positionCompactSearch();
                window.setTimeout(() => {
                    positionCompactSearch();
                    input.focus();
                    showMatches();
                }, 0);
            } else {
                closeCompactSearch();
            }
        });
    }

    input.addEventListener("input", showMatches);
    input.addEventListener("focus", showMatches);
    input.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" && visibleOptions.length) {
            event.preventDefault();
            activeIndex = (activeIndex + 1) % visibleOptions.length;
            refreshActive();
        } else if (event.key === "ArrowUp" && visibleOptions.length) {
            event.preventDefault();
            activeIndex = (activeIndex - 1 + visibleOptions.length) % visibleOptions.length;
            refreshActive();
        } else if (event.key === "Enter" && activeIndex >= 0) {
            event.preventDefault();
            submitOption(visibleOptions[activeIndex]);
        } else if (event.key === "Escape") {
            closeCompactSearch();
            if (compactToggle) compactToggle.focus();
        }
    });

    document.addEventListener("click", (event) => {
        if (!control.contains(event.target)) closeCompactSearch();
    });
    window.addEventListener("resize", () => {
        positionCompactSearch();
        positionList();
    });
    window.addEventListener("scroll", () => {
        if (list.hidden) return;
        const rect = input.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) closeList();
    }, true);
})();
