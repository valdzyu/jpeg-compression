// pracovní plátna
const transformationRGBCanvas = document.querySelector(".transformationRGB-canvas");
const transformationYCCCanvas = document.querySelector(".transformationYCC-canvas");
const subsamplingCanvas = document.querySelector(".subsampling-canvas");

// elementy přepínačů
const canvasControlButtons = document.querySelectorAll('form.canvas-control.form > input[type="radio"]'
);
const imageControlButtons = document.querySelectorAll('form.image-control.form > div > label > input[type="radio"]'
);

// pomocné konstanty
const ASSETS_DIR = "./assets/";
const DEFAULT_SOURCE_FILE = ASSETS_DIR + "1.png";
const canvasList = [
  transformationRGBCanvas,
  transformationYCCCanvas,
  subsamplingCanvas,
];

// třída zodpovědná za správu pláten
class CanvasController {
  // konstruktor třídy
  constructor() {
    this.sourceFileName = DEFAULT_SOURCE_FILE;
  }

  // počáteční nastavení
  init() {
    this.initCanvases();
    this.initCanvasControls();
    this.initImageControls();
    this.initZoom();
  }

  // vkládá počáteční data do pláten
  initCanvases() {
    const sourceData = this.getSourceData();
    this.canvasTransformationRGB = new Canvas(
      transformationRGBCanvas,
      sourceData,
      "original",
      null
    );
    this.canvasTransformationYCC = new Canvas(
      transformationYCCCanvas,
      sourceData,
      "y",
      null
    );
    this.canvasSubsampling = new Canvas(
      subsamplingCanvas,
      sourceData,
      "original",
      "4:4:4"
    );
    this.reloadCanvases();
  }

  // nastavuje jak se mají chovat jednotlivé typy přepínačů u pláten
  initCanvasControls() {
    for (const radioButton of canvasControlButtons) {
      let func;
      let target;
      switch (radioButton.getAttribute("name")) {
        case "transformationRGB-select":
          func = this.setTransformationValue;
          target = this.canvasTransformationRGB;
          break;
        case "transformationYCC-select":
          func = this.setTransformationValue;
          target = this.canvasTransformationYCC;
          break;
        case "subsampling-transformation-select":
          func = this.setTransformationValue;
          target = this.canvasSubsampling;
          break;
        case "subsampling-scheme-control":
          func = this.setSubsamplingScheme;
          target = this.canvasSubsampling;
          break;
      }
      if (func && target)
        radioButton.addEventListener("change", (e) => {
          func(target, e.target.value);
        });
    }
  }
  // nastavuje přepínače pro výběr zdrojového obrazu
  initImageControls() {
    for (const imageControlButton of imageControlButtons) {
      imageControlButton.addEventListener("change", (e) => {
        this.changeSourceImage(e.target.value);
      });
    }
  }

  // inicializuje lupy a nastavuje jejich parametry
  initZoom() {
    let magnifiers = [];
    for (const canvas of canvasList) {
      const magnifier = JyMagnifier({
        canvasSelector: canvas,
        wrapperSelector: ".wrapper",
        ratio: 16,
        width: 240,
        height: 240,
      });
      magnifiers.push(magnifier);
      canvas.addEventListener("mousemove", showMagnifiers, false);
      canvas.addEventListener("mousewheel", showMagnifiers, false);
      canvas.addEventListener("mouseout", hideMagnifiers);
      document.addEventListener("keyup", onKeyUp)

      function onKeyUp(e) {
        if (["ControlLeft", "ControlRight"].includes(e.code)) {
          const otherMagnifiers = magnifiers.filter( m => m !== magnifier)
          for (const m of otherMagnifiers) {
            m.show(false);
          }
        }
      }

      function showMagnifier(e, m) {
        m.show(true);
        m.bind(e);
      }

      function showMagnifiers(e) {
        if (!e.ctrlKey) {
          showMagnifier(e, magnifier)
          return;
        }
        for (const m of magnifiers) {
          showMagnifier(e, m)
        }
      }

      function hideMagnifiers() {
        for (const m of magnifiers) {
          m.show(false);
        }
      }
    }
  }

  // resetuje hodnoty přepínačů u pláten
  resetCanvasControls() {
    document.querySelector("input#transformationRGB-select_original").checked = true;
    document.querySelector("input#transformationYCC-select_y").checked = true;
    document.querySelector("input#subsampling-scheme-select_444").checked = true;
    document.querySelector("input#subsampling-transformation-select_original").checked = true;
  }

  // resetuje hodnoty parametrů objektů Canvas
  resetCanvasSettings() {
    this.canvasTransformationRGB.transformationValue = "original";
    this.canvasTransformationYCC.transformationValue = "y";
    this.canvasSubsampling.transformationValue = "original";
    this.canvasSubsampling.subsamplingScheme = "4:4:4";
  }

  // znovu generuje plátna
  reloadCanvases() {
    this.canvasTransformationRGB.generate();
    this.canvasTransformationYCC.generate();
    this.canvasSubsampling.generate();
  }

  // mění původní obraz na plátnech
  changeSourceImage(value) {
    this.sourceFileName = ASSETS_DIR + value + ".png";
    const sourceData = this.getSourceData();
    this.canvasTransformationRGB.sourceData = sourceData;
    this.canvasTransformationYCC.sourceData = sourceData;
    this.canvasSubsampling.sourceData = sourceData;
    this.resetCanvasSettings();
    this.resetCanvasControls();
    this.reloadCanvases();
  }

  // mění komponentu, dle které se provádí transformace barev vybraného plátna
  setTransformationValue(canvas, value) {
    canvas.transformationValue = value;
    canvas.generate();
  }

  // změní schéma, podle kterého je vybrané plátno podvzorkováno
  setSubsamplingScheme(canvas, value) {
    canvas.subsamplingScheme = value;
    canvas.generate();
  }

  // vrací imageData a vlastnosti zdrojového obrázku
  getSourceData() {
    const image = createImageElement(this.sourceFileName);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return {
      imageData,
      width: image.width,
      height: image.height,
    };
  }
}

// vytvoří nový objekt obrázku
function createImageElement(fileName) {
  const image = document.createElement("img");
  image.src = fileName;
  return image;
}
