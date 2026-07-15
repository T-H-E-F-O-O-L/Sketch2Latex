export type ObjectKind =
  | "freehand" | "line" | "dashed-line" | "curve" | "arrow" | "double-arrow" | "dimension" | "point" | "rect" | "circle" | "ellipse" | "text" | "equation" | "raw-tikz" | "axes"
  | "wire" | "resistor" | "capacitor" | "inductor" | "battery" | "switch" | "ground"
  | "op-amp" | "op-amp-comparator" | "op-amp-inverting" | "op-amp-non-inverting" | "op-amp-summing" | "op-amp-integrator" | "op-amp-differentiator" | "op-amp-schmitt"
  | "voltmeter" | "ammeter" | "gbf" | "oscilloscope"
  | "spring" | "force" | "mass" | "pulley" | "pendulum" | "reference-frame" | "circular-trajectory" | "gravity-field"
  | "lens" | "diverging-lens" | "plane-mirror" | "screen" | "prism" | "fiber" | "light-ray" | "wave"
  | "electric-field" | "magnetic-field-in" | "magnetic-field-out" | "bar-magnet" | "coil" | "solenoid" | "laplace-rails" | "charged-particle"
  | "heat-arrow" | "work-arrow" | "piston-cylinder" | "thermal-reservoir" | "heat-engine"
  | "bond-single" | "bond-double" | "bond-triple" | "reaction-arrow" | "equilibrium-arrow" | "hydrogen-bond" | "dipole" | "ion" | "lone-pair" | "crystal-fcc" | "precipitate" | "electrochemical-cell"
  | "beaker" | "flask" | "round-bottom-flask" | "distillation-flask" | "test-tube" | "graduated-cylinder" | "burette" | "volumetric-flask" | "separatory-funnel" | "pipette" | "filter-funnel" | "wash-bottle" | "liebig-condenser" | "support-stand" | "magnetic-stirrer" | "thermometer" | "bunsen-burner";

export type Point = { x: number; y: number };

export type CanvasObject = {
  id: string;
  kind: ObjectKind;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  points?: Point[];
  control?: Point;
  text?: string;
  rawTikz?: string;
  annotations?: Record<string, string>;
  style?: { stroke?: string; strokeWidth?: number; fill?: string };
  graph?: { expression: string; expressions?: string[]; xMin: number; xMax: number; yMin?: number; yMax?: number; xLabel?: string; yLabel?: string; showGrid?: boolean };
  bindings?: { startId?: string; endId?: string };
  groupId?: string;
  locked?: boolean;
  hidden?: boolean;
};

export type DocumentSettings = {
  width: number;
  height: number;
  unit: "cm" | "mm" | "pt" | "tikz";
  orientation: "landscape" | "portrait";
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
};

export const defaultDocumentSettings: DocumentSettings = {
  width: 900,
  height: 560,
  unit: "cm",
  orientation: "landscape",
  gridSize: 20,
  showGrid: true,
  snapToGrid: true,
};

const annotationDefaults: Partial<Record<ObjectKind, Record<string, string>>> = {
  arrow: { main: "" }, force: { main: "F" },
  voltmeter: { main: "V" }, ammeter: { main: "A" }, gbf: { main: "GBF" }, oscilloscope: { main: "oscillo" }, mass: { main: "m" },
  "reference-frame": { x: "x", y: "y", origin: "O" }, "circular-trajectory": { origin: "O" }, "gravity-field": { main: "g" },
  "electric-field": { main: "E" }, "bar-magnet": { north: "N", south: "S" }, "laplace-rails": { velocity: "v" }, "charged-particle": { main: "q" },
  dimension: { main: "d" }, "heat-arrow": { main: "Q" }, "work-arrow": { main: "W" }, dipole: { main: "μ" }, "piston-cylinder": { main: "P, V, T" }, "thermal-reservoir": { main: "T" },
  "heat-engine": { main: "machine", hot: "Qh", cold: "Qc", work: "W" }, ion: { main: "ion" },
  "electrochemical-cell": { anode: "anode (−)", cathode: "cathode (+)", bridge: "pont salin" },
};

export function defaultAnnotations(kind: ObjectKind) {
  const annotations = annotationDefaults[kind];
  return annotations ? { ...annotations } : undefined;
}

export const annotation = (object: CanvasObject, key: string, fallback: string) => object.annotations?.[key] ?? fallback;

export const connectorKinds: ObjectKind[] = [
  "line", "dashed-line", "curve", "arrow", "double-arrow", "dimension", "wire", "resistor", "capacitor", "inductor", "battery", "switch", "voltmeter", "ammeter",
  "lens", "diverging-lens",
  "spring", "force", "light-ray", "wave", "heat-arrow", "work-arrow", "bond-single", "bond-double", "bond-triple",
  "reaction-arrow", "equilibrium-arrow", "hydrogen-bond", "dipole",
];

