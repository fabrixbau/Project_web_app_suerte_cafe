const orderType = document.querySelector("#id_order_type");
const orderTypeButtons = document.querySelectorAll(".order-type-option");
const phoneFields = document.querySelector("#phone-fields");
const eatInFields = document.querySelector("#eat-in-fields");
const deliveryFields = document.querySelector("#delivery-fields");
function updateCustomerFields() {
  const selectedType = orderType.value || "eat_in";
  orderType.value = selectedType;
  eatInFields.hidden = selectedType !== "eat_in";
  deliveryFields.hidden = selectedType !== "delivery";
  phoneFields.hidden = !["delivery", "pickup"].includes(selectedType);
  orderTypeButtons.forEach(button => {
    button.classList.toggle("is-selected", button.dataset.orderType === selectedType);
  });
}
orderTypeButtons.forEach(button => {
  button.addEventListener("click", () => {
    orderType.value = button.dataset.orderType;
    updateCustomerFields();
  });
});
updateCustomerFields();
const categoryButtons = document.querySelectorAll(".category-card");
const categorySections = document.querySelectorAll(".category-products");
categoryButtons.forEach(button => {
  button.addEventListener("click", () => {
    categoryButtons.forEach(item => item.classList.remove("is-selected"));
    categorySections.forEach(section => section.hidden = true);
    button.classList.add("is-selected");
    document.querySelector(`#${button.dataset.categoryTarget}`).hidden = false;
  });
});
const productCards = document.querySelectorAll(".product-card[data-price]");
const currentOrderItems = document.querySelector("#current-order-items");
const totalItemsElement = document.querySelector("#total-items");
const summaryItemsElement = document.querySelector("#summary-items");
const subtotalElement = document.querySelector("#order-subtotal");
const totalElement = document.querySelector("#order-total");
const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  currencyDisplay: "symbol"
});
function changeQuantity(input, difference) {
  const currentValue = Number.parseInt(input.value, 10) || 0;
  input.value = Math.max(0, currentValue + difference);
  updateOrderSummary();
  document.dispatchEvent(new CustomEvent("order-menu-focus"));
}
function createSummaryItem(card, input, quantity, subtotal) {
  const item = document.createElement("article");
  item.className = `current-order-item${card.dataset.hasOptions === "true" ? " is-editable" : ""}`;
  const information = document.createElement("div");
  const name = document.createElement("strong");
  const detail = document.createElement("span");
  name.textContent = card.dataset.name;
  detail.textContent = `${currencyFormatter.format(Number.parseFloat(card.dataset.price))} × ${quantity}`;
  information.append(name, detail);
  const controls = document.createElement("div");
  controls.className = "summary-quantity-control";
  const decrease = document.createElement("button");
  const amount = document.createElement("span");
  const increase = document.createElement("button");
  decrease.type = "button";
  increase.type = "button";
  decrease.textContent = "−";
  increase.textContent = "+";
  amount.textContent = quantity;
  decrease.addEventListener("click", () => changeQuantity(input, -1));
  increase.addEventListener("click", () => changeQuantity(input, 1));
  controls.append(decrease, amount, increase);
  const price = document.createElement("strong");
  price.textContent = currencyFormatter.format(subtotal);
  item.append(information, controls, price);
  if (card.dataset.hasOptions === "true") {
    item.title = "Editar o personalizar este producto";
    item.addEventListener("click", event => {
      if (event.target.closest("button, input")) return;
      document.dispatchEvent(new CustomEvent("edit-order-item", {
        detail: {
          productId: card.dataset.productId,
          quantity,
          standardInput: input
        }
      }));
    });
  }
  return item;
}
function updateOrderSummary() {
  currentOrderItems.innerHTML = "";
  let totalItems = 0;
  let orderTotal = 0;
  productCards.forEach(card => {
    const input = card.querySelector(".quantity-input");
    const quantity = Number.parseInt(input.value, 10) || 0;
    const price = Number.parseFloat(card.dataset.price);
    card.classList.toggle("has-quantity", quantity > 0);
    if (quantity > 0) {
      const subtotal = price * quantity;
      currentOrderItems.appendChild(createSummaryItem(card, input, quantity, subtotal));
      totalItems += quantity;
      orderTotal += subtotal;
    }
  });
  if (totalItems === 0) {
    currentOrderItems.innerHTML = "<p>No hay productos seleccionados.</p>";
  }
  totalItemsElement.textContent = totalItems;
  summaryItemsElement.textContent = totalItems;
  subtotalElement.textContent = currencyFormatter.format(orderTotal);
  subtotalElement.dataset.subtotal = orderTotal;
  totalElement.textContent = currencyFormatter.format(orderTotal);
  document.dispatchEvent(new CustomEvent("base-order-summary-rendered", {
    detail: {
      count: totalItems,
      total: orderTotal
    }
  }));
}
productCards.forEach(card => {
  const input = card.querySelector(".quantity-input");
  card.querySelector(".decrease-quantity").addEventListener("click", () => changeQuantity(input, -1));
  card.querySelector(".increase-quantity").addEventListener("click", () => changeQuantity(input, 1));
  input.addEventListener("input", () => {
    if ((Number.parseInt(input.value, 10) || 0) < 0) input.value = 0;
    updateOrderSummary();
  });
  card.addEventListener("click", event => {
    if (event.target.closest("button, input, a")) return;
    changeQuantity(input, 1);
    card.classList.remove("was-added");
    window.requestAnimationFrame(() => card.classList.add("was-added"));
    window.setTimeout(() => card.classList.remove("was-added"), 280);
  });
});
window.refreshBaseOrderSummary = updateOrderSummary;
updateOrderSummary();
