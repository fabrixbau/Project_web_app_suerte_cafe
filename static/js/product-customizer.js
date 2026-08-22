(() => {
    const dataElement = document.querySelector("#product-customizations");
    const hiddenInput = document.querySelector("#custom-items-input");
    const dialog = document.querySelector("#product-customization-dialog");
    if (!dataElement || !hiddenInput || !dialog) return;

    const products = JSON.parse(dataElement.textContent);
    const currency = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        currencyDisplay: "narrowSymbol",
    });
    let activeProduct = null;
    let dialogQuantity = 1;
    let customItems = [];

    function selectedOptionIds() {
        return [...dialog.querySelectorAll(".customization-choice-input:checked")]
            .map((input) => Number.parseInt(input.value, 10));
    }

    function buildItem(product, optionIds, quantity) {
        const selected = new Set(optionIds);
        const defaultIds = new Set();
        const labels = [];
        let price = Number.parseFloat(product.base_price);
        product.groups.forEach((group) => {
            const names = [];
            group.options.forEach((option) => {
                if (option.is_default) defaultIds.add(option.id);
                if (selected.has(option.id)) {
                    names.push(option.name);
                    price += Number.parseFloat(option.price_adjustment);
                }
            });
            if (names.length) labels.push(`${group.name}: ${names.join(", ")}`);
        });
        const signature = [...selected].sort((a, b) => a - b).join(",");
        const defaultSignature = [...defaultIds].sort((a, b) => a - b).join(",");
        return {
            key: `${product.id}|${signature}`,
            product_id: product.id,
            name: product.name,
            option_ids: [...selected],
            quantity,
            unit_price: price,
            labels,
            is_customized: signature !== defaultSignature,
        };
    }

    function syncHiddenInput() {
        hiddenInput.value = JSON.stringify(customItems.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            option_ids: item.option_ids,
        })));
    }

    function refreshEverything() {
        syncHiddenInput();
        window.refreshBaseOrderSummary?.();
    }

    function changeCustomQuantity(key, difference) {
        const item = customItems.find((candidate) => candidate.key === key);
        if (!item) return;
        item.quantity = Math.max(0, item.quantity + difference);
        customItems = customItems.filter((candidate) => candidate.quantity > 0);
        refreshEverything();
    }

    function renderCustomSummary(event) {
        const summary = document.querySelector("#current-order-items");
        const totalItems = document.querySelector("#total-items");
        const summaryItems = document.querySelector("#summary-items");
        const totalElement = document.querySelector("#order-total");
        const subtotalElement = document.querySelector("#order-subtotal");
        if (!summary || !totalItems || !summaryItems || !totalElement) return;

        let count = event.detail.count;
        let total = event.detail.total;
        if (customItems.length && summary.querySelector(":scope > p")) summary.innerHTML = "";

        customItems.forEach((item) => {
            const row = document.createElement("article");
            row.className = `current-order-item customized-order-item${item.is_customized ? " is-customized" : ""}`;
            const information = document.createElement("div");
            const name = document.createElement("strong");
            name.textContent = item.name;
            if (item.is_customized) {
                const badge = document.createElement("span");
                badge.className = "customized-warning";
                badge.textContent = "Modificado";
                name.append(" ", badge);
            }
            const details = document.createElement("span");
            details.textContent = item.labels.join(" · ") || "Configuración estándar";
            information.append(name, details);

            const controls = document.createElement("div");
            controls.className = "summary-quantity-control";
            const decrease = document.createElement("button");
            const amount = document.createElement("span");
            const increase = document.createElement("button");
            decrease.type = increase.type = "button";
            decrease.textContent = "−";
            increase.textContent = "+";
            amount.textContent = item.quantity;
            decrease.addEventListener("click", () => changeCustomQuantity(item.key, -1));
            increase.addEventListener("click", () => changeCustomQuantity(item.key, 1));
            controls.append(decrease, amount, increase);

            const subtotal = document.createElement("strong");
            subtotal.textContent = currency.format(item.unit_price * item.quantity);
            row.append(information, controls, subtotal);
            summary.appendChild(row);
            count += item.quantity;
            total += item.unit_price * item.quantity;
        });

        totalItems.textContent = count;
        summaryItems.textContent = count;
        totalElement.textContent = currency.format(total);
        if (subtotalElement) subtotalElement.textContent = currency.format(total);
    }

    function updateDialogPrice() {
        if (!activeProduct) return;
        const item = buildItem(activeProduct, selectedOptionIds(), dialogQuantity);
        dialog.querySelector("#dialog-quantity").textContent = dialogQuantity;
        dialog.querySelector("#dialog-unit-price").textContent = currency.format(item.unit_price);
    }

    function openDialog(productId) {
        activeProduct = products[String(productId)];
        if (!activeProduct) return;
        dialogQuantity = 1;
        dialog.querySelector("#customization-product-name").textContent = activeProduct.name;
        const groupsContainer = dialog.querySelector("#customization-groups");
        groupsContainer.innerHTML = "";

        activeProduct.groups.forEach((group) => {
            const section = document.createElement("fieldset");
            section.className = "order-customization-group";
            section.dataset.required = group.is_required ? "true" : "false";
            const legend = document.createElement("legend");
            legend.textContent = group.name;
            const help = document.createElement("small");
            help.textContent = group.selection_type === "single"
                ? `${group.is_required ? "Elige una" : "Opcional"}`
                : `${group.is_required ? "Elige al menos una" : "Puedes elegir varias"}`;
            section.append(legend, help);

            group.options.forEach((option) => {
                const label = document.createElement("label");
                label.className = "customization-choice";
                const input = document.createElement("input");
                input.className = "customization-choice-input";
                input.type = group.selection_type === "single" ? "radio" : "checkbox";
                input.name = `custom-group-${group.id}`;
                input.value = option.id;
                input.checked = option.is_default;
                const text = document.createElement("span");
                const adjustment = Number.parseFloat(option.price_adjustment);
                text.innerHTML = `<strong></strong><small></small>`;
                text.querySelector("strong").textContent = option.name;
                text.querySelector("small").textContent = adjustment
                    ? `${adjustment > 0 ? "+" : ""}${currency.format(adjustment)}`
                    : "Incluido";
                input.addEventListener("change", updateDialogPrice);
                label.append(input, text);
                section.appendChild(label);
            });
            groupsContainer.appendChild(section);
        });
        updateDialogPrice();
        dialog.showModal();
    }

    document.querySelectorAll("[data-customize-product]").forEach((button) => {
        button.addEventListener("click", () => openDialog(button.dataset.customizeProduct));
    });
    dialog.querySelector("[data-customization-close]").addEventListener("click", () => dialog.close());
    dialog.querySelector("[data-dialog-decrease]").addEventListener("click", () => { dialogQuantity = Math.max(1, dialogQuantity - 1); updateDialogPrice(); });
    dialog.querySelector("[data-dialog-increase]").addEventListener("click", () => { dialogQuantity = Math.min(99, dialogQuantity + 1); updateDialogPrice(); });
    dialog.querySelector("#add-customized-product").addEventListener("click", () => {
        const missingGroup = [...dialog.querySelectorAll(".order-customization-group[data-required='true']")]
            .find((group) => !group.querySelector(".customization-choice-input:checked"));
        if (missingGroup) {
            missingGroup.classList.add("has-error");
            missingGroup.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        const item = buildItem(activeProduct, selectedOptionIds(), dialogQuantity);
        const existing = customItems.find((candidate) => candidate.key === item.key);
        if (existing) existing.quantity += item.quantity;
        else customItems.push(item);
        dialog.close();
        refreshEverything();
    });
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    document.addEventListener("base-order-summary-rendered", renderCustomSummary);

    try {
        const savedItems = JSON.parse(hiddenInput.value || "[]");
        customItems = savedItems.map((item) => {
            const product = products[String(item.product_id)];
            return product ? buildItem(product, item.option_ids || [], item.quantity) : null;
        }).filter(Boolean);
    } catch {
        customItems = [];
    }
    refreshEverything();
})();
