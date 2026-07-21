export type MathKeyboardTab = "numbers" | "functions" | "letters" | "symbols";

export type MathKeyboardKey = { id: string; label: string; insert?: string; ariaLabel: string; caseAware?: boolean; action?: "toggle-case" };

export const mathKeyboardTabs: Array<{ id: MathKeyboardTab; label: string; ariaLabel: string }> = [
  { id: "numbers", label: "123", ariaLabel: "Numbers and operations" },
  { id: "functions", label: "f(x)", ariaLabel: "Functions and calculus" },
  { id: "letters", label: "ABC", ariaLabel: "Letters and Greek alphabet" },
  { id: "symbols", label: "#&¬", ariaLabel: "Sets, logic and symbols" },
];

const key = (id: string, label: string, insert: string, ariaLabel: string, extras: Partial<MathKeyboardKey> = {}): MathKeyboardKey => ({ id, label, insert, ariaLabel, ...extras });
const letters = "abcdefghijklmnopqrstuvwxyz".split("").map((letter) => key(`letter-${letter}`, letter, letter, `Letter ${letter}`, { caseAware: true }));

export const mathKeyboardLayouts: Record<MathKeyboardTab, MathKeyboardKey[]> = {
  numbers: [
    key("x", "x", "x", "Variable x"), key("y", "y", "y", "Variable y"), key("pi", "\\pi", "\\pi", "Pi"), key("e", "\\mathrm{e}", "\\mathrm{e}", "Constant e"), key("open-parenthesis", "(", "(", "Opening parenthesis"), key("close-parenthesis", ")", ")", "Closing parenthesis"),
    key("square", "x^2", "#@^{2}", "Square"), key("power", "x^n", "#@^{#?}", "Power"), key("sqrt", "\\sqrt{x}", "\\sqrt{#0}", "Square root"), key("nth-root", "\\sqrt[n]{x}", "\\sqrt[#0]{#?}", "Nth root"), key("absolute", "\\left|x\\right|", "\\left|#?\\right|", "Absolute value"), key("fraction", "\\frac{x}{y}", "\\frac{#@}{#?}", "Fraction"),
    key("7", "7", "7", "Seven"), key("8", "8", "8", "Eight"), key("9", "9", "9", "Nine"), key("divide", "\\div", "\\div", "Divide"), key("less", "<", "<", "Less than"), key("less-equal", "\\le", "\\le", "Less than or equal to"),
    key("4", "4", "4", "Four"), key("5", "5", "5", "Five"), key("6", "6", "6", "Six"), key("multiply", "\\times", "\\times", "Multiply"), key("greater", ">", ">", "Greater than"), key("greater-equal", "\\ge", "\\ge", "Greater than or equal to"),
    key("1", "1", "1", "One"), key("2", "2", "2", "Two"), key("3", "3", "3", "Three"), key("minus", "-", "-", "Subtract"), key("plus", "+", "+", "Add"), key("equals", "=", "=", "Equals"),
    key("0", "0", "0", "Zero"), key("decimal", ".", ".", "Decimal point"), key("comma", ",", ",", "Comma"), key("percent", "\\%", "\\%", "Percentage"), key("factorial", "x!", "#@!", "Factorial"), key("subscript", "x_n", "#@_{#?}", "Subscript"),
  ],
  functions: [
    key("sin", "\\sin", "\\sin\\left(#?\\right)", "Sinus"), key("cos", "\\cos", "\\cos\\left(#?\\right)", "Cosinus"), key("tan", "\\tan", "\\tan\\left(#?\\right)", "Tangente"), key("asin", "\\sin^{-1}", "\\arcsin\\left(#?\\right)", "Arc sinus"), key("acos", "\\cos^{-1}", "\\arccos\\left(#?\\right)", "Arc cosinus"), key("atan", "\\tan^{-1}", "\\arctan\\left(#?\\right)", "Arc tangente"),
    key("ln", "\\ln", "\\ln\\left(#?\\right)", "Natural logarithm"), key("log10", "\\log_{10}", "\\log_{10}\\left(#?\\right)", "Common logarithm"), key("loga", "\\log_a", "\\log_{#?}\\left(#?\\right)", "Base-a logarithm"), key("exp", "\\exp", "\\exp\\left(#?\\right)", "Exponential"), key("e-power", "e^x", "\\mathrm{e}^{#?}", "Exponential of x"), key("general-power", "a^x", "#@^{#?}", "General power"),
    key("derivative", "\\frac{d}{dx}", "\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(#?\\right)", "Derivative with respect to x"), key("partial", "\\frac{\\partial}{\\partial x}", "\\frac{\\partial}{\\partial x}\\left(#?\\right)", "Partial derivative"), key("integral", "\\int", "\\int #?\\,\\mathrm{d}x", "Integral"), key("bounded-integral", "\\int_a^b", "\\int_{#?}^{#?} #?\\,\\mathrm{d}x", "Definite integral"), key("sum", "\\sum", "\\sum_{#?}^{#?} #?", "Sum"), key("product", "\\prod", "\\prod_{#?}^{#?} #?", "Product"),
    key("limit", "\\lim", "\\lim_{#?\\to#?} #?", "Limit"), key("absolute-function", "\\left|x\\right|", "\\left|#?\\right|", "Absolute value"), key("norm", "\\lVert x\\rVert", "\\left\\lVert#?\\right\\rVert", "Norm"), key("floor", "\\lfloor x\\rfloor", "\\left\\lfloor#?\\right\\rfloor", "Floor"), key("ceil", "\\lceil x\\rceil", "\\left\\lceil#?\\right\\rceil", "Ceiling"), key("mod", "\\bmod", "\\bmod", "Modulo"),
    key("dot", "\\dot{x}", "\\dot{#@}", "Time derivative"), key("ddot", "\\ddot{x}", "\\ddot{#@}", "Second time derivative"), key("vector", "\\vec{x}", "\\vec{#@}", "Vector"), key("overline", "\\overline{x}", "\\overline{#@}", "Overline"), key("real-part", "\\operatorname{Re}", "\\operatorname{Re}\\left(#?\\right)", "Real part"), key("imaginary-part", "\\operatorname{Im}", "\\operatorname{Im}\\left(#?\\right)", "Imaginary part"),
  ],
  letters: [
    ...letters,
    key("alpha", "\\alpha", "\\alpha", "Alpha"), key("beta", "\\beta", "\\beta", "Beta"), key("gamma", "\\gamma", "\\gamma", "Gamma"), key("delta", "\\delta", "\\delta", "Delta"),
    key("epsilon", "\\varepsilon", "\\varepsilon", "Epsilon"), key("theta", "\\theta", "\\theta", "Theta"), key("lambda", "\\lambda", "\\lambda", "Lambda"), key("mu", "\\mu", "\\mu", "Mu"), key("pi-letter", "\\pi", "\\pi", "Pi"), key("rho", "\\rho", "\\rho", "Rho"),
    key("sigma", "\\sigma", "\\sigma", "Sigma"), key("tau", "\\tau", "\\tau", "Tau"), key("phi", "\\varphi", "\\varphi", "Phi"), key("psi", "\\psi", "\\psi", "Psi"), key("omega", "\\omega", "\\omega", "Omega"), key("case", "\\uparrow", "", "Toggle lowercase and uppercase", { action: "toggle-case" }),
  ],
  symbols: [
    key("infinity", "\\infty", "\\infty", "Infinity"), key("approx", "\\approx", "\\approx", "Approximately equal"), key("not-equal", "\\ne", "\\ne", "Not equal"), key("proportional", "\\propto", "\\propto", "Proportional to"), key("plus-minus", "\\pm", "\\pm", "Plus or minus"), key("minus-plus", "\\mp", "\\mp", "Minus or plus"),
    key("less", "<", "<", "Less than"), key("greater", ">", ">", "Greater than"), key("less-equal", "\\le", "\\le", "Less than or equal to"), key("greater-equal", "\\ge", "\\ge", "Greater than or equal to"), key("in", "\\in", "\\in", "Belongs to"), key("not-in", "\\notin", "\\notin", "Does not belong to"),
    key("subset", "\\subset", "\\subset", "Proper subset"), key("subset-equal", "\\subseteq", "\\subseteq", "Subset"), key("union", "\\cup", "\\cup", "Union"), key("intersection", "\\cap", "\\cap", "Intersection"), key("empty", "\\varnothing", "\\varnothing", "Empty set"), key("setminus", "\\setminus", "\\setminus", "Set difference"),
    key("forall", "\\forall", "\\forall", "For all"), key("exists", "\\exists", "\\exists", "There exists"), key("not", "\\neg", "\\neg", "Negation"), key("and", "\\land", "\\land", "Logical and"), key("or", "\\lor", "\\lor", "Logical or"), key("implies", "\\Rightarrow", "\\Rightarrow", "Implies"),
    key("to", "\\to", "\\to", "Tends to"), key("leftrightarrow", "\\leftrightarrow", "\\leftrightarrow", "Double arrow"), key("perpendicular", "\\perp", "\\perp", "Perpendicular"), key("parallel", "\\parallel", "\\parallel", "Parallel"), key("angle", "\\angle", "\\angle", "Angle"), key("degree", "x^\\circ", "^{\\circ}", "Degree"),
    key("N", "\\mathbb{N}", "\\mathbb{N}", "Natural numbers"), key("Z", "\\mathbb{Z}", "\\mathbb{Z}", "Integers"), key("Q", "\\mathbb{Q}", "\\mathbb{Q}", "Rational numbers"), key("R", "\\mathbb{R}", "\\mathbb{R}", "Real numbers"), key("C", "\\mathbb{C}", "\\mathbb{C}", "Complex numbers"), key("imaginary", "\\mathrm{i}", "\\mathrm{i}", "Imaginary unit"),
  ],
};
