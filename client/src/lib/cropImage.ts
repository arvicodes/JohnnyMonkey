/** Pixel crop area from react-easy-crop */
export type PixelCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageAdjustments = {
  /** 0.5 (dunkler) … 1.5 (heller), Standard 1 */
  brightness?: number;
  /** 0.5 … 1.5, Standard 1 */
  contrast?: number;
  /** 0 … 2, Standard 1 */
  saturation?: number;
};

export type CropExportOptions = ImageAdjustments & {
  rotation?: number;
};

export function buildImageAdjustFilter(adjust: ImageAdjustments = {}): string | undefined {
  const brightness = adjust.brightness ?? 1;
  const contrast = adjust.contrast ?? 1;
  const saturation = adjust.saturation ?? 1;
  const parts: string[] = [];
  if (brightness !== 1) parts.push(`brightness(${brightness})`);
  if (contrast !== 1) parts.push(`contrast(${contrast})`);
  if (saturation !== 1) parts.push(`saturate(${saturation})`);
  return parts.length ? parts.join(' ') : undefined;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function applyAdjustmentsToImageData(imageData: ImageData, adjust: ImageAdjustments): void {
  const brightness = adjust.brightness ?? 1;
  const contrast = adjust.contrast ?? 1;
  const saturation = adjust.saturation ?? 1;
  if (brightness === 1 && contrast === 1 && saturation === 1) return;

  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    r = clampByte(r * brightness);
    g = clampByte(g * brightness);
    b = clampByte(b * brightness);

    r = clampByte((r - 128) * contrast + 128);
    g = clampByte((g - 128) * contrast + 128);
    b = clampByte((b - 128) * contrast + 128);

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clampByte(gray + (r - gray) * saturation);
    g = clampByte(gray + (g - gray) * saturation);
    b = clampByte(gray + (b - gray) * saturation);

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (e) => reject(e));
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Crops the image (with optional rotation) to a square JPEG blob.
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: PixelCrop,
  outputSize = 512,
  options: CropExportOptions = {},
): Promise<Blob> {
  const rotation = options.rotation ?? 0;
  const adjustments: ImageAdjustments = {
    brightness: options.brightness ?? 1,
    contrast: options.contrast ?? 1,
    saturation: options.saturation ?? 1,
  };

  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas nicht verfügbar');

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;
  const croppedCtx = croppedCanvas.getContext('2d');
  if (!croppedCtx) throw new Error('Canvas nicht verfügbar');

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outputSize;
  outCanvas.height = outputSize;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Canvas nicht verfügbar');

  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(croppedCanvas, 0, 0, outputSize, outputSize);

  const imageData = outCtx.getImageData(0, 0, outputSize, outputSize);
  applyAdjustmentsToImageData(imageData, adjustments);
  outCtx.putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    outCanvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Zuschneiden fehlgeschlagen'));
        else resolve(blob);
      },
      'image/jpeg',
      0.92,
    );
  });
}