export const stampKinds: ObjectKind[] = [
  "point", "equation", "ground", "gbf", "oscilloscope", "mass", "pulley", "pendulum", "reference-frame", "circular-trajectory", "gravity-field",
  "plane-mirror", "screen", "prism", "fiber", "electric-field", "magnetic-field-in", "magnetic-field-out", "bar-magnet", "coil", "solenoid", "laplace-rails", "charged-particle",
  "piston-cylinder", "thermal-reservoir", "heat-engine",
  "ion", "lone-pair", "crystal-fcc", "precipitate", "electrochemical-cell", "beaker", "flask", "round-bottom-flask", "distillation-flask", "test-tube", "graduated-cylinder", "burette", "volumetric-flask", "separatory-funnel", "pipette", "filter-funnel", "wash-bottle", "liebig-condenser", "support-stand", "magnetic-stirrer", "thermometer", "bunsen-burner",
  "op-amp", "op-amp-comparator", "op-amp-inverting", "op-amp-non-inverting", "op-amp-summing", "op-amp-integrator", "op-amp-differentiator", "op-amp-schmitt",
];

export const labels: Record<ObjectKind, string> = {
  freehand: "Main levée", line: "Segment", "dashed-line": "Trait pointillé", curve: "Courbe de Bézier", arrow: "Flèche", "double-arrow": "Double flèche", dimension: "Cote / mesure", point: "Point", rect: "Rectangle", circle: "Cercle", ellipse: "Ellipse", text: "Texte", axes: "Repère / graphe",
  wire: "Fil", resistor: "Résistance R", capacitor: "Condensateur C", inductor: "Bobine L", battery: "Générateur", switch: "Interrupteur", ground: "Masse / terre", voltmeter: "Voltmètre", ammeter: "Ampèremètre", gbf: "GBF", oscilloscope: "Oscilloscope",
  spring: "Ressort", force: "Vecteur force", mass: "Masse m", pulley: "Poulie", pendulum: "Pendule", "reference-frame": "Repère (O,x,y)", "circular-trajectory": "Trajectoire circulaire", "gravity-field": "Champ de pesanteur",
  lens: "Lentille convergente", "diverging-lens": "Lentille divergente", "plane-mirror": "Miroir plan", screen: "Écran", prism: "Prisme", fiber: "Fibre optique", "light-ray": "Rayon lumineux", wave: "Onde progressive",
  "electric-field": "Champ électrique", "magnetic-field-in": "Champ B entrant", "magnetic-field-out": "Champ B sortant", "bar-magnet": "Aimant droit", coil: "Spire", solenoid: "Bobine longue", "laplace-rails": "Rails de Laplace", "charged-particle": "Particule chargée",
  "heat-arrow": "Transfert thermique Q", "work-arrow": "Travail W", "piston-cylinder": "Piston-cylindre", "thermal-reservoir": "Réservoir thermique", "heat-engine": "Machine thermique",
  "bond-single": "Liaison simple", "bond-double": "Liaison double", "bond-triple": "Liaison triple", "reaction-arrow": "Flèche de réaction", "equilibrium-arrow": "Équilibre chimique", "hydrogen-bond": "Liaison hydrogène", dipole: "Moment dipolaire", ion: "Ion", "lone-pair": "Doublet non liant", "crystal-fcc": "Maille CFC", precipitate: "Précipité", "electrochemical-cell": "Pile électrochimique",
  beaker: "Bécher", flask: "Erlenmeyer", "round-bottom-flask": "Ballon à fond rond", "distillation-flask": "Ballon à distiller", "test-tube": "Tube à essai", "graduated-cylinder": "Éprouvette graduée", burette: "Burette", "volumetric-flask": "Fiole jaugée", "separatory-funnel": "Ampoule à décanter", pipette: "Pipette jaugée", "filter-funnel": "Entonnoir de filtration", "wash-bottle": "Pissette", "liebig-condenser": "Réfrigérant droit", "support-stand": "Potence", "magnetic-stirrer": "Agitateur magnétique", thermometer: "Thermomètre", "bunsen-burner": "Bec Bunsen",
  "op-amp": "AOP standard", "op-amp-comparator": "AOP comparateur", "op-amp-inverting": "AOP inverseur", "op-amp-non-inverting": "AOP non-inverseur", "op-amp-summing": "AOP sommateur", "op-amp-integrator": "AOP intégrateur", "op-amp-differentiator": "AOP dérivateur", "op-amp-schmitt": "AOP trigger de Schmitt", equation: "Équation LaTeX", "raw-tikz": "TikZ protégé",
};

export type ToolboxGroup = { title: string; kinds: Array<ObjectKind | "select"> };

