function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
(function () {
  var form = document.querySelector("form.order-workspace");
  var methodInput = document.querySelector("#id_payment_method");
  if (!form || !methodInput) return;
  var receivedInput = document.querySelector("#id_cash_received");
  var tipInput = document.querySelector("#id_tip_amount");
  var methodButtons = _toConsumableArray(document.querySelectorAll("[data-payment-method]"));
  var cashPanel = document.querySelector("[data-cash-payment]");
  var tipPanel = document.querySelector("[data-tip-payment]");
  var customCash = document.querySelector("[data-cash-custom]");
  var customTip = document.querySelector("[data-tip-custom]");
  var chargedOutput = document.querySelector("[data-charged-total]");
  var exactButton = document.querySelector("[data-cash-exact]");
  var confirmCashButton = document.querySelector("[data-cash-confirm]");
  var cashWarning = document.querySelector("[data-cash-warning]");
  var summaryLabel = document.querySelector("#subtotal-change-label");
  var summaryValue = document.querySelector("#order-subtotal");
  var paymentPanel = document.querySelector(".payment-panel");
  var money = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    currencyDisplay: "symbol"
  });
  var cashEditorCollapsed = false;
  function focusCheckout() {
    var completed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    form.classList.add("is-checkout-focus");
    form.classList.toggle("is-payment-complete", completed);
  }
  function focusMenu() {
    form.classList.remove("is-checkout-focus", "is-payment-complete");
  }
  function orderTotal() {
    var _document$querySelect;
    var text = ((_document$querySelect = document.querySelector("#order-total")) === null || _document$querySelect === void 0 ? void 0 : _document$querySelect.textContent) || "0";
    return Number.parseFloat(text.replace(/[^0-9.-]/g, "")) || 0;
  }
  function payableTotal() {
    return orderTotal() + (Number.parseFloat(customTip === null || customTip === void 0 ? void 0 : customTip.value) || 0);
  }
  function refreshPayment() {
    var method = methodInput.value;
    methodButtons.forEach(function (button) {
      return button.classList.toggle("is-selected", button.dataset.paymentMethod === method);
    });
    cashPanel.hidden = method !== "cash" || cashEditorCollapsed;
    tipPanel.hidden = !method;
    var received = Number.parseFloat(customCash === null || customCash === void 0 ? void 0 : customCash.value) || 0;
    var tip = Number.parseFloat(customTip === null || customTip === void 0 ? void 0 : customTip.value) || 0;
    if (receivedInput) receivedInput.value = method === "cash" && received ? received.toFixed(2) : "";
    if (tipInput) tipInput.value = tip.toFixed(2);
    var total = payableTotal();
    var difference = received - total;
    var hasCashAmount = method === "cash" && received > 0;
    if (summaryLabel && summaryValue) {
      var _summaryValue$parentE;
      summaryLabel.textContent = hasCashAmount ? "Cambio" : "Subtotal";
      summaryValue.textContent = hasCashAmount ? money.format(Math.max(0, difference)) : money.format(Number.parseFloat(summaryValue.dataset.subtotal) || 0);
      summaryValue.classList.toggle("is-insufficient", hasCashAmount && difference < 0);
      (_summaryValue$parentE = summaryValue.parentElement) === null || _summaryValue$parentE === void 0 || _summaryValue$parentE.classList.toggle("is-change-row", hasCashAmount);
    }
    if (cashWarning) cashWarning.hidden = !(hasCashAmount && difference < 0);
    if (method === "cash" && received > 0 && difference < 0) {
      cashEditorCollapsed = false;
      cashPanel.hidden = false;
    }
    document.querySelectorAll("[data-cash-amount]").forEach(function (button) {
      button.classList.toggle("is-too-small", Number(button.dataset.cashAmount) < total);
      button.setAttribute("aria-disabled", Number(button.dataset.cashAmount) < total ? "true" : "false");
    });
    if (chargedOutput) chargedOutput.textContent = money.format(payableTotal());
  }
  methodButtons.forEach(function (button) {
    return button.addEventListener("click", function () {
      var reopeningCash = button.dataset.paymentMethod === "cash" && methodInput.value === "cash";
      methodInput.value = button.dataset.paymentMethod;
      cashEditorCollapsed = false;
      paymentPanel.classList.remove("has-error");
      focusCheckout(false);
      refreshPayment();
      if (reopeningCash) cashPanel.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    });
  });
  document.querySelectorAll("[data-cash-amount]").forEach(function (button) {
    return button.addEventListener("click", function () {
      var amount = Number(button.dataset.cashAmount);
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
    });
  });
  exactButton === null || exactButton === void 0 || exactButton.addEventListener("click", function () {
    customCash.value = payableTotal().toFixed(2);
    cashEditorCollapsed = true;
    focusCheckout(true);
    refreshPayment();
  });
  confirmCashButton === null || confirmCashButton === void 0 || confirmCashButton.addEventListener("click", function () {
    var received = Number.parseFloat(customCash.value) || 0;
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
  customCash === null || customCash === void 0 || customCash.addEventListener("input", function () {
    focusCheckout(false);
    refreshPayment();
  });
  customTip === null || customTip === void 0 || customTip.addEventListener("input", function () {
    focusCheckout(cashEditorCollapsed);
    refreshPayment();
  });
  document.addEventListener("click", function (event) {
    var clickedPaymentArea = event.target.closest(".payment-panel, [data-cash-payment], [data-tip-payment]");
    if (form.classList.contains("is-checkout-focus") && !clickedPaymentArea) {
      focusMenu();
    }
    if (event.target.closest(".order-builder .category-card, .order-builder .product-card, .order-type-option, [data-table-map] [data-table-number], [data-table-clear], .current-order-items button, #packaging-editor button")) {
      focusMenu();
    }
  }, true);
  document.addEventListener("order-menu-focus", focusMenu);
  document.addEventListener("base-order-summary-rendered", refreshPayment);
  form.addEventListener("submit", function (event) {
    refreshPayment();
    var invalidCash = methodInput.value === "cash" && (Number.parseFloat(receivedInput.value) || 0) < payableTotal();
    if (!methodInput.value || invalidCash) {
      event.preventDefault();
      paymentPanel.classList.add("has-error");
      paymentPanel.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  });
  refreshPayment();
})();