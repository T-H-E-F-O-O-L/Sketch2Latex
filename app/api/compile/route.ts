type CompileRequest = { source?: unknown };

function diagnosticFromLog(log: string, source: string) {
  const line = Number(log.match(/(?:l\.|line\s+)(\d+)/i)?.[1]) || undefined;
  const message = log.match(/^!\s*(.+)$/m)?.[1]?.trim() ?? log.split(/\r?\n/).find((entry) => /error|undefined control sequence|missing/i.test(entry))?.trim() ?? "La compilation LaTeX a échoué.";
  const sourceLines = source.split(/\r?\n/); const preceding = line ? sourceLines.slice(0, line).reverse().find((entry) => /sketch2latex\s+id=/.test(entry)) : undefined;
  const objectId = preceding?.match(/id=([^\s]+)/)?.[1];
  return { line, objectId, message, log: log.slice(0, 12_000) };
}

export async function POST(request: Request) {
  let body: CompileRequest;
  try { body = await request.json() as CompileRequest; }
  catch { return Response.json({ message: "Requête de compilation invalide." }, { status: 400 }); }
  if (typeof body.source !== "string" || !body.source.trim()) return Response.json({ message: "Le document LaTeX est vide." }, { status: 400 });
  if (body.source.length > 60_000) return Response.json({ message: "Le document dépasse la limite de 60 000 caractères du compilateur en ligne." }, { status: 413 });

  const endpoint = new URL("https://latexonline.cc/compile");
  endpoint.searchParams.set("command", "pdflatex"); endpoint.searchParams.set("text", body.source);
  try {
    const result = await fetch(endpoint, { headers: { accept: "application/pdf,text/plain" }, signal: AbortSignal.timeout(90_000) });
    if (!result.ok) { const log = await result.text(); return Response.json(diagnosticFromLog(log, body.source), { status: 422 }); }
    const pdf = await result.arrayBuffer();
    return new Response(pdf, { headers: { "content-type": "application/pdf", "cache-control": "private, max-age=300" } });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return Response.json({ message: timedOut ? "La compilation a dépassé 90 secondes. Réessayez dans un instant." : "Le service de compilation LaTeX est momentanément indisponible." }, { status: 503 });
  }
}
