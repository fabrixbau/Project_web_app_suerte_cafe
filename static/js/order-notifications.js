(() => {
  const badges = document.querySelectorAll("[data-order-notification-count]");
  const ordersLink = document.querySelector("[data-order-notifications-url]");
  if (!badges.length || !ordersLink || !window.fetch) return;

  window.updateOrderNotificationCount = (count) => {
    const value = Number(count) || 0;
    badges.forEach((badge) => {
      badge.textContent = value;
      badge.classList.toggle("is-hidden", value === 0);
      badge.setAttribute("aria-label", `${value} pedido${value === 1 ? "" : "s"} por atender`);
    });
    document.querySelectorAll("[data-order-notification-summary]").forEach((summary) => {
      summary.classList.toggle("is-hidden", value === 0);
    });
    document.querySelectorAll("[data-order-notification-label]").forEach((label) => {
      label.textContent = `${value} pedido${value === 1 ? "" : "s"} por atender`;
    });
  };

  async function refresh() {
    if (document.hidden) return;
    try {
      const response = await fetch(ordersLink.dataset.orderNotificationsUrl, {
        credentials: "same-origin",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      if (response.ok) window.updateOrderNotificationCount((await response.json()).count);
    } catch (_) {
      // La aplicación sigue usable aunque una actualización breve falle.
    }
  }

  refresh();
  window.setInterval(refresh, 4000);
})();
