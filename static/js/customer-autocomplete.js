(() => {
    const container = document.querySelector("[data-delivery-customer-lookup]");
    const nameInput = document.querySelector("#id_customer_name");
    const phoneInput = document.querySelector("#id_phone");
    const orderType = document.querySelector("#id_order_type");
    const status = container?.querySelector(".customer-lookup-status");
    const matchList = container?.querySelector("[data-customer-match-list]");
    if (!container || !nameInput || !orderType || !status || !matchList) return;

    const fields = {
        phone: phoneInput,
        street: document.querySelector("#id_street"),
        exterior_number: document.querySelector("#id_exterior_number"),
        interior_number: document.querySelector("#id_interior_number"),
        neighborhood: document.querySelector("#id_neighborhood"),
        notes: document.querySelector("#id_notes"),
    };
    let timer;
    let requestNumber = 0;
    let lastAutofilled = null;
    let matches = [];
    let activeIndex = -1;

    function lookupEnabled() {
        return ["delivery", "pickup"].includes(orderType.value);
    }

    function closeMatches() {
        matches = [];
        activeIndex = -1;
        while (matchList.firstChild) matchList.removeChild(matchList.firstChild);
        matchList.hidden = true;
        nameInput.setAttribute("aria-expanded", "false");
        phoneInput?.setAttribute("aria-expanded", "false");
        container.classList.remove("opens-up");
    }

    function positionMatches() {
        if (matchList.hidden) return;
        container.classList.remove("opens-up");
        const rect = container.getBoundingClientRect();
        const desiredHeight = Math.min(matchList.scrollHeight || 280, 280) + 12;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        container.classList.toggle("opens-up", spaceBelow < desiredHeight && spaceAbove > spaceBelow);
    }

    function clearPreviousAutofill() {
        if (!lastAutofilled) return;
        Object.entries(fields).forEach(([key, field]) => {
            if (field && field.value === (lastAutofilled[key] || "")) field.value = "";
        });
        lastAutofilled = null;
    }

    function customerDescription(customer) {
        const address = [customer.street, customer.exterior_number].filter(Boolean).join(" ");
        return [customer.phone, address, customer.neighborhood].filter(Boolean).join(" · ") || "Sin datos adicionales";
    }

    function refreshActiveOption() {
        matchList.querySelectorAll(".customer-match-option").forEach((option, index) => {
            option.classList.toggle("is-active", index === activeIndex);
            option.setAttribute("aria-selected", String(index === activeIndex));
        });
    }

    function selectCustomer(customer) {
        nameInput.value = customer.name || "";
        const reusableFields = orderType.value === "pickup" ? {phone: fields.phone} : fields;
        Object.entries(reusableFields).forEach(([key, field]) => {
            if (field) field.value = customer[key] || "";
        });
        lastAutofilled = Object.fromEntries(
            Object.keys(reusableFields).map((key) => [key, customer[key] || ""]),
        );
        status.textContent = "Datos del cliente recuperados";
        status.className = "customer-lookup-status is-found";
        closeMatches();
    }

    function renderMatches(foundMatches) {
        matches = foundMatches;
        activeIndex = -1;
        while (matchList.firstChild) matchList.removeChild(matchList.firstChild);
        matches.forEach((customer, index) => {
            const option = document.createElement("button");
            const name = document.createElement("strong");
            const description = document.createElement("small");
            option.type = "button";
            option.className = "customer-match-option";
            option.setAttribute("role", "option");
            option.setAttribute("aria-selected", "false");
            name.textContent = customer.name;
            description.textContent = customerDescription(customer);
            option.appendChild(name);
            option.appendChild(description);
            option.addEventListener("mousedown", (event) => event.preventDefault());
            option.addEventListener("click", () => selectCustomer(matches[index]));
            matchList.appendChild(option);
        });
        matchList.hidden = matches.length === 0;
        nameInput.setAttribute("aria-expanded", String(matches.length > 0));
        phoneInput?.setAttribute("aria-expanded", String(matches.length > 0));
        if (matches.length) window.requestAnimationFrame(positionMatches);
    }

    async function findCustomers(sourceInput) {
        const query = sourceInput.value.trim();
        if (!lookupEnabled() || query.length < 2) {
            closeMatches();
            status.textContent = query ? "Escribe al menos 2 caracteres" : "";
            return;
        }
        const currentRequest = ++requestNumber;
        const endpoint = container.dataset.deliveryCustomerLookup;
        const url = `${endpoint}${endpoint.includes("?") ? "&" : "?"}q=${encodeURIComponent(query)}`;
        try {
            const response = await fetch(url, {headers: {Accept: "application/json"}});
            if (!response.ok || currentRequest !== requestNumber) return;
            const data = await response.json();
            const foundMatches = Array.isArray(data.matches) ? data.matches : [];
            renderMatches(foundMatches);
            status.textContent = foundMatches.length
                ? `${foundMatches.length} cliente${foundMatches.length === 1 ? "" : "s"} encontrado${foundMatches.length === 1 ? "" : "s"}`
                : "Cliente nuevo";
            status.className = `customer-lookup-status ${foundMatches.length ? "is-found" : "is-new"}`;
        } catch {
            closeMatches();
            status.textContent = "No fue posible consultar los clientes guardados";
            status.className = "customer-lookup-status is-error";
        }
    }

    function scheduleLookup(sourceInput) {
        window.clearTimeout(timer);
        if (lastAutofilled) clearPreviousAutofill();
        status.textContent = "";
        timer = window.setTimeout(() => findCustomers(sourceInput), 250);
    }

    function handleKeyboard(event) {
        if (matchList.hidden || !matches.length) return;
        if (event.key === "ArrowDown") {
            event.preventDefault();
            activeIndex = (activeIndex + 1) % matches.length;
            refreshActiveOption();
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            activeIndex = (activeIndex - 1 + matches.length) % matches.length;
            refreshActiveOption();
        } else if (event.key === "Enter" && activeIndex >= 0) {
            event.preventDefault();
            selectCustomer(matches[activeIndex]);
        } else if (event.key === "Escape") {
            closeMatches();
        }
    }

    [nameInput, phoneInput].filter(Boolean).forEach((input) => {
        input.setAttribute("autocomplete", "off");
        input.setAttribute("aria-autocomplete", "list");
        input.setAttribute("aria-expanded", "false");
        input.addEventListener("input", () => scheduleLookup(input));
        input.addEventListener("keydown", handleKeyboard);
        input.addEventListener("focus", () => {
            if (input.value.trim().length >= 2) scheduleLookup(input);
        });
    });

    document.addEventListener("click", (event) => {
        if (!container.contains(event.target) && event.target !== phoneInput) closeMatches();
    });
    window.addEventListener("scroll", (event) => {
        const target = event.target;
        if (target && target.nodeType === 1 && target.closest(".customer-match-list")) return;
        if (matchList.hidden) return;
        const rect = container.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) closeMatches();
    }, true);
    window.addEventListener("resize", positionMatches);
    document.querySelectorAll(".order-type-option").forEach((button) => {
        button.addEventListener("click", () => {
            window.clearTimeout(timer);
            closeMatches();
            status.textContent = "";
        });
    });
})();
