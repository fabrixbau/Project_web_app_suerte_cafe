(() => {
    const enhanced = [];

    function closeAll(except = null) {
        enhanced.forEach(({ root, list, trigger }) => {
            if (root === except) return;
            list.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
            root.classList.remove("is-open");
        });
    }

    document.querySelectorAll(".modern-select-form select").forEach((select, index) => {
        const shell = select.closest(".modern-input-shell");
        shell?.classList.add("has-app-select");
        select.classList.add("native-enhanced-select");
        select.removeAttribute("required");
        select.tabIndex = -1;
        select.style.display = "none";

        const root = document.createElement("div");
        root.className = "app-select";
        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "app-select-trigger";
        trigger.setAttribute("aria-haspopup", "listbox");
        trigger.setAttribute("aria-expanded", "false");
        const value = document.createElement("span");
        value.className = "app-select-value";
        const marker = document.createElement("span");
        marker.className = "app-select-marker";
        marker.setAttribute("aria-hidden", "true");
        trigger.append(value, marker);

        const list = document.createElement("div");
        list.className = "app-select-options";
        list.id = `app-select-options-${index}`;
        list.setAttribute("role", "listbox");
        list.hidden = true;
        trigger.setAttribute("aria-controls", list.id);

        function syncValue() {
            const selectedOption = select.options[select.selectedIndex];
            value.textContent = selectedOption?.textContent.trim() || "Selecciona una opción";
            list.querySelectorAll(".app-select-option").forEach((button) => {
                const selected = button.dataset.value === select.value;
                button.classList.toggle("is-selected", selected);
                button.setAttribute("aria-selected", selected ? "true" : "false");
            });
        }

        [...select.options].forEach((option) => {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "app-select-option";
            item.dataset.value = option.value;
            item.setAttribute("role", "option");
            item.textContent = option.textContent.trim();
            item.disabled = option.disabled;
            item.addEventListener("click", () => {
                select.value = option.value;
                select.dispatchEvent(new Event("change", { bubbles: true }));
                syncValue();
                closeAll();
                trigger.focus();
            });
            list.appendChild(item);
        });

        trigger.addEventListener("click", () => {
            const willOpen = list.hidden;
            closeAll(root);
            list.hidden = !willOpen;
            trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
            root.classList.toggle("is-open", willOpen);
            if (willOpen) list.querySelector(".is-selected")?.scrollIntoView({ block: "nearest" });
        });
        trigger.addEventListener("keydown", (event) => {
            if (["ArrowDown", "ArrowUp"].includes(event.key)) {
                event.preventDefault();
                if (list.hidden) trigger.click();
                const options = [...list.querySelectorAll(".app-select-option:not(:disabled)")];
                const current = options.findIndex((item) => item.classList.contains("is-selected"));
                const next = event.key === "ArrowDown" ? Math.min(options.length - 1, current + 1) : Math.max(0, current - 1);
                options[next]?.focus();
            }
        });

        select.parentNode.insertBefore(root, select);
        root.append(select, trigger, list);
        enhanced.push({ root, list, trigger });
        syncValue();
    });

    document.addEventListener("click", (event) => {
        if (!event.target.closest(".app-select")) closeAll();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeAll();
    });
})();
