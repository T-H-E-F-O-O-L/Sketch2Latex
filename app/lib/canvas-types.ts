export type ObjectKind =
  | "freehand" | "line" | "dashed-line" | "curve" | "arrow" | "double-arrow" | "dimension" | "point" | "rect" | "circle" | "ellipse" | "text" | "equation" | "raw-tikz" | "axes"
  | "wire" | "resistor" | "capacitor" | "inductor" | "battery" | "voltage-source" | "current-source" | "switch" | "transformer" | "ground"
  | "op-amp" | "op-amp-comparator" | "op-amp-inverting" | "op-amp-non-inverting" | "op-amp-summing" | "op-amp-integrator" | "op-amp-differentiator" | "op-amp-schmitt"
  | "signal-arrow" | "transfer-block" | "summing-junction" | "takeoff-point"
  | "bode-diagram" | "bode-trace" | "bode-break" | "bode-slope" | "stability-margin" | "time-response-diagram" | "time-response-trace" | "settling-band" | "performance-marker" | "pole-zero-map"
  | "sysml-frame" | "functional-block" | "typed-flow" | "state-node" | "state-pseudostate" | "state-transition" | "choice-junction" | "fork-join" | "chronogram-lane"
  | "sysml-requirement" | "sysml-requirement-link" | "sysml-block" | "sysml-structural-link" | "sysml-part" | "sysml-port" | "sysml-connector" | "sysml-item-flow"
  | "voltmeter" | "ammeter" | "gbf" | "oscilloscope"
  | "spring" | "force" | "mass" | "pulley" | "pendulum" | "reference-frame" | "circular-trajectory" | "gravity-field" | "joint-pivot" | "joint-slider" | "joint-ball" | "joint-cylindrical" | "joint-helical" | "joint-planar" | "joint-line-contact" | "joint-annular" | "joint-point-contact"
  | "gear-pair" | "rack-pinion" | "belt-drive" | "screw-nut" | "worm-gear" | "planetary-gear" | "cam-follower"
  | "electric-motor" | "gear-reducer" | "clutch" | "brake"
  | "hydraulic-pump" | "hydraulic-reservoir" | "hydraulic-cylinder" | "hydraulic-valve-4-3" | "pressure-relief-valve"
  | "pneumatic-source" | "pneumatic-service-unit" | "pneumatic-frl" | "pneumatic-cylinder" | "pneumatic-valve-5-2" | "one-way-flow-control" | "pneumatic-exhaust"
  | "hidden-edge" | "centre-line" | "cutting-plane" | "section-hatch" | "datum-feature" | "feature-control-frame" | "surface-texture"
  | "lens" | "diverging-lens" | "plane-mirror" | "screen" | "prism" | "fiber" | "light-ray" | "wave"
  | "wave-source" | "wavefront" | "aperture-array" | "wave-path" | "fringe-screen" | "diffraction-cone" | "standing-wave" | "intensity-profile"
  | "electric-field" | "magnetic-field-in" | "magnetic-field-out" | "bar-magnet" | "coil" | "solenoid" | "laplace-rails" | "charged-particle"
  | "uniform-field-region" | "field-map" | "oriented-current-loop" | "magnetic-dipole" | "charged-particle-trajectory" | "rotating-rectangular-loop" | "faraday-magnet-coil" | "coupled-coils" | "electromechanical-converter"
  | "heat-arrow" | "work-arrow" | "piston-cylinder" | "thermal-reservoir" | "heat-engine"
  | "thermo-diagram" | "thermo-state" | "thermo-process" | "thermo-isotherm-family" | "phase-diagram-pt" | "liquid-vapour-dome" | "vapour-quality-line" | "thermo-cycle" | "pressure-work-area"
  | "bond-single" | "bond-double" | "bond-triple" | "reaction-arrow" | "equilibrium-arrow" | "hydrogen-bond" | "dipole" | "ion" | "lone-pair" | "crystal-fcc" | "precipitate" | "electrochemical-cell"
  | "chemical-atom" | "bond-wedge-solid" | "bond-wedge-hashed" | "bond-wavy" | "electron-pair-arrow" | "single-electron-arrow" | "mesomeric-arrow" | "newman-projection" | "skeletal-ring"
  | "beaker" | "flask" | "round-bottom-flask" | "distillation-flask" | "test-tube" | "graduated-cylinder" | "burette" | "volumetric-flask" | "separatory-funnel" | "pipette" | "filter-funnel" | "wash-bottle" | "liebig-condenser" | "support-stand" | "magnetic-stirrer" | "thermometer" | "bunsen-burner";

