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
export type ConnectionPortName = "start" | "end" | "segment" | "anchor" | "ground" | "input" | "input-left" | "input-top" | "input-bottom" | "output" | "branch" | "top" | "right" | "bottom" | "left" | "inverting" | "non-inverting" | "primary-top" | "primary-bottom" | "secondary-top" | "secondary-bottom" | "coil-start" | "coil-end" | "electrical-plus" | "electrical-minus" | "mechanical" | "solid-1" | "solid-2" | "worm" | "wheel" | "sun" | "carrier" | "ring" | "cam" | "follower" | "electrical" | "shaft" | "frame" | "rod" | "cap" | "rod-side" | "A" | "B" | "P" | "T" | "R" | "S" | "1" | "2" | "3" | "4" | "5" | "12" | "14";
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
  style?: { stroke?: string; strokeWidth?: number; strokePattern?: StrokePattern; fill?: string; fontSize?: number; fontWeight?: "normal" | "bold" };
  graph?: { expression: string; expressions?: string[]; xMin: number; xMax: number; yMin?: number; yMax?: number; xLabel?: string; yLabel?: string; showGrid?: boolean };
  bindings?: { startId?: string; endId?: string; startPort?: ConnectionPortName; endPort?: ConnectionPortName; startRatio?: number; endRatio?: number; startAnchor?: Point; endAnchor?: Point };
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
  "uniform-field-region": { fieldType: "magnetic", direction: "outward", main: "B", density: "5" },
  "field-map": { fieldType: "magnetic", sourceType: "uniform", representation: "vectors", main: "B", density: "5" },
  "oriented-current-loop": { loopShape: "circular", current: "i", normal: "n", orientation: "counterclockwise", showMoment: "yes" },
  "magnetic-dipole": { main: "m", field: "B", angle: "θ", torque: "Γ" },
  "charged-particle-trajectory": { charge: "q > 0", velocity: "v_0", field: "B", trajectoryType: "circular", main: "q" },
  "laplace-rails": { velocity: "v", current: "i", field: "B", force: "F_L" },
  "rotating-rectangular-loop": { current: "i", field: "B", flux: "Φ", angle: "θ", angularSpeed: "ω" },
  "faraday-magnet-coil": { motion: "approach", emf: "e", current: "i", flux: "Φ", law: "Lenz" },
  "coupled-coils": { primary: "N_1", secondary: "N_2", current1: "i_1", current2: "i_2", mutual: "M", dotConvention: "yes" },
  "electromechanical-converter": { mode: "motor", voltage: "u", current: "i", torque: "C_m", angularSpeed: "ω", power: "P_em" },
  dimension: { main: "d" }, "heat-arrow": { main: "Q" }, "work-arrow": { main: "W" }, dipole: { main: "μ" }, "piston-cylinder": { main: "P, V, T" }, "thermal-reservoir": { main: "T" },
  "heat-engine": { main: "engine", hot: "Qh", cold: "Qc", work: "W" }, ion: { main: "ion" },
  "thermo-diagram": { diagramType: "P-V", title: "Clapeyron diagram", xMin: "0", xMax: "10", yMin: "0", yMax: "10", xUnit: "m^3", yUnit: "Pa" },
  "thermo-state": { main: "1", pressure: "P_1", volume: "V_1", temperature: "T_1", showCoordinates: "yes" },
  "thermo-process": { processType: "isothermal", direction: "forward", main: "T = const.", exponent: "1.4", heat: "", work: "" },
  "thermo-isotherm-family": { count: "4", main: "T_1 < T_2 < T_3 < T_4" },
  "phase-diagram-pt": { title: "Phase diagram (P,T)", substance: "pure substance", fusionSlope: "positive" },
  "liquid-vapour-dome": { title: "Liquid–vapour equilibrium", criticalPoint: "C" },
  "vapour-quality-line": { quality: "0.5", main: "x = 0.5" },
  "thermo-cycle": { cycleType: "Carnot", direction: "engine", main: "Carnot cycle" },
  "pressure-work-area": { main: "W = -∫P dV", areaType: "work received" },
  "electrochemical-cell": { anode: "anode (−)", cathode: "cathode (+)", bridge: "salt bridge" },
  "transfer-block": { main: "H(p)" }, "summing-junction": { left: "+", top: "+", bottom: "−" },
  "bode-diagram": { title: "Bode diagram", transferFunction: "H(p)", omegaMin: "0.1", omegaMax: "1000", gainMin: "-60", gainMax: "40", phaseMin: "-180", phaseMax: "0", frequencyUnit: "rad/s" },
  "bode-trace": { channel: "magnitude", traceType: "exact", model: "first order", gain: "1", omega0: "10", damping: "0.7", main: "H" },
  "bode-break": { main: "ω_0" },
  "bode-slope": { main: "-20 dB/decade", slope: "-20" },
  "stability-margin": { marginType: "phase", omegaC: "10", marginValue: "45", main: "M_φ" },
  "time-response-diagram": { title: "Time response", input: "step", signal: "y(t)", unit: "", timeMin: "0", timeMax: "10", yMin: "0", yMax: "1.5" },
  "time-response-trace": { model: "first order", input: "step", gain: "1", tau: "1", omega0: "1", damping: "0.5", main: "y(t)" },
  "settling-band": { target: "1", tolerance: "5", main: "±5 %" },
  "performance-marker": { performanceType: "t5%", main: "t_5%" },
  "pole-zero-map": { main: "Poles and zeros", poles: "-1+2i;-1-2i", zeros: "", realMin: "-5", realMax: "1", imagMin: "-4", imagMax: "4" },
  "sysml-frame": { diagram: "stm", name: "System" },
  "functional-block": { function: "Process information", constituent: "Control board" },
  "typed-flow": { flow: "information", main: "signal" },
  "state-node": { name: "State", entry: "", do: "", exit: "" },
  "state-pseudostate": { pseudostate: "initial" },
  "state-transition": { event: "event", guard: "", action: "" },
  "fork-join": { orientation: "horizontal", forkRole: "fork" },
  "chronogram-lane": { signal: "signal", waveform: "0,1,0,1", chronogram: "binary", times: "t_0,t_1,t_2,t_3,t_4" },
  "sysml-requirement": { name: "Requirement", reqId: "REQ-1", statement: "The system must satisfy this requirement." },
  "sysml-requirement-link": { requirementRelation: "satisfy" },
  "sysml-block": { name: "Block", values: "", parts: "", references: "", operations: "" },
  "sysml-structural-link": { structuralRelation: "association", symbolEnd: "start", startRole: "", startMultiplicity: "1", endRole: "", endMultiplicity: "1" },
  "sysml-part": { name: "part", blockType: "Block" },
  "sysml-port": { name: "p", interfaceType: "Interface", portDirection: "inout" },
  "sysml-connector": { main: "" },
  "sysml-item-flow": { name: "flow", itemType: "Information", flowDirection: "start to end" },
  "wave-source": { name: "S", sourceType: "point", phase: "0" },
  wavefront: { wavefrontType: "circular", direction: "right", main: "φ = constant" },
  "aperture-array": { apertureType: "Young double slit", count: "2", spacing: "a", opening: "b" },
  "wave-path": { main: "δ(M)", medium: "n = 1", pathStyle: "actual" },
  "fringe-screen": { screenName: "Screen", pointName: "M", fringeCount: "7", fringeSpacing: "i" },
  "diffraction-cone": { opening: "a", angle: "θ", wavelength: "λ", distance: "D" },
  "standing-wave": { main: "y(x,t)", mode: "3", showAntinodes: "yes" },
  "intensity-profile": { profileType: "interference", main: "I(x)", fringeCount: "7" },
  "chemical-atom": { element: "C", hydrogens: "0", charge: "", isotope: "", radical: "no", electronVacancy: "no", lonePairs: "0" },
  "bond-wedge-solid": { wideEnd: "end" },
  "bond-wedge-hashed": { wideEnd: "end" },
  "bond-wavy": { main: "" },
  "electron-pair-arrow": { main: "", curvature: "left" },
  "single-electron-arrow": { main: "", curvature: "left" },
  "mesomeric-arrow": { main: "" },
  "newman-projection": { conformation: "staggered", front1: "H", front2: "H", front3: "CH_3", rear1: "H", rear2: "H", rear3: "CH_3", rotation: "0" },
  "skeletal-ring": { ringSize: "6", ringType: "aromatic", substituent1: "", substituent2: "" },
  "gear-pair": { driver: "Z_1", driven: "Z_2" }, "rack-pinion": { pinion: "Z", rack: "x" }, "belt-drive": { driver: "D_1", driven: "D_2" }, "screw-nut": { pitch: "p" },
  "worm-gear": { worm: "Z_v", wheel: "Z_r" }, "planetary-gear": { sun: "Z_s", ring: "Z_c", carrier: "PS" }, "cam-follower": { cam: "C", follower: "S" },
  "electric-motor": { main: "M" }, "gear-reducer": { main: "r" }, clutch: { main: "E" }, brake: { main: "F" },
  "hydraulic-pump": { main: "P" }, "hydraulic-reservoir": { main: "T" }, "hydraulic-cylinder": { main: "1A" }, "hydraulic-valve-4-3": { main: "1V" }, "pressure-relief-valve": { main: "p_0" },
  "pneumatic-source": { main: "0P1" }, "pneumatic-service-unit": { main: "0Z1" }, "pneumatic-frl": { main: "0Z2" }, "pneumatic-cylinder": { main: "1A1" }, "pneumatic-valve-5-2": { main: "1V1", actuator: "1M1" }, "one-way-flow-control": { main: "1V2" }, "pneumatic-exhaust": { main: "" },
  "cutting-plane": { main: "A" },
  "datum-feature": { datum: "A" },
  "feature-control-frame": { characteristic: "position", tolerance: "0,02", diameter: "oui", modifier: "", datum1: "A", datum2: "B", datum3: "C" },
  "surface-texture": { requirement: "material removal", parameter: "Ra", value: "3.2", process: "", lay: "", allAround: "no" },
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
  "plane-mirror", "screen", "prism", "fiber", "wave-source", "wavefront", "aperture-array", "fringe-screen", "diffraction-cone", "intensity-profile", "electric-field", "magnetic-field-in", "magnetic-field-out", "bar-magnet", "coil", "solenoid", "charged-particle",
  "uniform-field-region", "field-map", "oriented-current-loop", "magnetic-dipole", "laplace-rails", "rotating-rectangular-loop", "faraday-magnet-coil", "coupled-coils", "electromechanical-converter",
  "piston-cylinder", "thermal-reservoir", "heat-engine",
  "thermo-diagram", "thermo-state", "thermo-isotherm-family", "phase-diagram-pt", "liquid-vapour-dome", "vapour-quality-line", "thermo-cycle", "pressure-work-area",
  "chemical-atom", "newman-projection", "skeletal-ring", "ion", "lone-pair", "crystal-fcc", "precipitate", "electrochemical-cell", "beaker", "flask", "round-bottom-flask", "distillation-flask", "test-tube", "graduated-cylinder", "burette", "volumetric-flask", "separatory-funnel", "pipette", "filter-funnel", "wash-bottle", "liebig-condenser", "support-stand", "magnetic-stirrer", "thermometer", "bunsen-burner",
  "op-amp", "op-amp-comparator", "op-amp-inverting", "op-amp-non-inverting", "op-amp-summing", "op-amp-integrator", "op-amp-differentiator", "op-amp-schmitt",
];

