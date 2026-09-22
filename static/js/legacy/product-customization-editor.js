function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
/* NOTA TEMPORAL PARA APRENDIZAJE:
Este editor mantiene grupos e ingredientes en memoria y sincroniza un JSON oculto antes de
guardar. "Par de sustitución" conecta equivalentes: crema y mayonesa pueden compartir Aderezo.
Django vuelve a validar todo el contenido en el servidor. Borra esta nota cuando comprendas el flujo. */

(function () {
  var editor = document.querySelector("[data-customization-editor]");
  if (!editor) return;
  var form = editor.closest("form");
  var list = editor.querySelector("[data-group-list]");
  var payloadInput = editor.querySelector("[data-customization-payload]");
  var emptyMessage = editor.querySelector("[data-empty-groups]");
  var errorBox = editor.querySelector("[data-customization-errors]");
  var librarySelect = editor.querySelector("[data-group-library]");
  var parseScript = function parseScript(id) {
    var _document$querySelect;
    return JSON.parse(((_document$querySelect = document.querySelector(id)) === null || _document$querySelect === void 0 ? void 0 : _document$querySelect.textContent) || "[]");
  };
  var groups = parseScript("#product-customization-data");
  var library = parseScript("#product-customization-library");
  var normalizeGroup = function normalizeGroup() {
    var group = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    return {
      id: group.id || null,
      shared_key: group.shared_key || null,
      name: group.name || "",
      selection_type: group.selection_type === "single" ? "single" : "multiple",
      is_required: group.is_required === true,
      options: (group.options || []).map(normalizeOption)
    };
  };
  function normalizeOption() {
    var _option$price_adjustm;
    var option = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    return {
      id: option.id || null,
      name: option.name || "",
      price_adjustment: String((_option$price_adjustm = option.price_adjustment) !== null && _option$price_adjustm !== void 0 ? _option$price_adjustm : "0.00"),
      replacement_pair: option.replacement_pair || "",
      is_default: option.is_default === true,
      is_available: option.is_available !== false
    };
  }
  groups = groups.map(normalizeGroup);
  function element(tag) {
    var className = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";
    var text = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function field(labelText, input) {
    var label = element("label", "integrated-field");
    label.append(element("strong", "", labelText), input);
    return label;
  }
  function textInput(value, onInput) {
    var attributes = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var input = document.createElement("input");
    input.type = attributes.type || "text";
    input.value = value;
    Object.entries(attributes).forEach(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
        key = _ref2[0],
        attributeValue = _ref2[1];
      if (key !== "type") input.setAttribute(key, attributeValue);
    });
    input.addEventListener("input", function () {
      onInput(input.value);
      sync();
    });
    return input;
  }
  function checkbox(labelText, checked, onChange) {
    var className = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : "";
    var label = element("label", `integrated-check ${className}`.trim());
    var input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.addEventListener("change", function () {
      onChange(input.checked);
      render();
    });
    label.append(input, element("span", "", labelText));
    return label;
  }
  function actionButton(label, action) {
    var className = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";
    var button = element("button", className, label);
    button.type = "button";
    button.addEventListener("click", action);
    return button;
  }
  function renderOption(group, groupIndex, option, optionIndex) {
    var row = element("article", "integrated-option-row");
    var name = textInput(option.name, function (value) {
      option.name = value;
    }, {
      placeholder: "Ej. Jitomate"
    });
    var charge = textInput(option.price_adjustment, function (value) {
      option.price_adjustment = value;
    }, {
      type: "number",
      min: "0",
      step: "0.50"
    });
    var replacementPair = textInput(option.replacement_pair, function (value) {
      option.replacement_pair = value;
    }, {
      placeholder: "Ej. Aderezo"
    });
    var standard = checkbox("Estándar", option.is_default, function (checked) {
      if (checked && group.selection_type === "single") {
        group.options.forEach(function (candidate) {
          candidate.is_default = false;
        });
      }
      if (checked && option.replacement_pair.trim()) {
        group.options.forEach(function (candidate) {
          if (candidate !== option && candidate.replacement_pair.trim().toLocaleLowerCase("es-MX") === option.replacement_pair.trim().toLocaleLowerCase("es-MX")) {
            candidate.is_default = false;
          }
        });
      }
      option.is_default = checked;
      if (checked) option.is_available = true;
    }, "standard-option");
    var available = checkbox("Disponible", option.is_available, function (checked) {
      option.is_available = checked;
      if (!checked) option.is_default = false;
    });
    var actions = element("div", "integrated-row-actions");
    actions.append(actionButton("↑", function () {
      return moveItem(group.options, optionIndex, -1);
    }, "compact-button"), actionButton("↓", function () {
      return moveItem(group.options, optionIndex, 1);
    }, "compact-button"), actionButton("×", function () {
      group.options.splice(optionIndex, 1);
      render();
    }, "danger compact-button"));
    row.append(field("Ingrediente u opción", name), field("Cargo adicional", charge), field("Par de sustitución", replacementPair), standard, available, actions);
    return row;
  }
  function renderGroup(group, groupIndex) {
    var card = element("section", "integrated-group-card");
    var heading = element("header");
    heading.append(element("strong", "", `Grupo ${groupIndex + 1}`));
    var groupActions = element("div", "integrated-row-actions");
    groupActions.append(actionButton("↑", function () {
      return moveItem(groups, groupIndex, -1);
    }, "compact-button"), actionButton("↓", function () {
      return moveItem(groups, groupIndex, 1);
    }, "compact-button"), actionButton("Eliminar grupo", function () {
      groups.splice(groupIndex, 1);
      render();
    }, "danger compact-button"));
    heading.append(groupActions);
    var settings = element("div", "integrated-group-settings");
    var name = textInput(group.name, function (value) {
      group.name = value;
    }, {
      placeholder: "Ej. Ingredientes del sándwich"
    });
    var selection = document.createElement("select");
    [["multiple", "Elegir varias opciones"], ["single", "Elegir una opción"]].forEach(function (_ref3) {
      var _ref4 = _slicedToArray(_ref3, 2),
        value = _ref4[0],
        label = _ref4[1];
      var option = element("option", "", label);
      option.value = value;
      option.selected = group.selection_type === value;
      selection.append(option);
    });
    selection.addEventListener("change", function () {
      group.selection_type = selection.value;
      if (selection.value === "single") {
        var foundDefault = false;
        group.options.forEach(function (option) {
          if (option.is_default && !foundDefault) foundDefault = true;else if (option.is_default) option.is_default = false;
        });
      }
      render();
    });
    settings.append(field("Nombre del grupo", name), field("Forma de elegir", selection));
    settings.append(checkbox("Debe conservar al menos una opción", group.is_required, function (checked) {
      group.is_required = checked;
    }));
    var options = element("div", "integrated-option-list");
    group.options.forEach(function (option, optionIndex) {
      return options.append(renderOption(group, groupIndex, option, optionIndex));
    });
    if (!group.options.length) options.append(element("p", "empty-customization-message", "Agrega por lo menos un ingrediente."));
    var addOption = actionButton("Agregar ingrediente", function () {
      group.options.push(normalizeOption());
      render();
    }, "secondary-action");
    card.append(heading, settings, options, addOption);
    return card;
  }
  function moveItem(collection, index, direction) {
    var target = index + direction;
    if (target < 0 || target >= collection.length) return;
    var _ref5 = [collection[target], collection[index]];
    collection[index] = _ref5[0];
    collection[target] = _ref5[1];
    render();
  }
  function sync() {
    payloadInput.value = JSON.stringify(groups.map(function (group, groupIndex) {
      return _objectSpread(_objectSpread({}, group), {}, {
        sort_order: (groupIndex + 1) * 10,
        options: group.options.map(function (option, optionIndex) {
          return _objectSpread(_objectSpread({}, option), {}, {
            sort_order: (optionIndex + 1) * 10
          });
        })
      });
    }));
  }
  function render() {
    list.innerHTML = "";
    groups.forEach(function (group, index) {
      return list.append(renderGroup(group, index));
    });
    emptyMessage.hidden = groups.length > 0;
    sync();
  }
  library.forEach(function (group, index) {
    var option = element("option", "", group.source_label);
    option.value = String(index);
    librarySelect.append(option);
  });
  editor.querySelector("[data-add-group]").addEventListener("click", function () {
    groups.push(normalizeGroup({
      options: [normalizeOption()]
    }));
    render();
  });
  editor.querySelector("[data-copy-group]").addEventListener("click", function () {
    var index = Number.parseInt(librarySelect.value, 10);
    if (!Number.isInteger(index) || !library[index]) return;
    var copy = normalizeGroup(structuredClone(library[index]));
    var currentNames = new Set(groups.map(function (group) {
      return group.name.toLocaleLowerCase("es-MX");
    }));
    var originalName = copy.name;
    var copyNumber = 1;
    while (currentNames.has(copy.name.toLocaleLowerCase("es-MX"))) {
      copy.name = `${originalName} (copia${copyNumber > 1 ? ` ${copyNumber}` : ""})`;
      copyNumber += 1;
    }
    groups.push(copy);
    librarySelect.value = "";
    render();
  });
  form.addEventListener("submit", function (event) {
    sync();
    errorBox.hidden = true;
    var invalidGroup = groups.find(function (group) {
      return !group.name.trim() || !group.options.length || group.options.some(function (option) {
        return !option.name.trim();
      });
    });
    if (invalidGroup) {
      event.preventDefault();
      errorBox.textContent = "Completa el nombre de cada grupo e ingrediente antes de guardar.";
      errorBox.hidden = false;
      editor.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  });
  render();
})();