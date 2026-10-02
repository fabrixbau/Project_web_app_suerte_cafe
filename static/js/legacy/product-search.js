function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
(function () {
  var toggle = document.querySelector("[data-product-search-toggle]");
  var panel = document.querySelector("[data-product-search-panel]");
  var input = document.querySelector("[data-product-search-input]");
  var suggestions = document.querySelector("[data-product-search-suggestions]");
  var searchControl = panel === null || panel === void 0 ? void 0 : panel.querySelector(".product-search-control");
  var feedback = document.querySelector("[data-product-search-feedback]");
  if (!toggle || !panel || !input || !suggestions || !feedback || !searchControl) return;
  var categoryButtons = _toConsumableArray(document.querySelectorAll(".category-card[data-category-target]"));
  var sections = _toConsumableArray(document.querySelectorAll(".category-products"));
  var products = _toConsumableArray(document.querySelectorAll(".category-products .product-card[data-name]")).map(function (card) {
    var _card$closest;
    return {
      card,
      section: card.closest(".category-products"),
      name: card.dataset.name || "",
      category: ((_card$closest = card.closest(".category-products")) === null || _card$closest === void 0 || (_card$closest = _card$closest.querySelector("h3")) === null || _card$closest === void 0 ? void 0 : _card$closest.textContent.trim()) || "",
      price: card.dataset.price || "0"
    };
  });
  var visibleSuggestions = [];
  var activeIndex = -1;
  function normalize(value) {
    var text = String(value || "").toLocaleLowerCase("es-MX");
    return text.normalize ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : text;
  }
  function clearSuggestions() {
    suggestions.innerHTML = "";
    suggestions.hidden = true;
    input.setAttribute("aria-expanded", "false");
    activeIndex = -1;
    searchControl.classList.remove("opens-up");
  }
  function positionSuggestions() {
    if (suggestions.hidden) return;
    searchControl.classList.remove("opens-up");
    var rect = input.getBoundingClientRect();
    var desiredHeight = Math.min(suggestions.scrollHeight || 300, 300) + 12;
    var spaceBelow = window.innerHeight - rect.bottom;
    var spaceAbove = rect.top;
    searchControl.classList.toggle("opens-up", spaceBelow < desiredHeight && spaceAbove > spaceBelow);
  }
  function restoreProducts() {
    products.forEach(function (_ref) {
      var card = _ref.card;
      card.hidden = false;
    });
  }
  function matchesFor(query) {
    var term = normalize(query.trim());
    if (!term) return [];
    return products.filter(function (_ref2) {
      var name = _ref2.name,
        category = _ref2.category;
      return normalize(`${name} ${category}`).indexOf(term) !== -1;
    });
  }
  function showResults(query) {
    var matches = matchesFor(query);
    var matchingCards = new Set(matches.map(function (_ref3) {
      var card = _ref3.card;
      return card;
    }));
    sections.forEach(function (section) {
      var sectionProducts = products.filter(function (product) {
        return product.section === section;
      });
      sectionProducts.forEach(function (_ref4) {
        var card = _ref4.card;
        card.hidden = !matchingCards.has(card);
      });
      section.hidden = !sectionProducts.some(function (_ref5) {
        var card = _ref5.card;
        return matchingCards.has(card);
      });
    });
    feedback.textContent = query.trim() ? `${matches.length} producto${matches.length === 1 ? "" : "s"} encontrado${matches.length === 1 ? "" : "s"}.` : "Escribe para buscar en todo el menú.";
    document.dispatchEvent(new CustomEvent("order-menu-focus"));
    return matches;
  }
  function choose(product) {
    input.value = product.name;
    showResults(product.name);
    clearSuggestions();
    window.setTimeout(function () {
      try {
        product.card.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      } catch (_) {
        product.card.scrollIntoView(true);
      }
    }, 0);
  }
  function renderSuggestions(matches) {
    suggestions.innerHTML = "";
    visibleSuggestions = matches.slice(0, 8);
    visibleSuggestions.forEach(function (product) {
      var option = document.createElement("button");
      var name = document.createElement("strong");
      var category = document.createElement("small");
      var price = document.createElement("span");
      option.type = "button";
      option.className = "product-search-suggestion";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      name.textContent = product.name;
      category.textContent = product.category;
      price.textContent = `$${Number.parseFloat(product.price).toFixed(2)}`;
      option.append(name, category, price);
      option.addEventListener("mousedown", function (event) {
        return event.preventDefault();
      });
      option.addEventListener("click", function () {
        return choose(product);
      });
      suggestions.appendChild(option);
    });
    suggestions.hidden = visibleSuggestions.length === 0;
    input.setAttribute("aria-expanded", String(visibleSuggestions.length > 0));
    activeIndex = -1;
    if (visibleSuggestions.length) window.requestAnimationFrame(positionSuggestions);
  }
  function refreshActive() {
    suggestions.querySelectorAll(".product-search-suggestion").forEach(function (option, index) {
      option.classList.toggle("is-active", index === activeIndex);
      option.setAttribute("aria-selected", String(index === activeIndex));
    });
  }
  function openSearch() {
    categoryButtons.forEach(function (button) {
      return button.classList.remove("is-selected");
    });
    sections.forEach(function (section) {
      section.hidden = true;
    });
    toggle.classList.add("is-selected");
    panel.hidden = false;
    input.focus();
    showResults(input.value);
  }
  toggle.addEventListener("click", openSearch);
  categoryButtons.forEach(function (button) {
    return button.addEventListener("click", function () {
      toggle.classList.remove("is-selected");
      panel.hidden = true;
      clearSuggestions();
      restoreProducts();
    });
  });
  input.addEventListener("input", function () {
    var matches = showResults(input.value);
    renderSuggestions(matches);
  });
  input.addEventListener("keydown", function (event) {
    var optionCount = visibleSuggestions.length;
    if (event.key === "ArrowDown" && optionCount) {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % optionCount;
      refreshActive();
    } else if (event.key === "ArrowUp" && optionCount) {
      event.preventDefault();
      activeIndex = (activeIndex - 1 + optionCount) % optionCount;
      refreshActive();
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0) choose(visibleSuggestions[activeIndex]);else {
        showResults(input.value);
        clearSuggestions();
      }
    } else if (event.key === "Escape") {
      clearSuggestions();
    }
  });
  document.addEventListener("click", function (event) {
    if (!panel.contains(event.target) && event.target !== toggle) clearSuggestions();
  });
  window.addEventListener("scroll", function (event) {
    var target = event.target;
    if (target && target.nodeType === 1 && target.closest(".product-search-suggestions")) return;
    if (suggestions.hidden) return;
    var rect = input.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) clearSuggestions();
  }, true);
  window.addEventListener("resize", positionSuggestions);
})();