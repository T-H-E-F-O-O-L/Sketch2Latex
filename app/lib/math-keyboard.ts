export type MathKeyboardTab = "numbers" | "functions" | "letters" | "symbols";

export type MathKeyboardKey = { id: string; label: string; insert?: string; ariaLabel: string; caseAware?: boolean; action?: "toggle-case" };

export const mathKeyboardTabs: Array<{ id: MathKeyboardTab; label: string; ariaLabel: string }> = [
  { id: "numbers", label: "123", ariaLabel: "Nombres et opérations" },
  { id: "functions", label: "f(x)", ariaLabel: "Fonctions et analyse" },
  { id: "letters", label: "ABC", ariaLabel: "Lettres et alphabet grec" },
  { id: "symbols", label: "#&¬", ariaLabel: "Ensembles, logique et symboles" },
];

const key = (id: string, label: string, insert: string, ariaLabel: string, extras: Partial<MathKeyboardKey> = {}): MathKeyboardKey => ({ id, label, insert, ariaLabel, ...extras });
const letters = "abcdefghijklmnopqrstuvwxyz".split("").map((letter) => key(`letter-${letter}`, letter, letter, `Lettre ${letter}`, { caseAware: true }));

export const mathKeyboardLayouts: Record<MathKeyboardTab, MathKeyboardKey[]> = {
  numbers: [
    key("x", "x", "x", "Variable x"), key("y", "y", "y", "Variable y"), key("pi", "\\pi", "\\pi", "Pi"), key("e", "\\mathrm{e}", "\\mathrm{e}", "Constante e"), key("open-parenthesis", "(", "(", "Parenthèse ouvrante"), key("close-parenthesis", ")", ")", "Parenthèse fermante"),
    key("square", "x^2", "#@^{2}", "Carré"), key("power", "x^n", "#@^{#?}", "Puissance"), key("sqrt", "\\sqrt{x}", "\\sqrt{#0}", "Racine carrée"), key("nth-root", "\\sqrt[n]{x}", "\\sqrt[#0]{#?}", "Racine n-ième"), key("absolute", "\\left|x\\right|", "\\left|#?\\right|", "Valeur absolue"), key("fraction", "\\frac{x}{y}", "\\frac{#@}{#?}", "Fraction"),
    key("7", "7", "7", "Sept"), key("8", "8", "8", "Huit"), key("9", "9", "9", "Neuf"), key("divide", "\\div", "\\div", "Diviser"), key("less", "<", "<", "Inférieur"), key("less-equal", "\\le", "\\le", "Inférieur ou égal"),
    key("4", "4", "4", "Quatre"), key("5", "5", "5", "Cinq"), key("6", "6", "6", "Six"), key("multiply", "\\times", "\\times", "Multiplier"), key("greater", ">", ">", "Supérieur"), key("greater-equal", "\\ge", "\\ge", "Supérieur ou égal"),
    key("1", "1", "1", "Un"), key("2", "2", "2", "Deux"), key("3", "3", "3", "Trois"), key("minus", "-", "-", "Soustraire"), key("plus", "+", "+", "Additionner"), key("equals", "=", "=", "Égal"),
    key("0", "0", "0", "Zéro"), key("decimal", ".", ".", "Point décimal"), key("comma", ",", ",", "Virgule"), key("percent", "\\%", "\\%", "Pourcentage"), key("factorial", "x!", "#@!", "Factorielle"), key("subscript", "x_n", "#@_{#?}", "Indice"),
  ],
  functions: [
    key("sin", "\\sin", "\\sin\\left(#?\\right)", "Sinus"), key("cos", "\\cos", "\\cos\\left(#?\\right)", "Cosinus"), key("tan", "\\tan", "\\tan\\left(#?\\right)", "Tangente"), key("asin", "\\sin^{-1}", "\\arcsin\\left(#?\\right)", "Arc sinus"), key("acos", "\\cos^{-1}", "\\arccos\\left(#?\\right)", "Arc cosinus"), key("atan", "\\tan^{-1}", "\\arctan\\left(#?\\right)", "Arc tangente"),
    key("ln", "\\ln", "\\ln\\left(#?\\right)", "Logarithme népérien"), key("log10", "\\log_{10}", "\\log_{10}\\left(#?\\right)", "Logarithme décimal"), key("loga", "\\log_a", "\\log_{#?}\\left(#?\\right)", "Logarithme en base a"), key("exp", "\\exp", "\\exp\\left(#?\\right)", "Exponentielle"), key("e-power", "e^x", "\\mathrm{e}^{#?}", "Exponentielle de x"), key("general-power", "a^x", "#@^{#?}", "Puissance générale"),
    key("derivative", "\\frac{d}{dx}", "\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(#?\\right)", "Dérivée par rapport à x"), key("partial", "\\frac{\\partial}{\\partial x}", "\\frac{\\partial}{\\partial x}\\left(#?\\right)", "Dérivée partielle"), key("integral", "\\int", "\\int #?\\,\\mathrm{d}x", "Intégrale"), key("bounded-integral", "\\int_a^b", "\\int_{#?}^{#?} #?\\,\\mathrm{d}x", "Intégrale bornée"), key("sum", "\\sum", "\\sum_{#?}^{#?} #?", "Somme"), key("product", "\\prod", "\\prod_{#?}^{#?} #?", "Produit"),
    key("limit", "\\lim", "\\lim_{#?\\to#?} #?", "Limite"), key("absolute-function", "\\left|x\\right|", "\\left|#?\\right|", "Valeur absolue"), key("norm", "\\lVert x\\rVert", "\\left\\lVert#?\\right\\rVert", "Norme"), key("floor", "\\lfloor x\\rfloor", "\\left\\lfloor#?\\right\\rfloor", "Partie entière inférieure"), key("ceil", "\\lceil x\\rceil", "\\left\\lceil#?\\right\\rceil", "Partie entière supérieure"), key("mod", "\\bmod", "\\bmod", "Modulo"),
    key("dot", "\\dot{x}", "\\dot{#@}", "Dérivée temporelle"), key("ddot", "\\ddot{x}", "\\ddot{#@}", "Dérivée temporelle seconde"), key("vector", "\\vec{x}", "\\vec{#@}", "Vecteur"), key("overline", "\\overline{x}", "\\overline{#@}", "Barre supérieure"), key("real-part", "\\operatorname{Re}", "\\operatorname{Re}\\left(#?\\right)", "Partie réelle"), key("imaginary-part", "\\operatorname{Im}", "\\operatorname{Im}\\left(#?\\right)", "Partie imaginaire"),
  ],
  letters: [
    ...letters,
    key("alpha", "\\alpha", "\\alpha", "Alpha"), key("beta", "\\beta", "\\beta", "Bêta"), key("gamma", "\\gamma", "\\gamma", "Gamma"), key("delta", "\\delta", "\\delta", "Delta"),
    key("epsilon", "\\varepsilon", "\\varepsilon", "Epsilon"), key("theta", "\\theta", "\\theta", "Thêta"), key("lambda", "\\lambda", "\\lambda", "Lambda"), key("mu", "\\mu", "\\mu", "Mu"), key("pi-letter", "\\pi", "\\pi", "Pi"), key("rho", "\\rho", "\\rho", "Rhô"),
    key("sigma", "\\sigma", "\\sigma", "Sigma"), key("tau", "\\tau", "\\tau", "Tau"), key("phi", "\\varphi", "\\varphi", "Phi"), key("psi", "\\psi", "\\psi", "Psi"), key("omega", "\\omega", "\\omega", "Oméga"), key("case", "\\uparrow", "", "Basculer entre minuscules et majuscules", { action: "toggle-case" }),
  ],
  symbols: [
    key("infinity", "\\infty", "\\infty", "Infini"), key("approx", "\\approx", "\\approx", "Environ égal"), key("not-equal", "\\ne", "\\ne", "Différent"), key("proportional", "\\propto", "\\propto", "Proportionnel"), key("plus-minus", "\\pm", "\\pm", "Plus ou moins"), key("minus-plus", "\\mp", "\\mp", "Moins ou plus"),
    key("less", "<", "<", "Inférieur"), key("greater", ">", ">", "Supérieur"), key("less-equal", "\\le", "\\le", "Inférieur ou égal"), key("greater-equal", "\\ge", "\\ge", "Supérieur ou égal"), key("in", "\\in", "\\in", "Appartient"), key("not-in", "\\notin", "\\notin", "N’appartient pas"),
    key("subset", "\\subset", "\\subset", "Sous-ensemble strict"), key("subset-equal", "\\subseteq", "\\subseteq", "Sous-ensemble"), key("union", "\\cup", "\\cup", "Union"), key("intersection", "\\cap", "\\cap", "Intersection"), key("empty", "\\varnothing", "\\varnothing", "Ensemble vide"), key("setminus", "\\setminus", "\\setminus", "Différence d’ensembles"),
    key("forall", "\\forall", "\\forall", "Pour tout"), key("exists", "\\exists", "\\exists", "Il existe"), key("not", "\\neg", "\\neg", "Négation"), key("and", "\\land", "\\land", "Et logique"), key("or", "\\lor", "\\lor", "Ou logique"), key("implies", "\\Rightarrow", "\\Rightarrow", "Implique"),
    key("to", "\\to", "\\to", "Tend vers"), key("leftrightarrow", "\\leftrightarrow", "\\leftrightarrow", "Double flèche"), key("perpendicular", "\\perp", "\\perp", "Perpendiculaire"), key("parallel", "\\parallel", "\\parallel", "Parallèle"), key("angle", "\\angle", "\\angle", "Angle"), key("degree", "x^\\circ", "^{\\circ}", "Degré"),
    key("N", "\\mathbb{N}", "\\mathbb{N}", "Ensemble des naturels"), key("Z", "\\mathbb{Z}", "\\mathbb{Z}", "Ensemble des entiers"), key("Q", "\\mathbb{Q}", "\\mathbb{Q}", "Ensemble des rationnels"), key("R", "\\mathbb{R}", "\\mathbb{R}", "Ensemble des réels"), key("C", "\\mathbb{C}", "\\mathbb{C}", "Ensemble des complexes"), key("imaginary", "\\mathrm{i}", "\\mathrm{i}", "Unité imaginaire"),
  ],
};
