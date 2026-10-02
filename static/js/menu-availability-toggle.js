(() => {
    const forms = document.querySelectorAll(".menu-product-table form[action*='/availability/']");

    forms.forEach((form) => {
        const button = form.querySelector(".availability-toggle");
        const label = form.querySelector(".availability-label");
        if (!button || !label || !window.fetch) return;

        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            if (button.disabled) return;

            button.disabled = true;
            button.setAttribute("aria-busy", "true");

            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    body: new FormData(form),
                    credentials: "same-origin",
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                });
                if (!response.ok) throw new Error("No fue posible actualizar la disponibilidad.");

                const data = await response.json();
                button.classList.toggle("is-available", data.is_available);
                button.classList.toggle("is-unavailable", !data.is_available);
                label.textContent = data.label;
                button.setAttribute("aria-label", data.label);
            } catch (error) {
                button.classList.add("has-update-error");
                window.setTimeout(() => button.classList.remove("has-update-error"), 1400);
            } finally {
                button.disabled = false;
                button.removeAttribute("aria-busy");
            }
        });
    });
})();
