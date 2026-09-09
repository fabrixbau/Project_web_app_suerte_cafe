(function () {
  var source = document.querySelector("#id_notes");
  var panel = document.querySelector("[data-order-comment-panel]");
  var toggle = document.querySelector("[data-order-comment-toggle]");
  var editor = document.querySelector("[data-order-comment-text]");
  var label = document.querySelector("[data-order-comment-label]");
  if (!source || !panel || !toggle || !editor) return;
  function refreshLabel() {
    var hasNote = Boolean(source.value.trim());
    toggle.classList.toggle("has-note", hasNote);
    label.textContent = hasNote ? "Editar nota" : "Agregar nota";
  }
  function openPanel() {
    editor.value = source.value;
    panel.hidden = false;
    document.dispatchEvent(new CustomEvent("order-menu-focus"));
    window.setTimeout(function () {
      return editor.focus();
    }, 0);
  }
  function closePanel() {
    panel.hidden = true;
  }
  toggle.addEventListener("click", function () {
    return panel.hidden ? openPanel() : closePanel();
  });
  panel.querySelector("[data-order-comment-close]").addEventListener("click", closePanel);
  panel.querySelector("[data-order-comment-save]").addEventListener("click", function () {
    source.value = editor.value.trim();
    source.dispatchEvent(new Event("input", {
      bubbles: true
    }));
    refreshLabel();
    closePanel();
  });
  source.addEventListener("input", refreshLabel);
  refreshLabel();
})();