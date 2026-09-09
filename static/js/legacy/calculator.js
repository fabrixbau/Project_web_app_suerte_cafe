function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
(function () {
  var storageKey = "suerteCafeCalculator";
  var calculator = document.querySelector("#calculator");
  var openButton = document.querySelector("#calculator-open");
  var display = document.querySelector("#calculator-display");
  var handle = document.querySelector("#calculator-handle");
  if (!calculator || !openButton) return;
  var initialState = function initialState() {
    return {
      display: "0",
      accumulator: null,
      operator: null,
      waitingForOperand: false,
      mode: "normal",
      position: null
    };
  };
  var state = initialState();
  function saveState() {
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  }
  function render() {
    if (state.mode === "minimized") {
      calculator.hidden = true;
      calculator.classList.add("is-hidden");
      openButton.setAttribute("aria-expanded", "false");
      return;
    }
    calculator.hidden = false;
    calculator.classList.remove("is-hidden");
    openButton.setAttribute("aria-expanded", "true");
    display.textContent = state.display;
    calculator.classList.toggle("is-expanded", state.mode === "expanded");
    if (state.mode === "normal" && state.position) {
      calculator.style.left = `${state.position.left}px`;
      calculator.style.top = `${state.position.top}px`;
      calculator.style.right = "auto";
      calculator.style.bottom = "auto";
    } else if (state.mode !== "normal") {
      calculator.style.removeProperty("left");
      calculator.style.removeProperty("top");
      calculator.style.removeProperty("right");
      calculator.style.removeProperty("bottom");
    }
  }
  function openCalculator() {
    var savedState = sessionStorage.getItem(storageKey);
    if (savedState) {
      try {
        state = _objectSpread(_objectSpread({}, initialState()), JSON.parse(savedState));
      } catch (_unused) {
        state = initialState();
      }
    }
    if (state.mode === "minimized") state.mode = "normal";
    render();
    saveState();
  }
  function resetCalculation() {
    var mode = state.mode;
    var position = state.position;
    state = _objectSpread(_objectSpread({}, initialState()), {}, {
      mode,
      position
    });
  }
  function formatResult(number) {
    if (!Number.isFinite(number)) return "Error";
    return String(Number.parseFloat(number.toFixed(10)));
  }
  function calculate(first, second, operator) {
    if (operator === "add") return first + second;
    if (operator === "subtract") return first - second;
    if (operator === "multiply") return first * second;
    if (operator === "divide") return second === 0 ? NaN : first / second;
    return second;
  }
  function inputDigit(digit) {
    if (state.display === "Error" || state.waitingForOperand) {
      state.display = digit;
      state.waitingForOperand = false;
    } else if (state.display === "0") {
      state.display = digit;
    } else if (state.display.length < 16) {
      state.display += digit;
    }
  }
  function inputDecimal() {
    if (state.display === "Error" || state.waitingForOperand) {
      state.display = "0.";
      state.waitingForOperand = false;
    } else if (!state.display.includes(".")) {
      state.display += ".";
    }
  }
  function selectOperator(nextOperator) {
    if (state.display === "Error") resetCalculation();
    var inputValue = Number.parseFloat(state.display);
    if (state.operator && state.waitingForOperand) {
      state.operator = nextOperator;
      return;
    }
    if (state.accumulator === null) {
      state.accumulator = inputValue;
    } else if (state.operator) {
      var result = calculate(state.accumulator, inputValue, state.operator);
      state.display = formatResult(result);
      state.accumulator = Number.isFinite(result) ? result : null;
      if (!Number.isFinite(result)) nextOperator = null;
    }
    state.operator = nextOperator;
    state.waitingForOperand = true;
  }
  function showResult() {
    if (!state.operator || state.accumulator === null || state.waitingForOperand) return;
    var result = calculate(state.accumulator, Number.parseFloat(state.display), state.operator);
    state.display = formatResult(result);
    state.accumulator = null;
    state.operator = null;
    state.waitingForOperand = true;
  }
  openButton.addEventListener("click", function () {
    var isOpen = openButton.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      state.mode = "minimized";
      render();
      saveState();
      return;
    }
    openCalculator();
  });
  calculator.addEventListener("click", function (event) {
    var button = event.target.closest("button");
    if (!button) return;
    var windowAction = button.dataset.windowAction;
    if (windowAction === "close") {
      calculator.hidden = true;
      calculator.classList.add("is-hidden");
      openButton.setAttribute("aria-expanded", "false");
      sessionStorage.removeItem(storageKey);
      state = initialState();
      return;
    }
    if (windowAction === "minimize") state.mode = "minimized";
    if (windowAction === "expand") {
      state.mode = state.mode === "expanded" ? "normal" : "expanded";
    }
    if (button.dataset.value) inputDigit(button.dataset.value);
    if (button.dataset.operator) selectOperator(button.dataset.operator);
    if (button.dataset.action === "decimal") inputDecimal();
    if (button.dataset.action === "equals") showResult();
    if (button.dataset.action === "clear") resetCalculation();
    if (button.dataset.action === "backspace" && !state.waitingForOperand) {
      state.display = state.display.length > 1 ? state.display.slice(0, -1) : "0";
    }
    if (button.dataset.action === "percent" && state.display !== "Error") {
      state.display = formatResult(Number.parseFloat(state.display) / 100);
    }
    render();
    saveState();
  });
  var dragOffset = null;
  handle.addEventListener("pointerdown", function (event) {
    if (state.mode !== "normal" || event.target.closest("button")) return;
    var rectangle = calculator.getBoundingClientRect();
    dragOffset = {
      x: event.clientX - rectangle.left,
      y: event.clientY - rectangle.top
    };
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener("pointermove", function (event) {
    if (!dragOffset) return;
    var left = Math.max(0, Math.min(window.innerWidth - calculator.offsetWidth, event.clientX - dragOffset.x));
    var top = Math.max(0, Math.min(window.innerHeight - calculator.offsetHeight, event.clientY - dragOffset.y));
    state.position = {
      left,
      top
    };
    render();
  });
  handle.addEventListener("pointerup", function () {
    if (dragOffset) saveState();
    dragOffset = null;
  });
  var savedState = sessionStorage.getItem(storageKey);
  if (savedState) {
    try {
      var storedMode = JSON.parse(savedState).mode;
      if (storedMode !== "minimized") openCalculator();
    } catch (_unused2) {
      sessionStorage.removeItem(storageKey);
    }
  }
})();