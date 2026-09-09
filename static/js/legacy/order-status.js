function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
(function () {
  var statusClasses = ["status-in_progress", "status-completed", "status-canceled"];
  function showError(message) {
    var container = document.createElement("div");
    container.className = "app-notifications";
    container.innerHTML = '<article class="app-notification notification-error"><div class="notification-content"><strong>No se pudo cambiar el estado</strong><p class="notification-message"></p></div><div class="notification-actions"><button type="button" data-close-notification aria-label="Cerrar notificación">×</button></div></article>';
    container.querySelector(".notification-message").textContent = message;
    container.querySelector("[data-close-notification]").addEventListener("click", function () {
      return container.remove();
    });
    document.body.appendChild(container);
    document.body.classList.add("feedback-frame-error");
    window.setTimeout(function () {
      return document.body.classList.remove("feedback-frame-error");
    }, 1500);
  }
  function updateMatchingButtons(action, data) {
    document.querySelectorAll(".status-update-form").forEach(function (form) {
      var _button$classList;
      if (form.action !== action) return;
      var button = form.querySelector(".status-cycle-button");
      (_button$classList = button.classList).remove.apply(_button$classList, statusClasses);
      button.classList.add(`status-${data.status}`);
      button.replaceChildren(document.createTextNode(`${data.status_label} `));
      var arrow = document.createElement("span");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      button.appendChild(arrow);
    });
  }
  document.addEventListener("submit", /*#__PURE__*/function () {
    var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(event) {
      var form, button, response, data, _t, _t2;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.p = _context.n) {
          case 0:
            form = event.target.closest(".status-update-form");
            if (form) {
              _context.n = 1;
              break;
            }
            return _context.a(2);
          case 1:
            event.preventDefault();
            button = form.querySelector(".status-cycle-button");
            if (!button.disabled) {
              _context.n = 2;
              break;
            }
            return _context.a(2);
          case 2:
            button.disabled = true;
            button.classList.add("is-saving");
            _context.p = 3;
            _context.n = 4;
            return fetch(form.action, {
              method: "POST",
              body: new FormData(form),
              headers: {
                "X-Requested-With": "XMLHttpRequest",
                Accept: "application/json"
              }
            });
          case 4:
            response = _context.v;
            _context.p = 5;
            _context.n = 6;
            return response.json();
          case 6:
            data = _context.v;
            _context.n = 8;
            break;
          case 7:
            _context.p = 7;
            _t = _context.v;
            throw new Error("El servidor no pudo procesar el cambio. Recarga e intenta nuevamente.");
          case 8:
            if (!(!response.ok || !data.ok)) {
              _context.n = 9;
              break;
            }
            throw new Error(data.error || "Intenta nuevamente.");
          case 9:
            updateMatchingButtons(form.action, data);
            _context.n = 11;
            break;
          case 10:
            _context.p = 10;
            _t2 = _context.v;
            showError(_t2.message || "No fue posible actualizar el pedido.");
          case 11:
            _context.p = 11;
            button.disabled = false;
            button.classList.remove("is-saving");
            return _context.f(11);
          case 12:
            return _context.a(2);
        }
      }, _callee, null, [[5, 7], [3, 10, 11, 12]]);
    }));
    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }());
})();