(() => {
    const board = document.querySelector("#kitchen-board");
    if (!board) return;
    let busy = false;

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
            if (payload.html !== board.innerHTML) board.innerHTML = payload.html;
        } catch (_) { /* El siguiente ciclo vuelve a intentarlo. */ }
    }

    board.addEventListener("click", async (event) => {
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

    window.setInterval(refreshBoard, 4000);
})();
