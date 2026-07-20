import type { MaskingResult } from '../../lib/pii-masker';

export type MaskingPreviewResult = Pick<
  MaskingResult,
  'maskedText' | 'hasUnmaskedNames'
>;

type MaskPreviewProps = {
  maskResult: MaskingPreviewResult;
  editedMaskedText: string;
  onChange: (value: string) => void;
};

const MASK_TOKEN_PATTERN =
  /\[EMAIL\]@[^\s]+|\[(?:PHONE|TRANSACTION|ID_NUMBER|REDACTED|REFERENCE)\]/gu;

function highlightedText(text: string) {
  const content = [];
  let cursor = 0;

  for (const match of text.matchAll(MASK_TOKEN_PATTERN)) {
    const index = match.index;
    if (index > cursor) {
      content.push(text.slice(cursor, index));
    }
    content.push(
      <mark
        key={`${index}-${match[0]}`}
        className="mask-placeholder"
        style={{
          background: 'var(--violet-dim)',
          color: 'var(--soft-white)',
          border: '1px solid var(--violet)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px 4px',
        }}
      >
        {match[0]}
      </mark>,
    );
    cursor = index + match[0].length;
  }

  if (cursor < text.length) {
    content.push(text.slice(cursor));
  }
  return content;
}

export default function MaskPreview({
  maskResult,
  editedMaskedText,
  onChange,
}: MaskPreviewProps) {
  return (
    <section className="analysis-section" aria-labelledby="mask-preview-heading">
      <h1 id="mask-preview-heading" style={{ marginTop: 0 }}>
        Review &amp; Mask
      </h1>
      <p style={{ color: 'var(--smoke)' }}>
        Review every placeholder, then remove or replace anything else you do
        not want analyzed.
      </p>
      <div
        className="mask-preview-surface"
        aria-label="Masked placeholder preview"
        style={{
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          marginBottom: 'var(--space-md)',
        }}
      >
        {highlightedText(editedMaskedText)}
      </div>
      {maskResult.hasUnmaskedNames ? (
        <p role="note" className="masking-review-note">
          Names may not be automatically detected. Please review and redact any
          personal names manually.
        </p>
      ) : null}
      <label
        htmlFor="edited-masked-message"
        style={{ display: 'block', marginBottom: 'var(--space-sm)' }}
      >
        Edit masked message
      </label>
      <textarea
        id="edited-masked-message"
        className="shado-input"
        rows={10}
        value={editedMaskedText}
        onChange={(event) => onChange(event.target.value)}
      />
    </section>
  );
}
