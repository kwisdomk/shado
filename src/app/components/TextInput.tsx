import { useEffect, useRef } from 'react';

import { MAX_INPUT_LENGTH } from '../../lib/constants';

type TextInputProps = {
  value: string;
  error: string | null;
  validationAttempt: number;
  onChange: (value: string) => void;
  onReview: () => void;
};

export default function TextInput({
  value,
  error,
  validationAttempt,
  onChange,
  onReview,
}: TextInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const describedBy = [
    'message-input-help',
    'message-input-count',
    error ? 'message-input-error' : null,
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    if (error) {
      inputRef.current?.focus();
    }
  }, [error, validationAttempt]);

  return (
    <section className="analysis-input-panel" aria-labelledby="message-input-heading">
      <h1 id="message-input-heading" style={{ marginTop: 0 }}>
        Check a suspicious message
      </h1>
      <p id="message-input-help" className="analysis-supporting-copy">
        Paste plain text only. SHADO keeps it in this page&apos;s memory and
        reviews masking before local analysis.
      </p>
      <label
        htmlFor="suspicious-message"
        style={{ display: 'block', marginBottom: 'var(--space-sm)' }}
      >
        Suspicious message
      </label>
      <textarea
        ref={inputRef}
        id="suspicious-message"
        className="shado-input"
        rows={10}
        placeholder="Paste the suspicious message here..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
      />
      {error ? (
        <p id="message-input-error" className="analysis-input-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="analysis-input-meta">
        <span
          id="message-input-count"
          aria-live="polite"
          className={value.length > MAX_INPUT_LENGTH ? 'analysis-count-over' : undefined}
        >
          {value.length} / {MAX_INPUT_LENGTH}
        </span>
        <button
          type="button"
          className="shado-btn shado-btn-primary"
          onClick={onReview}
        >
          Review Message
        </button>
      </div>
    </section>
  );
}