export type Point = { x: number; y: number };
export type ConnectionPortName = "start" | "end" | "segment" | "ground" | "input" | "input-left" | "input-top" | "input-bottom" | "output" | "branch" | "top" | "right" | "bottom" | "left" | "inverting" | "non-inverting" | "primary-top" | "primary-bottom" | "secondary-top" | "secondary-bottom" | "coil-start" | "coil-end" | "electrical-plus" | "electrical-minus" | "mechanical" | "solid-1" | "solid-2" | "worm" | "wheel" | "sun" | "carrier" | "ring" | "cam" | "follower" | "electrical" | "shaft" | "frame" | "rod" | "cap" | "rod-side" | "A" | "B" | "P" | "T" | "R" | "S" | "1" | "2" | "3" | "4" | "5" | "12" | "14";
export type StrokePattern = "solid" | "dashed" | "dotted" | "dash-dot";

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
  style?: { stroke?: string; strokeWidth?: number; strokePattern?: StrokePattern; fill?: string };
  graph?: { expression: string; expressions?: string[]; xMin: number; xMax: number; yMin?: number; yMax?: number; xLabel?: string; yLabel?: string; showGrid?: boolean };
  bindings?: { startId?: string; endId?: string; startPort?: ConnectionPortName; endPort?: ConnectionPortName; startRatio?: number; endRatio?: number };
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
  arrow: { main: "" }, "signal-arrow": { main: "x(p)" }, force: { main: "F" },
  "reaction-arrow": { above: "", below: "", reagent: "", solvent: "", temperature: "", duration: "" },
  "voltage-source": { main: "E" }, "current-source": { main: "I" }, transformer: { primary: "N_1", secondary: "N_2" }, voltmeter: { main: "V" }, ammeter: { main: "A" }, gbf: { main: "GBF" }, oscilloscope: { main: "oscillo" }, mass: { main: "m" },
  "reference-frame": { x: "x", y: "y", origin: "O" }, "circular-trajectory": { origin: "O" }, "gravity-field": { main: "g" },
  "electric-field": { main: "E" }, "bar-magnet": { north: "N", south: "S" }, "charged-particle": { main: "q" },
  "uniform-field-region": { fieldType: "magnétique", direction: "sortant", main: "B", density: "5" },
  "field-map": { fieldType: "magnétique", sourceType: "uniforme", representation: "vecteurs", main: "B", density: "5" },
  "oriented-current-loop": { loopShape: "circulaire", current: "i", normal: "n", orientation: "trigonométrique", showMoment: "oui" },
  "magnetic-dipole": { main: "m", field: "B", angle: "θ", torque: "Γ" },
  "charged-particle-trajectory": { charge: "q > 0", velocity: "v_0", field: "B", trajectoryType: "circulaire", main: "q" },
  "laplace-rails": { velocity: "v", current: "i", field: "B", force: "F_L" },
  "rotating-rectangular-loop": { current: "i", field: "B", flux: "Φ", angle: "θ", angularSpeed: "ω" },
  "faraday-magnet-coil": { motion: "approche", emf: "e", current: "i", flux: "Φ", law: "Lenz" },
  "coupled-coils": { primary: "N_1", secondary: "N_2", current1: "i_1", current2: "i_2", mutual: "M", dotConvention: "oui" },
  "electromechanical-converter": { mode: "moteur", voltage: "u", current: "i", torque: "C_m", angularSpeed: "ω", power: "P_em" },
  dimension: { main: "d" }, "heat-arrow": { main: "Q" }, "work-arrow": { main: "W" }, dipole: { main: "μ" }, "piston-cylinder": { main: "P, V, T" }, "thermal-reservoir": { main: "T" },
  "heat-engine": { main: "machine", hot: "Qh", cold: "Qc", work: "W" }, ion: { main: "ion" },
  "thermo-diagram": { diagramType: "P-V", title: "Diagramme de Clapeyron", xMin: "0", xMax: "10", yMin: "0", yMax: "10", xUnit: "m^3", yUnit: "Pa" },
  "thermo-state": { main: "1", pressure: "P_1", volume: "V_1", temperature: "T_1", showCoordinates: "oui" },
  "thermo-process": { processType: "isotherme", direction: "directe", main: "T = cste", exponent: "1.4", heat: "", work: "" },
  "thermo-isotherm-family": { count: "4", main: "T_1 < T_2 < T_3 < T_4" },
  "phase-diagram-pt": { title: "Diagramme de phases (P,T)", substance: "corps pur", fusionSlope: "positive" },
  "liquid-vapour-dome": { title: "Équilibre liquide-vapeur", criticalPoint: "C" },
  "vapour-quality-line": { quality: "0.5", main: "x = 0,5" },
  "thermo-cycle": { cycleType: "Carnot", direction: "moteur", main: "Cycle de Carnot" },
  "pressure-work-area": { main: "W = -∫P dV", areaType: "travail reçu" },
  "electrochemical-cell": { anode: "anode (−)", cathode: "cathode (+)", bridge: "pont salin" },
  "transfer-block": { main: "H(p)" }, "summing-junction": { left: "+", top: "+", bottom: "−" },
  "bode-diagram": { title: "Diagramme de Bode", transferFunction: "H(p)", omegaMin: "0.1", omegaMax: "1000", gainMin: "-60", gainMax: "40", phaseMin: "-180", phaseMax: "0", frequencyUnit: "rad/s" },
  "bode-trace": { channel: "module", traceType: "réel", model: "premier ordre", gain: "1", omega0: "10", damping: "0.7", main: "H" },
  "bode-break": { main: "ω_0" },
  "bode-slope": { main: "-20 dB/décade", slope: "-20" },
  "stability-margin": { marginType: "phase", omegaC: "10", marginValue: "45", main: "M_φ" },
  "time-response-diagram": { title: "Réponse temporelle", input: "échelon", signal: "y(t)", unit: "", timeMin: "0", timeMax: "10", yMin: "0", yMax: "1.5" },
  "time-response-trace": { model: "premier ordre", input: "échelon", gain: "1", tau: "1", omega0: "1", damping: "0.5", main: "y(t)" },
  "settling-band": { target: "1", tolerance: "5", main: "±5 %" },
  "performance-marker": { performanceType: "t5%", main: "t_5%" },
  "pole-zero-map": { main: "Pôles et zéros", poles: "-1+2i;-1-2i", zeros: "", realMin: "-5", realMax: "1", imagMin: "-4", imagMax: "4" },
  "sysml-frame": { diagram: "stm", name: "Système" },
  "functional-block": { function: "Traiter l’information", constituent: "Carte de commande" },
  "typed-flow": { flow: "information", main: "signal" },
  "state-node": { name: "État", entry: "", do: "", exit: "" },
  "state-pseudostate": { pseudostate: "initial" },
  "state-transition": { event: "événement", guard: "", action: "" },
  "fork-join": { orientation: "horizontal", forkRole: "fourche" },
  "chronogram-lane": { signal: "signal", waveform: "0,1,0,1", chronogram: "binaire", times: "t_0,t_1,t_2,t_3,t_4" },
  "sysml-requirement": { name: "Exigence", reqId: "REQ-1", statement: "Le système doit satisfaire cette exigence." },
  "sysml-requirement-link": { requirementRelation: "satisfy" },
  "sysml-block": { name: "Bloc", values: "", parts: "", references: "", operations: "" },
  "sysml-structural-link": { structuralRelation: "association", symbolEnd: "début", startRole: "", startMultiplicity: "1", endRole: "", endMultiplicity: "1" },
  "sysml-part": { name: "partie", blockType: "Bloc" },
  "sysml-port": { name: "p", interfaceType: "Interface", portDirection: "inout" },
  "sysml-connector": { main: "" },
  "sysml-item-flow": { name: "flux", itemType: "Information", flowDirection: "début vers fin" },
  "wave-source": { name: "S", sourceType: "ponctuelle", phase: "0" },
  wavefront: { wavefrontType: "circulaire", direction: "droite", main: "φ = constante" },
  "aperture-array": { apertureType: "trous d’Young", count: "2", spacing: "a", opening: "b" },
  "wave-path": { main: "δ(M)", medium: "n = 1", pathStyle: "réel" },
  "fringe-screen": { screenName: "Écran", pointName: "M", fringeCount: "7", fringeSpacing: "i" },
  "diffraction-cone": { opening: "a", angle: "θ", wavelength: "λ", distance: "D" },
  "standing-wave": { main: "y(x,t)", mode: "3", showAntinodes: "oui" },
  "intensity-profile": { profileType: "interférence", main: "I(x)", fringeCount: "7" },
  "chemical-atom": { element: "C", hydrogens: "0", charge: "", isotope: "", radical: "non", electronVacancy: "non", lonePairs: "0" },
  "bond-wedge-solid": { wideEnd: "fin" },
  "bond-wedge-hashed": { wideEnd: "fin" },
  "bond-wavy": { main: "" },
  "electron-pair-arrow": { main: "", curvature: "gauche" },
  "single-electron-arrow": { main: "", curvature: "gauche" },
  "mesomeric-arrow": { main: "" },
  "newman-projection": { conformation: "décalée", front1: "H", front2: "H", front3: "CH_3", rear1: "H", rear2: "H", rear3: "CH_3", rotation: "0" },
  "skeletal-ring": { ringSize: "6", ringType: "aromatique", substituent1: "", substituent2: "" },
  "gear-pair": { driver: "Z_1", driven: "Z_2" }, "rack-pinion": { pinion: "Z", rack: "x" }, "belt-drive": { driver: "D_1", driven: "D_2" }, "screw-nut": { pitch: "p" },
  "worm-gear": { worm: "Z_v", wheel: "Z_r" }, "planetary-gear": { sun: "Z_s", ring: "Z_c", carrier: "PS" }, "cam-follower": { cam: "C", follower: "S" },
  "electric-motor": { main: "M" }, "gear-reducer": { main: "r" }, clutch: { main: "E" }, brake: { main: "F" },
  "hydraulic-pump": { main: "P" }, "hydraulic-reservoir": { main: "T" }, "hydraulic-cylinder": { main: "1A" }, "hydraulic-valve-4-3": { main: "1V" }, "pressure-relief-valve": { main: "p_0" },
  "pneumatic-source": { main: "0P1" }, "pneumatic-service-unit": { main: "0Z1" }, "pneumatic-frl": { main: "0Z2" }, "pneumatic-cylinder": { main: "1A1" }, "pneumatic-valve-5-2": { main: "1V1", actuator: "1M1" }, "one-way-flow-control": { main: "1V2" }, "pneumatic-exhaust": { main: "" },
  "cutting-plane": { main: "A" },
  "datum-feature": { datum: "A" },
  "feature-control-frame": { characteristic: "position", tolerance: "0,02", diameter: "oui", modifier: "", datum1: "A", datum2: "B", datum3: "C" },
  "surface-texture": { requirement: "enlèvement", parameter: "Ra", value: "3,2", process: "", lay: "", allAround: "non" },
};

