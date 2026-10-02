(() => {
    const toggle = document.querySelector("[data-product-search-toggle]");
    const panel = document.querySelector("[data-product-search-panel]");
    const input = document.querySelector("[data-product-search-input]");
    const suggestions = document.querySelector("[data-product-search-suggestions]");
    const searchControl = panel?.querySelector(".product-search-control");
    const feedback = document.querySelector("[data-product-search-feedback]");
    if (!toggle || !panel || !input || !suggestions || !feedback || !searchControl) return;

    const categoryButtons = [...document.querySelectorAll(".category-card[data-category-target]")];
    const sections = [...document.querySelectorAll(".category-products")];
    const products = [...document.querySelectorAll(".category-products .product-card[data-name]")].map((card) => ({
        card,
        section: card.closest(".category-products"),
        name: card.dataset.name || "",
        category: card.closest(".category-products")?.querySelector("h3")?.textContent.trim() || "",
        price: card.dataset.price || "0",
    }));
    let visibleSuggestions = [];
    let activeIndex = -1;
    let observers = [];
    // Mientras un botón de la sugerencia reenvía su clic a la tarjeta, ese clic no cierra la lista.
    let proxying = false;

    function stopObserving() {
        observers.forEach((observer) => observer.disconnect());
        observers = [];
    }

    function normalize(value) {
        const text = String(value || "").toLocaleLowerCase("es-MX");
        return text.normalize ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : text;
    }

    function clearSuggestions() {
        stopObserving();
        suggestions.innerHTML = "";
        suggestions.hidden = true;
        input.setAttribute("aria-expanded", "false");
        activeIndex = -1;
        searchControl.classList.remove("opens-up");
    }

    function positionSuggestions() {
        if (suggestions.hidden) return;
        searchControl.classList.remove("opens-up");
        const rect = input.getBoundingClientRect();
        const desiredHeight = Math.min(suggestions.scrollHeight || 300, 300) + 12;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        searchControl.classList.toggle("opens-up", spaceBelow < desiredHeight && spaceAbove > spaceBelow);
    }

    function restoreProducts() {
        products.forEach(({card}) => { card.hidden = false; });
    }

    function matchesFor(query) {
        const term = normalize(query.trim());
        if (!term) return [];
        return products.filter(({name, category}) => normalize(`${name} ${category}`).indexOf(term) !== -1);
    }

    function showResults(query) {
        const matches = matchesFor(query);
        const matchingCards = new Set(matches.map(({card}) => card));
        sections.forEach((section) => {
            const sectionProducts = products.filter((product) => product.section === section);
            sectionProducts.forEach(({card}) => { card.hidden = !matchingCards.has(card); });
            section.hidden = !sectionProducts.some(({card}) => matchingCards.has(card));
        });
        feedback.textContent = query.trim()
            ? `${matches.length} producto${matches.length === 1 ? "" : "s"} encontrado${matches.length === 1 ? "" : "s"}.`
            : "Escribe para buscar en todo el menú.";
        document.dispatchEvent(new CustomEvent("order-menu-focus"));
        return matches;
    }

    function choose(product) {
        input.value = product.name;
        showResults(product.name);
        clearSuggestions();
        window.setTimeout(() => {
            try { product.card.scrollIntoView({behavior: "smooth", block: "center"}); }
            catch (_) { product.card.scrollIntoView(true); }
        }, 0);
    }

    // − # + y Personalizar de cada sugerencia: presionan los botones reales de la tarjeta del
    // producto, así que agregan al pedido exactamente igual que el catálogo.
    function controlsFor(product) {
        const decrease = product.card.querySelector(".decrease-quantity");
        const increase = product.card.querySelector(".increase-quantity");
        const total = product.card.querySelector("[data-product-total-quantity]");
        const customize = product.card.querySelector("[data-customize-product]");
        if (!decrease || !increase || !total) return null;
        const box = document.createElement("div");
        box.className = "product-search-controls";
        const control = (text, label, target, keepOpen) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "product-search-control";
            button.textContent = text;
            button.setAttribute("aria-label", label + " " + product.name);
            button.addEventListener("mousedown", (event) => event.preventDefault());
            button.addEventListener("click", (event) => {
                event.stopPropagation();
                if (!keepOpen) clearSuggestions();
                // Agregar el primer producto compacta el mapa de mesas y recorre la página;
                // se compensa el desplazamiento para que la lupa y su lista no se muevan.
                const topBefore = input.getBoundingClientRect().top;
                proxying = true;
                try { target.click(); } finally { proxying = false; }
                if (keepOpen) {
                    window.requestAnimationFrame(() => {
                        const shift = input.getBoundingClientRect().top - topBefore;
                        if (Math.abs(shift) > 1) window.scrollBy(0, shift);
                    });
                }
            });
            return button;
        };
        const count = document.createElement("strong");
        count.className = "product-search-count";
        const sync = () => { count.textContent = total.textContent.trim() || "0"; };
        sync();
        const observer = new MutationObserver(sync);
        observer.observe(total, {subtree: true, childList: true, characterData: true});
        observers.push(observer);
        box.append(control("−", "Quitar uno de", decrease, true), count, control("+", "Agregar uno de", increase, true));
        if (customize) {
            const button = control("Personalizar", "Personalizar", customize, false);
            button.classList.add("is-customize");
            box.appendChild(button);
        }
        return box;
    }

    function renderSuggestions(matches) {
        stopObserving();
        suggestions.innerHTML = "";
        visibleSuggestions = matches.slice(0, 8);
        visibleSuggestions.forEach((product) => {
            const option = document.createElement("button");
            const name = document.createElement("strong");
            const category = document.createElement("small");
            const price = document.createElement("span");
            option.type = "button";
            option.className = "product-search-suggestion";
            option.setAttribute("role", "option");
            option.setAttribute("aria-selected", "false");
            name.textContent = product.name;
            category.textContent = product.category;
            price.textContent = `$${Number.parseFloat(product.price).toFixed(2)}`;
            option.append(name, category, price);
            option.addEventListener("mousedown", (event) => event.preventDefault());
            option.addEventListener("click", () => choose(product));
            const controls = controlsFor(product);
            if (controls) {
                const row = document.createElement("div");
                row.className = "product-search-row";
                row.append(option, controls);
                suggestions.appendChild(row);
            } else {
                suggestions.appendChild(option);
            }
        });
        suggestions.hidden = visibleSuggestions.length === 0;
        input.setAttribute("aria-expanded", String(visibleSuggestions.length > 0));
        activeIndex = -1;
        if (visibleSuggestions.length) window.requestAnimationFrame(positionSuggestions);
    }

    function refreshActive() {
        suggestions.querySelectorAll(".product-search-suggestion").forEach((option, index) => {
            option.classList.toggle("is-active", index === activeIndex);
            option.setAttribute("aria-selected", String(index === activeIndex));
        });
    }

    function openSearch() {
        categoryButtons.forEach((button) => button.classList.remove("is-selected"));
        sections.forEach((section) => { section.hidden = true; });
        toggle.classList.add("is-selected");
        panel.hidden = false;
        input.focus();
        showResults(input.value);
    }

    toggle.addEventListener("click", openSearch);
    categoryButtons.forEach((button) => button.addEventListener("click", () => {
        toggle.classList.remove("is-selected");
        panel.hidden = true;
        clearSuggestions();
        restoreProducts();
    }));
    input.addEventListener("input", () => {
        const matches = showResults(input.value);
        renderSuggestions(matches);
    });
    input.addEventListener("keydown", (event) => {
        const optionCount = visibleSuggestions.length;
        if (event.key === "ArrowDown" && optionCount) {
            event.preventDefault();
            activeIndex = (activeIndex + 1) % optionCount;
            refreshActive();
        } else if (event.key === "ArrowUp" && optionCount) {
            event.preventDefault();
            activeIndex = (activeIndex - 1 + optionCount) % optionCount;
            refreshActive();
        } else if (event.key === "Enter") {
            event.preventDefault();
            if (activeIndex >= 0) choose(visibleSuggestions[activeIndex]);
            else { showResults(input.value); clearSuggestions(); }
        } else if (event.key === "Escape") {
            clearSuggestions();
        }
    });
    document.addEventListener("click", (event) => {
        if (proxying) return;
        if (!panel.contains(event.target) && event.target !== toggle) clearSuggestions();
    });
    window.addEventListener("scroll", (event) => {
        const target = event.target;
        if (target && target.nodeType === 1 && target.closest(".product-search-suggestions")) return;
        if (suggestions.hidden) return;
        const rect = input.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) clearSuggestions();
    }, true);
    window.addEventListener("resize", positionSuggestions);
})();
