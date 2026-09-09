const orderType = document.querySelector("#id_order_type"),
  typeButtons = document.querySelectorAll(".order-type-option"),
  phone = document.querySelector("#phone-fields"),
  eatIn = document.querySelector("#eat-in-fields"),
  delivery = document.querySelector("#delivery-fields");
function refreshFields() {
  const value = orderType.value || "eat_in";
  eatIn.hidden = value !== "eat_in";
  delivery.hidden = value !== "delivery";
  phone.hidden = !["delivery", "pickup"].includes(value);
  typeButtons.forEach(button => button.classList.toggle("is-selected", button.dataset.orderType === value));
}
typeButtons.forEach(button => button.addEventListener("click", () => {
  orderType.value = button.dataset.orderType;
  refreshFields();
}));
refreshFields();
const categoryButtons = document.querySelectorAll(".category-card"),
  categorySections = document.querySelectorAll(".category-products");
categoryButtons.forEach(button => button.addEventListener("click", () => {
  categoryButtons.forEach(item => item.classList.remove("is-selected"));
  categorySections.forEach(section => section.hidden = true);
  button.classList.add("is-selected");
  document.querySelector(`#${button.dataset.categoryTarget}`).hidden = false;
}));
const cards = document.querySelectorAll(".editable-order-product"),
  summary = document.querySelector("#current-order-items"),
  totalItems = document.querySelector("#total-items"),
  summaryItems = document.querySelector("#summary-items"),
  orderTotal = document.querySelector("#order-total"),
  currency = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    currencyDisplay: "symbol"
  });
function change(input, amount) {
  input.value = Math.max(0, (Number.parseInt(input.value, 10) || 0) + amount);
  refreshSummary();
}
function refreshSummary() {
  summary.innerHTML = "";
  const combined = new Map();
  let count = 0,
    total = 0;
  cards.forEach(card => {
    const input = card.querySelector(".quantity-input"),
      quantity = Number.parseInt(input.value, 10) || 0,
      price = Number.parseFloat(card.dataset.price),
      key = `${card.dataset.name}|${price}`;
    card.classList.toggle("has-quantity", quantity > 0);
    if (quantity > 0) {
      const previous = combined.get(key) || {
        name: card.dataset.name,
        price,
        quantity: 0
      };
      previous.quantity += quantity;
      combined.set(key, previous);
      count += quantity;
      total += price * quantity;
    }
  });
  combined.forEach(item => {
    const row = document.createElement("article"),
      subtotal = item.price * item.quantity;
    row.className = "current-order-item";
    row.innerHTML = "<div><strong></strong><span></span></div><strong></strong>";
    row.querySelector("div strong").textContent = item.name;
    row.querySelector("span").textContent = `${currency.format(item.price)} × ${item.quantity}`;
    row.querySelector(":scope > strong").textContent = currency.format(subtotal);
    summary.appendChild(row);
  });
  if (!count) summary.innerHTML = "<p>No hay productos seleccionados.</p>";
  totalItems.textContent = count;
  summaryItems.textContent = count;
  orderTotal.textContent = currency.format(total);
  document.dispatchEvent(new CustomEvent("base-order-summary-rendered", {
    detail: {
      count,
      total
    }
  }));
}
cards.forEach(card => {
  const input = card.querySelector(".quantity-input");
  card.querySelector(".decrease-quantity").addEventListener("click", () => change(input, -1));
  card.querySelector(".increase-quantity").addEventListener("click", () => change(input, 1));
  const removeButton = card.querySelector(".remove-order-product");
  if (removeButton) removeButton.addEventListener("click", () => {
    input.value = 0;
    refreshSummary();
  });
  input.addEventListener("input", () => {
    if ((Number.parseInt(input.value, 10) || 0) < 0) input.value = 0;
    refreshSummary();
  });
});
window.refreshBaseOrderSummary = refreshSummary;
refreshSummary();
