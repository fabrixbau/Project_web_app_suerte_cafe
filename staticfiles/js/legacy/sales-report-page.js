const period = document.querySelector("#id_period");
const customDates = document.querySelector("#custom-dates");
function updateCustomDates() {
  customDates.hidden = period.value !== "custom";
}
period.addEventListener("change", updateCustomDates);
updateCustomDates();
