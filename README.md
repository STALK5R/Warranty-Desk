# Warranty Desk

A working, single-workspace vehicle service contract prototype for your own Cloudflare account. Source and a prebuilt interface are included. This is the contract lookup test discussed with Clay—not a warranty-company network or payment processor.

## What is built

- Password-protected website, API endpoints, and original files. No publicly accessible contract bucket.
- Upload a PDF or one/multiple photos of a complete contract (JPG, PNG, WebP). Up to 20 MB total, 20 files, 100 pages.
- Read selectable PDF text; OCR scanned pages and images in the browser.
- Extract customer, VIN, vehicle, warranty company, administrator, contract and claim numbers, claims phone, invoice email/portal, plan, contract type, deductible, and expiration details.
- Review/correct fields before saving. Reopen and edit saved details.
- Persistent records and searchable text in D1; original documents in private R2 storage.
- Search saved records by VIN, customer, vehicle, contract number, or company.
- Component text search with source filenames/page numbers and several common synonyms.
- Optional AI extraction and coverage interpretation. The AI reads all supplied text, considers selected plans and exclusions, and returns exact supporting quotes. Quotes are checked against the stored pages; unsupported answers are marked Unclear.
- Responsive interface for phones and computers.

## What you need

1. Your GitHub account and a new private repository, such as `warranty-desk`.
2. Your Cloudflare account with Workers, D1 and R2 enabled.
3. For AI features: an OpenAI API key with API billing enabled. ChatGPT subscriptions do not include API usage. No ChatGPT plugin is needed.

**Do not put API keys or passwords in GitHub.** Use Cloudflare Worker secrets. Without the workspace password, this application stays locked. Without the AI key, scan reading, basic extraction, saved records, and text search still work.

## Setup through Cloudflare + GitHub

### 1. Put this project in GitHub

Unzip this folder. Upload its **contents** to the root of your private repository. `package.json`, `wrangler.jsonc`, `worker/`, `app/`, and `migrations/` must be at the repository root. Include the generated `package-lock.json` and `dist/` files. The included build is convenient; Cloudflare rebuilds it from source on deployment.

### 2. Create the storage

In Cloudflare, create a D1 database named `warranty-desk`. Copy its Database ID.

Create an R2 bucket named `warranty-desk-contracts`. Keep the bucket private; do not enable an R2 public development URL.

Edit `wrangler.jsonc` in your repository:

- Replace `00000000-0000-4000-8000-000000000000` with your actual D1 Database ID.
- If you chose different database/bucket names, update `database_name` and `bucket_name`.
- Keep the binding names **DB**, **BUCKET**, and **ASSETS** unchanged.
- Choose another `name` if `warranty-desk` is already used in your account.

The `migrations/0001_contracts.sql` file creates the table and VIN index. The deploy script applies pending migrations before deployment. If your deployment token cannot run migrations, run this SQL once in the D1 console for initial setup and use `npx wrangler deploy` as the deployment command. For later migrations, apply only new migration files.

### 3. Connect the repository to Workers Builds

In Cloudflare Workers & Pages, create/import a **Worker** connected to this GitHub repository. This is a Worker with static assets, not a Pages project.

Use:

| Setting | Value |
| --- | --- |
| Root directory | repository root |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Node version | 22.13.0 or newer |

Grant the deployment token the access required to deploy your Worker and apply migrations to the selected D1 database. The R2 bucket must already exist. Cloudflare's Git integration handles source updates when you push to the selected branch.

### 4. Set your secrets

Under your deployed Worker's settings, add these as **secrets**, not ordinary public text in the repository:

| Secret | Value |
| --- | --- |
| `APP_PASSWORD` | A unique workspace password of at least 16 characters |
| `OPENAI_API_KEY` | Your own OpenAI API key; optional for basic scan/text mode |

The model is configured in `wrangler.jsonc` as `OPENAI_MODEL: "gpt-4.1-mini"`. You can change it to another Responses API model that supports JSON-schema output. The API key is used only on the server.

Save/apply the settings. Open the Worker's `workers.dev` address and sign in using your workspace password.

### 5. Try a contract

