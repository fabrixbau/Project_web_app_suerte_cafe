(() => {
    const form = document.querySelector("form.order-workspace");
    const orderType = document.querySelector("#id_order_type");
    const tableInput = document.querySelector("input[name='table_reference']");
    const tableMap = document.querySelector("[data-table-map]");
    if (!form || !orderType || !tableMap) return;

    let itemCount = 0;
    let tableFocused = false;

    function currentItemCount() {
        let count = 0;
        document.querySelectorAll(".order-builder .quantity-input").forEach((input) => {
            count += Number.parseInt(input.value, 10) || 0;
        });
        const customInput = document.querySelector("#custom-items-input");
        try {
            JSON.parse(customInput?.value || "[]").forEach((item) => count += Number(item.quantity) || 0);
        } catch (_) { /* El personalizador mostrará su propia validación. */ }
        return count;
    }

    function refreshFocus() {
        const eatIn = orderType.value === "eat_in";
        const hasTable = Boolean((tableInput?.value || "").trim());
        const started = eatIn && (hasTable || itemCount > 0);
        if (!eatIn) tableFocused = false;
        form.classList.toggle("is-eat-in-preorder", eatIn && !started);
        form.classList.toggle("is-eat-in-started", started);
        form.classList.toggle("is-table-map-focused", eatIn && tableFocused);
    }

    document.addEventListener("base-order-summary-rendered", (event) => {
        itemCount = currentItemCount();
        if (itemCount > 0) tableFocused = false;
        refreshFocus();
    });
    document.addEventListener("table-selection-changed", (event) => {
        tableFocused = false;
        itemCount = currentItemCount();
        refreshFocus();
        document.dispatchEvent(new CustomEvent("order-menu-focus"));
        if (event.detail?.value) {
            window.setTimeout(() => {
                document.querySelector("#product-selection")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }, 180);
        }
    });
    tableMap.addEventListener("click", (event) => {
        if (!form.classList.contains("is-eat-in-started")) return;
        if (event.target.closest("[data-table-number], [data-table-clear]")) return;
        tableFocused = true;
        refreshFocus();
    });
    document.querySelectorAll(".order-type-option").forEach((button) => button.addEventListener("click", () => {
        window.setTimeout(() => {
            itemCount = currentItemCount();
            refreshFocus();
        });
    }));

    itemCount = currentItemCount();
    refreshFocus();
})();
