# SHADO

SHADO is a privacy-first, mobile-focused tool that checks suspicious Kenyan message text with deterministic local rules and explains the warning signs and safer next actions it finds.

**Current checkpoint:** deterministic local MVP. GPT-5.6 and other OpenAI models are not used at runtime.

## The problem

Mobile fraud messages can imitate M-PESA, Safaricom, KRA, and other familiar services while using urgency, credential requests, fake reversal instructions, suspicious links, or payment pressure. Kenyan users may need a quick, understandable second look before they reply, click, send money, or disclose a PIN or OTP.

SHADO provides an evidence-based risk indicator, not a fraud verdict. A low result does not prove that a message is safe, and the indicator score is not a probability of fraud.

## What works today

- Manual plain-text message entry in a mobile-focused browser flow.
- A **Review & Mask** step that detects supported phone numbers, email local parts, transaction codes, ID numbers, sensitive URL parameters, and qualified long references.
- An editable masked-text preview so the user can remove names or other details the deterministic masker may miss.
- A second masking pass before analysis.
- Deterministic normalization, warning-signal extraction, scoring, safety floors, scam-family assignment, and protective-action selection.
- Evidence for credential requests, M-PESA reversal patterns, KRA impersonation, urgency or account threats, suspicious links, contact diversion, advance fees, secrecy, and reward bait.
- Brand-name-only and benign-message controls intended to reduce false positives.
- A strict Zod `AnalysisReport` contract covering risk level, indicator score, evidence, likely family, actions, method, uncertainty, and limitations.
- Focused unit and UI regression tests for the engine, masking, schema, safety rules, results, and complete review-to-results journey.

The report language taxonomy is exactly:

- `english`
- `swahili`
- `local`

`local` is the deterministic fallback when no matched signal supplies an English or Swahili label. It is metadata, not a claim of complete language identification.

## Privacy and safety model

The user manually pastes a message. The current analysis then runs locally in the browser with deterministic TypeScript rules. Before analysis, supported personal details are masked, shown for review, and masked again after the user's edits.

The implemented path keeps the message in the page's transient memory. It does not send the message to an analysis API or AI service, write it to application storage, place it in the URL, log it, or persist it in a database. Browser JavaScript cannot guarantee physical memory zeroization, and deterministic masking cannot reliably detect every name or unfamiliar sensitive format, so the review step remains essential.

SHADO's score is an indicator derived from matched rules; it is not a probability that a message is fraudulent. Users should independently verify unexpected messages through an official app, website, number, or support channel obtained separately from the message.

## Architecture

```text
Manual paste in /analyze
  -> normalize the text
  -> mask supported sensitive details
  -> user reviews and edits the masked text
  -> mask again and extract deterministic signals
  -> calculate the indicator score and apply safety floors
  -> select a likely family and approved actions
  -> validate the AnalysisReport with Zod
  -> render evidence, limitations, and next steps
```

The Next.js App Router provides the landing page and client-side analysis journey. Pure TypeScript modules in `src/lib` perform normalization, masking, signal extraction, scoring, policy enforcement, and report construction. Frozen catalogues in `src/data` contain signal rules, approved actions, and reviewed official-source records. There is no analysis API route, runtime OpenAI SDK call, message database, or background worker in this checkpoint.

## Prerequisites

For exact reproduction of this submission gate, use:

- Node.js `24.12.0`
- npm `11.6.2`

The locked Next.js package declares Node.js `>=20.9.0`, but this repository currently has no `.nvmrc` or root `engines` declaration. Node.js `24.12.0` is therefore the precise version used for the documented verification.

## Setup and run

From the repository root:

```bash
npm ci --no-audit --no-fund
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), select **Analyze a Message**, paste a synthetic message, review the masked text, and choose **Analyze Safely**.

## Verify

```bash
npm ci --no-audit --no-fund
npm test
npm run lint
npm run build
```

## Privacy-safe judge samples

These examples contain no real identifiers, credentials, or clickable links.

High-risk credential/OTP request:

```text
Your M-PESA verification code is needed. Please share your OTP to continue.
```

Benign or low-risk M-PESA notification:

```text
M-PESA CONFIRMED. You received KES 500 from Sample User.
```

Related regression fixtures are in `src/lib/__tests__/engine.test.ts`.

## Built during OpenAI Build Week

Repository history shows that the SHADO/Shadow Lab concept, working functional specification, generic Next.js shell, and landing-page design existed before the core analyzer commits. During the submission period, the project added the new Next.js/TypeScript deterministic analysis engine, normalization and PII masking, signal and official-source catalogues, scoring and safety floors, the strict report contract, regression tests, and the mobile Review & Mask/results journey. Later submission-period commits refined mobile usability, contextual financial-lure handling, and reproducible clean installs.

The implemented submission is the deterministic local MVP described in this README. Planned AI assistance, PWA installation, and Android sharing are not part of the current runtime.

## How Codex and GPT-5.6 were used

Codex and GPT-5.6 were used in the development workflow for:

- architecture review;
- contract and schema development;
- deterministic engine implementation;
- privacy and safety review;
- regression testing;
- UI iteration; and
- repository reproducibility and review.

This describes development-time collaboration. It does **not** mean that GPT-5.6 analyzes user messages in the current application. The implemented runtime is local and deterministic, and the repository contains no active OpenAI analysis integration.

## Current limitations and non-goals

- Rule-based analysis can miss new, obfuscated, unsupported, or context-dependent fraud patterns.
- A low indicator result is not a guarantee of safety; the score is not a fraud probability.
- Masking is deterministic and incomplete: names and unfamiliar formats require manual review.
- There is no runtime GPT-5.6 or other model analysis, multi-agent runtime pipeline, or server analysis API.
- There is no background SMS or inbox access, OCR, automatic fraud reporting, sender blocking, or transaction action.
- There is no completed PWA, offline guarantee, Android Share Target, native Android app, or verified production deployment.
- SHADO has no persistent message history, community reporting, phone-number reputation service, or threat database.
- The current tests are prototype regression evidence, not an accuracy evaluation or population-level validation.

## Repository structure

- `src/app` — App Router pages, mobile analysis flow, result components, styling, and UI tests.
- `src/lib` — normalization, masking, signal extraction, scoring, safety floors, report schema, deterministic engine, and unit tests.
- `src/data` — signal lexicon, protective-action catalogue, and reviewed official-source registry.
- `docs/SHADO_FUNCTIONAL_SPEC.md` — planning specification; it includes future ideas that are not necessarily implemented.
- `public` — static brand assets.

## Official-source attribution

The source registry and action catalogue record guidance reviewed on 19 July 2026 from:

- [Safaricom Fraud Awareness](https://www.safaricom.co.ke/fraud-awareness)
- [Safaricom Fake Reversal Instructions](https://www.safaricom.co.ke/fraud-awareness/m-pesa-fraud/fake-reversal-instructions)
- [Safaricom M-PESA Reversal](https://www.safaricom.co.ke/main-mpesa/m-pesa-for-you/getting-started/m-pesa-reversal)
- [KRA: Fraudulent Persons Masquerading as KRA Staff](https://www.kra.go.ke/news-center/public-notices/1603-fraudulent-person-s-masquerading-as-kra-staff)
- [KRA M-Service](https://www.kra.go.ke/m-services)

These sources inform reviewed safety guidance; they do not constitute a complete labelled dataset or prove the accuracy of SHADO's classifications. Official procedures can change, so users should re-check the organizations' current channels independently.

## License

SHADO is available under the [MIT License](LICENSE).
