import type { CanvasObject, ObjectKind } from "./canvas-types";

export type SymbolPreset = {
  id: string;
  title: string;
  category: string;
  description: string;
  width: number;
  height: number;
  annotations?: Record<string, string>;
  sourceUrl: string;
};

const cpge = "https://www.enseignementsup-recherche.gouv.fr/sites/default/files/imported_files/documents/BOSPE1_MESRI_1378831.pdf";
const tikz = "https://tikz.net/tag/circuitikz/";
const p = (id: string, title: string, category: string, description: string, width = 100, height = 80, annotations?: Record<string, string>): SymbolPreset => ({ id, title, category, description, width, height, annotations, sourceUrl: category === "Électricité" ? tikz : cpge });

export const symbolPresets: SymbolPreset[] = [
  p("diode", "Diode", "Électricité", "Diode PN en représentation européenne", 90, 60, { main: "D" }),
  p("led", "DEL / LED", "Électricité", "Diode électroluminescente", 90, 70, { main: "D" }),
  p("zener-diode", "Diode Zener", "Électricité", "Diode Zener", 90, 60, { main: "D_Z" }),
  p("voltage-source", "Source de tension", "Électricité", "Source idéale de tension", 75, 75, { main: "u(t)" }),
  p("current-source", "Source de courant", "Électricité", "Source idéale de courant", 75, 75, { main: "i(t)" }),
  p("junction", "Nœud électrique", "Électricité", "Jonction de conducteurs", 36, 36),
  p("port", "Port / borne", "Électricité", "Borne de connexion nommée", 80, 45, { main: "A" }),
  p("transformer", "Transformateur", "Induction", "Transformateur idéal à deux bobines", 150, 100, { left: "N_1", right: "N_2" }),
  p("npn-transistor", "Transistor NPN", "Électricité", "Transistor bipolaire NPN", 100, 100, { main: "NPN" }),
  p("pnp-transistor", "Transistor PNP", "Électricité", "Transistor bipolaire PNP", 100, 100, { main: "PNP" }),
  p("nmos", "MOSFET canal N", "Électricité", "Transistor MOS canal N", 110, 100, { main: "NMOS" }),
  p("pmos", "MOSFET canal P", "Électricité", "Transistor MOS canal P", 110, 100, { main: "PMOS" }),
  p("bode-plot", "Diagramme de Bode", "Ondes et signaux", "Axes logarithmiques pour gain et phase", 180, 130, { main: "H(jω)" }),
  p("signal", "Signal sinusoïdal", "Ondes et signaux", "Signal périodique et période", 150, 80, { main: "s(t)" }),
  p("phase-wave", "Déphasage", "Ondes et signaux", "Deux signaux et leur déphasage", 160, 100, { main: "φ" }),
  p("wavefront", "Fronts d’onde", "Ondes et signaux", "Propagation d’une onde progressive", 160, 100, { main: "c" }),
  p("young-slits", "Fentes d’Young", "Optique", "Deux sources cohérentes et écran", 180, 120, { main: "Δ" }),
  p("optical-source", "Source ponctuelle", "Optique", "Source lumineuse monochromatique", 70, 70, { main: "S" }),
  p("optical-screen", "Écran optique", "Optique", "Écran de réception", 35, 130, { main: "E" }),
  p("spherical-mirror", "Miroir sphérique", "Optique", "Miroir concave ou convexe", 80, 130, { main: "R" }),
  p("optical-fiber", "Fibre à saut d’indice", "Optique", "Cœur, gaine et cône d’acceptance", 190, 90, { main: "n₁,n₂" }),
  p("photon", "Photon", "Physique moderne", "Photon avec énergie et quantité de mouvement", 90, 70, { main: "hν" }),
  p("bohr-atom", "Atome de Bohr", "Physique moderne", "Niveaux d’énergie et transitions", 120, 120, { main: "E_n" }),
  p("force-vector", "Vecteur force", "Mécanique", "Force appliquée à un point matériel", 130, 70, { main: "F⃗" }),
  p("friction", "Frottement", "Mécanique", "Réaction normale et force de frottement", 130, 90, { main: "f⃗" }),
  p("coordinate-system", "Repère cartésien", "Mécanique", "Repère (O,x,y,z)", 110, 100, { main: "O" }),
  p("frenet-frame", "Repère de Frenet", "Mécanique", "Tangente et normale à une trajectoire", 130, 100, { main: "t⃗,n⃗" }),
  p("torque", "Moment d’une force", "Mécanique", "Bras de levier et moment", 150, 90, { main: "M⃗_O" }),
  p("rigid-body", "Solide en rotation", "Mécanique", "Axe de rotation et vitesse angulaire", 130, 100, { main: "ω" }),
  p("rolling-body", "Roulement sans glissement", "Mécanique", "Roue et point de contact", 120, 100, { main: "v" }),
  p("collision", "Choc et quantité de mouvement", "Mécanique", "Avant/après collision", 170, 90, { main: "p⃗" }),
  p("potential-well", "Puits de potentiel", "Mécanique", "Énergie potentielle et équilibre stable", 170, 100, { main: "E_p" }),
  p("piston", "Piston-gaz parfait", "Thermodynamique", "Système fermé et travail des forces de pression", 120, 120, { main: "P,V,T" }),
  p("thermostat", "Thermostat", "Thermodynamique", "Source à température imposée", 90, 80, { main: "T" }),
  p("heat-source", "Transfert thermique", "Thermodynamique", "Chaleur reçue ou cédée", 130, 70, { main: "Q" }),
  p("entropy-flow", "Flux d’entropie", "Thermodynamique", "Bilan d’entropie", 130, 70, { main: "S" }),
  p("pv-diagram", "Diagramme P-V", "Thermodynamique", "Chemin thermodynamique dans le plan de Clapeyron", 180, 130, { main: "P,V" }),
  p("phase-diagram", "Diagramme de phases", "Thermodynamique", "Domaines solide, liquide et vapeur", 170, 130, { main: "P,T" }),
  p("carnot-cycle", "Cycle de Carnot", "Thermodynamique", "Deux isothermes et deux adiabatiques", 170, 130, { main: "η" }),
  p("refrigerator", "Réfrigérateur / pompe à chaleur", "Thermodynamique", "Machine cyclique et flux thermiques", 140, 100, { main: "COP" }),
  p("lewis-molecule", "Schéma de Lewis", "Chimie", "Doublets liants et non liants", 120, 90, { main: "CO₂" }),
  p("lewis-ion", "Lewis d’un ion", "Chimie", "Charge formelle et octet", 120, 90, { main: "NH₄⁺" }),
  p("molecular-geometry", "Géométrie VSEPR", "Chimie", "Géométrie et répulsion des doublets", 130, 100, { main: "AX₄" }),
  p("molecular-dipole", "Moment dipolaire", "Chimie", "Liaison polarisée et moment dipolaire", 130, 90, { main: "μ⃗" }),
  p("hydrogen-bond", "Liaison hydrogène", "Chimie", "Interaction par pont hydrogène", 140, 80, { main: "δ+···δ−" }),
  p("van-der-waals", "Interaction de van der Waals", "Chimie", "Interaction intermoléculaire", 140, 80, { main: "vdW" }),
  p("equilibrium-table", "Tableau d’avancement", "Chimie", "État initial, évolution et état final", 180, 100, { main: "ξ" }),
  p("kinetics-plot", "Cinétique chimique", "Chimie", "Concentration et vitesse en fonction du temps", 180, 120, { main: "v(t)" }),
  p("arrhenius-plot", "Loi d’Arrhenius", "Chimie", "Droite ln(k) en fonction de 1/T", 180, 120, { main: "E_a" }),
  p("redox", "Réaction d’oxydo-réduction", "Chimie", "Oxydant, réducteur et électrons", 160, 90, { main: "e⁻" }),
  p("periodic-table", "Tableau périodique", "Chimie", "Blocs s et p, familles et valence", 190, 120, { main: "Z" }),
  p("crystal-cell", "Maille CFC", "Chimie", "Maille cubique à faces centrées", 130, 120, { main: "CFC" }),
  p("tetrahedral-site", "Site tétraédrique", "Chimie", "Interstice tétraédrique dans un empilement", 110, 100, { main: "T" }),
  p("octahedral-site", "Site octaédrique", "Chimie", "Interstice octaédrique dans un empilement", 110, 100, { main: "O" }),
];

export const symbolPresetMap = new Map(symbolPresets.map((preset) => [preset.id, preset]));

export const symbolObject = (preset: SymbolPreset, x: number, y: number): CanvasObject => ({
  id: Math.random().toString(36).slice(2, 10), kind: "symbol" as ObjectKind, symbol: preset.id, x, y,
  width: preset.width, height: preset.height, annotations: preset.annotations ? { ...preset.annotations } : undefined,
});
