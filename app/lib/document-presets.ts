import type { DocumentSettings } from "./canvas-types";

export type DocumentPreset = {
  id: string;
  label: string;
  group: "Screen & slides" | "Print";
  width: number;
  height: number;
  orientation: DocumentSettings["orientation"];
};

const CM = 50;

export const documentPresets: DocumentPreset[] = [
  { id: "screen-16-9", label: "Widescreen 16:9 — 1600 × 900", group: "Screen & slides", width: 1600, height: 900, orientation: "landscape" },
  { id: "screen-16-10", label: "Widescreen 16:10 — 1440 × 900", group: "Screen & slides", width: 1440, height: 900, orientation: "landscape" },
  { id: "screen-4-3", label: "Standard 4:3 — 1200 × 900", group: "Screen & slides", width: 1200, height: 900, orientation: "landscape" },
  { id: "screen-3-2", label: "Photo 3:2 — 1350 × 900", group: "Screen & slides", width: 1350, height: 900, orientation: "landscape" },
  { id: "screen-1-1", label: "Square 1:1 — 900 × 900", group: "Screen & slides", width: 900, height: 900, orientation: "landscape" },
  { id: "screen-9-16", label: "Vertical 9:16 — 900 × 1600", group: "Screen & slides", width: 900, height: 1600, orientation: "portrait" },
  { id: "a4-portrait", label: "A4 portrait — 210 × 297 mm", group: "Print", width: 21 * CM, height: 29.7 * CM, orientation: "portrait" },
  { id: "a4-landscape", label: "A4 landscape — 297 × 210 mm", group: "Print", width: 29.7 * CM, height: 21 * CM, orientation: "landscape" },
  { id: "a3-portrait", label: "A3 portrait — 297 × 420 mm", group: "Print", width: 29.7 * CM, height: 42 * CM, orientation: "portrait" },
  { id: "a3-landscape", label: "A3 landscape — 420 × 297 mm", group: "Print", width: 42 * CM, height: 29.7 * CM, orientation: "landscape" },
  { id: "letter-portrait", label: "US Letter portrait — 8.5 × 11 in", group: "Print", width: 21.59 * CM, height: 27.94 * CM, orientation: "portrait" },
  { id: "letter-landscape", label: "US Letter landscape — 11 × 8.5 in", group: "Print", width: 27.94 * CM, height: 21.59 * CM, orientation: "landscape" },
];

export const documentPresetById = (id: string) => documentPresets.find((preset) => preset.id === id);

export const matchingDocumentPresetId = (settings: Pick<DocumentSettings, "width" | "height">) =>
  documentPresets.find((preset) => Math.abs(preset.width - settings.width) < 0.01 && Math.abs(preset.height - settings.height) < 0.01)?.id ?? "custom";
