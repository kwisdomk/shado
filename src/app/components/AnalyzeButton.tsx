type AnalyzeButtonProps = {
  disabled: boolean;
  processing?: boolean;
  onClick: () => void;
};

export default function AnalyzeButton({
  disabled,
  processing = false,
  onClick,
}: AnalyzeButtonProps) {
  return (
    <button
      type="button"
      className="shado-btn shado-btn-primary"
      disabled={disabled || processing}
      onClick={onClick}
    >
      {processing ? 'Analyzing locally…' : 'Analyze Safely'}
    </button>
  );
}
