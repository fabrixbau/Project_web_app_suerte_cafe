(function (_window$refreshBaseOr3, _window3) {
  var orderType = document.querySelector("#id_order_type");
  var hiddenInput = document.querySelector("#id_packaging_items");
  var editor = document.querySelector("#packaging-editor");
  var catalogElement = document.querySelector("#packaging-catalog");
  var rowsContainer = document.querySelector("#packaging-editor-items");
  var totalElement = document.querySelector("#order-total");
  if (!orderType || !hiddenInput || !editor || !catalogElement || !rowsContainer || !totalElement) return;
  var catalog = JSON.parse(catalogElement.textContent);
  var automatic = editor.dataset.automatic === "true";
  var currency = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    currencyDisplay: "symbol"
  });
  var saved = [];
  try {
    saved = JSON.parse(hiddenInput.value || "[]");
  } catch (_unused) {
    saved = [];
  }
  var initialized = false;
  var adjustments = new Map();
  function isTakeaway() {
    return ["delivery", "pickup"].includes(orderType.value);
  }
  function productPackagingType(productId) {
    var _document$querySelect;
    return ((_document$querySelect = document.querySelector(`.product-card[data-product-id="${productId}"]`)) === null || _document$querySelect === void 0 ? void 0 : _document$querySelect.dataset.packagingType) || "";
  }
  function automaticCounts() {
    var counts = new Map();
    if (!automatic) return counts;
    document.querySelectorAll(".product-card[data-product-id][data-packaging-type]").forEach(function (card) {
      var _card$querySelector;
      var typeId = card.dataset.packagingType;
      var quantity = Number.parseInt((_card$querySelector = card.querySelector(".quantity-input")) === null || _card$querySelector === void 0 ? void 0 : _card$querySelector.value, 10) || 0;
      if (typeId && quantity > 0) counts.set(typeId, (counts.get(typeId) || 0) + quantity);
    });
    var customInput = document.querySelector("#custom-items-input");
    if (customInput) {
      try {
        JSON.parse(customInput.value || "[]").forEach(function (item) {
          var typeId = productPackagingType(item.product_id);
          if (typeId && item.quantity > 0) counts.set(typeId, (counts.get(typeId) || 0) + item.quantity);
        });
      } catch (_unused2) {/* The product customizer displays its own validation error. */}
    }
    return counts;
  }
  function initializeAdjustments(autoCounts) {
    if (initialized) return;
    var hasSavedSelection = editor.dataset.selectionInitialized === "true";
    catalog.forEach(function (type) {
      var key = String(type.id);
      var savedItem = saved.find(function (item) {
        return String(item.packaging_type_id) === key;
      });
      adjustments.set(key, hasSavedSelection ? ((savedItem === null || savedItem === void 0 ? void 0 : savedItem.quantity) || 0) - (autoCounts.get(key) || 0) : 0);
    });
    initialized = true;
  }
  function quantities() {
    var autoCounts = automaticCounts();
    initializeAdjustments(autoCounts);
    var result = new Map();
    catalog.forEach(function (type) {
      var key = String(type.id);
      result.set(key, Math.max(0, (autoCounts.get(key) || 0) + (adjustments.get(key) || 0)));
    });
    return result;
  }
  function changeQuantity(typeId, difference) {
    var _window$refreshBaseOr, _window;
    var current = quantities().get(typeId) || 0;
    if (current === 0 && difference < 0) return;
    adjustments.set(typeId, (adjustments.get(typeId) || 0) + difference);
    (_window$refreshBaseOr = (_window = window).refreshBaseOrderSummary) === null || _window$refreshBaseOr === void 0 || _window$refreshBaseOr.call(_window);
  }
  function render() {
    var takeaway = isTakeaway();
    editor.hidden = !takeaway || catalog.length === 0;
    var selected = [];
    var packagingTotal = 0;
    var currentQuantities = quantities();
    rowsContainer.innerHTML = "";
    catalog.forEach(function (type) {
      var key = String(type.id);
      var quantity = currentQuantities.get(key) || 0;
      var subtotal = Number.parseFloat(type.price) * quantity;
      if (takeaway && quantity > 0) selected.push({
        packaging_type_id: type.id,
        quantity
      });
      packagingTotal += takeaway ? subtotal : 0;
      var row = document.createElement("article");
      row.className = `packaging-editor-row${quantity ? " has-quantity" : ""}`;
      row.innerHTML = '<div><strong></strong><small></small></div><div class="summary-quantity-control"><button type="button" data-minus>−</button><span></span><button type="button" data-plus>+</button></div><strong data-subtotal></strong>';
      row.querySelector("div > strong").textContent = type.name;
      row.querySelector("small").textContent = `${currency.format(Number.parseFloat(type.price))} por pieza`;
      row.querySelector(".summary-quantity-control span").textContent = quantity;
      row.querySelector("[data-subtotal]").textContent = currency.format(subtotal);
      row.querySelector("[data-minus]").addEventListener("click", function () {
        return changeQuantity(key, -1);
      });
      row.querySelector("[data-plus]").addEventListener("click", function () {
        return changeQuantity(key, 1);
      });
      rowsContainer.appendChild(row);
    });
    hiddenInput.value = JSON.stringify(selected);
    if (takeaway) {
      var displayedTotal = Number.parseFloat(totalElement.textContent.replace(/[^0-9.-]/g, "")) || 0;
      totalElement.textContent = currency.format(displayedTotal + packagingTotal);
    }
  }
  document.addEventListener("base-order-summary-rendered", render);
  document.querySelectorAll(".order-type-option").forEach(function (button) {
    return button.addEventListener("click", function () {
      return window.setTimeout(function () {
        var _window$refreshBaseOr2, _window2;
        return (_window$refreshBaseOr2 = (_window2 = window).refreshBaseOrderSummary) === null || _window$refreshBaseOr2 === void 0 ? void 0 : _window$refreshBaseOr2.call(_window2);
      });
    });
  });
  (_window$refreshBaseOr3 = (_window3 = window).refreshBaseOrderSummary) === null || _window$refreshBaseOr3 === void 0 || _window$refreshBaseOr3.call(_window3);
})();