export function defaultAnnotations(kind: ObjectKind) {
  const annotations = annotationDefaults[kind];
  return annotations ? { ...annotations } : undefined;
}

export const annotation = (object: CanvasObject, key: string, fallback: string) => object.annotations?.[key] ?? fallback;

export const connectorKinds: ObjectKind[] = [
  "line", "dashed-line", "hidden-edge", "centre-line", "cutting-plane", "datum-feature", "feature-control-frame", "surface-texture", "curve", "arrow", "signal-arrow", "bode-break", "bode-slope", "performance-marker", "typed-flow", "state-transition", "sysml-requirement-link", "sysml-structural-link", "sysml-connector", "sysml-item-flow", "double-arrow", "dimension", "wire", "resistor", "capacitor", "inductor", "battery", "voltage-source", "current-source", "switch", "voltmeter", "ammeter",
  "lens", "diverging-lens", "wave-path", "standing-wave",
  "spring", "force", "light-ray", "wave", "heat-arrow", "work-arrow", "bond-single", "bond-double", "bond-triple", "bond-wedge-solid", "bond-wedge-hashed", "bond-wavy",
  "thermo-process",
  "charged-particle-trajectory",
  "reaction-arrow", "electron-pair-arrow", "single-electron-arrow", "mesomeric-arrow", "equilibrium-arrow", "hydrogen-bond", "dipole",
];

