function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
(function () {
  var container = document.querySelector("[data-delivery-customer-lookup]");
  var nameInput = document.querySelector("#id_customer_name");
  var phoneInput = document.querySelector("#id_phone");
  var orderType = document.querySelector("#id_order_type");
  var status = container === null || container === void 0 ? void 0 : container.querySelector(".customer-lookup-status");
  var matchList = container === null || container === void 0 ? void 0 : container.querySelector("[data-customer-match-list]");
  if (!container || !nameInput || !orderType || !status || !matchList) return;
  var fields = {
    phone: phoneInput,
    street: document.querySelector("#id_street"),
    exterior_number: document.querySelector("#id_exterior_number"),
    interior_number: document.querySelector("#id_interior_number"),
    neighborhood: document.querySelector("#id_neighborhood"),
    notes: document.querySelector("#id_notes")
  };
  var timer;
  var requestNumber = 0;
  var lastAutofilled = null;
  var matches = [];
  var activeIndex = -1;
  function lookupEnabled() {
    return ["delivery", "pickup"].includes(orderType.value);
  }
  function closeMatches() {
    matches = [];
    activeIndex = -1;
    while (matchList.firstChild) matchList.removeChild(matchList.firstChild);
    matchList.hidden = true;
    nameInput.setAttribute("aria-expanded", "false");
    phoneInput === null || phoneInput === void 0 || phoneInput.setAttribute("aria-expanded", "false");
    container.classList.remove("opens-up");
  }
  function positionMatches() {
    if (matchList.hidden) return;
    container.classList.remove("opens-up");
    var rect = container.getBoundingClientRect();
    var desiredHeight = Math.min(matchList.scrollHeight || 280, 280) + 12;
    var spaceBelow = window.innerHeight - rect.bottom;
    var spaceAbove = rect.top;
    container.classList.toggle("opens-up", spaceBelow < desiredHeight && spaceAbove > spaceBelow);
  }
  function clearPreviousAutofill() {
    if (!lastAutofilled) return;
    Object.entries(fields).forEach(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
        key = _ref2[0],
        field = _ref2[1];
      if (field && field.value === (lastAutofilled[key] || "")) field.value = "";
    });
    lastAutofilled = null;
  }
  function customerDescription(customer) {
    var address = [customer.street, customer.exterior_number].filter(Boolean).join(" ");
    return [customer.phone, address, customer.neighborhood].filter(Boolean).join(" · ") || "Sin datos adicionales";
  }
  function refreshActiveOption() {
    matchList.querySelectorAll(".customer-match-option").forEach(function (option, index) {
      option.classList.toggle("is-active", index === activeIndex);
      option.setAttribute("aria-selected", String(index === activeIndex));
    });
  }
  function selectCustomer(customer) {
    nameInput.value = customer.name || "";
    var reusableFields = orderType.value === "pickup" ? {
      phone: fields.phone
    } : fields;
    Object.entries(reusableFields).forEach(function (_ref3) {
      var _ref4 = _slicedToArray(_ref3, 2),
        key = _ref4[0],
        field = _ref4[1];
      if (field) field.value = customer[key] || "";
    });
    lastAutofilled = Object.fromEntries(Object.keys(reusableFields).map(function (key) {
      return [key, customer[key] || ""];
    }));
    status.textContent = "Datos del cliente recuperados";
    status.className = "customer-lookup-status is-found";
    closeMatches();
  }
  function renderMatches(foundMatches) {
    matches = foundMatches;
    activeIndex = -1;
    while (matchList.firstChild) matchList.removeChild(matchList.firstChild);
    matches.forEach(function (customer, index) {
      var option = document.createElement("button");
      var name = document.createElement("strong");
      var description = document.createElement("small");
      option.type = "button";
      option.className = "customer-match-option";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      name.textContent = customer.name;
      description.textContent = customerDescription(customer);
      option.appendChild(name);
      option.appendChild(description);
      option.addEventListener("mousedown", function (event) {
        return event.preventDefault();
      });
      option.addEventListener("click", function () {
        return selectCustomer(matches[index]);
      });
      matchList.appendChild(option);
    });
    matchList.hidden = matches.length === 0;
    nameInput.setAttribute("aria-expanded", String(matches.length > 0));
    phoneInput === null || phoneInput === void 0 || phoneInput.setAttribute("aria-expanded", String(matches.length > 0));
    if (matches.length) window.requestAnimationFrame(positionMatches);
  }
  function findCustomers(_x) {
    return _findCustomers.apply(this, arguments);
  }
  function _findCustomers() {
    _findCustomers = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(sourceInput) {
      var query, currentRequest, endpoint, url, response, data, foundMatches, _t;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.p = _context.n) {
          case 0:
            query = sourceInput.value.trim();
            if (!(!lookupEnabled() || query.length < 2)) {
              _context.n = 1;
              break;
            }
            closeMatches();
            status.textContent = query ? "Escribe al menos 2 caracteres" : "";
            return _context.a(2);
          case 1:
            currentRequest = ++requestNumber;
            endpoint = container.dataset.deliveryCustomerLookup;
            url = `${endpoint}${endpoint.includes("?") ? "&" : "?"}q=${encodeURIComponent(query)}`;
            _context.p = 2;
            _context.n = 3;
            return fetch(url, {
              headers: {
                Accept: "application/json"
              }
            });
          case 3:
            response = _context.v;
            if (!(!response.ok || currentRequest !== requestNumber)) {
              _context.n = 4;
              break;
            }
            return _context.a(2);
          case 4:
            _context.n = 5;
            return response.json();
          case 5:
            data = _context.v;
            foundMatches = Array.isArray(data.matches) ? data.matches : [];
            renderMatches(foundMatches);
            status.textContent = foundMatches.length ? `${foundMatches.length} cliente${foundMatches.length === 1 ? "" : "s"} encontrado${foundMatches.length === 1 ? "" : "s"}` : "Cliente nuevo";
            status.className = `customer-lookup-status ${foundMatches.length ? "is-found" : "is-new"}`;
            _context.n = 7;
            break;
          case 6:
            _context.p = 6;
            _t = _context.v;
            closeMatches();
            status.textContent = "No fue posible consultar los clientes guardados";
            status.className = "customer-lookup-status is-error";
          case 7:
            return _context.a(2);
        }
      }, _callee, null, [[2, 6]]);
    }));
    return _findCustomers.apply(this, arguments);
  }
  function scheduleLookup(sourceInput) {
    window.clearTimeout(timer);
    if (lastAutofilled) clearPreviousAutofill();
    status.textContent = "";
    timer = window.setTimeout(function () {
      return findCustomers(sourceInput);
    }, 250);
  }
  function handleKeyboard(event) {
    if (matchList.hidden || !matches.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % matches.length;
      refreshActiveOption();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = (activeIndex - 1 + matches.length) % matches.length;
      refreshActiveOption();
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectCustomer(matches[activeIndex]);
    } else if (event.key === "Escape") {
      closeMatches();
    }
  }
  [nameInput, phoneInput].filter(Boolean).forEach(function (input) {
    input.setAttribute("autocomplete", "off");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-expanded", "false");
    input.addEventListener("input", function () {
      return scheduleLookup(input);
    });
    input.addEventListener("keydown", handleKeyboard);
    input.addEventListener("focus", function () {
      if (input.value.trim().length >= 2) scheduleLookup(input);
    });
  });
  document.addEventListener("click", function (event) {
    if (!container.contains(event.target) && event.target !== phoneInput) closeMatches();
  });
  window.addEventListener("scroll", function (event) {
    var target = event.target;
    if (target && target.nodeType === 1 && target.closest(".customer-match-list")) return;
    if (matchList.hidden) return;
    var rect = container.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) closeMatches();
  }, true);
  window.addEventListener("resize", positionMatches);
  document.querySelectorAll(".order-type-option").forEach(function (button) {
    button.addEventListener("click", function () {
      window.clearTimeout(timer);
      closeMatches();
      status.textContent = "";
    });
  });
})();