export const toolboxGroups: ToolboxGroup[] = [
  { title: "Outils", kinds: ["select", "line", "dashed-line", "curve", "arrow", "double-arrow", "dimension", "point", "rect", "circle", "ellipse", "freehand", "text", "equation", "axes"] },
  { title: "Électricité & signaux", kinds: ["wire", "resistor", "capacitor", "inductor", "battery", "switch", "ground", "voltmeter", "ammeter", "gbf", "oscilloscope"] },
  { title: "Optique & ondes", kinds: ["lens", "diverging-lens", "plane-mirror", "screen", "prism", "fiber", "light-ray", "wave"] },
  { title: "Mécanique", kinds: ["force", "spring", "mass", "pulley", "pendulum", "reference-frame", "circular-trajectory", "gravity-field"] },
  { title: "Champs & induction", kinds: ["electric-field", "magnetic-field-in", "magnetic-field-out", "bar-magnet", "coil", "solenoid", "laplace-rails", "charged-particle"] },
  { title: "Thermodynamique", kinds: ["heat-arrow", "work-arrow", "piston-cylinder", "thermal-reservoir", "heat-engine"] },
  { title: "Chimie", kinds: ["bond-single", "bond-double", "bond-triple", "reaction-arrow", "equilibrium-arrow", "hydrogen-bond", "dipole", "ion", "lone-pair", "crystal-fcc", "precipitate", "electrochemical-cell"] },
  { title: "Verrerie & matériel de TP", kinds: ["beaker", "flask", "round-bottom-flask", "distillation-flask", "test-tube", "graduated-cylinder", "burette", "volumetric-flask", "separatory-funnel", "pipette", "filter-funnel", "wash-bottle", "liebig-condenser", "support-stand", "magnetic-stirrer", "thermometer", "bunsen-burner"] },
  { title: "Amplificateurs opérationnels", kinds: ["op-amp", "op-amp-comparator", "op-amp-inverting", "op-amp-non-inverting", "op-amp-summing", "op-amp-integrator", "op-amp-differentiator", "op-amp-schmitt"] },
];

const sizes: Partial<Record<ObjectKind, { width: number; height: number }>> = {
  point: { width: 18, height: 18 }, equation: { width: 220, height: 70 }, "raw-tikz": { width: 180, height: 70 },
  ground: { width: 44, height: 42 }, gbf: { width: 70, height: 70 }, oscilloscope: { width: 100, height: 70 }, mass: { width: 70, height: 55 }, pulley: { width: 85, height: 85 }, pendulum: { width: 80, height: 110 }, "reference-frame": { width: 100, height: 80 }, "circular-trajectory": { width: 90, height: 90 }, "gravity-field": { width: 95, height: 85 },
  lens: { width: 60, height: 120 }, "diverging-lens": { width: 60, height: 120 }, "plane-mirror": { width: 34, height: 120 }, screen: { width: 34, height: 120 }, prism: { width: 90, height: 80 }, fiber: { width: 140, height: 65 }, "electric-field": { width: 100, height: 75 }, "magnetic-field-in": { width: 90, height: 75 }, "magnetic-field-out": { width: 90, height: 75 }, "bar-magnet": { width: 110, height: 48 }, coil: { width: 100, height: 70 }, solenoid: { width: 130, height: 80 }, "laplace-rails": { width: 140, height: 90 }, "charged-particle": { width: 50, height: 50 },
  "piston-cylinder": { width: 100, height: 105 }, "thermal-reservoir": { width: 78, height: 78 }, "heat-engine": { width: 120, height: 100 },
  ion: { width: 52, height: 52 }, "lone-pair": { width: 42, height: 42 }, "crystal-fcc": { width: 110, height: 100 }, precipitate: { width: 80, height: 90 }, "electrochemical-cell": { width: 240, height: 160 }, beaker: { width: 80, height: 100 }, flask: { width: 85, height: 105 }, "round-bottom-flask": { width: 92, height: 112 }, "distillation-flask": { width: 115, height: 108 }, "test-tube": { width: 52, height: 105 }, "graduated-cylinder": { width: 54, height: 145 }, burette: { width: 38, height: 140 }, "volumetric-flask": { width: 90, height: 125 }, "separatory-funnel": { width: 78, height: 125 }, pipette: { width: 42, height: 145 }, "filter-funnel": { width: 82, height: 115 }, "wash-bottle": { width: 82, height: 100 }, "liebig-condenser": { width: 165, height: 70 }, "support-stand": { width: 130, height: 175 }, "magnetic-stirrer": { width: 120, height: 100 }, thermometer: { width: 42, height: 130 }, "bunsen-burner": { width: 75, height: 100 },
  "op-amp": { width: 150, height: 105 }, "op-amp-comparator": { width: 150, height: 105 }, "op-amp-inverting": { width: 170, height: 120 }, "op-amp-non-inverting": { width: 170, height: 120 }, "op-amp-summing": { width: 180, height: 125 }, "op-amp-integrator": { width: 180, height: 125 }, "op-amp-differentiator": { width: 180, height: 125 }, "op-amp-schmitt": { width: 180, height: 125 },
};

export const stampSize = (kind: ObjectKind) => sizes[kind] ?? { width: 70, height: 80 };