export const labels: Record<ObjectKind, string> = {
  freehand: "Freehand", line: "Line", "dashed-line": "Dashed line", curve: "Bézier curve", arrow: "Arrow", "signal-arrow": "Signal arrow", "double-arrow": "Double arrow", dimension: "Dimension", point: "Point", rect: "Rectangle", circle: "Circle", ellipse: "Ellipse", text: "Text", axes: "Axes / graph",
  "hidden-edge": "Hidden edge — thin dashed line", "centre-line": "Axis / centre line — thin chain line", "cutting-plane": "Cutting plane A–A", "section-hatch": "Section hatch", "datum-feature": "GPS datum feature", "feature-control-frame": "Geometric tolerance frame", "surface-texture": "Surface texture ISO 21920",
  wire: "Wire", resistor: "Resistor R", capacitor: "Capacitor C", inductor: "Inductor L", battery: "Battery", "voltage-source": "Ideal voltage source", "current-source": "Ideal current source", switch: "Switch", transformer: "Core transformer", ground: "Ground", voltmeter: "Voltmeter", ammeter: "Ammeter", gbf: "Function generator", oscilloscope: "Oscilloscope",
  spring: "Spring", force: "Force vector", mass: "Mass m", pulley: "Pulley", pendulum: "Pendulum", "reference-frame": "Reference frame (O,x,y)", "circular-trajectory": "Circular trajectory", "gravity-field": "Gravitational field",
  "joint-pivot": "Revolute joint (front view)", "joint-slider": "Prismatic joint (side view)", "joint-ball": "Spherical joint / ball joint",
  "joint-cylindrical": "Cylindrical joint", "joint-helical": "Helical joint", "joint-planar": "Planar joint", "joint-line-contact": "Linear contact joint", "joint-annular": "Annular contact joint", "joint-point-contact": "Point contact / sphere-plane joint",
  "gear-pair": "External gear pair", "rack-pinion": "Rack and pinion", "belt-drive": "Pulley and belt drive", "screw-nut": "Lead screw and nut",
  "worm-gear": "Worm gear", "planetary-gear": "Planetary gear train", "cam-follower": "Cam and follower",
  "electric-motor": "Electric motor", "gear-reducer": "Gear reducer", clutch: "Clutch", brake: "Brake",
  "hydraulic-pump": "Hydraulic pump", "hydraulic-reservoir": "Hydraulic reservoir", "hydraulic-cylinder": "Double-acting cylinder", "hydraulic-valve-4-3": "4/3 closed-centre valve", "pressure-relief-valve": "Pressure-relief valve",
  "pneumatic-source": "Compressor / air source", "pneumatic-service-unit": "Air service unit without lubricator", "pneumatic-frl": "Filter-regulator-lubricator unit", "pneumatic-cylinder": "Double-acting pneumatic cylinder", "pneumatic-valve-5-2": "Monostable 5/2 valve", "one-way-flow-control": "One-way flow-control valve", "pneumatic-exhaust": "Pneumatic exhaust",
  lens: "Converging lens", "diverging-lens": "Diverging lens", "plane-mirror": "Plane mirror", screen: "Screen", prism: "Prism", fiber: "Optical fibre", "light-ray": "Light ray", wave: "Progressive wave",
  "wave-source": "Wave source S", wavefront: "Plane / circular wavefront", "aperture-array": "Aperture / Young double slit / grating", "wave-path": "Propagation / optical path", "fringe-screen": "Interference screen / fringes", "diffraction-cone": "Diffraction cone", "standing-wave": "Standing wave — nodes and antinodes", "intensity-profile": "Intensity profile I(x)",
  "electric-field": "Electric field", "magnetic-field-in": "Magnetic field into page", "magnetic-field-out": "Magnetic field out of page", "bar-magnet": "Bar magnet", coil: "Current loop", solenoid: "Long solenoid", "laplace-rails": "Laplace rails", "charged-particle": "Charged particle",
  "uniform-field-region": "Uniform field region", "field-map": "Electric / magnetic field map", "oriented-current-loop": "Oriented current loop", "magnetic-dipole": "Magnetic dipole — moment and torque", "charged-particle-trajectory": "Charged-particle trajectory", "rotating-rectangular-loop": "Rotating rectangular loop", "faraday-magnet-coil": "Magnet and coil — Faraday–Lenz induction", "coupled-coils": "Coupled coils — mutual inductance", "electromechanical-converter": "Electromechanical converter",
  "heat-arrow": "Heat transfer Q", "work-arrow": "Work W", "piston-cylinder": "Piston-cylinder", "thermal-reservoir": "Thermal reservoir", "heat-engine": "Heat engine",
  "thermo-diagram": "Thermodynamic axes P–V / P–v / P–T / T–s / Amagat", "thermo-state": "Thermodynamic state", "thermo-process": "Directed thermodynamic process", "thermo-isotherm-family": "Isotherm family", "phase-diagram-pt": "Phase diagram (P,T)", "liquid-vapour-dome": "Liquid–vapour dome", "vapour-quality-line": "Vapour-quality line x", "thermo-cycle": "Thermodynamic cycle", "pressure-work-area": "Work area −∫P dV",
  "bond-single": "Single bond", "bond-double": "Double bond", "bond-triple": "Triple bond", "reaction-arrow": "Reaction arrow", "equilibrium-arrow": "Chemical equilibrium", "hydrogen-bond": "Hydrogen bond", dipole: "Dipole moment", ion: "Ion", "lone-pair": "Lone pair", "crystal-fcc": "FCC unit cell", precipitate: "Precipitate", "electrochemical-cell": "Electrochemical cell",
  "chemical-atom": "Atom / atomic centre", "bond-wedge-solid": "Solid wedge bond", "bond-wedge-hashed": "Hashed wedge bond", "bond-wavy": "Wavy stereochemical bond", "electron-pair-arrow": "Electron-pair curved arrow", "single-electron-arrow": "Single-electron curved arrow", "mesomeric-arrow": "Resonance arrow", "newman-projection": "Newman projection", "skeletal-ring": "Skeletal ring",
  beaker: "Beaker", flask: "Erlenmeyer flask", "round-bottom-flask": "Round-bottom flask", "distillation-flask": "Distillation flask", "test-tube": "Test tube", "graduated-cylinder": "Graduated cylinder", burette: "Burette", "volumetric-flask": "Volumetric flask", "separatory-funnel": "Separatory funnel", pipette: "Volumetric pipette", "filter-funnel": "Filter funnel", "wash-bottle": "Wash bottle", "liebig-condenser": "Liebig condenser", "support-stand": "Retort stand", "magnetic-stirrer": "Magnetic stirrer", thermometer: "Thermometer", "bunsen-burner": "Bunsen burner",
  "op-amp": "Standard op-amp", "op-amp-comparator": "Op-amp comparator", "op-amp-inverting": "Inverting op-amp", "op-amp-non-inverting": "Non-inverting op-amp", "op-amp-summing": "Summing op-amp", "op-amp-integrator": "Integrator op-amp", "op-amp-differentiator": "Differentiator op-amp", "op-amp-schmitt": "Schmitt trigger op-amp", equation: "LaTeX equation", "raw-tikz": "Protected TikZ",
  "transfer-block": "Transfer block H(p)", "summing-junction": "Comparator / summing junction", "takeoff-point": "Takeoff point",
  "bode-diagram": "Bode diagram — magnitude and phase", "bode-trace": "Exact / asymptotic Bode trace", "bode-break": "Break frequency ω₀", "bode-slope": "Bode slope in dB/decade", "stability-margin": "Stability margin — phase / gain",
  "time-response-diagram": "Time-response axes", "time-response-trace": "First- / second-order time response", "settling-band": "±5% tolerance band", "performance-marker": "Time-performance marker", "pole-zero-map": "Pole-zero map",
  "sysml-frame": "SysML v1 diagram frame", "functional-block": "Function / component block", "typed-flow": "Typed material-energy-information flow", "state-node": "SysML state", "state-pseudostate": "Initial / final pseudostate", "state-transition": "Event [guard] / action transition", "choice-junction": "Choice junction", "fork-join": "Parallel fork / join", "chronogram-lane": "Timing-diagram lane",
  "sysml-requirement": "SysML «requirement»", "sysml-requirement-link": "SysML requirement relationship", "sysml-block": "SysML BDD block", "sysml-structural-link": "BDD structural relationship", "sysml-part": "SysML IBD part", "sysml-port": "SysML port", "sysml-connector": "Port connector", "sysml-item-flow": "SysML item flow",
};

