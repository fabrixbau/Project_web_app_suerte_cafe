function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
(function () {
  var dataElement = document.querySelector("#product-customizations");
  var hiddenInput = document.querySelector("#custom-items-input");
  var dialog = document.querySelector("#product-customization-dialog");
  if (!dataElement || !hiddenInput || !dialog) return;
  var products = JSON.parse(dataElement.textContent);
  var currency = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    currencyDisplay: "symbol"
  });
  var activeProduct = null;
  var dialogQuantity = 1;
  var customItems = [];
  var editingCustomKey = null;
  var editingStandardInput = null;
  function selectedOptionIds() {
    return _toConsumableArray(dialog.querySelectorAll(".customization-choice-input:checked")).map(function (input) {
      return Number.parseInt(input.value, 10);
    });
  }
  function buildItem(product, optionIds, quantity) {
    var selected = new Set(optionIds);
    var defaultIds = new Set();
    var labels = [];
    var price = Number.parseFloat(product.base_price);
    product.groups.forEach(function (group) {
      var names = [];
      group.options.forEach(function (option) {
        if (option.is_default) defaultIds.add(option.id);
        if (selected.has(option.id)) {
          names.push(option.name);
          price += Number.parseFloat(option.price_adjustment);
        }
      });
      if (names.length) labels.push(`${group.name}: ${names.join(", ")}`);
    });
    var signature = _toConsumableArray(selected).sort(function (a, b) {
      return a - b;
    }).join(",");
    var defaultSignature = _toConsumableArray(defaultIds).sort(function (a, b) {
      return a - b;
    }).join(",");
    return {
      key: `${product.id}|${signature}`,
      product_id: product.id,
      name: product.name,
      option_ids: _toConsumableArray(selected),
      quantity,
      unit_price: price,
      labels,
      is_customized: signature !== defaultSignature
    };
  }
  function syncHiddenInput() {
    hiddenInput.value = JSON.stringify(customItems.map(function (item) {
      return {
        product_id: item.product_id,
        quantity: item.quantity,
        option_ids: item.option_ids
      };
    }));
  }
  function refreshEverything() {
    var _window$refreshBaseOr, _window;
    syncHiddenInput();
    (_window$refreshBaseOr = (_window = window).refreshBaseOrderSummary) === null || _window$refreshBaseOr === void 0 || _window$refreshBaseOr.call(_window);
  }
  function addStandardQuantity(productId, quantity) {
    var cards = _toConsumableArray(document.querySelectorAll(`.product-card[data-product-id="${productId}"]`));
    var standardCard = cards.find(function (card) {
      return card.dataset.isCustomized !== "true" && card.classList.contains("has-quantity");
    }) || cards.find(function (card) {
      return card.dataset.isCustomized !== "true";
    });
    var input = standardCard === null || standardCard === void 0 ? void 0 : standardCard.querySelector(".quantity-input");
    if (!input) return false;
    input.value = (Number.parseInt(input.value, 10) || 0) + quantity;
    input.dispatchEvent(new Event("input", {
      bubbles: true
    }));
    return true;
  }
  function changeCustomQuantity(key, difference) {
    var item = customItems.find(function (candidate) {
      return candidate.key === key;
    });
    if (!item) return;
    item.quantity = Math.max(0, item.quantity + difference);
    customItems = customItems.filter(function (candidate) {
      return candidate.quantity > 0;
    });
    refreshEverything();
  }
  function renderCustomSummary(event) {
    var summary = document.querySelector("#current-order-items");
    var totalItems = document.querySelector("#total-items");
    var summaryItems = document.querySelector("#summary-items");
    var totalElement = document.querySelector("#order-total");
    var subtotalElement = document.querySelector("#order-subtotal");
    if (!summary || !totalItems || !summaryItems || !totalElement) return;
    var count = event.detail.count;
    var total = event.detail.total;
    if (customItems.length && summary.querySelector(":scope > p")) summary.innerHTML = "";
    customItems.forEach(function (item) {
      var row = document.createElement("article");
      row.className = `current-order-item customized-order-item is-editable${item.is_customized ? " is-customized" : ""}`;
      row.title = "Editar esta personalización";
      var information = document.createElement("div");
      var name = document.createElement("strong");
      name.textContent = item.name;
      if (item.is_customized) {
        var badge = document.createElement("span");
        badge.className = "customized-warning";
        badge.textContent = "Modificado";
        name.append(" ", badge);
      }
      information.append(name);
      if (item.is_customized) {
        var details = document.createElement("span");
        details.textContent = item.labels.join(" · ");
        information.append(details);
      }
      var controls = document.createElement("div");
      controls.className = "summary-quantity-control";
      var decrease = document.createElement("button");
      var amount = document.createElement("span");
      var increase = document.createElement("button");
      decrease.type = increase.type = "button";
      decrease.textContent = "−";
      increase.textContent = "+";
      amount.textContent = item.quantity;
      decrease.addEventListener("click", function () {
        return changeCustomQuantity(item.key, -1);
      });
      increase.addEventListener("click", function () {
        return changeCustomQuantity(item.key, 1);
      });
      controls.append(decrease, amount, increase);
      var subtotal = document.createElement("strong");
      subtotal.textContent = currency.format(item.unit_price * item.quantity);
      row.append(information, controls, subtotal);
      row.addEventListener("click", function (clickEvent) {
        if (clickEvent.target.closest("button, input")) return;
        openDialog(item.product_id, item.option_ids, item.quantity, {
          customKey: item.key
        });
      });
      summary.appendChild(row);
      count += item.quantity;
      total += item.unit_price * item.quantity;
    });
    totalItems.textContent = count;
    summaryItems.textContent = count;
    totalElement.textContent = currency.format(total);
    if (subtotalElement) {
      subtotalElement.textContent = currency.format(total);
      subtotalElement.dataset.subtotal = total;
    }
  }
  function updateDialogPrice() {
    if (!activeProduct) return;
    var item = buildItem(activeProduct, selectedOptionIds(), dialogQuantity);
    dialog.querySelector("#dialog-quantity").textContent = dialogQuantity;
    dialog.querySelector("#dialog-unit-price").textContent = currency.format(item.unit_price);
  }
  function openDialog(productId) {
    var optionIds = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var quantity = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
    var editContext = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    activeProduct = products[String(productId)];
    if (!activeProduct) return;
    dialogQuantity = quantity;
    editingCustomKey = editContext.customKey || null;
    editingStandardInput = editContext.standardInput || null;
    var selectedIds = optionIds ? new Set(optionIds.map(Number)) : null;
    dialog.querySelector("#customization-product-name").textContent = activeProduct.name;
    var groupsContainer = dialog.querySelector("#customization-groups");
    groupsContainer.innerHTML = "";
    activeProduct.groups.forEach(function (group) {
      var section = document.createElement("fieldset");
      section.className = "order-customization-group";
      section.dataset.required = group.is_required ? "true" : "false";
      var legend = document.createElement("legend");
      legend.textContent = group.name;
      var help = document.createElement("small");
      help.textContent = group.selection_type === "single" ? `${group.is_required ? "Elige una" : "Opcional"}` : `${group.is_required ? "Elige al menos una" : "Puedes elegir varias"}`;
      section.append(legend, help);
      group.options.forEach(function (option) {
        var label = document.createElement("label");
        label.className = "customization-choice";
        var input = document.createElement("input");
        input.className = "customization-choice-input";
        input.type = group.selection_type === "single" ? "radio" : "checkbox";
        input.name = `custom-group-${group.id}`;
        input.value = option.id;
        input.checked = selectedIds ? selectedIds.has(option.id) : option.is_default;
        var text = document.createElement("span");
        var adjustment = Number.parseFloat(option.price_adjustment);
        text.innerHTML = `<strong></strong><small></small>`;
        text.querySelector("strong").textContent = option.name;
        text.querySelector("small").textContent = adjustment ? `${adjustment > 0 ? "+" : ""}${currency.format(adjustment)}` : "Incluido";
        input.addEventListener("change", updateDialogPrice);
        label.append(input, text);
        section.appendChild(label);
      });
      groupsContainer.appendChild(section);
    });
    updateDialogPrice();
    dialog.showModal();
  }
  document.querySelectorAll("[data-customize-product]").forEach(function (button) {
    button.addEventListener("click", function () {
      document.dispatchEvent(new CustomEvent("order-menu-focus"));
      openDialog(button.dataset.customizeProduct);
    });
  });
  document.addEventListener("edit-order-item", function (event) {
    var product = products[String(event.detail.productId)];
    if (!product) return;
    document.dispatchEvent(new CustomEvent("order-menu-focus"));
    var defaultIds = product.groups.flatMap(function (group) {
      return group.options.filter(function (option) {
        return option.is_default;
      }).map(function (option) {
        return option.id;
      });
    });
    openDialog(event.detail.productId, defaultIds, event.detail.quantity, {
      standardInput: event.detail.standardInput
    });
  });
  dialog.querySelector("[data-customization-close]").addEventListener("click", function () {
    return dialog.close();
  });
  dialog.querySelector("[data-dialog-decrease]").addEventListener("click", function () {
    dialogQuantity = Math.max(1, dialogQuantity - 1);
    updateDialogPrice();
  });
  dialog.querySelector("[data-dialog-increase]").addEventListener("click", function () {
    dialogQuantity = Math.min(99, dialogQuantity + 1);
    updateDialogPrice();
  });
  dialog.querySelector("#add-customized-product").addEventListener("click", function () {
    var missingGroup = _toConsumableArray(dialog.querySelectorAll(".order-customization-group[data-required='true']")).find(function (group) {
      return !group.querySelector(".customization-choice-input:checked");
    });
    if (missingGroup) {
      missingGroup.classList.add("has-error");
      missingGroup.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
      return;
    }
    var item = buildItem(activeProduct, selectedOptionIds(), dialogQuantity);
    document.dispatchEvent(new CustomEvent("order-menu-focus"));
    if (editingCustomKey) customItems = customItems.filter(function (candidate) {
      return candidate.key !== editingCustomKey;
    });
    if (editingStandardInput) editingStandardInput.value = 0;
    if (!item.is_customized && addStandardQuantity(item.product_id, item.quantity)) {
      editingCustomKey = null;
      editingStandardInput = null;
      dialog.close();
      return;
    }
    var existing = customItems.find(function (candidate) {
      return candidate.key === item.key;
    });
    if (existing) existing.quantity += item.quantity;else customItems.push(item);
    editingCustomKey = null;
    editingStandardInput = null;
    dialog.close();
    refreshEverything();
  });
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });
  document.addEventListener("base-order-summary-rendered", renderCustomSummary);
  try {
    var savedItems = JSON.parse(hiddenInput.value || "[]");
    customItems = savedItems.map(function (item) {
      var product = products[String(item.product_id)];
      if (!product) return null;
      var restored = buildItem(product, item.option_ids || [], item.quantity);
      if (!restored.is_customized && addStandardQuantity(restored.product_id, restored.quantity)) return null;
      return restored;
    }).filter(Boolean);
  } catch (_unused) {
    customItems = [];
  }
  refreshEverything();
})();