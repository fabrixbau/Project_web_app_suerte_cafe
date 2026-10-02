(() => {
    document.querySelectorAll("[data-table-map]").forEach((map) => {
        const input = map.querySelector("input[name='table_reference']");
        const buttons = [...map.querySelectorAll("[data-table-number]")];
        const selectedOutput = map.querySelector("[data-selected-table]");
        if (!input) return;

        function normalizedValue() {
            return (input.value || "").replace(/^mesa\s*/i, "").trim();
        }

        function refresh() {
            const value = normalizedValue();
            buttons.forEach((button) => {
                const selected = button.dataset.tableNumber === value;
                button.classList.toggle("is-selected", selected);
                button.setAttribute("aria-pressed", selected ? "true" : "false");
            });
            selectedOutput.textContent = value || "Ninguna";
        }

        buttons.forEach((button) => button.addEventListener("click", () => {
            input.value = button.dataset.tableNumber;
            input.dispatchEvent(new Event("change", {bubbles: true}));
            refresh();
            document.dispatchEvent(new CustomEvent("table-selection-changed", {detail: {value: input.value}}));
        }));
        map.querySelector("[data-table-clear]")?.addEventListener("click", () => {
            input.value = "";
            input.dispatchEvent(new Event("change", {bubbles: true}));
            refresh();
            document.dispatchEvent(new CustomEvent("table-selection-changed", {detail: {value: ""}}));
        });
        document.querySelectorAll(".order-type-option").forEach((button) => button.addEventListener("click", () => {
            if (button.dataset.orderType !== "eat_in") {
                input.value = "";
                refresh();
                document.dispatchEvent(new CustomEvent("table-selection-changed", {detail: {value: ""}}));
            }
        }));
        refresh();
    });
})();
