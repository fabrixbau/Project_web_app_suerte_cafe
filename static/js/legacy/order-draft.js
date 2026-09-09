(function () {
  "use strict";

  var STORAGE_KEY = "suerte-cafe-current-order-draft-v1";
  var form = document.querySelector("form.order-workspace");
  if (!form) return;
  var isClearing = false;
  var saveTimer = null;
  var query = new URLSearchParams(window.location.search);
  function draftControls() {
    return Array.from(form.elements).filter(function (control) {
      if (!control.name || control.name === "csrfmiddlewaretoken") return false;
      return !["submit", "button", "file"].includes(control.type);
    });
  }
  function clearStoredDraft() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // La orden puede continuar aunque el navegador bloquee localStorage.
    }
  }
  function saveDraft() {
    if (isClearing) return;
    var values = {};
    draftControls().forEach(function (control) {
      if (control.type === "checkbox" || control.type === "radio") {
        values[control.name] = {
          value: control.value,
          checked: control.checked
        };
      } else {
        values[control.name] = control.value;
      }
    });
    try {
      // setItem reemplaza el borrador anterior: nunca se acumulan varios.
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        values
      }));
    } catch (error) {
      // No interrumpir la captura si el almacenamiento no está disponible.
    }
  }
  function scheduleSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveDraft, 60);
  }
  function restoreDraft() {
    var draft;
    try {
      draft = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      clearStoredDraft();
      return;
    }
    if (!draft || !draft.values) return;
    draftControls().forEach(function (control) {
      if (!Object.prototype.hasOwnProperty.call(draft.values, control.name)) return;
      var stored = draft.values[control.name];
      if (control.type === "checkbox" || control.type === "radio") {
        control.checked = Boolean(stored && stored.checked && stored.value === control.value);
      } else {
        control.value = stored;
      }
    });
  }
  if (query.has("created_order")) {
    clearStoredDraft();
  } else {
    restoreDraft();
  }
  form.addEventListener("input", scheduleSave);
  form.addEventListener("change", scheduleSave);
  document.addEventListener("base-order-summary-rendered", function () {
    // Esperar a que personalizaciones y envases actualicen sus campos ocultos.
    window.setTimeout(scheduleSave, 0);
  });
  window.addEventListener("pagehide", saveDraft);
  var clearButton = form.querySelector("[data-clear-order-draft]");
  if (clearButton) {
    clearButton.addEventListener("click", function () {
      isClearing = true;
      window.clearTimeout(saveTimer);
      clearStoredDraft();
      clearButton.classList.add("is-cleared");
      clearButton.querySelector("strong").textContent = "Pedido vaciado";
      window.setTimeout(function () {
        return window.location.replace(window.location.pathname);
      }, 220);
    });
  }
})();