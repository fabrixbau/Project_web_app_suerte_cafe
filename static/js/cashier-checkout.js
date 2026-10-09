(() => {
  function initializeTableMap(map) {
    if (!map || map.dataset.cashierMapReady) return;
    map.dataset.cashierMapReady = "true";
    const input = map.querySelector("input[name='table_reference']");
    const buttons = map.querySelectorAll("[data-table-number]");
    const output = map.querySelector("[data-selected-table]");
    if (!input) return;
    const refresh = () => {
      const value = (input.value || "").replace(/^mesa\s*/i, "").trim();
      buttons.forEach((button) => button.classList.toggle("is-selected", button.dataset.tableNumber === value));
      if (output) output.textContent = value || "Ninguna";
    };
    buttons.forEach((button) => button.addEventListener("click", () => {
      input.value = button.dataset.tableNumber;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      refresh();
    }));
    map.querySelector("[data-table-clear]")?.addEventListener("click", () => {
      input.value = "";
      input.dispatchEvent(new Event("change", { bubbles: true }));
      refresh();
    });
    refresh();
  }

  function initialize(root = document) {
    root.querySelectorAll(".cashier-checkout-form").forEach((form) => {
      if (form.dataset.cashierReady) return;
      form.dataset.cashierReady = "true";
      const input = form.querySelector("input[name='payment_method']");
      const cashField = form.querySelector("[data-cashier-cash]");
      const buttons = form.querySelectorAll("[data-cashier-method]");
      if (!input || !buttons.length) return;
      const refresh = () => {
        const method = input.value || "cash";
        buttons.forEach((button) => button.classList.toggle("is-selected", button.dataset.cashierMethod === method));
        if (cashField) cashField.hidden = method !== "cash";
      };
      buttons.forEach((button) => button.addEventListener("click", () => {
        input.value = button.dataset.cashierMethod;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        refresh();
      }));
      refresh();
    });
    root.querySelectorAll("[data-table-map]").forEach(initializeTableMap);
  }

  window.initializeCashierCheckout = initialize;
  initialize();
})();
