(() => {
    const statusClasses = ["status-in_progress", "status-completed", "status-canceled"];

    function showError(message) {
        const container = document.createElement("div");
        container.className = "app-notifications";
        container.innerHTML = `<article class="app-notification notification-error"><div class="notification-content"><strong>No se pudo cambiar el estado</strong><p class="notification-message"></p></div><div class="notification-actions"><button type="button" data-close-notification aria-label="Cerrar notificación">×</button></div></article>`;
        container.querySelector(".notification-message").textContent = message;
        container.querySelector("[data-close-notification]").addEventListener("click", () => container.remove());
        document.body.appendChild(container);
        document.body.classList.add("feedback-frame-error");
        window.setTimeout(() => document.body.classList.remove("feedback-frame-error"), 1500);
    }

    document.querySelectorAll(".status-update-form").forEach((form) => {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const button = form.querySelector(".status-cycle-button");
            if (button.disabled) return;

            button.disabled = true;
            button.classList.add("is-saving");
            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    body: new FormData(form),
                    headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json" },
                });
                let data;
                try {
                    data = await response.json();
                } catch {
                    throw new Error("El servidor no pudo procesar el cambio. Recarga e intenta nuevamente.");
                }
                if (!response.ok || !data.ok) throw new Error(data.error || "Intenta nuevamente.");

                button.classList.remove(...statusClasses);
                button.classList.add(`status-${data.status}`);
                button.replaceChildren(document.createTextNode(`${data.status_label} `));
                const arrow = document.createElement("span");
                arrow.setAttribute("aria-hidden", "true");
                arrow.textContent = "→";
                button.appendChild(arrow);
            } catch (error) {
                showError(error.message || "No fue posible actualizar el pedido.");
            } finally {
                button.disabled = false;
                button.classList.remove("is-saving");
            }
        });
    });
})();
