import { defaultDocumentSettings, labels, type CanvasObject, type DocumentSettings } from "./canvas-types";

export const PROJECT_VERSION = 2;
export const AUTOSAVE_KEY = "sketch2latex.autosave.v2";
export const PROJECTS_KEY = "sketch2latex.projects.v2";
export const FAVORITES_KEY = "sketch2latex.favorites.v1";
export const MODE_KEY = "sketch2latex.mode.v1";

export type ProjectFile = {
  version: number;
  name: string;
  updatedAt: string;
  settings: DocumentSettings;
  objects: CanvasObject[];
};

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

function validObject(value: unknown): value is CanvasObject {
  if (!value || typeof value !== "object") return false;
  const object = value as Record<string, unknown>;
  return typeof object.id === "string" && typeof object.kind === "string" && Object.hasOwn(labels, object.kind) && finite(object.x) && finite(object.y);
}

function settingsFrom(value: unknown): DocumentSettings {
  const input = value && typeof value === "object" ? value as Partial<DocumentSettings> : {};
  return {
    width: finite(input.width) ? Math.max(320, Math.min(2400, input.width)) : defaultDocumentSettings.width,
    height: finite(input.height) ? Math.max(240, Math.min(1800, input.height)) : defaultDocumentSettings.height,
    unit: input.unit === "mm" || input.unit === "pt" || input.unit === "tikz" ? input.unit : "cm",
    orientation: input.orientation === "portrait" ? "portrait" : "landscape",
    gridSize: finite(input.gridSize) ? Math.max(5, Math.min(100, input.gridSize)) : defaultDocumentSettings.gridSize,
    showGrid: input.showGrid !== false,
    snapToGrid: input.snapToGrid !== false,
  };
}

export function makeProject(name: string, objects: CanvasObject[], settings: DocumentSettings): ProjectFile {
  return { version: PROJECT_VERSION, name: name.trim() || "Sans titre", updatedAt: new Date().toISOString(), settings: { ...settings }, objects };
}

export function parseProject(value: string | unknown): ProjectFile {
  let parsed: unknown;
  try { parsed = typeof value === "string" ? JSON.parse(value) : value; }
  catch { throw new Error("Ce fichier ne contient pas de JSON valide."); }
  if (!parsed || typeof parsed !== "object") throw new Error("Le projet est vide ou invalide.");
  const input = parsed as Record<string, unknown>;
  const objects = Array.isArray(input.objects) ? input.objects : Array.isArray(parsed) ? parsed : undefined;
  if (!objects || objects.some((object) => !validObject(object))) throw new Error("Le projet contient un ou plusieurs objets non reconnus.");
  return {
    version: finite(input.version) ? input.version : 1,
    name: typeof input.name === "string" ? input.name : "Imported project",
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : new Date().toISOString(),
    settings: settingsFrom(input.settings),
    objects: objects as CanvasObject[],
  };
}

export function storedProjects(): ProjectFile[] {
  if (typeof window === "undefined") return [];
  try {
    const values: unknown = JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? "[]");
    return Array.isArray(values) ? values.map((value) => { try { return parseProject(value); } catch { return undefined; } }).filter((value): value is ProjectFile => Boolean(value)) : [];
  } catch { return []; }
}

export function saveNamedProject(project: ProjectFile) {
  const projects = storedProjects().filter((item) => item.name !== project.name);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify([project, ...projects].slice(0, 20)));
}

export function downloadText(filename: string, contents: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
