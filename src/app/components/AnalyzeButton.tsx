type AnalyzeButtonProps = {
  disabled: boolean;
  onClick: () => void;
};

export default function AnalyzeButton({
  disabled,
  onClick,
}: AnalyzeButtonProps) {
  return (
    <button
      type="button"
      className="shado-btn shado-btn-primary"
      disabled={disabled}
      onClick={onClick}
    >
      Analyze Safely
    </button>
  );
}