export const stampKinds: ObjectKind[] = [
  "point", "equation", "section-hatch", "ground", "transformer", "gbf", "oscilloscope", "transfer-block", "summing-junction", "takeoff-point", "bode-diagram", "bode-trace", "stability-margin", "time-response-diagram", "time-response-trace", "settling-band", "pole-zero-map", "sysml-frame", "functional-block", "state-node", "state-pseudostate", "choice-junction", "fork-join", "chronogram-lane", "sysml-requirement", "sysml-block", "sysml-part", "sysml-port", "mass", "pulley", "pendulum", "reference-frame", "circular-trajectory", "gravity-field", "joint-pivot", "joint-slider", "joint-ball", "joint-cylindrical", "joint-helical", "joint-planar", "joint-line-contact", "joint-annular", "joint-point-contact",
  "gear-pair", "rack-pinion", "belt-drive", "screw-nut", "worm-gear", "planetary-gear", "cam-follower",
  "electric-motor", "gear-reducer", "clutch", "brake",
  "hydraulic-pump", "hydraulic-reservoir", "hydraulic-cylinder", "hydraulic-valve-4-3", "pressure-relief-valve",
  "pneumatic-source", "pneumatic-service-unit", "pneumatic-frl", "pneumatic-cylinder", "pneumatic-valve-5-2", "one-way-flow-control", "pneumatic-exhaust",
  "plane-mirror", "screen", "prism", "fiber", "wave-source", "wavefront", "aperture-array", "fringe-screen", "diffraction-cone", "intensity-profile", "electric-field", "magnetic-field-in", "magnetic-field-out", "bar-magnet", "coil", "solenoid", "laplace-rails", "charged-particle",
  "uniform-field-region", "field-map", "oriented-current-loop", "magnetic-dipole", "rotating-rectangular-loop", "faraday-magnet-coil", "coupled-coils", "electromechanical-converter",
  "piston-cylinder", "thermal-reservoir", "heat-engine",
  "thermo-diagram", "thermo-state", "thermo-isotherm-family", "phase-diagram-pt", "liquid-vapour-dome", "vapour-quality-line", "thermo-cycle", "pressure-work-area",
  "chemical-atom", "newman-projection", "skeletal-ring", "ion", "lone-pair", "crystal-fcc", "precipitate", "electrochemical-cell", "beaker", "flask", "round-bottom-flask", "distillation-flask", "test-tube", "graduated-cylinder", "burette", "volumetric-flask", "separatory-funnel", "pipette", "filter-funnel", "wash-bottle", "liebig-condenser", "support-stand", "magnetic-stirrer", "thermometer", "bunsen-burner",
  "op-amp", "op-amp-comparator", "op-amp-inverting", "op-amp-non-inverting", "op-amp-summing", "op-amp-integrator", "op-amp-differentiator", "op-amp-schmitt",
];

