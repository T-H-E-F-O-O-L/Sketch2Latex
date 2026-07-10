import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

export const runtime = "nodejs";

const run = promisify(execFile);

export async function POST(request: Request) {
  const { latex } = await request.json() as { latex?: string };
  if (!latex || latex.length > 250_000) return Response.json({ error: "Provide a LaTeX document under 250 KB." }, { status: 400 });
  const dir = await mkdtemp(join(tmpdir(), "sketch2latex-"));
  const tex = join(dir, "diagram.tex");
  try {
    await writeFile(tex, latex, "utf8");
    await run("tectonic", ["--keep-logs", "--outdir", dir, tex], { timeout: 45_000, windowsHide: true });
    const pdf = await readFile(join(dir, "diagram.pdf"));
    return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=sketch2latex.pdf" } });
  } catch (error) {
    const log = await readFile(join(dir, "diagram.log"), "utf8").catch(() => "");
    const message = error instanceof Error && /ENOENT/.test(error.message)
      ? "Tectonic is not installed or not on PATH. Install Tectonic, then retry export."
      : log || (error instanceof Error ? error.message : "LaTeX compilation failed.");
    return Response.json({ error: message }, { status: 422 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
