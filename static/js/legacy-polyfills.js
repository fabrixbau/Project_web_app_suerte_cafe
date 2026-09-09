(function () {
    "use strict";

    var elementPrototype = window.Element && window.Element.prototype;
    if (elementPrototype && !elementPrototype.matches) {
        elementPrototype.matches = elementPrototype.msMatchesSelector || elementPrototype.webkitMatchesSelector;
    }
    if (elementPrototype && !elementPrototype.closest) {
        elementPrototype.closest = function (selector) {
            var current = this;
            while (current && current.nodeType === 1) {
                if (current.matches(selector)) return current;
                current = current.parentElement;
            }
            return null;
        };
    }
    if (window.NodeList && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = Array.prototype.forEach;
    }
    if (!Array.from) {
        Array.from = function (value) { return Array.prototype.slice.call(value); };
    }
    if (!Array.prototype.includes) {
        Array.prototype.includes = function (value) { return this.indexOf(value) !== -1; };
    }
    if (!Array.prototype.find) {
        Array.prototype.find = function (callback, thisArg) {
            for (var index = 0; index < this.length; index += 1) {
                if (callback.call(thisArg, this[index], index, this)) return this[index];
            }
        };
    }
    if (!Array.prototype.findIndex) {
        Array.prototype.findIndex = function (callback, thisArg) {
            for (var index = 0; index < this.length; index += 1) {
                if (callback.call(thisArg, this[index], index, this)) return index;
            }
            return -1;
        };
    }
    if (!Array.prototype.flatMap) {
        Array.prototype.flatMap = function (callback, thisArg) {
            return Array.prototype.concat.apply([], this.map(callback, thisArg));
        };
    }
    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function (search, position) {
            return this.substr(position || 0, search.length) === search;
        };
    }
    if (!Object.entries) {
        Object.entries = function (object) {
            return Object.keys(object).map(function (key) { return [key, object[key]]; });
        };
    }
    if (!Object.fromEntries) {
        Object.fromEntries = function (entries) {
            return entries.reduce(function (result, entry) {
                result[entry[0]] = entry[1];
                return result;
            }, {});
        };
    }
    if (window.Element && !Element.prototype.append) {
        Element.prototype.append = function () {
            var fragment = document.createDocumentFragment();
            Array.prototype.forEach.call(arguments, function (item) {
                fragment.appendChild(item instanceof Node ? item : document.createTextNode(String(item)));
            });
            this.appendChild(fragment);
        };
    }
    if (typeof window.CustomEvent !== "function") {
        window.CustomEvent = function (event, params) {
            var customEvent = document.createEvent("CustomEvent");
            customEvent.initCustomEvent(event, params && params.bubbles, params && params.cancelable, params && params.detail);
            return customEvent;
        };
    }
    try { new window.Event("compatibility-test"); }
    catch (error) {
        window.Event = function (event, params) {
            var basicEvent = document.createEvent("Event");
            basicEvent.initEvent(event, params && params.bubbles, params && params.cancelable);
            return basicEvent;
        };
    }

    if (!window.URLSearchParams) {
        window.URLSearchParams = function (query) {
            this.values = {};
            String(query || "").replace(/^\?/, "").split("&").forEach(function (pair) {
                if (!pair) return;
                var parts = pair.split("=");
                this.values[decodeURIComponent(parts[0])] = decodeURIComponent(parts.slice(1).join("=") || "");
            }, this);
        };
        window.URLSearchParams.prototype.get = function (key) { return this.values[key] || null; };
        window.URLSearchParams.prototype.set = function (key, value) { this.values[key] = String(value); };
        window.URLSearchParams.prototype.toString = function () {
            return Object.keys(this.values).map(function (key) {
                return encodeURIComponent(key) + "=" + encodeURIComponent(this.values[key]);
            }, this).join("&");
        };
    }

    if (!window.fetch) {
        window.fetch = function (url, options) {
            options = options || {};
            return new Promise(function (resolve, reject) {
                var request = new XMLHttpRequest();
                request.open(options.method || "GET", url, true);
                Object.keys(options.headers || {}).forEach(function (name) {
                    request.setRequestHeader(name, options.headers[name]);
                });
                request.onload = function () {
                    var response = {
                        ok: request.status >= 200 && request.status < 300,
                        status: request.status,
                        text: function () { return Promise.resolve(request.responseText); },
                        json: function () {
                            try { return Promise.resolve(JSON.parse(request.responseText)); }
                            catch (error) { return Promise.reject(error); }
                        }
                    };
                    resolve(response);
                };
                request.onerror = function () { reject(new TypeError("Error de red")); };
                request.send(options.body || null);
            });
        };
    }

    function closeDialog(dialog) {
        dialog.removeAttribute("open");
        if (dialog._legacyBackdrop && dialog._legacyBackdrop.parentNode) {
            dialog._legacyBackdrop.parentNode.removeChild(dialog._legacyBackdrop);
        }
        document.body.classList.remove("legacy-dialog-open");
        dialog.dispatchEvent(new Event("close"));
    }
    Array.prototype.forEach.call(document.querySelectorAll("dialog"), function (dialog) {
        if (!dialog.showModal) {
            dialog.showModal = function () {
                var backdrop = document.createElement("div");
                backdrop.className = "legacy-dialog-backdrop";
                backdrop.onclick = function () { closeDialog(dialog); };
                dialog._legacyBackdrop = backdrop;
                document.body.appendChild(backdrop);
                dialog.setAttribute("open", "open");
                document.body.classList.add("legacy-dialog-open");
            };
        }
        if (!dialog.close) dialog.close = function () { closeDialog(dialog); };
    });
}());
