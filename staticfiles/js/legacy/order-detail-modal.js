function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
(function () {
  var modal = document.querySelector("#order-detail-modal");
  if (!modal) return;
  var content = modal.querySelector("[data-order-detail-content]");
  var title = modal.querySelector("#order-detail-modal-title");
  var loadingMarkup = '<div class="order-detail-loading"><span></span><p>Cargando pedido…</p></div>';
  var activeRequest = null;
  var activeDetail = null;
  function closeModal() {
    if (activeRequest) activeRequest.abort();
    if (modal.open) modal.close();
  }
  function openDetail(_x) {
    return _openDetail.apply(this, arguments);
  }
  function _openDetail() {
    _openDetail = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(link) {
      var response, documentResponse, detail, message, _t, _t2;
      return _regenerator().w(function (_context) {
        while (1) switch (_context.p = _context.n) {
          case 0:
            if (activeRequest) activeRequest.abort();
            activeRequest = new AbortController();
            title.textContent = `Pedido ${link.textContent.trim()}`;
            activeDetail = {
              href: link.href,
              textContent: link.textContent
            };
            content.innerHTML = loadingMarkup;
            modal.showModal();
            _context.p = 1;
            _context.n = 2;
            return fetch(link.href, {
              headers: {
                "X-Requested-With": "XMLHttpRequest"
              },
              signal: activeRequest.signal
            });
          case 2:
            response = _context.v;
            if (response.ok) {
              _context.n = 3;
              break;
            }
            throw new Error("No fue posible cargar el pedido.");
          case 3:
            _t = new DOMParser();
            _context.n = 4;
            return response.text();
          case 4:
            documentResponse = _t.parseFromString.call(_t, _context.v, "text/html");
            detail = documentResponse.querySelector(".order-detail-layout");
            if (detail) {
              _context.n = 5;
              break;
            }
            throw new Error("El detalle recibido no es válido.");
          case 5:
            content.replaceChildren(detail);
            _context.n = 8;
            break;
          case 6:
            _context.p = 6;
            _t2 = _context.v;
            if (!(_t2.name === "AbortError")) {
              _context.n = 7;
              break;
            }
            return _context.a(2);
          case 7:
            content.innerHTML = "";
            message = document.createElement("div");
            message.className = "order-detail-load-error";
            message.innerHTML = "<strong>No pudimos abrir el pedido</strong><p></p>";
            message.querySelector("p").textContent = _t2.message;
            content.appendChild(message);
          case 8:
            _context.p = 8;
            activeRequest = null;
            return _context.f(8);
          case 9:
            return _context.a(2);
        }
      }, _callee, null, [[1, 6, 8, 9]]);
    }));
    return _openDetail.apply(this, arguments);
  }
  document.addEventListener("click", function (event) {
    var trigger = event.target.closest(".order-detail-trigger");
    if (trigger) {
      event.preventDefault();
      openDetail(trigger);
      return;
    }
    if (event.target.closest("[data-close-order-detail]")) closeModal();
    var row = event.target.closest(".order-row[data-detail-url]");
    if (row && !event.target.closest("button, form, input, select, textarea, a")) {
      var _row$querySelector;
      openDetail({
        href: row.dataset.detailUrl,
        textContent: ((_row$querySelector = row.querySelector(".order-detail-trigger")) === null || _row$querySelector === void 0 ? void 0 : _row$querySelector.textContent) || ""
      });
    }
  });
  document.addEventListener("keydown", function (event) {
    var _event$target$closest, _event$target;
    var row = (_event$target$closest = (_event$target = event.target).closest) === null || _event$target$closest === void 0 ? void 0 : _event$target$closest.call(_event$target, ".order-row[data-detail-url]");
    if (row && ["Enter", " "].includes(event.key)) {
      var _row$querySelector2;
      event.preventDefault();
      openDetail({
        href: row.dataset.detailUrl,
        textContent: ((_row$querySelector2 = row.querySelector(".order-detail-trigger")) === null || _row$querySelector2 === void 0 ? void 0 : _row$querySelector2.textContent) || ""
      });
    }
  });
  modal.addEventListener("click", function (event) {
    if (event.target === modal) closeModal();
  });
  document.addEventListener("orders-live-updated", function () {
    if (modal.open && activeDetail && !activeRequest) openDetail(activeDetail);
  });
})();