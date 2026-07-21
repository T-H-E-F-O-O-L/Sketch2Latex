import type { CanvasObject } from "./canvas-types";

export type PdfPageDrawing = {
  sourceWidth: number;
  sourceHeight: number;
  objects: CanvasObject[];
};

type PdfFileDescriptor = Pick<File, "name" | "size" | "type">;

export const MAX_PDF_FILE_SIZE = 100 * 1024 * 1024;

const finiteDimension = (value: number) => Number.isFinite(value) && value > 0;

function scaleObject(object: CanvasObject, scaleX: number, scaleY: number): CanvasObject {
  return {
    ...object,
    x: object.x * scaleX,
    y: object.y * scaleY,
    x2: object.x2 === undefined ? undefined : object.x2 * scaleX,
    y2: object.y2 === undefined ? undefined : object.y2 * scaleY,
    width: object.width === undefined ? undefined : object.width * scaleX,
    height: object.height === undefined ? undefined : object.height * scaleY,
    control: object.control ? { x: object.control.x * scaleX, y: object.control.y * scaleY } : undefined,
    points: object.points?.map((point) => ({ x: point.x * scaleX, y: point.y * scaleY })),
    annotations: object.annotations ? { ...object.annotations } : undefined,
    style: object.style ? { ...object.style } : undefined,
    bindings: object.bindings ? { ...object.bindings } : undefined,
    graph: object.graph ? { ...object.graph, expressions: object.graph.expressions ? [...object.graph.expressions] : undefined, colors: object.graph.colors ? [...object.graph.colors] : undefined } : undefined,
  };
}

export function normalizePdfPageDrawing(objects: CanvasObject[], width: number, height: number): PdfPageDrawing {
  if (!finiteDimension(width) || !finiteDimension(height)) throw new Error("The PDF page dimensions are invalid.");
  return { sourceWidth: width, sourceHeight: height, objects: objects.map((object) => scaleObject(object, 1 / width, 1 / height)) };
}

export function restorePdfPageDrawing(drawing: PdfPageDrawing | undefined, width: number, height: number): CanvasObject[] {
  if (!drawing) return [];
  if (!finiteDimension(width) || !finiteDimension(height)) throw new Error("The PDF page dimensions are invalid.");
  return drawing.objects.map((object) => scaleObject(object, width, height));
}

export function validatePdfFile(file: PdfFileDescriptor): string | undefined {
  if (!file.size) return "This PDF is empty.";
  if (file.size > MAX_PDF_FILE_SIZE) return "This PDF is larger than 100 MB. Choose a smaller file to avoid exhausting browser memory.";
  const extensionIsPdf = file.name.toLocaleLowerCase("en").endsWith(".pdf");
  const mimeIsPdf = !file.type || file.type === "application/pdf";
  return extensionIsPdf && mimeIsPdf ? undefined : "Choose a PDF file (.pdf).";
}

export function friendlyPdfError(error: unknown): string {
  const source = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? "");
  if (/password|PasswordException/i.test(source)) return "This PDF is password-protected. Remove the password before importing it.";
  if (/invalid|missing pdf|unexpected response|format/i.test(source)) return "This PDF is corrupted or is not a valid PDF file.";
  if (/empty|zero/i.test(source)) return "This PDF is empty.";
  return "The PDF could not be opened. Try another file.";
}
