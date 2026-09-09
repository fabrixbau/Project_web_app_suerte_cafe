(function () {
  document.querySelectorAll('input[type="number"]:not(.quantity-input):not([data-native-number])').forEach(function (input) {
    var _input$labels;
    if (input.dataset.numberControlReady === "true" || input.closest(".currency-setting-input")) return;
    input.dataset.numberControlReady = "true";
    var control = document.createElement("div");
    control.className = "app-number-control";
    var decrement = document.createElement("button");
    var increment = document.createElement("button");
    var label = ((_input$labels = input.labels) === null || _input$labels === void 0 || (_input$labels = _input$labels[0]) === null || _input$labels === void 0 ? void 0 : _input$labels.textContent.trim().replace(/:$/, "")) || "valor";
    decrement.type = "button";
    decrement.className = "app-number-step app-number-step-down";
    decrement.textContent = "−";
    decrement.setAttribute("aria-label", `Disminuir ${label}`);
    increment.type = "button";
    increment.className = "app-number-step app-number-step-up";
    increment.textContent = "+";
    increment.setAttribute("aria-label", `Aumentar ${label}`);
    var update = function update(direction) {
      if (input.disabled || input.readOnly) return;
      try {
        direction > 0 ? input.stepUp() : input.stepDown();
      } catch (_unused) {
        var step = Number(input.step) || 1;
        input.value = String((Number(input.value) || 0) + direction * step);
      }
      input.dispatchEvent(new Event("input", {
        bubbles: true
      }));
      input.dispatchEvent(new Event("change", {
        bubbles: true
      }));
    };
    decrement.addEventListener("click", function () {
      return update(-1);
    });
    increment.addEventListener("click", function () {
      return update(1);
    });
    input.parentNode.insertBefore(control, input);
    control.append(decrement, input, increment);
  });
})();