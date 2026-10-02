(function () {
  var form = document.querySelector("[data-product-editor]");
  if (!form) return;
  var imageControl = form.querySelector("[data-product-image-control]");
  var imageInput = imageControl === null || imageControl === void 0 ? void 0 : imageControl.querySelector("input[type='file']");
  var placeholder = imageControl === null || imageControl === void 0 ? void 0 : imageControl.querySelector("[data-product-image-placeholder]");
  var framing = imageControl === null || imageControl === void 0 ? void 0 : imageControl.querySelector("[data-product-image-framing]");
  var cropWindow = imageControl === null || imageControl === void 0 ? void 0 : imageControl.querySelector("[data-product-image-crop-window]");
  var zoomControl = imageControl === null || imageControl === void 0 ? void 0 : imageControl.querySelector("[data-product-image-zoom]");
  var resetButton = imageControl === null || imageControl === void 0 ? void 0 : imageControl.querySelector("[data-product-image-reset]");
  var positionX = form.querySelector("[name='image_position_x']");
  var positionY = form.querySelector("[name='image_position_y']");
  var zoomValue = form.querySelector("[name='image_zoom']");
  var cropImage;
  var objectUrl;
  var clamp = function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  };
  var renderFraming = function renderFraming() {
    if (!cropImage) return;
    var x = Number((positionX === null || positionX === void 0 ? void 0 : positionX.value) || 50);
    var y = Number((positionY === null || positionY === void 0 ? void 0 : positionY.value) || 50);
    var zoom = Number((zoomValue === null || zoomValue === void 0 ? void 0 : zoomValue.value) || 1);
    cropImage.style.objectPosition = `${x}% ${y}%`;
    cropImage.style.transformOrigin = `${x}% ${y}%`;
    cropImage.style.transform = `scale(${zoom})`;
    if (zoomControl) zoomControl.value = zoom;
  };
  var openFraming = function openFraming(src) {
    if (!framing || !cropWindow || !src) return;
    cropImage = cropWindow.querySelector("img") || document.createElement("img");
    cropImage.src = src;
    cropImage.alt = "Vista previa del encuadre del producto";
    cropImage.draggable = false;
    cropWindow.replaceChildren(cropImage);
    framing.hidden = false;
    renderFraming();
  };
  var currentPreview = imageControl === null || imageControl === void 0 ? void 0 : imageControl.querySelector("[data-product-image-preview]");
  if (currentPreview !== null && currentPreview !== void 0 && currentPreview.src) openFraming(currentPreview.src);
  imageInput === null || imageInput === void 0 || imageInput.addEventListener("change", function () {
    var _imageInput$files;
    var file = (_imageInput$files = imageInput.files) === null || _imageInput$files === void 0 ? void 0 : _imageInput$files[0];
    if (!file) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    var preview = imageControl.querySelector("[data-product-image-preview]");
    if (!preview) {
      preview = document.createElement("img");
      preview.dataset.productImagePreview = "";
      placeholder === null || placeholder === void 0 || placeholder.replaceChildren(preview);
    }
    preview.src = objectUrl;
    preview.alt = "Vista previa de la imagen seleccionada";
    imageControl.classList.add("has-new-image");
    openFraming(objectUrl);
  });
  zoomControl === null || zoomControl === void 0 || zoomControl.addEventListener("input", function () {
    if (zoomValue) zoomValue.value = Number(zoomControl.value).toFixed(2);
    renderFraming();
  });
  resetButton === null || resetButton === void 0 || resetButton.addEventListener("click", function () {
    if (positionX) positionX.value = 50;
    if (positionY) positionY.value = 50;
    if (zoomValue) zoomValue.value = "1.00";
    renderFraming();
  });
  var dragStart;
  cropWindow === null || cropWindow === void 0 || cropWindow.addEventListener("pointerdown", function (event) {
    if (!cropImage) return;
    dragStart = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: Number(positionX.value || 50),
      y: Number(positionY.value || 50)
    };
    cropWindow.setPointerCapture(event.pointerId);
    cropWindow.classList.add("is-dragging");
  });
  cropWindow === null || cropWindow === void 0 || cropWindow.addEventListener("pointermove", function (event) {
    if (!dragStart) return;
    var bounds = cropWindow.getBoundingClientRect();
    positionX.value = Math.round(clamp(dragStart.x - (event.clientX - dragStart.pointerX) / bounds.width * 100, 0, 100));
    positionY.value = Math.round(clamp(dragStart.y - (event.clientY - dragStart.pointerY) / bounds.height * 100, 0, 100));
    renderFraming();
  });
  var finishDrag = function finishDrag() {
    dragStart = null;
    cropWindow === null || cropWindow === void 0 || cropWindow.classList.remove("is-dragging");
  };
  cropWindow === null || cropWindow === void 0 || cropWindow.addEventListener("pointerup", finishDrag);
  cropWindow === null || cropWindow === void 0 || cropWindow.addEventListener("pointercancel", finishDrag);
})();