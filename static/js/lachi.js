/* Lachi, la mascota de Suerte Café: reacciona a lo que pasa en la app.
   Todo corre en el navegador (sin costo de servidor). Se apaga desde el panel Apariencia. */
(() => {
    const root = document.querySelector("[data-lachi]");
    if (!root) return;

    const bubble = root.querySelector("[data-lachi-bubble]");
    const button = root.querySelector("[data-lachi-button]");
    const toggle = document.querySelector("[data-lachi-toggle]");
    const visibleKey = "suerteCafeLachi";
    const greetingKey = "suerteCafeLachiGreeting";
    const sleepAfter = 5 * 60 * 1000;
    const moods = ["is-waving", "is-celebrating", "is-alert", "is-worried", "is-sleeping"];
    const userName = root.dataset.lachiUser || "";
    const lookChoices = document.querySelectorAll("[data-lachi-look-choice]");

    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const read = (storage, key) => { try { return storage.getItem(key); } catch (_) { return null; } };
    const write = (storage, key, value) => { try { storage.setItem(key, value); } catch (_) { /* sin almacenamiento */ } };

    // Frases por defecto: sólo se usan si en "Frases de Lachi" no queda ninguna activa para ese momento.
    const phrases = {
        newOrder: ["¡Llegó un pedido nuevo!", "¡Pedido nuevo! A darle con todo", "¡Alguien quiere café! Pedido nuevo"],
        created: ["¡Pedido registrado!", "¡Uno más! Vamos muy bien", "¡Listo! Ya quedó el pedido"],
        completed: ["¡Pedido completado!", "¡Excelente trabajo!", "¡Otro cliente feliz!", "Yeah buddy, lightweight baby!"],
        canceled: ["Pedido cancelado. ¡Ánimo, seguimos!"],
        error: ["Uy, algo salió mal. Revisa el mensaje", "¡Ups! Algo no salió bien"],
        wake: ["¡Ya desperté! ¿Me perdí de algo?", "¡Uf! Me quedé dormido un ratito", "I rose up from the dead, I do it all the time"],
        poke: [
            "¡Hola! Soy Lachi, la mascota de Suerte Café",
            "Tenemos café de la suerte",
            "¡Me haces cosquillas!",
            "¿Ya tomaste tu cafecito hoy?",
            "Un buen café arregla cualquier día",
            "¡Echándole ganas!",
            "Yeah buddy, lightweight baby!",
            "I rose up from the dead, I do it all the time",
            "Never say never",
            "La vida es un gran baile, y el mundo es un salón",
        ],
    };

    // Frases editables (modelo LachiPhrase), inyectadas en la página con json_script.
    try {
        const saved = JSON.parse(document.querySelector("#lachi-phrases")?.textContent || "{}");
        const keys = {poke: "poke", new_order: "newOrder", created: "created", completed: "completed", canceled: "canceled", error: "error", wake: "wake"};
        Object.entries(keys).forEach(([moment, key]) => {
            if (saved[moment]?.length) phrases[key] = saved[moment];
        });
    } catch (_) { /* se quedan las frases por defecto */ }

    let moodTimer = 0;
    let bubbleTimer = 0;
    let sleepTimer = 0;

    function isEnabled() {
        return read(localStorage, visibleKey) !== "off";
    }

    function setMood(mood, duration = 2600) {
        window.clearTimeout(moodTimer);
        root.classList.remove(...moods);
        if (!mood) return;
        root.classList.add(mood);
        if (duration) moodTimer = window.setTimeout(() => root.classList.remove(mood), duration);
    }

    function say(text, mood, duration = 4200) {
        if (!isEnabled()) return;
        window.clearTimeout(bubbleTimer);
        bubble.textContent = text;
        bubble.hidden = false;
        root.classList.add("is-talking");
        setMood(mood, Math.min(duration, 3000));
        bubbleTimer = window.setTimeout(() => {
            bubble.hidden = true;
            root.classList.remove("is-talking");
        }, duration);
    }

    function greeting() {
        const hour = new Date().getHours();
        const name = userName ? `, ${userName}` : "";
        if (hour < 12) return `¡Buenos días${name}! ¿Listos para un gran día?`;
        if (hour < 19) return `¡Buenas tardes${name}! Vamos con todo`;
        return `¡Buenas noches${name}! Ya casi terminamos`;
    }

    function applyVisibility() {
        const enabled = isEnabled();
        root.classList.toggle("is-hidden-by-user", !enabled);
        if (toggle) toggle.checked = enabled;
        if (!enabled) {
            bubble.hidden = true;
            setMood(null);
        }
    }

    // Dormir tras 5 minutos sin actividad; cualquier interacción lo despierta.
    function resetSleep() {
        window.clearTimeout(sleepTimer);
        if (root.classList.contains("is-sleeping")) {
            root.classList.remove("is-sleeping");
            say(pick(phrases.wake), "is-waving");
        }
        sleepTimer = window.setTimeout(() => {
            bubble.hidden = true;
            root.classList.remove("is-talking");
            setMood("is-sleeping", 0);
        }, sleepAfter);
    }
    ["pointerdown", "keydown"].forEach((type) => document.addEventListener(type, resetSleep, {passive: true}));

    // Los ojos siguen al puntero (sólo en dispositivos con mouse).
    if (window.matchMedia("(pointer: fine)").matches) {
        let frame = 0;
        document.addEventListener("pointermove", (event) => {
            if (frame) return;
            frame = window.requestAnimationFrame(() => {
                frame = 0;
                const pupils = root.querySelector("[data-lachi-pupils]");
                if (!pupils) return;
                const box = button.getBoundingClientRect();
                const dx = event.clientX - (box.left + box.width / 2);
                const dy = event.clientY - (box.top + box.height * 0.3);
                const distance = Math.hypot(dx, dy) || 1;
                const reach = Math.min(distance / 120, 1) * 3.2;
                pupils.setAttribute("transform", `translate(${(dx / distance) * reach} ${(dy / distance) * reach})`);
            });
        }, {passive: true});
    }

    button.addEventListener("click", () => {
        resetSleep();
        say(pick(phrases.poke), pick(["is-waving", "is-celebrating"]));
    });

    toggle?.addEventListener("change", () => {
        write(localStorage, visibleKey, toggle.checked ? "on" : "off");
        applyVisibility();
        if (toggle.checked) say("¡Aquí estoy de nuevo!", "is-waving");
    });

    // Cambio de look: se guarda en el perfil del usuario y se cambia el dibujo sin recargar.
    lookChoices.forEach((choice) => choice.addEventListener("change", async () => {
        if (!choice.checked) return;
        const body = new FormData();
        body.append("look", choice.value);
        body.append("csrfmiddlewaretoken", document.querySelector(".lachi-look-options [name=csrfmiddlewaretoken]")?.value || "");
        try {
            const response = await fetch(root.dataset.lachiLookUrl, {method: "POST", body, headers: {"X-Requested-With": "XMLHttpRequest"}});
            const data = await response.json();
            if (!response.ok || !data.ok) throw new Error(data.error);
            button.innerHTML = data.html;
            root.classList.remove(`lachi-look-${root.dataset.lachiLook}`);
            root.dataset.lachiLook = data.look;
            root.classList.add(`lachi-look-${data.look}`);
            say("¡Mira mi nuevo look!", "is-celebrating");
        } catch (_) {
            say("No pude cambiarme de ropa, intenta otra vez", "is-worried");
        }
    }));

    // Eventos de la app --------------------------------------------------------------
    document.addEventListener("order-status-changed", (event) => {
        const status = event.detail?.status;
        if (status === "completed") say(pick(phrases.completed), "is-celebrating");
        else if (status === "canceled") say(pick(phrases.canceled), "is-worried");
    });
    document.addEventListener("app-error", () => say(pick(phrases.error), "is-worried"));

    const knownOrders = () => new Set([...document.querySelectorAll(".order-row[data-order-id]")].map((row) => row.dataset.orderId));
    let seenOrders = knownOrders();
    document.addEventListener("orders-live-updated", () => {
        const current = knownOrders();
        const arrived = [...current].some((id) => !seenOrders.has(id) && Number(id) > Math.max(0, ...[...seenOrders].map(Number)));
        seenOrders = current;
        if (arrived) say(pick(phrases.newOrder), "is-alert");
    });

    applyVisibility();
    resetSleep();

    // Al cargar: error, pedido creado o saludo (una vez por día y usuario).
    window.setTimeout(() => {
        if (document.querySelector("[data-error-notification]")) {
            say(pick(phrases.error), "is-worried");
        } else if (document.querySelector("[data-success-feedback]")) {
            say(pick(phrases.created), "is-celebrating");
        } else {
            const today = `${new Date().toDateString()}|${userName}`;
            if (read(localStorage, greetingKey) !== today) {
                write(localStorage, greetingKey, today);
                say(greeting(), "is-waving", 5000);
            }
        }
    }, 700);
})();