export type ToolboxGroup = { title: string; kinds: Array<ObjectKind | "select"> };

export const toolboxGroups: ToolboxGroup[] = [
  { title: "Tools", kinds: ["select", "line", "dashed-line", "curve", "arrow", "double-arrow", "dimension", "point", "rect", "circle", "ellipse", "freehand", "text", "equation", "axes"] },
  { title: "Technical drawing & GPS", kinds: ["hidden-edge", "centre-line", "cutting-plane", "section-hatch", "datum-feature", "feature-control-frame", "surface-texture"] },
  { title: "Electricity & signals", kinds: ["wire", "resistor", "capacitor", "inductor", "battery", "voltage-source", "current-source", "switch", "transformer", "ground", "voltmeter", "ammeter", "gbf", "oscilloscope"] },
  { title: "Optics & waves", kinds: ["lens", "diverging-lens", "plane-mirror", "screen", "prism", "fiber", "light-ray", "wave"] },
  { title: "Waves, interference & diffraction", kinds: ["wave-source", "wavefront", "aperture-array", "wave-path", "fringe-screen", "diffraction-cone", "standing-wave", "intensity-profile"] },
  { title: "Mechanics", kinds: ["force", "spring", "mass", "pulley", "pendulum", "reference-frame", "circular-trajectory", "gravity-field"] },
  { title: "Standardized mechanical joints", kinds: ["joint-pivot", "joint-slider", "joint-cylindrical", "joint-helical", "joint-ball", "joint-planar", "joint-line-contact", "joint-annular", "joint-point-contact"] },
  { title: "Mechanical transmissions", kinds: ["gear-pair", "rack-pinion", "belt-drive", "screw-nut", "worm-gear", "planetary-gear", "cam-follower"] },
  { title: "Actuators & power chain", kinds: ["electric-motor", "gear-reducer", "clutch", "brake"] },
  { title: "Hydraulics — ISO 1219", kinds: ["hydraulic-pump", "hydraulic-reservoir", "hydraulic-cylinder", "hydraulic-valve-4-3", "pressure-relief-valve"] },
  { title: "Pneumatics — ISO 1219", kinds: ["pneumatic-source", "pneumatic-service-unit", "pneumatic-frl", "pneumatic-cylinder", "pneumatic-valve-5-2", "one-way-flow-control", "pneumatic-exhaust"] },
  { title: "Fields & induction", kinds: ["electric-field", "magnetic-field-in", "magnetic-field-out", "bar-magnet", "coil", "solenoid", "charged-particle"] },
  { title: "Induction & electromechanical conversion", kinds: ["uniform-field-region", "field-map", "oriented-current-loop", "magnetic-dipole", "charged-particle-trajectory", "laplace-rails", "rotating-rectangular-loop", "faraday-magnet-coil", "coupled-coils", "electromechanical-converter"] },
  { title: "Thermodynamics", kinds: ["heat-arrow", "work-arrow", "piston-cylinder", "thermal-reservoir", "heat-engine"] },
  { title: "Thermodynamic diagrams", kinds: ["thermo-diagram", "thermo-state", "thermo-process", "thermo-isotherm-family", "phase-diagram-pt", "liquid-vapour-dome", "vapour-quality-line", "thermo-cycle", "pressure-work-area"] },
  { title: "Chemistry", kinds: ["bond-single", "bond-double", "bond-triple", "equilibrium-arrow", "hydrogen-bond", "dipole", "ion", "lone-pair", "crystal-fcc", "precipitate", "electrochemical-cell"] },
  { title: "Molecular structures & mechanisms", kinds: ["chemical-atom", "bond-wedge-solid", "bond-wedge-hashed", "bond-wavy", "electron-pair-arrow", "single-electron-arrow", "reaction-arrow", "mesomeric-arrow", "newman-projection", "skeletal-ring"] },
  { title: "Glassware & laboratory equipment", kinds: ["beaker", "flask", "round-bottom-flask", "distillation-flask", "test-tube", "graduated-cylinder", "burette", "volumetric-flask", "separatory-funnel", "pipette", "filter-funnel", "wash-bottle", "liebig-condenser", "support-stand", "magnetic-stirrer", "thermometer", "bunsen-burner"] },
  { title: "Operational amplifiers", kinds: ["op-amp", "op-amp-comparator", "op-amp-inverting", "op-amp-non-inverting", "op-amp-summing", "op-amp-integrator", "op-amp-differentiator", "op-amp-schmitt"] },
  { title: "Control systems & block diagrams", kinds: ["signal-arrow", "transfer-block", "summing-junction", "takeoff-point"] },
  { title: "Time & frequency responses", kinds: ["bode-diagram", "bode-trace", "bode-break", "bode-slope", "stability-margin", "time-response-diagram", "time-response-trace", "settling-band", "performance-marker", "pole-zero-map"] },
  { title: "Sequential systems & SysML", kinds: ["sysml-frame", "functional-block", "typed-flow", "state-node", "state-pseudostate", "state-transition", "choice-junction", "fork-join", "chronogram-lane"] },
  { title: "SysML requirements & architecture", kinds: ["sysml-requirement", "sysml-requirement-link", "sysml-block", "sysml-structural-link", "sysml-part", "sysml-port", "sysml-connector", "sysml-item-flow"] },
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
