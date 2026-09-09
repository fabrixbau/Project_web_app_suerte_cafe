(function () {
  var themeKey = "suerteCafeTheme";
  var paletteKey = "suerteCafePalette";
  var toggle = document.querySelector("#appearance-toggle");
  var panel = document.querySelector("#appearance-panel");
  if (!toggle || !panel) return;
  var themes = ["light", "dark"];
  var palettes = ["coffee", "terracotta", "green"];
  function storedValue(key, allowed, fallback) {
    var value = localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  }
  function applyAppearance() {
    var theme = storedValue(themeKey, themes, "light");
    var palette = storedValue(paletteKey, palettes, "coffee");
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.palette = palette;
    panel.querySelector(`[name="theme"][value="${theme}"]`).checked = true;
    panel.querySelector(`[name="palette"][value="${palette}"]`).checked = true;
  }
  function closePanel() {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }
  toggle.addEventListener("click", function () {
    var willOpen = panel.hidden;
    panel.hidden = !willOpen;
    toggle.setAttribute("aria-expanded", String(willOpen));
  });
  panel.addEventListener("change", function (event) {
    if (event.target.name === "theme") {
      localStorage.setItem(themeKey, event.target.value);
    } else if (event.target.name === "palette") {
      localStorage.setItem(paletteKey, event.target.value);
    }
    applyAppearance();
  });
  document.addEventListener("click", function (event) {
    if (!panel.hidden && !panel.contains(event.target) && event.target !== toggle) {
      closePanel();
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closePanel();
  });
  applyAppearance();
})();