(() => {
    const notifications = document.querySelectorAll(".app-notification");

    notifications.forEach((notification) => {
        const closeButton = notification.querySelector("[data-close-notification]");
        const copyButton = notification.querySelector("[data-copy-notification]");
        const message = notification.querySelector(".notification-message");

        closeButton?.addEventListener("click", () => {
            notification.remove();
        });

        copyButton?.addEventListener("click", async () => {
            const text = message?.innerText.trim() || "";
            try {
                await navigator.clipboard.writeText(text);
                copyButton.textContent = "Copiado";
            } catch {
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(message);
                selection.removeAllRanges();
                selection.addRange(range);
                copyButton.textContent = "Texto seleccionado";
            }
        });
    });

    document.querySelectorAll("[data-order-created-toast]").forEach((toast) => {
        const lifetime = 4000;
        let remaining = lifetime;
        let startedAt = performance.now();
        let dismissTimer;
        let isRunning = false;

        const dismiss = () => {
            if (toast.classList.contains("is-leaving")) return;
            isRunning = false;
            toast.classList.add("is-leaving");
            toast.addEventListener("animationend", (event) => {
                if (event.animationName === "notification-leave") toast.remove();
            });
        };
        const startTimer = () => {
            if (isRunning || toast.classList.contains("is-leaving")) return;
            isRunning = true;
            startedAt = performance.now();
            dismissTimer = window.setTimeout(dismiss, remaining);
            toast.classList.remove("is-paused");
        };
        const pauseTimer = () => {
            if (!isRunning) return;
            window.clearTimeout(dismissTimer);
            remaining = Math.max(0, remaining - (performance.now() - startedAt));
            isRunning = false;
            toast.classList.add("is-paused");
        };

        toast.addEventListener("pointerenter", pauseTimer);
        toast.addEventListener("pointerleave", startTimer);
        toast.addEventListener("focus", pauseTimer);
        toast.addEventListener("blur", startTimer);
        startTimer();
    });

    const feedbackType = document.querySelector("[data-error-notification]")
        ? "error"
        : document.querySelector("[data-success-feedback]")
          ? "success"
          : null;

    if (feedbackType) {
        const className = `feedback-frame-${feedbackType}`;
        const duration = feedbackType === "success" ? 1000 : 1500;
        document.body.classList.add(className);
        window.setTimeout(() => document.body.classList.remove(className), duration);
    }
})();
