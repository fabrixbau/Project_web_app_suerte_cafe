function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
(function () {
  document.querySelectorAll("[data-table-map]").forEach(function (map) {
    var _map$querySelector;
    var input = map.querySelector("input[name='table_reference']");
    var buttons = _toConsumableArray(map.querySelectorAll("[data-table-number]"));
    var selectedOutput = map.querySelector("[data-selected-table]");
    if (!input) return;
    function normalizedValue() {
      return (input.value || "").replace(/^mesa\s*/i, "").trim();
    }
    function refresh() {
      var value = normalizedValue();
      buttons.forEach(function (button) {
        var selected = button.dataset.tableNumber === value;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      selectedOutput.textContent = value || "Ninguna";
    }
    buttons.forEach(function (button) {
      return button.addEventListener("click", function () {
        input.value = button.dataset.tableNumber;
        input.dispatchEvent(new Event("change", {
          bubbles: true
        }));
        refresh();
        document.dispatchEvent(new CustomEvent("table-selection-changed", {
          detail: {
            value: input.value
          }
        }));
      });
    });
    (_map$querySelector = map.querySelector("[data-table-clear]")) === null || _map$querySelector === void 0 || _map$querySelector.addEventListener("click", function () {
      input.value = "";
      input.dispatchEvent(new Event("change", {
        bubbles: true
      }));
      refresh();
      document.dispatchEvent(new CustomEvent("table-selection-changed", {
        detail: {
          value: ""
        }
      }));
    });
    document.querySelectorAll(".order-type-option").forEach(function (button) {
      return button.addEventListener("click", function () {
        if (button.dataset.orderType !== "eat_in") {
          input.value = "";
          refresh();
          document.dispatchEvent(new CustomEvent("table-selection-changed", {
            detail: {
              value: ""
            }
          }));
        }
      });
    });
    refresh();
  });
})();