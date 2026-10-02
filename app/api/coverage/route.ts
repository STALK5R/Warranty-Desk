import { ask, object, string, rules } from '@/lib/ai';
import { database, sameOrigin } from '@/lib/db';
import { makePassages, finalizeCoverage } from '@/lib/coverage-evidence';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response('Forbidden', { status: 403 });
  try {
    const { id, component } = await request.json() as any;
    if (typeof id !== 'string' || typeof component !== 'string' ||
        component.trim().length < 2 || component.length > 200) {
      return Response.json({ error: 'Select a saved contract and enter a component name (2–200 characters).' }, { status: 400 });
    }
    const row: any = await database()
      .prepare('SELECT data,pages FROM contracts WHERE id=?').bind(id).first();
    if (!row) return Response.json({ error: 'Contract not found.' }, { status: 404 });
    if (row.pages.length > 500000) {
      return Response.json({ error: 'This contract exceeds the AI text limit. Use the matching passages and original documents.' }, { status: 400 });
    }
    const passages = makePassages(JSON.parse(row.pages));
    if (!passages.length) {
      return Response.json({ status: 'Unclear', summary: 'No readable contract text is saved in this record.',
        conditions: 'Upload a readable complete contract and review the extracted text before saving.', evidence: [] });
    }
    // Keep enums within the model's schema limits; full input is still provided.
    const evidenceIdSchema = passages.length <= 900
      ? { type: 'string', enum: passages.map(p => p.id) }
      : { type: 'string' };
    const result = await ask(
      rules + `
Determine whether the requested component appears covered under the selected plan.
The contract is supplied as ordered passages with stable IDs. Read all passages,
including declarations, plan selection, definitions, exclusions, endorsements and
claim conditions. Overlapping text is repeated context, not a separate provision.
Saved details are user-reviewed metadata; original contract terms control.
If selected coverage or controlling terms are missing, explain specifically what
is missing and use Unclear. Do not infer coverage from a component name alone.
For exclusionary coverage, look for the affirmative coverage grant and all relevant
exclusions; absence of the component from an exclusion list alone is insufficient.
Consider diagnosis, failure cause, dates, mileage and prior authorization. Clearly
separate apparent component coverage from approval of this particular repair.
Return evidenceIds naming 1–6 supplied passages that support your conclusion,
including applicable restrictions or conflicting provisions. Never write quotes
or filenames yourself: the server will attach the exact original passages.
If no passage can support a conclusion, use Unclear, evidenceIds: [], and explain
what cannot be determined. An ID existing is not proof it supports a conclusion;
select only relevant evidence. No markdown in summary or conditions.`,
      { component: component.trim(), details: JSON.parse(row.data),
        passages: passages.map(({ id, file, page, text }) => ({ id, file, page, text })) },
      object({
        status: { type: 'string', enum: ['Appears covered', 'Appears excluded', 'Conditional', 'Unclear'] },
        summary: string, conditions: string,
        evidenceIds: { type: 'array', items: evidenceIdSchema, maxItems: 6 },
      }),
    );
    return Response.json(finalizeCoverage(result, passages));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Coverage analysis failed. Please try again.' }, { status: 502 });
  }
}
