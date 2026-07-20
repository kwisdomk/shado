export type AnalyzeStep =
  | 'input'
  | 'review'
  | 'analyzing'
  | 'results'
  | 'error';

export default function StateIndicator({ step }: { step: AnalyzeStep }) {
  const label =
    step === 'input'
      ? 'Step 1 of 3 · Paste'
      : step === 'results'
        ? 'Results'
        : 'Step 2 of 3 · Review & Mask';

  return (
    <p
      aria-label="Analysis progress"
      aria-current="step"
      className="analysis-step-label"
    >
      {label}
    </p>
  );
}
