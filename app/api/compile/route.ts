import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

export const runtime = "nodejs";

const run = promisify(execFile);
const missingExecutable = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";

async function compile(tex: string, dir: string) {
  try {
    await run(process.env.TECTONIC_BIN ?? "tectonic", ["--keep-logs", "--outdir", dir, tex], { timeout: 45_000, windowsHide: true });
  } catch (tectonicError) {
    if (!missingExecutable(tectonicError)) throw tectonicError;
    await run(process.env.PDFLATEX_BIN ?? "pdflatex", ["-interaction=nonstopmode", "-halt-on-error", `-output-directory=${dir}`, tex], { timeout: 45_000, windowsHide: true });
  }
}

export async function POST(request: Request) {
  const { latex } = await request.json() as { latex?: string };
  if (!latex || latex.length > 250_000) return Response.json({ error: "Provide a LaTeX document under 250 KB." }, { status: 400 });
  const dir = await mkdtemp(join(tmpdir(), "sketch2latex-"));
  const tex = join(dir, "diagram.tex");
  try {
    await writeFile(tex, latex, "utf8");
    await compile(tex, dir);
    const pdf = await readFile(join(dir, "diagram.pdf"));
    return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=sketch2latex.pdf" } });
  } catch (error) {
    const log = await readFile(join(dir, "diagram.log"), "utf8").catch(() => "");
    const message = error instanceof Error && /ENOENT/.test(error.message)
      ? "Neither Tectonic nor pdfLaTeX is available on PATH. Install one, then retry export."
      : log || (error instanceof Error ? error.message : "LaTeX compilation failed.");
    return Response.json({ error: message }, { status: 422 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
