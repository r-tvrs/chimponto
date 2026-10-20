import { createWorker } from "tesseract.js";

const MAX_SIDE = 1600;

/**
 * Texto da foto do comprovante (docs/06), lido no aparelho: redimensiona, passa para cinza com
 * mais contraste e roda o Tesseract (`por`). Worker, core e idioma vêm do jsDelivr na primeira vez
 * e ficam no cache do service worker; a imagem não sai do aparelho e o canvas é descartado.
 */
export async function readReceipt(photo: Blob, onProgress: (ratio: number) => void) {
  const canvas = await preprocess(photo);
  const worker = await createWorker("por", undefined, {
    logger: (m) => m.status === "recognizing text" && onProgress(m.progress),
  });
  try {
    const { data } = await worker.recognize(canvas);
    return data.text;
  } finally {
    await worker.terminate();
    canvas.width = canvas.height = 0;
  }
}

async function preprocess(photo: Blob) {
  const bitmap = await createImageBitmap(photo);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    const gray = 0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!;
    // Contraste 1,5x em torno do meio: o papel térmico sai claro e a fonte matricial, fraca.
    px[i] = px[i + 1] = px[i + 2] = Math.max(0, Math.min(255, (gray - 128) * 1.5 + 128));
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
