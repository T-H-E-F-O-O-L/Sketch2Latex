export type ObjectKind =
  | "freehand" | "line" | "arrow" | "rect" | "circle" | "ellipse" | "text" | "axes"
  | "wire" | "resistor" | "capacitor" | "inductor" | "battery" | "switch" | "ground"
  | "voltmeter" | "ammeter" | "gbf" | "oscilloscope"
  | "spring" | "force" | "mass" | "inclined-plane" | "pulley" | "pendulum" | "reference-frame" | "circular-trajectory" | "gravity-field"
  | "lens" | "diverging-lens" | "plane-mirror" | "screen" | "prism" | "fiber" | "light-ray" | "wave"
  | "electric-field" | "magnetic-field-in" | "magnetic-field-out" | "bar-magnet" | "coil" | "solenoid" | "laplace-rails" | "charged-particle"
  | "heat-arrow" | "work-arrow" | "piston-cylinder" | "thermal-reservoir" | "heat-engine" | "phase-diagram" | "clapeyron-diagram" | "energy-diagram"
  | "bond-single" | "bond-double" | "bond-triple" | "reaction-arrow" | "equilibrium-arrow" | "hydrogen-bond" | "dipole" | "ion" | "lone-pair" | "crystal-fcc" | "precipitate" | "electrochemical-cell"
  | "beaker" | "flask" | "test-tube" | "burette" | "volumetric-flask" | "separatory-funnel" | "pipette" | "thermometer" | "bunsen-burner";

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
  rotation?: number;
  points?: Point[];
  text?: string;
  style?: { stroke?: string; strokeWidth?: number; fill?: string };
  graph?: { expression: string; xMin: number; xMax: number };
};

export const connectorKinds: ObjectKind[] = [
  "line", "arrow", "wire", "resistor", "capacitor", "inductor", "battery", "switch", "voltmeter", "ammeter",
  "spring", "force", "light-ray", "wave", "heat-arrow", "work-arrow", "bond-single", "bond-double", "bond-triple",
  "reaction-arrow", "equilibrium-arrow", "hydrogen-bond", "dipole",
];

export const stampKinds: ObjectKind[] = [
  "ground", "gbf", "oscilloscope", "mass", "inclined-plane", "pulley", "pendulum", "reference-frame", "circular-trajectory", "gravity-field",
  "lens", "diverging-lens", "plane-mirror", "screen", "prism", "fiber", "electric-field", "magnetic-field-in", "magnetic-field-out", "bar-magnet", "coil", "solenoid", "laplace-rails", "charged-particle",
  "piston-cylinder", "thermal-reservoir", "heat-engine", "phase-diagram", "clapeyron-diagram", "energy-diagram",
  "ion", "lone-pair", "crystal-fcc", "precipitate", "electrochemical-cell", "beaker", "flask", "test-tube", "burette", "volumetric-flask", "separatory-funnel", "pipette", "thermometer", "bunsen-burner",
];

export const labels: Record<ObjectKind, string> = {
  freehand: "Main levée", line: "Segment", arrow: "Flèche", rect: "Rectangle", circle: "Cercle", ellipse: "Ellipse", text: "Texte", axes: "Repère / graphe",
  wire: "Fil", resistor: "Résistance R", capacitor: "Condensateur C", inductor: "Bobine L", battery: "Générateur", switch: "Interrupteur", ground: "Masse / terre", voltmeter: "Voltmètre", ammeter: "Ampèremètre", gbf: "GBF", oscilloscope: "Oscilloscope",
  spring: "Ressort", force: "Vecteur force", mass: "Masse m", "inclined-plane": "Plan incliné", pulley: "Poulie", pendulum: "Pendule", "reference-frame": "Repère (O,x,y)", "circular-trajectory": "Trajectoire circulaire", "gravity-field": "Champ de pesanteur",
  lens: "Lentille convergente", "diverging-lens": "Lentille divergente", "plane-mirror": "Miroir plan", screen: "Écran", prism: "Prisme", fiber: "Fibre optique", "light-ray": "Rayon lumineux", wave: "Onde progressive",
  "electric-field": "Champ électrique", "magnetic-field-in": "Champ B entrant", "magnetic-field-out": "Champ B sortant", "bar-magnet": "Aimant droit", coil: "Spire", solenoid: "Bobine longue", "laplace-rails": "Rails de Laplace", "charged-particle": "Particule chargée",
  "heat-arrow": "Transfert thermique Q", "work-arrow": "Travail W", "piston-cylinder": "Piston-cylindre", "thermal-reservoir": "Réservoir thermique", "heat-engine": "Machine thermique", "phase-diagram": "Diagramme (P,T)", "clapeyron-diagram": "Diagramme de Clapeyron", "energy-diagram": "Diagramme d'énergie",
  "bond-single": "Liaison simple", "bond-double": "Liaison double", "bond-triple": "Liaison triple", "reaction-arrow": "Flèche de réaction", "equilibrium-arrow": "Équilibre chimique", "hydrogen-bond": "Liaison hydrogène", dipole: "Moment dipolaire", ion: "Ion", "lone-pair": "Doublet non liant", "crystal-fcc": "Maille CFC", precipitate: "Précipité", "electrochemical-cell": "Pile électrochimique",
  beaker: "Bécher", flask: "Erlenmeyer", "test-tube": "Tube à essai", burette: "Burette", "volumetric-flask": "Fiole jaugée", "separatory-funnel": "Ampoule à décanter", pipette: "Pipette jaugée", thermometer: "Thermomètre", "bunsen-burner": "Bec Bunsen",
};