export const labels: Record<ObjectKind, string> = {
  freehand: "Main levée", line: "Segment", "dashed-line": "Trait pointillé", curve: "Courbe de Bézier", arrow: "Flèche", "signal-arrow": "Flèche de signal", "double-arrow": "Double flèche", dimension: "Cote / mesure", point: "Point", rect: "Rectangle", circle: "Cercle", ellipse: "Ellipse", text: "Texte", axes: "Repère / graphe",
  "hidden-edge": "Arête cachée — trait interrompu fin", "centre-line": "Axe / ligne de centre — trait mixte fin", "cutting-plane": "Plan de coupe A–A", "section-hatch": "Zone hachurée de section", "datum-feature": "Repère de référence GPS", "feature-control-frame": "Cadre de tolérance géométrique", "surface-texture": "État de surface ISO 21920",
  wire: "Fil", resistor: "Résistance R", capacitor: "Condensateur C", inductor: "Bobine L", battery: "Pile / batterie", "voltage-source": "Générateur idéal de tension", "current-source": "Générateur idéal de courant", switch: "Interrupteur", transformer: "Transformateur à noyau", ground: "Masse / terre", voltmeter: "Voltmètre", ammeter: "Ampèremètre", gbf: "GBF", oscilloscope: "Oscilloscope",
  spring: "Ressort", force: "Vecteur force", mass: "Masse m", pulley: "Poulie", pendulum: "Pendule", "reference-frame": "Repère (O,x,y)", "circular-trajectory": "Trajectoire circulaire", "gravity-field": "Champ de pesanteur",
  "joint-pivot": "Liaison pivot (vue de face)", "joint-slider": "Liaison glissière (vue de côté)", "joint-ball": "Liaison sphérique / rotule",
  "joint-cylindrical": "Liaison pivot glissant", "joint-helical": "Liaison hélicoïdale", "joint-planar": "Liaison appui plan", "joint-line-contact": "Liaison linéaire rectiligne", "joint-annular": "Liaison linéaire annulaire", "joint-point-contact": "Liaison sphère-plan / ponctuelle",
  "gear-pair": "Engrenage extérieur", "rack-pinion": "Pignon-crémaillère", "belt-drive": "Poulies-courroie", "screw-nut": "Système vis-écrou",
  "worm-gear": "Roue et vis sans fin", "planetary-gear": "Train épicycloïdal", "cam-follower": "Came et poussoir",
  "electric-motor": "Moteur électrique", "gear-reducer": "Réducteur", clutch: "Embrayage", brake: "Frein",
  "hydraulic-pump": "Pompe hydraulique", "hydraulic-reservoir": "Réservoir hydraulique", "hydraulic-cylinder": "Vérin double effet", "hydraulic-valve-4-3": "Distributeur 4/3 centre fermé", "pressure-relief-valve": "Limiteur de pression",
  "pneumatic-source": "Compresseur / source d’air", "pneumatic-service-unit": "Conditionnement sans lubrificateur", "pneumatic-frl": "Unité filtre-régulateur-lubrificateur", "pneumatic-cylinder": "Vérin pneumatique double effet", "pneumatic-valve-5-2": "Distributeur 5/2 monostable", "one-way-flow-control": "Réducteur de débit unidirectionnel", "pneumatic-exhaust": "Échappement pneumatique",
  lens: "Lentille convergente", "diverging-lens": "Lentille divergente", "plane-mirror": "Miroir plan", screen: "Écran", prism: "Prisme", fiber: "Fibre optique", "light-ray": "Rayon lumineux", wave: "Onde progressive",
  "wave-source": "Source ondulatoire S", wavefront: "Front d’onde plan / circulaire", "aperture-array": "Ouverture / fentes de Young / réseau", "wave-path": "Chemin de propagation / chemin optique", "fringe-screen": "Écran d’interférences / franges", "diffraction-cone": "Cône de diffraction", "standing-wave": "Onde stationnaire — nœuds et ventres", "intensity-profile": "Profil d’intensité I(x)",
  "electric-field": "Champ électrique", "magnetic-field-in": "Champ B entrant", "magnetic-field-out": "Champ B sortant", "bar-magnet": "Aimant droit", coil: "Spire", solenoid: "Bobine longue", "laplace-rails": "Rails de Laplace", "charged-particle": "Particule chargée",
  "uniform-field-region": "Région de champ uniforme", "field-map": "Carte de champ électrique / magnétique", "oriented-current-loop": "Spire orientée parcourue par un courant", "magnetic-dipole": "Dipôle magnétique — moment et couple", "charged-particle-trajectory": "Trajectoire d’une particule chargée", "rotating-rectangular-loop": "Cadre rectangulaire tournant", "faraday-magnet-coil": "Aimant–bobine — induction de Faraday-Lenz", "coupled-coils": "Bobines couplées — inductance mutuelle", "electromechanical-converter": "Convertisseur électromécanique",
  "heat-arrow": "Transfert thermique Q", "work-arrow": "Travail W", "piston-cylinder": "Piston-cylindre", "thermal-reservoir": "Réservoir thermique", "heat-engine": "Machine thermique",
  "thermo-diagram": "Repère thermodynamique P–V / P–v / P–T / T–s / Amagat", "thermo-state": "État thermodynamique", "thermo-process": "Transformation thermodynamique orientée", "thermo-isotherm-family": "Réseau d’isothermes", "phase-diagram-pt": "Diagramme de phases (P,T)", "liquid-vapour-dome": "Dôme liquide-vapeur", "vapour-quality-line": "Isotitre vapeur x", "thermo-cycle": "Cycle thermodynamique", "pressure-work-area": "Aire de travail −∫P dV",
  "bond-single": "Liaison simple", "bond-double": "Liaison double", "bond-triple": "Liaison triple", "reaction-arrow": "Flèche de réaction", "equilibrium-arrow": "Équilibre chimique", "hydrogen-bond": "Liaison hydrogène", dipole: "Moment dipolaire", ion: "Ion", "lone-pair": "Doublet non liant", "crystal-fcc": "Maille CFC", precipitate: "Précipité", "electrochemical-cell": "Pile électrochimique",
  "chemical-atom": "Atome / centre atomique", "bond-wedge-solid": "Liaison en coin plein", "bond-wedge-hashed": "Liaison en coin hachuré", "bond-wavy": "Liaison stéréochimique ondulée", "electron-pair-arrow": "Flèche courbe de doublet d’électrons", "single-electron-arrow": "Flèche courbe monoélectronique", "mesomeric-arrow": "Flèche de mésomérie", "newman-projection": "Projection de Newman", "skeletal-ring": "Cycle en formule topologique",
  beaker: "Bécher", flask: "Erlenmeyer", "round-bottom-flask": "Ballon à fond rond", "distillation-flask": "Ballon à distiller", "test-tube": "Tube à essai", "graduated-cylinder": "Éprouvette graduée", burette: "Burette", "volumetric-flask": "Fiole jaugée", "separatory-funnel": "Ampoule à décanter", pipette: "Pipette jaugée", "filter-funnel": "Entonnoir de filtration", "wash-bottle": "Pissette", "liebig-condenser": "Réfrigérant droit", "support-stand": "Potence", "magnetic-stirrer": "Agitateur magnétique", thermometer: "Thermomètre", "bunsen-burner": "Bec Bunsen",
  "op-amp": "AOP standard", "op-amp-comparator": "AOP comparateur", "op-amp-inverting": "AOP inverseur", "op-amp-non-inverting": "AOP non-inverseur", "op-amp-summing": "AOP sommateur", "op-amp-integrator": "AOP intégrateur", "op-amp-differentiator": "AOP dérivateur", "op-amp-schmitt": "AOP trigger de Schmitt", equation: "Équation LaTeX", "raw-tikz": "TikZ protégé",
  "transfer-block": "Bloc de transfert H(p)", "summing-junction": "Comparateur / sommateur", "takeoff-point": "Point de prélèvement",
  "bode-diagram": "Diagramme de Bode — module et phase", "bode-trace": "Tracé de Bode réel / asymptotique", "bode-break": "Pulsation de cassure ω₀", "bode-slope": "Pente de Bode en dB/décade", "stability-margin": "Marge de stabilité — phase / gain",
  "time-response-diagram": "Repère de réponse temporelle", "time-response-trace": "Réponse temporelle d’ordre 1 / 2", "settling-band": "Bande de tolérance à ±5 %", "performance-marker": "Indicateur de performance temporelle", "pole-zero-map": "Carte des pôles et zéros",
  "sysml-frame": "Cadre de diagramme SysML v1", "functional-block": "Bloc fonction / constituant", "typed-flow": "Flux typé matière-énergie-information", "state-node": "État SysML", "state-pseudostate": "Pseudo-état initial / final", "state-transition": "Transition événement [garde] / action", "choice-junction": "Jonction de choix", "fork-join": "Fourche / jonction parallèle", "chronogram-lane": "Ligne de chronogramme",
  "sysml-requirement": "Exigence SysML «requirement»", "sysml-requirement-link": "Relation d’exigence SysML", "sysml-block": "Bloc SysML BDD", "sysml-structural-link": "Relation structurelle BDD", "sysml-part": "Partie SysML IBD", "sysml-port": "Port SysML", "sysml-connector": "Connecteur entre ports", "sysml-item-flow": "Flux d’élément SysML",
};

