import { MAX_INPUT_LENGTH } from '../../lib/constants';

type TextInputProps = {
  value: string;
  onChange: (value: string) => void;
  onReview: () => void;
};

export default function TextInput({ value, onChange, onReview }: TextInputProps) {
  return (
    <section className="shado-card" aria-labelledby="message-input-heading">
      <h1 id="message-input-heading" style={{ marginTop: 0 }}>
        Check a suspicious message
      </h1>
      <p style={{ color: 'var(--smoke)' }}>
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
        id="suspicious-message"
        className="shado-input"
        rows={10}
        maxLength={MAX_INPUT_LENGTH}
        placeholder="Paste the suspicious message here..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-md)',
          marginTop: 'var(--space-md)',
        }}
      >
        <span aria-live="polite" style={{ color: 'var(--smoke)' }}>
          {value.length} / {MAX_INPUT_LENGTH}
        </span>
        <button
          type="button"
          className="shado-btn shado-btn-primary"
          disabled={value.trim().length === 0}
          onClick={onReview}
        >
          Review Message
        </button>
      </div>
    </section>
  );
}
