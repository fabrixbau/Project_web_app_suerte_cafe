(function () {
  var form = document.querySelector("form.order-workspace");
  var orderType = document.querySelector("#id_order_type");
  var tableInput = document.querySelector("input[name='table_reference']");
  var tableMap = document.querySelector("[data-table-map]");
  if (!form || !orderType || !tableMap) return;
  var itemCount = 0;
  var tableFocused = false;
  function currentItemCount() {
    var count = 0;
    document.querySelectorAll(".order-builder .quantity-input").forEach(function (input) {
      count += Number.parseInt(input.value, 10) || 0;
    });
    var customInput = document.querySelector("#custom-items-input");
    try {
      JSON.parse((customInput === null || customInput === void 0 ? void 0 : customInput.value) || "[]").forEach(function (item) {
        return count += Number(item.quantity) || 0;
      });
    } catch (_) {/* El personalizador mostrará su propia validación. */}
    return count;
  }
  function refreshFocus() {
    var eatIn = orderType.value === "eat_in";
    var hasTable = Boolean(((tableInput === null || tableInput === void 0 ? void 0 : tableInput.value) || "").trim());
    var started = eatIn && (hasTable || itemCount > 0);
    if (!eatIn) tableFocused = false;
    form.classList.toggle("is-eat-in-preorder", eatIn && !started);
    form.classList.toggle("is-eat-in-started", started);
    form.classList.toggle("is-table-map-focused", eatIn && tableFocused);
  }
  document.addEventListener("base-order-summary-rendered", function (event) {
    itemCount = currentItemCount();
    if (itemCount > 0) tableFocused = false;
    refreshFocus();
  });
  document.addEventListener("table-selection-changed", function (event) {
    var _event$detail;
    tableFocused = false;
    itemCount = currentItemCount();
    refreshFocus();
    document.dispatchEvent(new CustomEvent("order-menu-focus"));
    if ((_event$detail = event.detail) !== null && _event$detail !== void 0 && _event$detail.value) {
      window.setTimeout(function () {
        var _document$querySelect;
        (_document$querySelect = document.querySelector("#product-selection")) === null || _document$querySelect === void 0 || _document$querySelect.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 180);
    }
  });
  tableMap.addEventListener("click", function (event) {
    if (!form.classList.contains("is-eat-in-started")) return;
    if (event.target.closest("[data-table-number], [data-table-clear]")) return;
    tableFocused = true;
    refreshFocus();
  });
  document.querySelectorAll(".order-type-option").forEach(function (button) {
    return button.addEventListener("click", function () {
      window.setTimeout(function () {
        itemCount = currentItemCount();
        refreshFocus();
      });
    });
  });
  itemCount = currentItemCount();
  refreshFocus();
})();