export type ToolboxGroup = { title: string; kinds: Array<ObjectKind | "select"> };

export const toolboxGroups: ToolboxGroup[] = [
  { title: "Outils", kinds: ["select", "line", "dashed-line", "curve", "arrow", "double-arrow", "dimension", "point", "rect", "circle", "ellipse", "freehand", "text", "equation", "axes"] },
  { title: "Dessin technique & GPS", kinds: ["hidden-edge", "centre-line", "cutting-plane", "section-hatch", "datum-feature", "feature-control-frame", "surface-texture"] },
  { title: "Électricité & signaux", kinds: ["wire", "resistor", "capacitor", "inductor", "battery", "voltage-source", "current-source", "switch", "transformer", "ground", "voltmeter", "ammeter", "gbf", "oscilloscope"] },
  { title: "Optique & ondes", kinds: ["lens", "diverging-lens", "plane-mirror", "screen", "prism", "fiber", "light-ray", "wave"] },
  { title: "Ondes, interférences & diffraction", kinds: ["wave-source", "wavefront", "aperture-array", "wave-path", "fringe-screen", "diffraction-cone", "standing-wave", "intensity-profile"] },
  { title: "Mécanique", kinds: ["force", "spring", "mass", "pulley", "pendulum", "reference-frame", "circular-trajectory", "gravity-field"] },
  { title: "Liaisons mécaniques normalisées", kinds: ["joint-pivot", "joint-slider", "joint-cylindrical", "joint-helical", "joint-ball", "joint-planar", "joint-line-contact", "joint-annular", "joint-point-contact"] },
  { title: "Transmissions mécaniques", kinds: ["gear-pair", "rack-pinion", "belt-drive", "screw-nut", "worm-gear", "planetary-gear", "cam-follower"] },
  { title: "Actionneurs & chaîne d’énergie", kinds: ["electric-motor", "gear-reducer", "clutch", "brake"] },
  { title: "Hydraulique ISO 1219", kinds: ["hydraulic-pump", "hydraulic-reservoir", "hydraulic-cylinder", "hydraulic-valve-4-3", "pressure-relief-valve"] },
  { title: "Pneumatique ISO 1219", kinds: ["pneumatic-source", "pneumatic-service-unit", "pneumatic-frl", "pneumatic-cylinder", "pneumatic-valve-5-2", "one-way-flow-control", "pneumatic-exhaust"] },
  { title: "Champs & induction", kinds: ["electric-field", "magnetic-field-in", "magnetic-field-out", "bar-magnet", "coil", "solenoid", "charged-particle"] },
  { title: "Induction & conversion électromécanique", kinds: ["uniform-field-region", "field-map", "oriented-current-loop", "magnetic-dipole", "charged-particle-trajectory", "laplace-rails", "rotating-rectangular-loop", "faraday-magnet-coil", "coupled-coils", "electromechanical-converter"] },
  { title: "Thermodynamique", kinds: ["heat-arrow", "work-arrow", "piston-cylinder", "thermal-reservoir", "heat-engine"] },
  { title: "Diagrammes thermodynamiques", kinds: ["thermo-diagram", "thermo-state", "thermo-process", "thermo-isotherm-family", "phase-diagram-pt", "liquid-vapour-dome", "vapour-quality-line", "thermo-cycle", "pressure-work-area"] },
  { title: "Chimie", kinds: ["bond-single", "bond-double", "bond-triple", "equilibrium-arrow", "hydrogen-bond", "dipole", "ion", "lone-pair", "crystal-fcc", "precipitate", "electrochemical-cell"] },
  { title: "Structures moléculaires & mécanismes", kinds: ["chemical-atom", "bond-wedge-solid", "bond-wedge-hashed", "bond-wavy", "electron-pair-arrow", "single-electron-arrow", "reaction-arrow", "mesomeric-arrow", "newman-projection", "skeletal-ring"] },
  { title: "Verrerie & matériel de TP", kinds: ["beaker", "flask", "round-bottom-flask", "distillation-flask", "test-tube", "graduated-cylinder", "burette", "volumetric-flask", "separatory-funnel", "pipette", "filter-funnel", "wash-bottle", "liebig-condenser", "support-stand", "magnetic-stirrer", "thermometer", "bunsen-burner"] },
  { title: "Amplificateurs opérationnels", kinds: ["op-amp", "op-amp-comparator", "op-amp-inverting", "op-amp-non-inverting", "op-amp-summing", "op-amp-integrator", "op-amp-differentiator", "op-amp-schmitt"] },
  { title: "Automatique & schémas-blocs", kinds: ["signal-arrow", "transfer-block", "summing-junction", "takeoff-point"] },
  { title: "Réponses temporelles & fréquentielles", kinds: ["bode-diagram", "bode-trace", "bode-break", "bode-slope", "stability-margin", "time-response-diagram", "time-response-trace", "settling-band", "performance-marker", "pole-zero-map"] },
  { title: "Systèmes séquentiels & SysML", kinds: ["sysml-frame", "functional-block", "typed-flow", "state-node", "state-pseudostate", "state-transition", "choice-junction", "fork-join", "chronogram-lane"] },
  { title: "Exigences & architecture SysML", kinds: ["sysml-requirement", "sysml-requirement-link", "sysml-block", "sysml-structural-link", "sysml-part", "sysml-port", "sysml-connector", "sysml-item-flow"] },
];

