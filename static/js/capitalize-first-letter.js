(() => {
  const isEligible = (field) => {
    if (!field || field.dataset.noCapitalize !== undefined) return false;
    if (field.tagName === "TEXTAREA") return true;
    return field.tagName === "INPUT" && (field.type === "text" || !field.getAttribute("type"));
  };

  document.addEventListener("input", (event) => {
    const field = event.target;
    if (!isEligible(field)) return;
    const value = field.value;
    if (value && value[0] !== value[0].toUpperCase()) {
      const cursor = field.selectionStart;
      field.value = value[0].toUpperCase() + value.slice(1);
      if (cursor !== null) field.setSelectionRange(cursor, cursor);
    }
  });
})();
