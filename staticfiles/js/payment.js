(() => {
    const form = document.querySelector("form.order-workspace");
    const methodInput = document.querySelector("#id_payment_method");
    if (!form || !methodInput) return;

    const receivedInput = document.querySelector("#id_cash_received");
    const tipInput = document.querySelector("#id_tip_amount");
    const methodButtons = [...document.querySelectorAll("[data-payment-method]")];
    const cashPanel = document.querySelector("[data-cash-payment]");
    const tipPanel = document.querySelector("[data-tip-payment]");
    const customCash = document.querySelector("[data-cash-custom]");
    const customTip = document.querySelector("[data-tip-custom]");
    const chargedOutput = document.querySelector("[data-charged-total]");
    const exactButton = document.querySelector("[data-cash-exact]");
    const confirmCashButton = document.querySelector("[data-cash-confirm]");
    const cashWarning = document.querySelector("[data-cash-warning]");
    const summaryLabel = document.querySelector("#subtotal-change-label");
    const summaryValue = document.querySelector("#order-subtotal");
    const paymentPanel = document.querySelector(".payment-panel");
    const stickyChangeRow = document.querySelector("[data-sticky-change-row]");
    const stickyChangeValue = document.querySelector("[data-sticky-change]");
    const stickyTotalValue = document.querySelector("[data-sticky-total]");
    const money = new Intl.NumberFormat("es-MX", {style: "currency", currency: "MXN", currencyDisplay: "symbol"});
    let cashEditorCollapsed = false;

    function focusCheckout(completed = false) {
        form.classList.add("is-checkout-focus");
        form.classList.toggle("is-payment-complete", completed);
    }

    function focusMenu() {
        form.classList.remove("is-checkout-focus", "is-payment-complete");
    }

    function orderTotal() {
        const text = document.querySelector("#order-total")?.textContent || "0";
        return Number.parseFloat(text.replace(/[^0-9.-]/g, "")) || 0;
    }

    function payableTotal() {
        return orderTotal() + (Number.parseFloat(customTip?.value) || 0);
    }

    function refreshPayment() {
        const method = methodInput.value;
        methodButtons.forEach((button) => {
            const selected = button.dataset.paymentMethod === method;
            button.classList.toggle("is-selected", selected);
            button.setAttribute("aria-pressed", String(selected));
        });
        cashPanel.hidden = method !== "cash" || cashEditorCollapsed;
        tipPanel.hidden = !method;
        const received = Number.parseFloat(customCash?.value) || 0;
        const tip = Number.parseFloat(customTip?.value) || 0;
        if (receivedInput) receivedInput.value = method === "cash" && received ? received.toFixed(2) : "";
        if (tipInput) tipInput.value = tip.toFixed(2);
        const total = payableTotal();
        if (stickyTotalValue) stickyTotalValue.textContent = money.format(total);
        const difference = received - total;
        const hasCashAmount = method === "cash" && received > 0;
        if (summaryLabel && summaryValue) {
            summaryLabel.textContent = hasCashAmount ? "Cambio" : "Subtotal";
            summaryValue.textContent = hasCashAmount
                ? money.format(Math.max(0, difference))
                : money.format(Number.parseFloat(summaryValue.dataset.subtotal) || 0);
            summaryValue.classList.toggle("is-insufficient", hasCashAmount && difference < 0);
            summaryValue.parentElement?.classList.toggle("is-change-row", hasCashAmount);
        }
        if (cashWarning) cashWarning.hidden = !(hasCashAmount && difference < 0);
        if (stickyChangeRow && stickyChangeValue) {
            stickyChangeRow.hidden = !hasCashAmount;
            stickyChangeRow.classList.toggle("is-insufficient", hasCashAmount && difference < 0);
            stickyChangeRow.querySelector("span").textContent = difference < 0 ? "Falta" : "Cambio";
            stickyChangeValue.textContent = money.format(Math.abs(difference));
        }
        if (method === "cash" && received > 0 && difference < 0) {
            cashEditorCollapsed = false;
            cashPanel.hidden = false;
        }
        document.querySelectorAll("[data-cash-amount]").forEach((button) => {
            button.classList.toggle("is-too-small", Number(button.dataset.cashAmount) < total);
            button.setAttribute("aria-disabled", Number(button.dataset.cashAmount) < total ? "true" : "false");
        });
        if (chargedOutput) chargedOutput.textContent = money.format(payableTotal());
    }

    methodButtons.forEach((button) => button.addEventListener("click", () => {
        const isSelected = methodInput.value === button.dataset.paymentMethod;
        if (isSelected) {
            methodInput.value = "";
            if (customCash) customCash.value = "";
            if (customTip) customTip.value = "0";
            cashEditorCollapsed = false;
            paymentPanel.classList.remove("has-error");
            focusMenu();
            refreshPayment();
            return;
        }
        if (methodInput.value === "cash" && button.dataset.paymentMethod !== "cash" && customCash) {
            customCash.value = "";
        }
        methodInput.value = button.dataset.paymentMethod;
        cashEditorCollapsed = false;
        paymentPanel.classList.remove("has-error");
        focusCheckout(false);
        refreshPayment();
    }));
    document.querySelectorAll("[data-cash-amount]").forEach((button) => button.addEventListener("click", () => {
        const amount = Number(button.dataset.cashAmount);
        if (amount < payableTotal()) {
            customCash.value = "";
            refreshPayment();
            cashWarning.hidden = false;
            return;
        }
        customCash.value = amount;
        cashEditorCollapsed = true;
        focusCheckout(true);
        refreshPayment();
    }));
    exactButton?.addEventListener("click", () => {
        customCash.value = payableTotal().toFixed(2);
        cashEditorCollapsed = true;
        focusCheckout(true);
        refreshPayment();
    });
    confirmCashButton?.addEventListener("click", () => {
        const received = Number.parseFloat(customCash.value) || 0;
        if (received < payableTotal()) {
            cashEditorCollapsed = false;
            refreshPayment();
            cashWarning.hidden = false;
            return;
        }
        cashEditorCollapsed = true;
        focusCheckout(true);
        refreshPayment();
    });
    customCash?.addEventListener("input", () => { focusCheckout(false); refreshPayment(); });
    customTip?.addEventListener("input", () => { focusCheckout(cashEditorCollapsed); refreshPayment(); });
    document.addEventListener("click", (event) => {
        const clickedPaymentArea = event.target.closest(".payment-panel, [data-cash-payment], [data-tip-payment]");
        if (form.classList.contains("is-checkout-focus") && !clickedPaymentArea) {
            focusMenu();
        }
        if (event.target.closest(".order-builder .category-card, .order-builder .product-card, .order-type-option, [data-table-map] [data-table-number], [data-table-clear], .current-order-items button, #packaging-editor button")) {
            focusMenu();
        }
    }, true);
    document.addEventListener("order-menu-focus", focusMenu);
    document.addEventListener("base-order-summary-rendered", refreshPayment);
    form.addEventListener("submit", (event) => {
        refreshPayment();
        const invalidCash = methodInput.value === "cash" && (Number.parseFloat(receivedInput.value) || 0) < payableTotal();
        if (!methodInput.value || invalidCash) {
            event.preventDefault();
            paymentPanel.classList.add("has-error");
            paymentPanel.scrollIntoView({behavior: "smooth", block: "center"});
        }
    });
    refreshPayment();
})();
