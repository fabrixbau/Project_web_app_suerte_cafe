function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
(function () {
  var board = document.querySelector("#kitchen-board");
  if (!board) return;
  var busy = false;
  function csrfToken() {
    var _document$cookie$spli;
    return ((_document$cookie$spli = document.cookie.split(";").map(function (item) {
      return item.trim();
    }).find(function (item) {
      return item.startsWith("csrftoken=");
    })) === null || _document$cookie$spli === void 0 ? void 0 : _document$cookie$spli.split("=").slice(1).join("=")) || "";
  }
  function refreshBoard() {
    return _refreshBoard.apply(this, arguments);
  }
  function _refreshBoard() {
    _refreshBoard = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
      var filter, response, payload, _t2;
      return _regenerator().w(function (_context2) {
        while (1) switch (_context2.p = _context2.n) {
          case 0:
            if (!(busy || document.hidden)) {
              _context2.n = 1;
              break;
            }
            return _context2.a(2);
          case 1:
            _context2.p = 1;
            filter = new URLSearchParams(window.location.search).get("filter") || "two_players";
            _context2.n = 2;
            return fetch(`${board.dataset.liveUrl}?filter=${encodeURIComponent(filter)}`, {
              headers: {
                "X-Requested-With": "XMLHttpRequest"
              }
            });
          case 2:
            response = _context2.v;
            if (response.ok) {
              _context2.n = 3;
              break;
            }
            return _context2.a(2);
          case 3:
            _context2.n = 4;
            return response.json();
          case 4:
            payload = _context2.v;
            if (payload.html !== board.innerHTML) board.innerHTML = payload.html;
            _context2.n = 6;
            break;
          case 5:
            _context2.p = 5;
            _t2 = _context2.v;
          case 6:
            return _context2.a(2);
        }
      }, _callee2, null, [[1, 5]]);
    }));
    return _refreshBoard.apply(this, arguments);
  }
  board.addEventListener("click", /*#__PURE__*/function () {
    var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(event) {
      var button, response, payload, _button$closest, _t;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.p = _context.n) {
          case 0:
            button = event.target.closest("[data-bar-status-url]");
            if (!(!button || busy)) {
              _context.n = 1;
              break;
            }
            return _context.a(2);
          case 1:
            busy = true;
            button.disabled = true;
            button.textContent = "Actualizando…";
            _context.p = 2;
            _context.n = 3;
            return fetch(button.dataset.barStatusUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": decodeURIComponent(csrfToken()),
                "X-Requested-With": "XMLHttpRequest"
              },
              body: JSON.stringify({
                bar: button.dataset.station,
                status: button.dataset.nextStatus
              })
            });
          case 3:
            response = _context.v;
            _context.n = 4;
            return response.json();
          case 4:
            payload = _context.v;
            if (!(!response.ok || !payload.success)) {
              _context.n = 5;
              break;
            }
            throw new Error(payload.error || "No fue posible actualizar la barra.");
          case 5:
            busy = false;
            _context.n = 6;
            return refreshBoard();
          case 6:
            _context.n = 8;
            break;
          case 7:
            _context.p = 7;
            _t = _context.v;
            button.disabled = false;
            button.textContent = "Intentar nuevamente";
            (_button$closest = button.closest("[data-kitchen-ticket]")) === null || _button$closest === void 0 || _button$closest.classList.add("has-error");
          case 8:
            _context.p = 8;
            busy = false;
            return _context.f(8);
          case 9:
            return _context.a(2);
        }
      }, _callee, null, [[2, 7, 8, 9]]);
    }));
    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }());
  window.setInterval(refreshBoard, 4000);
})();