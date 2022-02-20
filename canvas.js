const RGB_COMPONENTS = ["r", "g", "b"];
const YCC_COMPONENTS = ["y", "cb", "cr"];

// třída objektu, která obsahuje parametry konkrétního plátna a je zodpovědná za jeho zpracování
class Canvas {

  // konstruktor třídy
  constructor(
    targetEl,
    sourceData,
    defaultTransformationValue,
    defaultSubsamplingScheme
  ) {
    this.canvasContext = getContext(targetEl);
    this.sourceData = sourceData;
    this.transformationValue = defaultTransformationValue;
    this.subsamplingScheme = defaultSubsamplingScheme;
  }

  // generuje výsledek na základě vybraných parametrů plátna
  generate() {
    let pixelData = getPixelData(this.sourceData.imageData);
    if (this.subsamplingScheme !== null) {
      pixelData = this.changeSubsampling(pixelData);
    }
    if (this.transformationValue !== "original") {
      pixelData = this.changeTransformation(pixelData);
    }
    if (
      this.subsamplingScheme != null &&
      this.transformationValue === "original"
    ) {
      pixelData = convertPixelData(pixelData, "RGB");
    }
    const newImageData = this.getFilledImageData(
      this.sourceData.width,
      this.sourceData.height,
      pixelData
    );
    this.canvasContext.putImageData(newImageData, 0, 0);
  }

  // provádí proces podvzorkování a vrácí výsledný objekt pixelData
  changeSubsampling(pixelData) {
    pixelData = convertPixelData(pixelData, "YCC");
    pixelData = this.subsampling(
      pixelData,
      this.subsamplingScheme,
      this.sourceData.width
    );
    return pixelData;
  }

  // provádí proces transformaci barev a vrácí výsledný objekt pixelData
  changeTransformation(pixelData) {
    if (YCC_COMPONENTS.includes(this.transformationValue)) {
      pixelData = convertPixelData(pixelData, "YCC");
    }
    pixelData = this.transform(pixelData, this.transformationValue);
    return pixelData;
  }

  // provádí podvzorkování pixelů objektu pixelData na základě vybraného schématu
  subsampling(pixelData, scheme, imageWidth) {
    const chunks = this.getChunksByScheme(pixelData.pixels, scheme, imageWidth);
    let subsampledPixels = [];
    for (const chunk of chunks) {
      const avgCB = getAverageOfComponent(chunk, "cb");
      const avgCR = getAverageOfComponent(chunk, "cr");
      for (const pixelYCC of chunk) {
        pixelYCC.cb = avgCB;
        pixelYCC.cr = avgCR;
        subsampledPixels.push(pixelYCC);
      }
    }
    return { pixels: subsampledPixels, colorMode: pixelData.colorMode };
  }

  // provádí transformaci barev pixelů objektu pixelData na základě vybraného schématu
  transform(pixelData, component) {
    let transformedPixels = [];
    for (let pixel of pixelData.pixels) {
      if (pixelData.colorMode === "YCC") {
        pixel = leaveOnlyComponentYCC(component, pixel);
      } else {
        pixel = leaveOnlyComponentRGB(component, pixel);
      }
      transformedPixels.push(pixel);
    }
    return { pixels: transformedPixels, colorMode: pixelData.colorMode };
  }

  // vrací objekt imageData vyplněný pixely
  getFilledImageData(width, height, pixelData) {
    let imageData = createImageData(width, height);
    for (const pixelObject of pixelData.pixels) {
      let pixel = roundValues(pixelObject);
      pixel = pick(
        pixel,
        pixelData.colorMode === "YCC" ? YCC_COMPONENTS : RGB_COMPONENTS
      );
      pushPixelToImageData(imageData, pixel, pixelObject.col, pixelObject.row);
    }
    return imageData;
  }

  // vrací seznam bloků na základě zvoleného schématu
  getChunksByScheme(array) {
    if (this.subsamplingScheme === "4:2:2") {
      return getChunks(array, 2);
    } else if (this.subsamplingScheme === "4:4:4") {
      return getChunks(array, 1);
    } else if (this.subsamplingScheme === "4:2:0") {
      return getSquares(array, 2, this.sourceData.width);
    }
    return [];
  }
}

// přidává hodnoty pixelů v seznam imageData na správné místo
function pushPixelToImageData(imageData, pixel, col, row) {
  const index = (col + row * imageData.width) * 4;
  for (const [i, value] of [...Object.values(pixel), 255].entries()) {
    imageData.data[index + i] = value;
  }
}

