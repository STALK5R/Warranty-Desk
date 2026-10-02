export type SourcePage = { file: string; page: number; text: string };
export type Passage = SourcePage & { id: string; start: number; end: number };

// Preserve original text and source locations. Overlap keeps boundary context.
export function makePassages(pages: SourcePage[]): Passage[] {
  const passages: Passage[] = [];
  for (const page of pages) {
    if (typeof page.text !== 'string' || !page.text.trim()) continue;
    let start = 0;
    while (start < page.text.length) {
      let end = Math.min(start + 1800, page.text.length);
      if (end < page.text.length) {
        const boundary = page.text.lastIndexOf('\n', end);
        if (boundary > start + 900) end = boundary + 1;
      }
      passages.push({
        id: `S${passages.length + 1}`, file: page.file, page: page.page,
        text: page.text.slice(start, end), start, end,
      });
      if (end === page.text.length) break;
      start = end - 200;
    }
  }
  return passages;
}

export function resolveEvidence(ids: unknown, passages: Passage[]) {
  const requested = Array.isArray(ids) ? ids : [];
  const byId = new Map(passages.map(p => [p.id, p]));
  const selected = [...new Set(requested)];
  const invalid = selected.some(id => typeof id !== 'string' || !byId.has(id));
  const evidence = selected.flatMap(id => {
    const passage = byId.get(id);
    return passage ? [{ file: passage.file, page: passage.page, quote: passage.text }] : [];
  });
  return { evidence, invalid };
}

export function finalizeCoverage(result: any, passages: Passage[]) {
  const { evidence, invalid } = resolveEvidence(result.evidenceIds, passages);
  if (invalid || (result.status !== 'Unclear' && !evidence.length)) {
    return {
      status: 'Unclear',
      summary: 'The analysis did not identify valid supporting passages. No supported coverage conclusion is available.',
      conditions: 'Review the matching passages and original contract, or contact the administrator.',
      evidence,
    };
  }
  // A legitimate Unclear result keeps its explanation of what is missing.
  return { status: result.status, summary: result.summary, conditions: result.conditions, evidence };
}
