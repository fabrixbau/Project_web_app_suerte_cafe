(function () {
  var root = document.documentElement;
  var button = document.querySelector("[data-sidebar-toggle]");
  if (!button) return;
  function refresh() {
    var expanded = root.dataset.sidebar !== "collapsed";
    button.setAttribute("aria-expanded", String(expanded));
    button.setAttribute("aria-label", expanded ? "Plegar barra lateral" : "Desplegar barra lateral");
    document.querySelectorAll(".sidebar nav a, .sidebar nav button").forEach(function (item) {
      var label = item.textContent.trim().replace(/\s+/g, " ");
      if (label) item.title = expanded ? "" : label;
    });
  }
  button.addEventListener("click", function () {
    var next = root.dataset.sidebar === "collapsed" ? "expanded" : "collapsed";
    root.dataset.sidebar = next;
    try {
      window.localStorage.setItem("suerteCafeSidebar", next);
    } catch (_) {/* Preferencia opcional. */}
    refresh();
  });
  refresh();
})();