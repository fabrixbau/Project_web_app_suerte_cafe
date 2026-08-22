(() => {
    const orderType = document.querySelector("#id_order_type");
    const hiddenInput = document.querySelector("#id_packaging_items");
    const editor = document.querySelector("#packaging-editor");
    const catalogElement = document.querySelector("#packaging-catalog");
    const rowsContainer = document.querySelector("#packaging-editor-items");
    const totalElement = document.querySelector("#order-total");
    if (!orderType || !hiddenInput || !editor || !catalogElement || !rowsContainer || !totalElement) return;

    const catalog = JSON.parse(catalogElement.textContent);
    const automatic = editor.dataset.automatic === "true";
    const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", currencyDisplay: "narrowSymbol" });
    let saved = [];
    try { saved = JSON.parse(hiddenInput.value || "[]"); } catch { saved = []; }
    let initialized = false;
    const adjustments = new Map();

    function isTakeaway() {
        return ["delivery", "pickup"].includes(orderType.value);
    }

    function productPackagingType(productId) {
        return document.querySelector(`.product-card[data-product-id="${productId}"]`)?.dataset.packagingType || "";
    }

    function automaticCounts() {
        const counts = new Map();
        if (!automatic) return counts;
        document.querySelectorAll(".product-card[data-product-id][data-packaging-type]").forEach((card) => {
            const typeId = card.dataset.packagingType;
            const quantity = Number.parseInt(card.querySelector(".quantity-input")?.value, 10) || 0;
            if (typeId && quantity > 0) counts.set(typeId, (counts.get(typeId) || 0) + quantity);
        });
        const customInput = document.querySelector("#custom-items-input");
        if (customInput) {
            try {
                JSON.parse(customInput.value || "[]").forEach((item) => {
                    const typeId = productPackagingType(item.product_id);
                    if (typeId && item.quantity > 0) counts.set(typeId, (counts.get(typeId) || 0) + item.quantity);
                });
            } catch { /* The product customizer displays its own validation error. */ }
        }
        return counts;
    }

    function initializeAdjustments(autoCounts) {
        if (initialized) return;
        const hasSavedSelection = editor.dataset.selectionInitialized === "true";
        catalog.forEach((type) => {
            const key = String(type.id);
            const savedItem = saved.find((item) => String(item.packaging_type_id) === key);
            adjustments.set(key, hasSavedSelection ? (savedItem?.quantity || 0) - (autoCounts.get(key) || 0) : 0);
        });
        initialized = true;
    }

    function quantities() {
        const autoCounts = automaticCounts();
        initializeAdjustments(autoCounts);
        const result = new Map();
        catalog.forEach((type) => {
            const key = String(type.id);
            result.set(key, Math.max(0, (autoCounts.get(key) || 0) + (adjustments.get(key) || 0)));
        });
        return result;
    }

    function changeQuantity(typeId, difference) {
        const current = quantities().get(typeId) || 0;
        if (current === 0 && difference < 0) return;
        adjustments.set(typeId, (adjustments.get(typeId) || 0) + difference);
        window.refreshBaseOrderSummary?.();
    }

    function render() {
        const takeaway = isTakeaway();
        editor.hidden = !takeaway || catalog.length === 0;
        const selected = [];
        let packagingTotal = 0;
        const currentQuantities = quantities();
        rowsContainer.innerHTML = "";

        catalog.forEach((type) => {
            const key = String(type.id);
            const quantity = currentQuantities.get(key) || 0;
            const subtotal = Number.parseFloat(type.price) * quantity;
            if (takeaway && quantity > 0) selected.push({ packaging_type_id: type.id, quantity });
            packagingTotal += takeaway ? subtotal : 0;

            const row = document.createElement("article");
            row.className = `packaging-editor-row${quantity ? " has-quantity" : ""}`;
            row.innerHTML = '<div><strong></strong><small></small></div><div class="summary-quantity-control"><button type="button" data-minus>−</button><span></span><button type="button" data-plus>+</button></div><strong data-subtotal></strong>';
            row.querySelector("div > strong").textContent = type.name;
            row.querySelector("small").textContent = `${currency.format(Number.parseFloat(type.price))} por pieza`;
            row.querySelector(".summary-quantity-control span").textContent = quantity;
            row.querySelector("[data-subtotal]").textContent = currency.format(subtotal);
            row.querySelector("[data-minus]").addEventListener("click", () => changeQuantity(key, -1));
            row.querySelector("[data-plus]").addEventListener("click", () => changeQuantity(key, 1));
            rowsContainer.appendChild(row);
        });

        hiddenInput.value = JSON.stringify(selected);
        if (takeaway) {
            const displayedTotal = Number.parseFloat(totalElement.textContent.replace(/[^0-9.-]/g, "")) || 0;
            totalElement.textContent = currency.format(displayedTotal + packagingTotal);
        }
    }

    document.addEventListener("base-order-summary-rendered", render);
    document.querySelectorAll(".order-type-option").forEach((button) => button.addEventListener("click", () => window.setTimeout(() => window.refreshBaseOrderSummary?.())));
    window.refreshBaseOrderSummary?.();
})();