const sizes: Partial<Record<ObjectKind, { width: number; height: number }>> = {
  point: { width: 18, height: 18 }, equation: { width: 220, height: 70 }, "raw-tikz": { width: 180, height: 70 }, "section-hatch": { width: 160, height: 100 },
  ground: { width: 44, height: 42 }, transformer: { width: 140, height: 160 }, gbf: { width: 70, height: 70 }, oscilloscope: { width: 100, height: 70 }, mass: { width: 70, height: 55 }, pulley: { width: 85, height: 85 }, pendulum: { width: 80, height: 110 }, "reference-frame": { width: 100, height: 80 }, "circular-trajectory": { width: 90, height: 90 }, "gravity-field": { width: 95, height: 85 },
  "joint-pivot": { width: 90, height: 50 }, "joint-slider": { width: 110, height: 70 }, "joint-ball": { width: 100, height: 70 },
  "joint-cylindrical": { width: 110, height: 70 }, "joint-helical": { width: 110, height: 70 }, "joint-planar": { width: 90, height: 80 }, "joint-line-contact": { width: 90, height: 90 }, "joint-annular": { width: 90, height: 90 }, "joint-point-contact": { width: 90, height: 90 },
  "gear-pair": { width: 170, height: 110 }, "rack-pinion": { width: 180, height: 120 }, "belt-drive": { width: 190, height: 120 }, "screw-nut": { width: 180, height: 105 },
  "worm-gear": { width: 180, height: 125 }, "planetary-gear": { width: 180, height: 180 }, "cam-follower": { width: 150, height: 160 },
  "electric-motor": { width: 130, height: 90 }, "gear-reducer": { width: 140, height: 90 }, clutch: { width: 130, height: 90 }, brake: { width: 130, height: 110 },
  "hydraulic-pump": { width: 90, height: 110 }, "hydraulic-reservoir": { width: 100, height: 70 }, "hydraulic-cylinder": { width: 180, height: 100 }, "hydraulic-valve-4-3": { width: 200, height: 130 }, "pressure-relief-valve": { width: 140, height: 110 },
  "pneumatic-source": { width: 90, height: 100 }, "pneumatic-service-unit": { width: 170, height: 90 }, "pneumatic-frl": { width: 200, height: 90 }, "pneumatic-cylinder": { width: 180, height: 100 }, "pneumatic-valve-5-2": { width: 180, height: 125 }, "one-way-flow-control": { width: 140, height: 90 }, "pneumatic-exhaust": { width: 60, height: 60 },
  "transfer-block": { width: 120, height: 70 }, "summing-junction": { width: 70, height: 70 }, "takeoff-point": { width: 18, height: 18 },
  "bode-diagram": { width: 420, height: 300 }, "bode-trace": { width: 420, height: 300 }, "stability-margin": { width: 420, height: 300 },
  "time-response-diagram": { width: 420, height: 240 }, "time-response-trace": { width: 420, height: 240 }, "settling-band": { width: 420, height: 240 }, "pole-zero-map": { width: 320, height: 260 },
  "sysml-frame": { width: 420, height: 260 }, "functional-block": { width: 150, height: 80 }, "state-node": { width: 150, height: 90 }, "state-pseudostate": { width: 32, height: 32 }, "choice-junction": { width: 38, height: 38 }, "fork-join": { width: 150, height: 28 }, "chronogram-lane": { width: 320, height: 70 },
  "sysml-requirement": { width: 220, height: 125 }, "sysml-block": { width: 220, height: 160 }, "sysml-part": { width: 190, height: 75 }, "sysml-port": { width: 18, height: 18 },
  lens: { width: 60, height: 120 }, "diverging-lens": { width: 60, height: 120 }, "plane-mirror": { width: 34, height: 120 }, screen: { width: 34, height: 120 }, prism: { width: 90, height: 80 }, fiber: { width: 140, height: 65 }, "electric-field": { width: 100, height: 75 }, "magnetic-field-in": { width: 90, height: 75 }, "magnetic-field-out": { width: 90, height: 75 }, "bar-magnet": { width: 110, height: 48 }, coil: { width: 100, height: 70 }, solenoid: { width: 130, height: 80 }, "laplace-rails": { width: 140, height: 90 }, "charged-particle": { width: 50, height: 50 },
  "uniform-field-region": { width: 260, height: 180 }, "field-map": { width: 320, height: 240 }, "oriented-current-loop": { width: 220, height: 180 }, "magnetic-dipole": { width: 180, height: 140 },
  "rotating-rectangular-loop": { width: 280, height: 220 }, "faraday-magnet-coil": { width: 340, height: 200 }, "coupled-coils": { width: 320, height: 200 }, "electromechanical-converter": { width: 300, height: 180 },
  "wave-source": { width: 70, height: 70 }, wavefront: { width: 180, height: 130 }, "aperture-array": { width: 70, height: 160 }, "fringe-screen": { width: 150, height: 190 }, "diffraction-cone": { width: 260, height: 150 }, "intensity-profile": { width: 260, height: 150 },
  "piston-cylinder": { width: 100, height: 105 }, "thermal-reservoir": { width: 78, height: 78 }, "heat-engine": { width: 120, height: 100 },
  "thermo-diagram": { width: 420, height: 280 }, "thermo-state": { width: 50, height: 50 }, "thermo-isotherm-family": { width: 420, height: 280 }, "phase-diagram-pt": { width: 420, height: 280 }, "liquid-vapour-dome": { width: 420, height: 280 }, "vapour-quality-line": { width: 420, height: 280 }, "thermo-cycle": { width: 420, height: 280 }, "pressure-work-area": { width: 420, height: 280 },
  "chemical-atom": { width: 70, height: 60 }, "newman-projection": { width: 190, height: 190 }, "skeletal-ring": { width: 180, height: 160 },
  ion: { width: 52, height: 52 }, "lone-pair": { width: 42, height: 42 }, "crystal-fcc": { width: 110, height: 100 }, precipitate: { width: 80, height: 90 }, "electrochemical-cell": { width: 240, height: 160 }, beaker: { width: 80, height: 100 }, flask: { width: 85, height: 105 }, "round-bottom-flask": { width: 92, height: 112 }, "distillation-flask": { width: 115, height: 108 }, "test-tube": { width: 52, height: 105 }, "graduated-cylinder": { width: 54, height: 145 }, burette: { width: 38, height: 140 }, "volumetric-flask": { width: 90, height: 125 }, "separatory-funnel": { width: 78, height: 125 }, pipette: { width: 42, height: 145 }, "filter-funnel": { width: 82, height: 115 }, "wash-bottle": { width: 82, height: 100 }, "liebig-condenser": { width: 165, height: 70 }, "support-stand": { width: 130, height: 175 }, "magnetic-stirrer": { width: 120, height: 100 }, thermometer: { width: 42, height: 130 }, "bunsen-burner": { width: 75, height: 100 },
  "op-amp": { width: 150, height: 105 }, "op-amp-comparator": { width: 150, height: 105 }, "op-amp-inverting": { width: 170, height: 120 }, "op-amp-non-inverting": { width: 170, height: 120 }, "op-amp-summing": { width: 180, height: 125 }, "op-amp-integrator": { width: 180, height: 125 }, "op-amp-differentiator": { width: 180, height: 125 }, "op-amp-schmitt": { width: 180, height: 125 },
};

export const stampSize = (kind: ObjectKind) => sizes[kind] ?? { width: 70, height: 80 };
