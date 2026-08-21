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
