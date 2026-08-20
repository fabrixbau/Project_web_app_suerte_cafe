(() => {
    const storageKey = "suerteCafeCalculator";
    const calculator = document.querySelector("#calculator");
    const openButton = document.querySelector("#calculator-open");
    const display = document.querySelector("#calculator-display");
    const handle = document.querySelector("#calculator-handle");

    if (!calculator || !openButton) return;

    const initialState = () => ({
        display: "0",
        accumulator: null,
        operator: null,
        waitingForOperand: false,
        mode: "normal",
        position: null,
    });

    let state = initialState();

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
        const savedState = sessionStorage.getItem(storageKey);
        if (savedState) {
            try {
                state = { ...initialState(), ...JSON.parse(savedState) };
            } catch {
                state = initialState();
            }
        }
        if (state.mode === "minimized") state.mode = "normal";
        render();
        saveState();
    }

    function resetCalculation() {
        const mode = state.mode;
        const position = state.position;
        state = { ...initialState(), mode, position };
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
        const inputValue = Number.parseFloat(state.display);

        if (state.operator && state.waitingForOperand) {
            state.operator = nextOperator;
            return;
        }
        if (state.accumulator === null) {
            state.accumulator = inputValue;
        } else if (state.operator) {
            const result = calculate(state.accumulator, inputValue, state.operator);
            state.display = formatResult(result);
            state.accumulator = Number.isFinite(result) ? result : null;
            if (!Number.isFinite(result)) nextOperator = null;
        }
        state.operator = nextOperator;
        state.waitingForOperand = true;
    }

    function showResult() {
        if (!state.operator || state.accumulator === null || state.waitingForOperand) return;
        const result = calculate(
            state.accumulator,
            Number.parseFloat(state.display),
            state.operator
        );
        state.display = formatResult(result);
        state.accumulator = null;
        state.operator = null;
        state.waitingForOperand = true;
    }

    openButton.addEventListener("click", () => {
        const isOpen = openButton.getAttribute("aria-expanded") === "true";

        if (isOpen) {
            state.mode = "minimized";
            render();
            saveState();
            return;
        }

        openCalculator();
    });

    calculator.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;

        const windowAction = button.dataset.windowAction;
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

    let dragOffset = null;
    handle.addEventListener("pointerdown", (event) => {
        if (state.mode !== "normal" || event.target.closest("button")) return;
        const rectangle = calculator.getBoundingClientRect();
        dragOffset = {
            x: event.clientX - rectangle.left,
            y: event.clientY - rectangle.top,
        };
        handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener("pointermove", (event) => {
        if (!dragOffset) return;
        const left = Math.max(
            0,
            Math.min(window.innerWidth - calculator.offsetWidth, event.clientX - dragOffset.x)
        );
        const top = Math.max(
            0,
            Math.min(window.innerHeight - calculator.offsetHeight, event.clientY - dragOffset.y)
        );
        state.position = { left, top };
        render();
    });
    handle.addEventListener("pointerup", () => {
        if (dragOffset) saveState();
        dragOffset = null;
    });

    const savedState = sessionStorage.getItem(storageKey);
    if (savedState) {
        try {
            const storedMode = JSON.parse(savedState).mode;
            if (storedMode !== "minimized") openCalculator();
        } catch {
            sessionStorage.removeItem(storageKey);
        }
    }
})();
