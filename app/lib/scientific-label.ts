export type ScientificLabelScript = "sub" | "super";

export type ScientificLabelPart = {
  text: string;
  script?: ScientificLabelScript;
};

export type ParsedScientificLabel = {
  parts: ScientificLabelPart[];
  vector: boolean;
};

const SYMBOLS: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  Gamma: "Γ",
  delta: "δ",
  Delta: "Δ",
  epsilon: "ε",
  varepsilon: "ϵ",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  vartheta: "ϑ",
  Theta: "Θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  Lambda: "Λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  Xi: "Ξ",
  pi: "π",
  Pi: "Π",
  rho: "ρ",
  sigma: "σ",
  Sigma: "Σ",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  varphi: "ϕ",
  Phi: "Φ",
  chi: "χ",
  psi: "ψ",
  Psi: "Ψ",
  omega: "ω",
  Omega: "Ω",
  infty: "∞",
  pm: "±",
  mp: "∓",
  times: "×",
  cdot: "·",
  degree: "°",
};

const stripMathDelimiters = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.startsWith("$") && trimmed.endsWith("$")
    ? trimmed.slice(1, -1).trim()
    : value;
};

const groupedToken = (value: string, start: number) => {
  if (value[start] !== "{") return undefined;
  let depth = 0;
  for (let index = start; index < value.length; index += 1) {
    if (value[index] === "{") depth += 1;
    if (value[index] === "}") depth -= 1;
    if (depth === 0) return { text: value.slice(start + 1, index), end: index + 1 };
  }
  return undefined;
};

const commandToken = (value: string, start: number) => {
  const match = value.slice(start).match(/^\\([A-Za-z]+)/);
  if (match) return { text: SYMBOLS[match[1]] ?? match[1], end: start + match[0].length };
  const escaped = Array.from(value.slice(start + 1))[0];
  return escaped ? { text: escaped, end: start + 1 + escaped.length } : { text: "", end: start + 1 };
};

const normalizeSymbols = (value: string) => value
  .replace(/\\(?:left|right)\b/g, "")
  .replace(/\\([A-Za-z]+)/g, (match, command: string) => SYMBOLS[command] ?? match);

const unwrapVector = (value: string) => {
  const match = value.match(/^\\(?:vec|overrightarrow)\s*/);
  if (!match) return { value, vector: false };
  const tokenStart = match[0].length;
  const group = groupedToken(value, tokenStart);
  if (group) return { value: `${group.text}${value.slice(group.end)}`, vector: true };
  if (value[tokenStart] === "\\") {
    const token = commandToken(value, tokenStart);
    return { value: `${token.text}${value.slice(token.end)}`, vector: true };
  }
  const token = Array.from(value.slice(tokenStart))[0] ?? "";
  return { value: `${token}${value.slice(tokenStart + token.length)}`, vector: true };
};

const appendPart = (parts: ScientificLabelPart[], text: string, script?: ScientificLabelScript) => {
  if (!text) return;
  const last = parts.at(-1);
  if (last && last.script === script) last.text += text;
  else parts.push(script ? { text, script } : { text });
};

export function parseScientificLabel(value: string): ParsedScientificLabel {
  const unwrapped = unwrapVector(stripMathDelimiters(value));
  const source = unwrapped.value;
  const parts: ScientificLabelPart[] = [];
  let normal = "";

  const flushNormal = () => {
    appendPart(parts, normalizeSymbols(normal));
    normal = "";
  };

  for (let index = 0; index < source.length;) {
    const character = source[index];
    if (character !== "_" && character !== "^") {
      if (character !== "{" && character !== "}") normal += character;
      index += 1;
      continue;
    }

    flushNormal();
    const script: ScientificLabelScript = character === "_" ? "sub" : "super";
    const tokenStart = index + 1;
    const group = groupedToken(source, tokenStart);
    if (group) {
      appendPart(parts, normalizeSymbols(group.text.replace(/[{}]/g, "")), script);
      index = group.end;
      continue;
    }
    if (source[tokenStart] === "\\") {
      const token = commandToken(source, tokenStart);
      appendPart(parts, token.text, script);
      index = token.end;
      continue;
    }
    const token = Array.from(source.slice(tokenStart))[0];
    if (token) {
      appendPart(parts, token, script);
      index = tokenStart + token.length;
    } else {
      normal += character;
      index += 1;
    }
  }

  flushNormal();
  return { parts, vector: unwrapped.vector };
}

const UNICODE_SUBSCRIPTS: Record<string, string> = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "₊": "+", "₋": "-" };

const normalizeUnicodeSubscript = (value: string) => {
  const match = value.match(/^(.*?)([₀-₉₊₋]+)$/u);
  return match ? `${match[1]}_{${[...match[2]].map((character) => UNICODE_SUBSCRIPTS[character]).join("")}}` : value;
};

const escapeLatexLabel = (value: string) => value.replace(/\\/g, "\\textbackslash{} ").replace(/([#%&_{}])/g, "\\$1");

export function scientificLabelToLatex(value: string, forceVector = false): string {
  if (value.includes("$") && !forceVector) return value;
  const parsed = parseScientificLabel(normalizeUnicodeSubscript(value));
  const pieces = parsed.parts.map((part) => {
    const content = escapeLatexLabel(part.text);
    return part.script === "sub" ? `_{${content}}` : part.script === "super" ? `^{${content}}` : content;
  });
  const vectorIndex = parsed.parts.findIndex((part) => !part.script);
  if ((forceVector || parsed.vector) && vectorIndex >= 0) pieces[vectorIndex] = `\\vec{${pieces[vectorIndex]}}`;
  return `$${pieces.join("")}$`;
}
