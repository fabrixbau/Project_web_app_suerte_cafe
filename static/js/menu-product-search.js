(() => {
    const control = document.querySelector("[data-menu-product-search]");
    if (!control) return;

    const form = control.closest("form");
    const input = control.querySelector("input[name='q']");
    const list = control.querySelector(".menu-product-suggestions");
    const compactToggle = control.querySelector(".menu-search-toggle");
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
        closeList();
    }

    function positionList() {
        if (list.hidden) return;
        control.classList.remove("opens-up");
        const rect = input.getBoundingClientRect();
        const desiredHeight = Math.min(list.scrollHeight || 300, 300) + 12;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        control.classList.toggle("opens-up", spaceBelow < desiredHeight && spaceAbove > spaceBelow);
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
        compactToggle.addEventListener("click", () => {
            const willOpen = !control.classList.contains("is-search-open");
            control.classList.toggle("is-search-open", willOpen);
            compactToggle.setAttribute("aria-expanded", String(willOpen));
            if (willOpen) {
                window.setTimeout(() => input.focus(), 0);
            } else {
                closeList();
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
    window.addEventListener("resize", positionList);
    window.addEventListener("scroll", () => {
        if (list.hidden) return;
        const rect = input.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) closeList();
    }, true);
})();
