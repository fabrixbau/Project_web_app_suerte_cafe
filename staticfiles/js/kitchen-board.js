(() => {
    const board = document.querySelector("#kitchen-board");
    if (!board) return;
    const hiddenDialog = document.querySelector("#kitchen-hidden-dialog");
    const hiddenDialogList = hiddenDialog?.querySelector("[data-hidden-dialog-list]");
    const hiddenDialogContext = hiddenDialog?.querySelector("[data-hidden-dialog-context]");
    const storageKey = "suerte-cafe:kitchen-hidden-items:v1";
    const pendingDeadlines = new Map();
    const pendingTimers = new Map();
    let activeHiddenTicketKey = null;
    let busy = false;

    function loadHiddenItems() {
        try {
            const saved = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
            const recentLimit = Date.now() - (7 * 24 * 60 * 60 * 1000);
            return new Map(Object.entries(saved).filter(([, hiddenAt]) => Number(hiddenAt) >= recentLimit));
        } catch (_) {
            return new Map();
        }
    }

    const hiddenItems = loadHiddenItems();

    function saveHiddenItems() {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(hiddenItems)));
        } catch (_) { /* La vista sigue funcionando durante esta sesiÃ³n. */ }
    }

    function hiddenRowsForTicket(ticketKey) {
        const ticket = board.querySelector(`[data-kitchen-ticket][data-ticket-key="${CSS.escape(ticketKey)}"]`);
        if (!ticket) return [];
        return [...ticket.querySelectorAll("[data-kitchen-item-key]")]
            .filter((row) => hiddenItems.has(row.dataset.kitchenItemKey));
    }

    function renderHiddenDialog() {
        if (!hiddenDialog?.open || !hiddenDialogList || !activeHiddenTicketKey) return;
        const ticket = board.querySelector(`[data-kitchen-ticket][data-ticket-key="${CSS.escape(activeHiddenTicketKey)}"]`);
        const rows = hiddenRowsForTicket(activeHiddenTicketKey);
        hiddenDialogList.innerHTML = "";
        if (!ticket || !rows.length) {
            hiddenDialog.close();
            activeHiddenTicketKey = null;
            return;
        }
        hiddenDialogContext.textContent = `${ticket.dataset.ticketLabel} · ${ticket.dataset.stationLabel}`;
        rows.forEach((row) => {
            const restoredRow = document.createElement("article");
            restoredRow.className = "kitchen-hidden-row";
            restoredRow.dataset.restoreItemKey = row.dataset.kitchenItemKey;
            const quantity = row.querySelector(":scope > b").cloneNode(true);
            const information = row.querySelector(":scope > div").cloneNode(true);
            const restoreButton = document.createElement("button");
            restoreButton.type = "button";
            restoreButton.className = "kitchen-item-restore";
            restoreButton.dataset.restoreKitchenItem = row.dataset.kitchenItemKey;
            restoreButton.setAttribute("aria-label", "Regresar este producto a la comanda");
            restoreButton.title = "Regresar a la comanda";
            const restoreIcon = document.createElement("span");
            restoreIcon.setAttribute("aria-hidden", "true");
            restoreIcon.textContent = "↩";
            restoreButton.appendChild(restoreIcon);
            restoredRow.append(quantity, information, restoreButton);
            hiddenDialogList.appendChild(restoredRow);
        });
    }

    function applyItemVisibility() {
        board.querySelectorAll("[data-kitchen-item-key]").forEach((row) => {
            const key = row.dataset.kitchenItemKey;
            const hidden = hiddenItems.has(key);
            row.hidden = hidden;
            const check = row.querySelector("[data-kitchen-item-check]");
            const counting = pendingDeadlines.has(key);
            check?.classList.toggle("is-counting", counting);
            check?.setAttribute("aria-pressed", counting ? "true" : "false");
        });
        board.querySelectorAll("[data-kitchen-ticket]").forEach((ticket) => {
            const count = hiddenRowsForTicket(ticket.dataset.ticketKey).length;
            const button = ticket.querySelector("[data-hidden-items-open]");
            if (!button) return;
            button.classList.toggle("has-hidden-items", count > 0);
            button.querySelector("[data-hidden-count]").textContent = count;
            button.setAttribute("aria-label", count
                ? `Ver ${count} producto${count === 1 ? "" : "s"} oculto${count === 1 ? "" : "s"}`
                : "No hay productos ocultos");
        });
        renderHiddenDialog();
    }

    function cancelPendingHide(key) {
        window.clearTimeout(pendingTimers.get(key));
        pendingTimers.delete(key);
        pendingDeadlines.delete(key);
        applyItemVisibility();
    }

    function finishPendingHide(key) {
        pendingTimers.delete(key);
        pendingDeadlines.delete(key);
        hiddenItems.set(key, Date.now());
        saveHiddenItems();
        applyItemVisibility();
    }

    function startPendingHide(key) {
        pendingDeadlines.set(key, Date.now() + 7000);
        pendingTimers.set(key, window.setTimeout(() => finishPendingHide(key), 7000));
        applyItemVisibility();
    }

    function csrfToken() {
        return document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith("csrftoken="))?.split("=").slice(1).join("=") || "";
    }

    async function refreshBoard() {
        if (busy || document.hidden) return;
        try {
            const filter = new URLSearchParams(window.location.search).get("filter") || "two_players";
            const response = await fetch(`${board.dataset.liveUrl}?filter=${encodeURIComponent(filter)}`, {headers: {"X-Requested-With": "XMLHttpRequest"}});
            if (!response.ok) return;
            const payload = await response.json();
            if (payload.html !== board.innerHTML) {
                board.innerHTML = payload.html;
                applyItemVisibility();
            }
        } catch (_) { /* El siguiente ciclo vuelve a intentarlo. */ }
    }

    board.addEventListener("click", async (event) => {
        const checkButton = event.target.closest("[data-kitchen-item-check]");
        if (checkButton) {
            const key = checkButton.closest("[data-kitchen-item-key]")?.dataset.kitchenItemKey;
            if (!key) return;
            if (pendingDeadlines.has(key)) cancelPendingHide(key);
            else startPendingHide(key);
            return;
        }

        const hiddenListButton = event.target.closest("[data-hidden-items-open]");
        if (hiddenListButton) {
            const ticket = hiddenListButton.closest("[data-kitchen-ticket]");
            if (!ticket || !hiddenRowsForTicket(ticket.dataset.ticketKey).length || !hiddenDialog) return;
            activeHiddenTicketKey = ticket.dataset.ticketKey;
            hiddenDialog.showModal();
            renderHiddenDialog();
            return;
        }

        const button = event.target.closest("[data-bar-status-url]");
        if (!button || busy) return;
        busy = true;
        button.disabled = true;
        button.textContent = "Actualizando…";
        try {
            const response = await fetch(button.dataset.barStatusUrl, {
                method: "POST",
                headers: {"Content-Type": "application/json", "X-CSRFToken": decodeURIComponent(csrfToken()), "X-Requested-With": "XMLHttpRequest"},
                body: JSON.stringify({bar: button.dataset.station, status: button.dataset.nextStatus}),
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) throw new Error(payload.error || "No fue posible actualizar la barra.");
            busy = false;
            await refreshBoard();
        } catch (error) {
            button.disabled = false;
            button.textContent = "Intentar nuevamente";
            button.closest("[data-kitchen-ticket]")?.classList.add("has-error");
        } finally {
            busy = false;
        }
    });

    hiddenDialog?.querySelector("[data-hidden-dialog-close]")?.addEventListener("click", () => hiddenDialog.close());
    hiddenDialog?.addEventListener("click", (event) => {
        if (event.target === hiddenDialog) hiddenDialog.close();
    });
    hiddenDialogList?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-restore-kitchen-item]");
        if (!button) return;
        button.classList.add("is-restoring");
        button.disabled = true;
        window.setTimeout(() => {
            hiddenItems.delete(button.dataset.restoreKitchenItem);
            saveHiddenItems();
            applyItemVisibility();
        }, 160);
    });
    hiddenDialog?.addEventListener("close", () => { activeHiddenTicketKey = null; });

    applyItemVisibility();
    window.setInterval(refreshBoard, 2000);
})();
