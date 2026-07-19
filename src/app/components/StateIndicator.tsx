export type AnalyzeStep =
  | 'input'
  | 'review'
  | 'analyzing'
  | 'results'
  | 'error';

const STEPS = [
  ['input', 'Paste'],
  ['review', 'Review & Mask'],
  ['results', 'Results'],
] as const;

export default function StateIndicator({ step }: { step: AnalyzeStep }) {
  const activeStep = step === 'analyzing' ? 'review' : step;

  return (
    <ol
      aria-label="Analysis progress"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-sm)',
        listStyle: 'none',
        padding: 0,
        margin: '0 0 var(--space-lg)',
      }}
    >
      {STEPS.map(([value, label], index) => (
        <li
          key={value}
          className="shado-badge"
          aria-current={activeStep === value ? 'step' : undefined}
          style={activeStep === value ? undefined : { opacity: 0.55 }}
        >
          {index + 1}. {label}
        </li>
      ))}
    </ol>
  );
}
