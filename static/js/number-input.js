(() => {
    document.querySelectorAll('input[type="number"]:not(.quantity-input):not([data-native-number])').forEach((input) => {
        if (input.dataset.numberControlReady === "true" || input.closest(".currency-setting-input")) return;
        input.dataset.numberControlReady = "true";

        const control = document.createElement("div");
        control.className = "app-number-control";
        const decrement = document.createElement("button");
        const increment = document.createElement("button");
        const label = input.labels?.[0]?.textContent.trim().replace(/:$/, "") || "valor";

        decrement.type = "button";
        decrement.className = "app-number-step app-number-step-down";
        decrement.textContent = "−";
        decrement.setAttribute("aria-label", `Disminuir ${label}`);
        increment.type = "button";
        increment.className = "app-number-step app-number-step-up";
        increment.textContent = "+";
        increment.setAttribute("aria-label", `Aumentar ${label}`);

        const update = (direction) => {
            if (input.disabled || input.readOnly) return;
            try {
                direction > 0 ? input.stepUp() : input.stepDown();
            } catch {
                const step = Number(input.step) || 1;
                input.value = String((Number(input.value) || 0) + (direction * step));
            }
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
        };

        decrement.addEventListener("click", () => update(-1));
        increment.addEventListener("click", () => update(1));
        input.parentNode.insertBefore(control, input);
        control.append(decrement, input, increment);
    });
})();
