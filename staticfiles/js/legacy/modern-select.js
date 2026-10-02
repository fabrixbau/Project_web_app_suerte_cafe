function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
(function () {
  var enhanced = [];
  var nextId = 0;
  function closeAll() {
    var except = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    enhanced.forEach(function (_ref) {
      var root = _ref.root,
        list = _ref.list,
        trigger = _ref.trigger;
      if (root === except) return;
      list.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      root.classList.remove("is-open");
      root.classList.remove("opens-up");
    });
  }
  function positionList(root, list, trigger) {
    if (list.hidden) return;
    root.classList.remove("opens-up");
    var rect = trigger.getBoundingClientRect();
    var desiredHeight = Math.min(list.scrollHeight || 310, 310) + 12;
    var spaceBelow = window.innerHeight - rect.bottom;
    var spaceAbove = rect.top;
    root.classList.toggle("opens-up", spaceBelow < desiredHeight && spaceAbove > spaceBelow);
  }
  function enhanceWithin() {
    var scope = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;
    scope.querySelectorAll("select:not([data-native-select])").forEach(function (select) {
      if (select.dataset.modernSelectReady === "true") {
        var _select$appSelectRefr;
        (_select$appSelectRefr = select.appSelectRefresh) === null || _select$appSelectRefr === void 0 || _select$appSelectRefr.call(select);
        return;
      }
      var index = nextId++;
      select.dataset.modernSelectReady = "true";
      var shell = select.closest(".modern-input-shell");
      shell === null || shell === void 0 || shell.classList.add("has-app-select");
      select.classList.add("native-enhanced-select");
      select.removeAttribute("required");
      select.tabIndex = -1;
      select.style.display = "none";
      var root = document.createElement("div");
      root.className = "app-select";
      var trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "app-select-trigger";
      trigger.setAttribute("aria-haspopup", "listbox");
      trigger.setAttribute("aria-expanded", "false");
      var value = document.createElement("span");
      value.className = "app-select-value";
      var marker = document.createElement("span");
      marker.className = "app-select-marker";
      marker.setAttribute("aria-hidden", "true");
      trigger.append(value, marker);
      var list = document.createElement("div");
      list.className = "app-select-options";
      list.id = `app-select-options-${index}`;
      list.setAttribute("role", "listbox");
      list.hidden = true;
      trigger.setAttribute("aria-controls", list.id);
      function syncValue() {
        var selectedOption = select.options[select.selectedIndex];
        value.textContent = (selectedOption === null || selectedOption === void 0 ? void 0 : selectedOption.textContent.trim()) || "Selecciona una opción";
        list.querySelectorAll(".app-select-option").forEach(function (button) {
          var selected = button.dataset.value === select.value;
          button.classList.toggle("is-selected", selected);
          button.setAttribute("aria-selected", selected ? "true" : "false");
        });
      }
      function rebuildOptions() {
        list.innerHTML = "";
        _toConsumableArray(select.options).forEach(function (option) {
          var item = document.createElement("button");
          item.type = "button";
          item.className = "app-select-option";
          item.dataset.value = option.value;
          item.setAttribute("role", "option");
          item.textContent = option.textContent.trim();
          item.disabled = option.disabled;
          item.addEventListener("click", function () {
            select.value = option.value;
            select.dispatchEvent(new Event("change", {
              bubbles: true
            }));
            syncValue();
            closeAll();
            trigger.focus();
          });
          list.appendChild(item);
        });
      }
      trigger.addEventListener("click", function () {
        var willOpen = list.hidden;
        closeAll(root);
        list.hidden = !willOpen;
        trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
        root.classList.toggle("is-open", willOpen);
        if (willOpen) {
          window.requestAnimationFrame(function () {
            var _list$querySelector;
            positionList(root, list, trigger);
            (_list$querySelector = list.querySelector(".is-selected")) === null || _list$querySelector === void 0 || _list$querySelector.scrollIntoView({
              block: "nearest"
            });
          });
        }
      });
      trigger.addEventListener("keydown", function (event) {
        if (["ArrowDown", "ArrowUp"].includes(event.key)) {
          var _options$next;
          event.preventDefault();
          if (list.hidden) trigger.click();
          var options = _toConsumableArray(list.querySelectorAll(".app-select-option:not(:disabled)"));
          var current = options.findIndex(function (item) {
            return item.classList.contains("is-selected");
          });
          var next = event.key === "ArrowDown" ? Math.min(options.length - 1, current + 1) : Math.max(0, current - 1);
          (_options$next = options[next]) === null || _options$next === void 0 || _options$next.focus();
        }
      });
      select.parentNode.insertBefore(root, select);
      root.append(select, trigger, list);
      enhanced.push({
        root,
        list,
        trigger
      });
      select.addEventListener("change", syncValue);
      select.appSelectRefresh = function () {
        rebuildOptions();
        syncValue();
      };
      rebuildOptions();
      syncValue();
    });
  }
  window.enhanceAppSelects = enhanceWithin;
  enhanceWithin();
  document.addEventListener("click", function (event) {
    if (!event.target.closest(".app-select")) closeAll();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeAll();
  });
  window.addEventListener("scroll", function (event) {
    var target = event.target;
    if (target && target.nodeType === 1 && target.closest(".app-select-options")) return;
    enhanced.forEach(function (_ref2) {
      var root = _ref2.root,
        list = _ref2.list,
        trigger = _ref2.trigger;
      if (list.hidden) return;
      var rect = trigger.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
        list.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        root.classList.remove("is-open", "opens-up");
      }
    });
  }, true);
  window.addEventListener("resize", function () {
    enhanced.forEach(function (_ref3) {
      var root = _ref3.root,
        list = _ref3.list,
        trigger = _ref3.trigger;
      return positionList(root, list, trigger);
    });
  });
})();