// vrací kontext plátna
function getContext(canvas) {
  return canvas.getContext("2d");
}

// vrací objekt pixelData získaný z pixelů objektu imageData
function getPixelData(imageData) {
  let pixels = [];
  for (let row = 0; row < imageData.height; row++) {
    for (let col = 0; col < imageData.width; col++) {
      let pixel = getPixel(imageData, col, row);
      pixels.push(pixel);
    }
  }
  return { pixels, colorMode: "RGB" };
}

// vrací hodnoty modelu RGB u zvoleného pixelu
function getPixel(imageData, col, row) {
  let data = imageData.data;
  const index = (col + row * imageData.width) * 4;
  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
    row,
    col,
  };
}

// převádí hodnoty objektu pixelData do vybraného formátu
function convertPixelData(pixelData, format) {
  if (pixelData.colorMode === format) return pixelData;
  let pixels = [];
  for (let pixel of pixelData.pixels) {
    if (format === "YCC") pixel = convertRGBtoYCC(pixel);
    else pixel = convertYCCtoRGB(pixel);
    pixels.push(pixel);
  }
  return { pixels, colorMode: format };
}

// vrací nový objekt plátna
function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// vrací nový objekt imageData
function createImageData(width, height) {
  const ctx = createCanvas(width, height).getContext("2d");
  return ctx.createImageData(width, height);
}

// vrací nový objekt RGB pixelů, kde všechny komponenty kromě zvoleného jsou vynulované
function leaveOnlyComponentRGB(needComponent, pixel) {
  let newPixel = { ...pixel };
  for (let comp of ["r", "g", "b"]) {
    if (comp !== needComponent) {
      newPixel[comp] = 0;
    }
  }
  return newPixel;
}

// vrací nový objekt YCbCr pixelu, kde všechny komponenty mají hodnotu zvolené složky
function leaveOnlyComponentYCC(needComponent, pixel) {
  let newPixel = { ...pixel };
  for (let comp of ["y", "cb", "cr"]) {
    newPixel[comp] = newPixel[needComponent];
  }
  return newPixel;
}

// vrací objekt s zaokrouhlenými hodnotami jednotlivých atributů
function roundValues(dict) {
  return Object.entries(dict).reduce(
    (arr, [key, value]) => ({ ...arr, [key]: Math.round(value) }),
    {}
  );
}

// převádí hodnoty pixelu RGB na YCbCr model
function convertRGBtoYCC(pixel) {
  const r = pixel.r;
  const g = pixel.g;
  const b = pixel.b;
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
  const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
  return { y, cb, cr, row: pixel.row, col: pixel.col };
}

// převádí hodnoty pixelu YCbCr na RGB model
function convertYCCtoRGB(pixel) {
  const y = pixel.y;
  const cb = pixel.cb;
  const cr = pixel.cr;
  const r = y + 1.402 * (cr - 128);
  const g = y - 0.34414 * (cb - 128) - 0.71414 * (cr - 128);
  const b = y + 1.772 * (cb - 128);
  return { r, g, b, row: pixel.row, col: pixel.col };
}

// vrací průměrnou hodnotu zvolené složky v seznamu pixelů
function getAverageOfComponent(pixels, component) {
  const componentValues = pixels.map((x) => x[component]);
  const sum = componentValues.reduce((a, b) => a + b, 0);
  return sum / pixels.length;
}

// vrací objekt obsahující pouze zadané seznamem složky
function pick(obj, props) {
  if (!obj || !props) return;
  let picked = {};
  props.forEach(function (prop) {
    picked[prop] = obj[prop];
  });
  return picked;
}

// vrací seznam bloků velikosti Lx1, kde L - zvolená délka bloku
function getChunks(array, length) {
  return array.reduce(function (result, value, index, array) {
    if (index % length === 0) result.push(array.slice(index, index + length));
    return result;
  }, []);
}

// vrací seznam bloků velikosti SxS, kde S - zvolená velikost bloku
function getSquares(array, squareSize, imageWidth) {
  const rows = getChunks(array, imageWidth);
  let row = 0;
  const result2D = rows.reduce((result, rowEl, rowIndex) => {
    if (rowIndex && rowIndex % squareSize === 0) row++;
    let col = 0;
    rowEl.forEach((colEl, colIndex) => {
      if (colIndex && colIndex % squareSize === 0) col++;
      if (!result[row]) result[row] = [];
      if (!result[row][col]) result[row][col] = [];
      result[row][col].push(colEl);
    });
    return result;
  }, []);
  return result2D.flat();
}