1. Click **Add contract**.
2. Upload the declarations page and the complete terms, including endorsements.
3. Click **Read contract**. Keep the tab open; long scanned PDFs can take a few minutes, especially on a phone.
4. Review the extracted text and correct the fields. Blanks mean missing/unreadable information. The claims phone is not the claim number.
5. Save. The customer name and a valid 17-character VIN are required.
6. Open the record and search **water pump** or another component.
7. Check the AI answer and cited passages against the original paperwork.

## Terminal setup alternative

Requires Node 22.13+, npm, and a Cloudflare login:

```bash
npm ci
npx wrangler login
npx wrangler d1 create warranty-desk
npx wrangler r2 bucket create warranty-desk-contracts
```

Put the returned database ID in `wrangler.jsonc`, then:

```bash
npm run build
npm run deploy
npx wrangler secret put APP_PASSWORD
npx wrangler secret put OPENAI_API_KEY
```

The first deploy is locked until `APP_PASSWORD` is configured.

## Local development

```bash
npm ci
cp .dev.vars.example .dev.vars
# Set your local password, and optionally your API key, in .dev.vars.
npm run db:local
npm run dev
```

Open the local URL printed by Wrangler. Local D1 and R2 are separate from production. Rebuild after frontend edits; Wrangler watches server source. Do not commit `.dev.vars`.

## Verification

```bash
npm test
npm run check
npm run build
npm run verify:worker
```

A synthetic end-to-end storage/auth test is also included. It creates records in the local database only. Start the local server with `APP_PASSWORD=local-test-password-only`, then run `node tests/smoke.mjs`. Do not point this test at production.

Validated during construction: TypeScript, production frontend build, Worker dry-run bundling, local D1 migration, password sign-in, unauthorized API/file blocking, D1 create/read/update/list, original file storage/retrieval in R2, cross-origin write rejection, missing-AI-key fallback, field extraction, and component text search. Live OpenAI calls require your key and were not run. Browser OCR and visual interaction testing were not completed in this environment; test your first real scanned contract after deployment.

## Important behavior and limits

- This is one private test workspace with one shared password, not separate shop/company accounts. Rotating the password invalidates all sessions. Sessions last 12 hours. Login and AI rate limits are configured in Wrangler.
- Uploads are read locally first. After saving, originals are stored in your R2 bucket and extracted text in your D1 database. With AI enabled, extracted contract text is sent to OpenAI for analysis with `store: false`. Do not assume this setting changes your account's provider retention policies.
- OCR libraries and English language data load from pinned jsDelivr dependencies. Internet access is required. File bytes are processed by those libraries in the browser, not uploaded to an OCR service. Use English documents and clear scans. HEIC photos should be exported as JPG first.
- Basic extraction uses labeled text patterns; many layouts need manual corrections. AI improves interpretation but is also fallible. Only save after reviewing the original.
- AI accepts up to 500,000 characters of contract text. Larger records can still be saved (up to 1.5 million characters) and searched as text.
- A template booklet containing multiple plans is not proof of purchased coverage. Missing declarations/endorsements, unclear exclusions, current mileage, diagnosis, and dates can prevent a reliable answer.
- Coverage guidance is not an approval, authorization, or promise of payment. The administrator still decides the claim.
- No VIN data is retrieved from warranty companies. Records come from contracts you upload. No live payments, billing/subscriptions, warranty-company integrations, or invoice workflow are included in this first contract test.
- Customer-data export, individual user permissions, audit trails, and deletion workflows should be added before expanding beyond the private pilot. No automated deletion is performed.

## Project map

- `app/page.tsx`: application interface and upload/review flows.
- `app/api/`: record, document and AI endpoints.
- `worker/index.ts`: Cloudflare request routing and access controls.
- `worker/auth.ts`: password/session handling.
- `lib/ai.ts`: server-side OpenAI Responses API integration.
- `lib/contract.ts`: basic extraction and passage search.
- `public/reader.mjs`: browser PDF reader and OCR.
- `migrations/`: versioned D1 schema changes.
- `wrangler.jsonc`: your Cloudflare resource configuration.

Reference documentation:
- https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/workers/configuration/rate-limiting/
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://github.com/naptha/tesseract.js
- https://mozilla.github.io/pdf.js/examples/
