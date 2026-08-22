(() => {
    const modal = document.querySelector("#order-detail-modal");
    if (!modal) return;

    const content = modal.querySelector("[data-order-detail-content]");
    const title = modal.querySelector("#order-detail-modal-title");
    const loadingMarkup = '<div class="order-detail-loading"><span></span><p>Cargando pedido…</p></div>';
    let activeRequest = null;

    function closeModal() {
        if (activeRequest) activeRequest.abort();
        if (modal.open) modal.close();
    }

    async function openDetail(link) {
        if (activeRequest) activeRequest.abort();
        activeRequest = new AbortController();
        title.textContent = `Pedido ${link.textContent.trim()}`;
        content.innerHTML = loadingMarkup;
        modal.showModal();

        try {
            const response = await fetch(link.href, {
                headers: { "X-Requested-With": "XMLHttpRequest" },
                signal: activeRequest.signal,
            });
            if (!response.ok) throw new Error("No fue posible cargar el pedido.");

            const documentResponse = new DOMParser().parseFromString(await response.text(), "text/html");
            const detail = documentResponse.querySelector(".order-detail-layout");
            if (!detail) throw new Error("El detalle recibido no es válido.");
            content.replaceChildren(detail);
        } catch (error) {
            if (error.name === "AbortError") return;
            content.innerHTML = "";
            const message = document.createElement("div");
            message.className = "order-detail-load-error";
            message.innerHTML = "<strong>No pudimos abrir el pedido</strong><p></p>";
            message.querySelector("p").textContent = error.message;
            content.appendChild(message);
        } finally {
            activeRequest = null;
        }
    }

    document.addEventListener("click", (event) => {
        const trigger = event.target.closest(".order-detail-trigger");
        if (trigger) {
            event.preventDefault();
            openDetail(trigger);
            return;
        }
        if (event.target.closest("[data-close-order-detail]")) closeModal();
        const row = event.target.closest(".order-row[data-detail-url]");
        if (row && !event.target.closest("button, form, input, select, textarea, a")) {
            openDetail({ href: row.dataset.detailUrl, textContent: row.querySelector(".order-detail-trigger")?.textContent || "" });
        }
    });

    document.addEventListener("keydown", (event) => {
        const row = event.target.closest?.(".order-row[data-detail-url]");
        if (row && ["Enter", " "].includes(event.key)) {
            event.preventDefault();
            openDetail({ href: row.dataset.detailUrl, textContent: row.querySelector(".order-detail-trigger")?.textContent || "" });
        }
    });

    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeModal();
    });
})();
