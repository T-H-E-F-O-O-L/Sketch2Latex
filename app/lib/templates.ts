import type { CanvasObject, StrokePattern } from "./canvas-types";

export type DiagramTemplate = {
  id: string;
  title: string;
  category: string;
  description: string;
  sourceName: "TikZ.net" | "Janosh Diagrams" | "Sketch2LaTeX";
  sourceUrl: string;
  license: string;
  objects: CanvasObject[];
};

const o = (id: string, object: Omit<CanvasObject, "id">): CanvasObject => ({ id, ...object });
const concours = (strokeWidth = 2, strokePattern: StrokePattern = "solid") => ({ stroke: "#111111", strokeWidth, strokePattern });

export const diagramTemplates: DiagramTemplate[] = [
  {
    id: "rlc-series",
    title: "Circuit RLC série",
    category: "Électricité",
    description: "Générateur, résistance, bobine et condensateur en boucle, prêts à annoter.",
    sourceName: "TikZ.net",
    sourceUrl: "https://tikz.net/rlc-circuit/",
    license: "Adapté sous CC BY-SA 4.0",
    objects: [
      o("rlc-battery", { kind: "battery", x: 120, y: 390, x2: 120, y2: 160 }),
      o("rlc-top", { kind: "wire", x: 120, y: 160, x2: 270, y2: 160 }),
      o("rlc-r", { kind: "resistor", x: 270, y: 160, x2: 430, y2: 160, annotations: { main: "R" } }),
      o("rlc-l", { kind: "inductor", x: 430, y: 160, x2: 590, y2: 160, annotations: { main: "L" } }),
      o("rlc-right", { kind: "wire", x: 590, y: 160, x2: 590, y2: 390 }),
      o("rlc-c", { kind: "capacitor", x: 590, y: 390, x2: 430, y2: 390, annotations: { main: "C" } }),
      o("rlc-bottom", { kind: "wire", x: 430, y: 390, x2: 120, y2: 390 }),
      o("rlc-i", { kind: "arrow", x: 190, y: 130, x2: 340, y2: 130, annotations: { main: "i(t)" }, style: concours() }),
      o("rlc-title", { kind: "text", x: 355, y: 90, text: "Circuit RLC série" }),
    ],
  },
  {
    id: "thevenin-equivalent",
    title: "Équivalent de Thévenin",
    category: "Électricité",
    description: "Générateur idéal de tension ETh et résistance RTh en série, avec bornes de sortie A et B.",
    sourceName: "Sketch2LaTeX",
    sourceUrl: "https://tug.ctan.org/graphics/pgf/contrib/circuitikz/doc/circuitikzmanual.pdf",
    license: "Création originale – conventions européennes CircuitikZ",
    objects: [
      o("th-source", { kind: "voltage-source", x: 180, y: 360, x2: 180, y2: 180, annotations: { main: "E_{Th}" } }),
      o("th-top-left", { kind: "wire", x: 180, y: 180, x2: 300, y2: 180 }),
      o("th-resistor", { kind: "resistor", x: 300, y: 180, x2: 480, y2: 180, annotations: { main: "R_{Th}" } }),
      o("th-top-right", { kind: "wire", x: 480, y: 180, x2: 650, y2: 180 }),
      o("th-bottom", { kind: "wire", x: 180, y: 360, x2: 650, y2: 360 }),
      o("th-terminal-a", { kind: "circle", x: 644, y: 174, width: 12, height: 12 }),
      o("th-terminal-b", { kind: "circle", x: 644, y: 354, width: 12, height: 12 }),
      o("th-label-a", { kind: "text", x: 670, y: 185, text: "A" }),
      o("th-label-b", { kind: "text", x: 670, y: 365, text: "B" }),
      o("th-title", { kind: "text", x: 340, y: 105, text: "Modèle de Thévenin" }),
    ],
  },
  {
    id: "norton-equivalent",
    title: "Équivalent de Norton",
    category: "Électricité",
    description: "Générateur idéal de courant IN et résistance RN en parallèle, avec bornes de sortie A et B.",
    sourceName: "Sketch2LaTeX",
    sourceUrl: "https://tug.ctan.org/graphics/pgf/contrib/circuitikz/doc/circuitikzmanual.pdf",
    license: "Création originale – conventions européennes CircuitikZ",
    objects: [
      o("no-source", { kind: "current-source", x: 250, y: 360, x2: 250, y2: 180, annotations: { main: "I_N" } }),
      o("no-top-left", { kind: "wire", x: 250, y: 180, x2: 450, y2: 180 }),
      o("no-top-right", { kind: "wire", x: 450, y: 180, x2: 650, y2: 180 }),
      o("no-resistor", { kind: "resistor", x: 450, y: 180, x2: 450, y2: 360, annotations: { main: "R_N" } }),
      o("no-bottom-left", { kind: "wire", x: 250, y: 360, x2: 450, y2: 360 }),
      o("no-bottom-right", { kind: "wire", x: 450, y: 360, x2: 650, y2: 360 }),
      o("no-terminal-a", { kind: "circle", x: 644, y: 174, width: 12, height: 12 }),
      o("no-terminal-b", { kind: "circle", x: 644, y: 354, width: 12, height: 12 }),
      o("no-label-a", { kind: "text", x: 670, y: 185, text: "A" }),
      o("no-label-b", { kind: "text", x: 670, y: 365, text: "B" }),
      o("no-title", { kind: "text", x: 350, y: 105, text: "Modèle de Norton" }),
    ],
  },
  {
    id: "pendulum-forces",
    title: "Pendule et forces",
    category: "Mécanique",
    description: "Pendule dévié, poids, tension, angle et repère.",
    sourceName: "TikZ.net",
    sourceUrl: "https://tikz.net/dynamics_pendulum/",
    license: "Adapté sous CC BY-SA 4.0",
    objects: [
      o("pen-support", { kind: "line", x: 250, y: 95, x2: 470, y2: 95 }),
      o("pen-rope", { kind: "line", x: 360, y: 95, x2: 485, y2: 330 }),
      o("pen-mass", { kind: "mass", x: 445, y: 315, width: 80, height: 60, annotations: { main: "m" } }),
      o("pen-weight", { kind: "force", x: 485, y: 345, x2: 485, y2: 475, annotations: { main: "P" }, style: concours(3) }),
      o("pen-tension", { kind: "force", x: 480, y: 330, x2: 405, y2: 190, annotations: { main: "T" }, style: concours(3) }),
      o("pen-vertical", { kind: "dashed-line", x: 360, y: 95, x2: 360, y2: 390 }),
      o("pen-angle", { kind: "curve", x: 360, y: 175, x2: 398, y2: 166, control: { x: 377, y: 165 }, annotations: { main: "θ" } }),
      o("pen-label", { kind: "text", x: 395, y: 195, text: "θ" }),
    ],
  },
  {
    id: "prism-dispersion",
    title: "Dispersion par un prisme",
    category: "Optique",
    description: "Rayon incident et faisceau dispersé à travers un prisme.",
    sourceName: "TikZ.net",
    sourceUrl: "https://tikz.net/optics_prism/",
    license: "Adapté sous CC BY-SA 4.0",
    objects: [
      o("prism", { kind: "prism", x: 370, y: 190, width: 150, height: 140 }),
      o("incident", { kind: "light-ray", x: 100, y: 260, x2: 415, y2: 260, style: concours(3) }),
      o("red", { kind: "light-ray", x: 470, y: 260, x2: 760, y2: 205, style: concours(3) }),
      o("orange", { kind: "light-ray", x: 470, y: 260, x2: 760, y2: 240, style: concours(3, "dashed") }),
      o("blue", { kind: "light-ray", x: 470, y: 260, x2: 760, y2: 300, style: concours(3, "dotted") }),
      o("violet", { kind: "light-ray", x: 470, y: 260, x2: 760, y2: 335, style: concours(3, "dash-dot") }),
      o("white-light", { kind: "text", x: 190, y: 235, text: "lumière blanche" }),
      o("red-label", { kind: "text", x: 780, y: 208, text: "rouge" }),
      o("orange-label", { kind: "text", x: 780, y: 243, text: "orange" }),
      o("blue-label", { kind: "text", x: 780, y: 303, text: "bleu" }),
      o("violet-label", { kind: "text", x: 780, y: 338, text: "violet" }),
    ],
  },
  {
    id: "thin-lens",
    title: "Construction d’image",
    category: "Optique",
    description: "Axe optique, lentille convergente, objet et deux rayons principaux.",
    sourceName: "Sketch2LaTeX",
    sourceUrl: "https://tikz.net/tag/optics/",
    license: "Création originale inspirée des conventions TikZ",
    objects: [
      o("lens-axis", { kind: "line", x: 80, y: 300, x2: 820, y2: 300 }),
      o("lens", { kind: "lens", x: 450, y: 170, x2: 450, y2: 430 }),
      o("object", { kind: "arrow", x: 230, y: 300, x2: 230, y2: 175, style: concours(3) }),
      o("parallel", { kind: "light-ray", x: 230, y: 175, x2: 450, y2: 175, style: concours() }),
      o("refracted", { kind: "light-ray", x: 450, y: 175, x2: 700, y2: 385, style: concours() }),
      o("central", { kind: "light-ray", x: 230, y: 175, x2: 700, y2: 385, style: concours() }),
      o("image", { kind: "arrow", x: 700, y: 300, x2: 700, y2: 385, style: concours(3) }),
      o("f-left", { kind: "point", x: 325, y: 291, width: 18, height: 18 }),
      o("f-left-label", { kind: "text", x: 334, y: 330, text: "F" }),
      o("f-right", { kind: "point", x: 565, y: 291, width: 18, height: 18 }),
      o("f-right-label", { kind: "text", x: 574, y: 330, text: "F′" }),
    ],
  },
  {
    id: "heat-engine",
    title: "Machine thermique",
    category: "Thermodynamique",
    description: "Sources chaude et froide, machine, chaleur et travail.",
    sourceName: "Janosh Diagrams",
    sourceUrl: "https://diagrams.janosh.dev/",
    license: "Création originale à partir de concepts MIT",
    objects: [
      o("hot", { kind: "thermal-reservoir", x: 390, y: 70, width: 120, height: 90, annotations: { main: "Tₕ" } }),
      o("engine", { kind: "heat-engine", x: 375, y: 235, width: 150, height: 120, annotations: { main: "machine", hot: "Qₕ", cold: "Q𝚌", work: "W" } }),
      o("cold", { kind: "thermal-reservoir", x: 390, y: 420, width: 120, height: 90, annotations: { main: "T𝚌" } }),
      o("qh", { kind: "heat-arrow", x: 450, y: 160, x2: 450, y2: 235, annotations: { main: "Qₕ" }, style: concours(3) }),
      o("qc", { kind: "heat-arrow", x: 450, y: 355, x2: 450, y2: 420, annotations: { main: "Q𝚌" }, style: concours(3) }),
      o("work", { kind: "work-arrow", x: 525, y: 295, x2: 700, y2: 295, annotations: { main: "W" }, style: concours(3) }),
    ],
  },
  {
    id: "titration",
    title: "Dosage par titrage",
    category: "Chimie",
    description: "Burette, bécher, agitateur et support pour un montage de dosage.",
    sourceName: "Sketch2LaTeX",
    sourceUrl: "https://tikz.net/tag/chemistry/",
    license: "Création originale inspirée des conventions TikZ",
    objects: [
      o("stand", { kind: "support-stand", x: 220, y: 80, width: 170, height: 350 }),
      o("burette", { kind: "burette", x: 360, y: 85, width: 50, height: 270 }),
      o("beaker", { kind: "beaker", x: 360, y: 365, width: 135, height: 140 }),
      o("stirrer", { kind: "magnetic-stirrer", x: 340, y: 455, width: 175, height: 90 }),
      o("drop", { kind: "dashed-line", x: 385, y: 355, x2: 410, y2: 390, style: concours() }),
      o("titrant", { kind: "text", x: 470, y: 180, text: "solution titrante" }),
      o("analyte", { kind: "text", x: 565, y: 430, text: "solution à doser" }),
    ],
  },
  {
    id: "electrochemical-cell",
    title: "Pile électrochimique",
    category: "Chimie",
    description: "Deux demi-piles, pont salin et circuit extérieur.",
    sourceName: "Janosh Diagrams",
    sourceUrl: "https://diagrams.janosh.dev/",
    license: "Création originale à partir de concepts MIT",
    objects: [
      o("cell", { kind: "electrochemical-cell", x: 230, y: 190, width: 440, height: 280, annotations: { anode: "Zn (−)", cathode: "Cu (+)", bridge: "pont salin" } }),
      o("wire-left", { kind: "wire", x: 340, y: 225, x2: 340, y2: 100 }),
      o("wire-top", { kind: "wire", x: 340, y: 100, x2: 560, y2: 100 }),
      o("wire-right", { kind: "wire", x: 560, y: 100, x2: 560, y2: 225 }),
      o("current", { kind: "arrow", x: 390, y: 75, x2: 510, y2: 75, style: concours() }),
      o("current-label", { kind: "text", x: 450, y: 55, text: "e⁻" }),
    ],
  },
  {
    id: "multi-graph",
    title: "Comparaison de fonctions",
    category: "Mathématiques",
    description: "Repère avec plusieurs courbes, domaine, axes et légendes modifiables.",
    sourceName: "TikZ.net",
    sourceUrl: "https://tikz.net/data/",
    license: "Adapté sous CC BY-SA 4.0",
    objects: [
      o("graph", { kind: "axes", x: 170, y: 90, width: 560, height: 390, graph: { expression: "sin(x)", expressions: ["sin(x)", "cos(x)", "0.25*x^2-1"], xMin: -6, xMax: 6, yMin: -3, yMax: 3, xLabel: "x", yLabel: "y", showGrid: true } }),
      o("legend", { kind: "text", x: 670, y: 125, text: "sin(x), cos(x), 0.25x²−1" }),
    ],
  },
];

export const cloneTemplateObjects = (template: DiagramTemplate) => {
  const suffix = Math.random().toString(36).slice(2, 7);
  const ids = new Map(template.objects.map((object) => [object.id, `${object.id}-${suffix}`]));
  const groups = new Map(template.objects.flatMap((object) => object.groupId ? [[object.groupId, `${object.groupId}-${suffix}`] as const] : []));
  return template.objects.map((object) => ({
    ...object,
    id: ids.get(object.id)!,
    groupId: object.groupId ? groups.get(object.groupId) : undefined,
    bindings: object.bindings ? { startId: ids.get(object.bindings.startId ?? ""), startPort: object.bindings.startPort, startRatio: object.bindings.startRatio, endId: ids.get(object.bindings.endId ?? ""), endPort: object.bindings.endPort, endRatio: object.bindings.endRatio } : undefined,
    style: object.style ? { ...object.style } : undefined,
    graph: object.graph ? { ...object.graph, expressions: object.graph.expressions ? [...object.graph.expressions] : undefined } : undefined,
    annotations: object.annotations ? { ...object.annotations } : undefined,
    points: object.points?.map((point) => ({ ...point })),
    control: object.control ? { ...object.control } : undefined,
  }));
};
