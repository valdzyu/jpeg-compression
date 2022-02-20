(function (name, definition) {
  if (typeof module != "undefined") module.exports = definition();
  else if (typeof define == "function" && typeof define.amd == "object")
    define(definition);
  else this[name] = definition();
})("JyMagnifier", function () {
  "use strict";
  return function (setting) {
    let magnifierDiv;
    let magnifierCtx;
    const wrapperSelector = setting.wrapperSelector || document.body;
    const wrapperEl =
      typeof wrapperSelector === "string"
        ? document.querySelector(wrapperSelector)
        : wrapperSelector;
    const magnifierDivStyle =
      setting.magnifierDivStyle ||
      "border:1px solid #ccc;background:#fff;box-shadow:5px 5px 25px #000;";
    let magnifierCanvas;

    const width = setting.width || 150;
    const height = setting.height || 150;
    let ratio = setting.ratio || 3;
    const targetCanvasSelector = setting.canvasSelector;

    const targetCanvas =
      typeof targetCanvasSelector === "string"
        ? document.querySelector(targetCanvasSelector)
        : targetCanvasSelector;
    let widthOffset = (width * ratio) / 2 - width / 2;
    let heightOffset = (height * ratio) / 2 - height / 2;
    let magnifierShow = false;

    let offsetX = 0;
    let offsetY = 0;

    let hackCanvas;
    let hackCtx;

    function _setRatio(mRatio) {
      ratio = mRatio;
      widthOffset = (width * ratio) / 2 - width / 2;
      heightOffset = (height * ratio) / 2 - height / 2;
      _draw();
    }

    function _createCanvas(width, height) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      canvas.style.background = "#ffffff";
      return canvas;
    }

    function _init() {
      magnifierDiv = document.createElement("div");
      magnifierDiv.setAttribute(
        "style",
        "z-index:1989;position:absolute;display:none;" + magnifierDivStyle
      );
      magnifierDiv.style.width = width + "px";
      magnifierDiv.style.height = height + "px";
      magnifierDiv.style.top = targetCanvas.offsetTop + "px";
      magnifierDiv.style.left = targetCanvas.offsetLeft + "px";
      wrapperEl.appendChild(magnifierDiv);
      magnifierCanvas = _createCanvas(width, height);

      if (magnifierDiv.style.borderRadius) {
        magnifierCanvas.style.borderRadius = magnifierDiv.style.borderRadius;
      }
      magnifierDiv.appendChild(magnifierCanvas);
      magnifierCtx = magnifierCanvas.getContext("2d");
      hackCanvas = _createCanvas(
        targetCanvas.width + width,
        targetCanvas.height + height
      );
      hackCanvas.style.display = "none";
      wrapperEl.appendChild(hackCanvas);
      hackCtx = hackCanvas.getContext("2d");

      _draw();
    }

    function _disableBlur(ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.mozImageSmoothingEnabled = false;
      ctx.imageSmoothingEnabled = false;
    }

    function _draw() {
      _disableBlur(hackCtx);
      _disableBlur(magnifierCtx);
      hackCtx.clearRect(0, 0, hackCanvas.width, hackCanvas.height);
      hackCtx.drawImage(
        targetCanvas,
        width / 2,
        height / 2,
        targetCanvas.width,
        targetCanvas.height
      );
      magnifierCtx.clearRect(
        0,
        0,
        magnifierCanvas.width,
        magnifierCanvas.height
      );
      magnifierCtx.drawImage(
        hackCanvas,
        offsetX,
        offsetY,
        width,
        height,
        -widthOffset,
        -heightOffset,
        width * ratio,
        height * ratio
      );
    }

    function _bind(event) {
      if (!magnifierShow) {
        return;
      }
      if (event.touches) {
        event = event.touches[0];
      }
      const canvasProps = _getCanvasProps(targetCanvas)
      const targetProps = _getCanvasProps(event.target)
      const relativePos = _getRelativePos(event);
      const scaleX = canvasProps.w / targetProps.w;
      const scaleY = canvasProps.h / targetProps.h;

      const calculatedPosX = canvasProps.x + (relativePos.x - window.scrollX) * scaleX - window.scrollX;
      const calculatedPosY = canvasProps.y + (relativePos.y - window.scrollY) * scaleY + window.scrollY;

      magnifierDiv.style.left = (calculatedPosX + 10) + "px";
      magnifierDiv.style.top = (calculatedPosY + 10) + "px";

      offsetX = event.offsetX;
      offsetY = event.offsetY;
      _draw();
    }

    function _getRelativePos(e) {
      const r = e.target.getBoundingClientRect();
      const x = e.pageX - r.left;
      const y = e.pageY - r.top;
      return { x, y };
    }

    function _getCanvasProps(canvas) {
      const r = canvas.getBoundingClientRect();
      const x = r.left;
      const y = r.top;
      const w = r.width;
      const h = r.height;
      return { x, y, w, h };
    }

    function _show(mShow) {
      magnifierShow = mShow;
      magnifierDiv.style.display = magnifierShow ? "" : "none";
    }

    _init();
    return {
      bind: _bind,
      show: _show,
      setRatio: _setRatio,
    };
  };
});
