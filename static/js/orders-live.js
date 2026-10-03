(() => {
    const body = document.querySelector("#orders-table-body");
    if (!body) return;
    
    // Only run on the orders list page (/orders/ or /orders/?filter=...)
    // NOT on detail pages (/orders/123/), kitchen (/orders/kitchen/), or create (/orders/new/)
    const path = window.location.pathname;
    if (path !== '/orders/' && !path.startsWith('/orders/?')) {
        return;
    }
    
    function comparableHtml(html) {
        const template = document.createElement("template");
        template.innerHTML = html;
        // Django masks the CSRF token differently on every response. It does
        // not mean the orders changed and must not cause a full table redraw.
        template.content.querySelectorAll('input[name="csrfmiddlewaretoken"]').forEach((input) => input.remove());
        return template.innerHTML;
    }

    let currentHtml = body.innerHTML;
    let currentComparableHtml = comparableHtml(currentHtml);
    let busy = false;
    async function refreshOrders() {
        if (busy || document.hidden) return;
        busy = true;
        try {
            const response = await fetch(`${body.dataset.liveOrdersUrl}${window.location.search}`, {headers: {"X-Requested-With": "XMLHttpRequest"}});
            if (!response.ok) return;
            const payload = await response.json();
            const nextComparableHtml = comparableHtml(payload.html);
            if (nextComparableHtml !== currentComparableHtml) {
                body.innerHTML = payload.html;
                currentHtml = payload.html;
                currentComparableHtml = nextComparableHtml;
                document.dispatchEvent(new CustomEvent("orders-live-updated"));
            }
        } catch (_) {
            document.querySelector(".live-orders-indicator")?.classList.add("is-offline");
        } finally { busy = false; }
    }
    window.setInterval(refreshOrders, 4000);
})();