export type ToolboxGroup = { title: string; kinds: Array<ObjectKind | "select"> };

export const toolboxGroups: ToolboxGroup[] = [
  { title: "Outils", kinds: ["select", "line", "arrow", "rect", "circle", "ellipse", "freehand", "text", "axes"] },
  { title: "Électricité & signaux", kinds: ["wire", "resistor", "capacitor", "inductor", "battery", "switch", "ground", "voltmeter", "ammeter", "gbf", "oscilloscope"] },
  { title: "Optique & ondes", kinds: ["lens", "diverging-lens", "plane-mirror", "screen", "prism", "fiber", "light-ray", "wave"] },
  { title: "Mécanique", kinds: ["force", "spring", "mass", "inclined-plane", "pulley", "pendulum", "reference-frame", "circular-trajectory", "gravity-field"] },
  { title: "Champs & induction", kinds: ["electric-field", "magnetic-field-in", "magnetic-field-out", "bar-magnet", "coil", "solenoid", "laplace-rails", "charged-particle"] },
  { title: "Thermodynamique", kinds: ["heat-arrow", "work-arrow", "piston-cylinder", "thermal-reservoir", "heat-engine", "phase-diagram", "clapeyron-diagram", "energy-diagram"] },
  { title: "Chimie", kinds: ["bond-single", "bond-double", "bond-triple", "reaction-arrow", "equilibrium-arrow", "hydrogen-bond", "dipole", "ion", "lone-pair", "crystal-fcc", "precipitate", "electrochemical-cell"] },
  { title: "Verrerie & mesures", kinds: ["beaker", "flask", "test-tube", "burette", "volumetric-flask", "separatory-funnel", "pipette", "thermometer", "bunsen-burner"] },
];

const sizes: Partial<Record<ObjectKind, { width: number; height: number }>> = {
  ground: { width: 44, height: 42 }, gbf: { width: 70, height: 70 }, oscilloscope: { width: 100, height: 70 }, mass: { width: 70, height: 55 }, "inclined-plane": { width: 100, height: 80 }, pulley: { width: 85, height: 85 }, pendulum: { width: 80, height: 110 }, "reference-frame": { width: 100, height: 80 }, "circular-trajectory": { width: 90, height: 90 }, "gravity-field": { width: 95, height: 85 },
  lens: { width: 60, height: 120 }, "diverging-lens": { width: 60, height: 120 }, "plane-mirror": { width: 34, height: 120 }, screen: { width: 34, height: 120 }, prism: { width: 90, height: 80 }, fiber: { width: 140, height: 65 }, "electric-field": { width: 100, height: 75 }, "magnetic-field-in": { width: 90, height: 75 }, "magnetic-field-out": { width: 90, height: 75 }, "bar-magnet": { width: 110, height: 48 }, coil: { width: 100, height: 70 }, solenoid: { width: 130, height: 80 }, "laplace-rails": { width: 140, height: 90 }, "charged-particle": { width: 50, height: 50 },
  "piston-cylinder": { width: 100, height: 105 }, "thermal-reservoir": { width: 78, height: 78 }, "heat-engine": { width: 120, height: 100 }, "phase-diagram": { width: 150, height: 115 }, "clapeyron-diagram": { width: 150, height: 115 }, "energy-diagram": { width: 150, height: 100 },
  ion: { width: 52, height: 52 }, "lone-pair": { width: 42, height: 42 }, "crystal-fcc": { width: 110, height: 100 }, precipitate: { width: 80, height: 90 }, "electrochemical-cell": { width: 145, height: 100 }, beaker: { width: 80, height: 100 }, flask: { width: 85, height: 100 }, "test-tube": { width: 52, height: 105 }, burette: { width: 38, height: 140 }, "volumetric-flask": { width: 85, height: 110 }, "separatory-funnel": { width: 75, height: 120 }, pipette: { width: 135, height: 36 }, thermometer: { width: 42, height: 130 }, "bunsen-burner": { width: 75, height: 100 },
};

export const stampSize = (kind: ObjectKind) => sizes[kind] ?? { width: 70, height: 80 };
