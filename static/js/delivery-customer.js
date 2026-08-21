(() => {
    const container = document.querySelector("[data-delivery-customer-lookup]");
    const nameInput = document.querySelector("#id_customer_name");
    const orderType = document.querySelector("#id_order_type");
    const status = container?.querySelector(".customer-lookup-status");
    if (!container || !nameInput || !orderType) return;

    const fields = {
        phone: document.querySelector("#id_phone"),
        street: document.querySelector("#id_street"),
        exterior_number: document.querySelector("#id_exterior_number"),
        interior_number: document.querySelector("#id_interior_number"),
        neighborhood: document.querySelector("#id_neighborhood"),
        notes: document.querySelector("#id_notes"),
    };
    let timer;
    let requestNumber = 0;
    let lastAutofilled = null;

    function clearPreviousAutofill() {
        if (!lastAutofilled) return;
        Object.entries(fields).forEach(([key, field]) => {
            if (field && field.value === (lastAutofilled[key] || "")) field.value = "";
        });
        lastAutofilled = null;
    }

    async function findCustomer() {
        if (!["delivery", "pickup"].includes(orderType.value) || !nameInput.value.trim()) {
            status.textContent = "";
            return;
        }

        const currentRequest = ++requestNumber;
        const url = new URL(container.dataset.deliveryCustomerLookup, window.location.origin);
        url.searchParams.set("name", nameInput.value.trim());

        try {
            const response = await fetch(url, { headers: { Accept: "application/json" } });
            if (!response.ok || currentRequest !== requestNumber) return;
            const data = await response.json();
            if (!data.found) {
                status.textContent = "Cliente nuevo";
                status.className = "customer-lookup-status is-new";
                return;
            }

            clearPreviousAutofill();
            const reusableFields = orderType.value === "pickup"
                ? { phone: fields.phone }
                : fields;
            Object.entries(reusableFields).forEach(([key, field]) => {
                if (field) field.value = data.customer[key] || "";
            });
            lastAutofilled = Object.fromEntries(
                Object.keys(reusableFields).map((key) => [key, data.customer[key] || ""]),
            );
            status.textContent = "Datos anteriores recuperados";
            status.className = "customer-lookup-status is-found";
        } catch {
            status.textContent = "No fue posible consultar los datos guardados";
            status.className = "customer-lookup-status is-error";
        }
    }

    nameInput.addEventListener("input", () => {
        window.clearTimeout(timer);
        if (lastAutofilled) clearPreviousAutofill();
        status.textContent = "";
        timer = window.setTimeout(findCustomer, 450);
    });
    nameInput.addEventListener("blur", () => {
        window.clearTimeout(timer);
        findCustomer();
    });
    document.querySelectorAll(".order-type-option").forEach((button) => {
        button.addEventListener("click", () => {
            window.clearTimeout(timer);
            status.textContent = "";
            window.setTimeout(findCustomer, 0);
        });
    });
})();
