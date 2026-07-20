'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { MAX_INPUT_LENGTH } from '../../lib/constants';
import { analyzeMessage } from '../../lib/engine';
import { maskPII } from '../../lib/pii-masker';
import { normalize } from '../../lib/normalize';
import {
  AnalysisReportSchema,
  type AnalysisReport,
} from '../../lib/schema';
import ActionsList from '../components/ActionsList';
import AnalyzeButton from '../components/AnalyzeButton';
import EvidenceList from '../components/EvidenceList';
import LimitationsFooter from '../components/LimitationsFooter';
import MaskPreview, {
  type MaskingPreviewResult,
} from '../components/MaskPreview';
import RiskCard from '../components/RiskCard';
import ShadoLogo from '../components/ShadoLogo';
import StateIndicator from '../components/StateIndicator';
import TextInput from '../components/TextInput';

type ReviewData = {
  rawText: string;
  maskResult: MaskingPreviewResult;
  editedMaskedText: string;
};

type AnalyzeState =
  | { step: 'input' }
  | ({ step: 'review' } & ReviewData)
  | { step: 'analyzing'; review: ReviewData }
  | { step: 'results'; report: AnalysisReport }
  | { step: 'error'; message: string; review: ReviewData };

type AnalysisStage = 'masking' | 'signals' | 'guidance';

const ANALYSIS_STAGE_LABELS = {
  masking: 'Masking sensitive details…',
  signals: 'Checking warning signs…',
  guidance: 'Preparing safety guidance…',
} satisfies Record<AnalysisStage, string>;

const READABLE_CHARACTER = /[\p{L}\p{N}]/u;

function validateInput(value: string): string | null {
  if (value.trim().length === 0) {
    return 'Paste a message to continue.';
  }

  if (value.length > MAX_INPUT_LENGTH) {
    return 'This message is too long. Keep it under 2,000 characters.';
  }

  const normalized = normalize(value);
  if (!READABLE_CHARACTER.test(normalized.display)) {
    return 'We couldn’t find readable text. Paste a message containing letters or numbers.';
  }

  return null;
}

function nextBrowserPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve());
      return;
    }

    window.setTimeout(resolve, 0);
  });
}

export default function AnalyzePage() {
  const [inputText, setInputText] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [analysisStage, setAnalysisStage] =
    useState<AnalysisStage>('masking');
  const [state, setState] = useState<AnalyzeState>({ step: 'input' });
  const flowContentRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef(state.step);
  const reviewSubmissionRef = useRef(false);
  const analysisSubmissionRef = useRef(false);

  useEffect(() => {
    if (previousStepRef.current !== state.step) {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      flowContentRef.current?.focus({ preventScroll: true });
      previousStepRef.current = state.step;
    }
  }, [state.step]);

  const analyzingReview = state.step === 'analyzing' ? state.review : null;

  useEffect(() => {
    if (!analyzingReview) {
      return;
    }

    let cancelled = false;

    async function runLocalPipeline(review: ReviewData) {
      try {
        await nextBrowserPaint();
        if (cancelled) {
          return;
        }

        const safelyRemaskedText = maskPII(review.editedMaskedText).maskedText;
        setAnalysisStage('signals');

        await nextBrowserPaint();
        if (cancelled) {
          return;
        }

        const analyzedReport = analyzeMessage(safelyRemaskedText);
        setAnalysisStage('guidance');

        await nextBrowserPaint();
        if (cancelled) {
          return;
        }

        const report = AnalysisReportSchema.parse(analyzedReport);
        analysisSubmissionRef.current = false;
        setState({ step: 'results', report });
      } catch {
        analysisSubmissionRef.current = false;
        setState({
          step: 'error',
          message:
            'The local analysis could not be completed. Please review the message and try again.',
          review,
        });
      }
    }

    void runLocalPipeline(analyzingReview);

    return () => {
      cancelled = true;
    };
  }, [analyzingReview]);

  function changeInput(value: string) {
    setInputText(value);
    if (inputError && validateInput(value) === null) {
      setInputError(null);
    }
  }

  function reviewMessage() {
    if (reviewSubmissionRef.current) {
      return;
    }

    const error = validateInput(inputText);
    if (error) {
      setInputError(error);
      setValidationAttempt((attempt) => attempt + 1);
      return;
    }

    reviewSubmissionRef.current = true;
    const normalized = normalize(inputText);
    const maskResult = maskPII(normalized.display);
    const review: ReviewData = {
      rawText: inputText,
      maskResult: {
        maskedText: maskResult.maskedText,
        hasUnmaskedNames: maskResult.hasUnmaskedNames,
      },
      editedMaskedText: maskResult.maskedText,
    };

    setInputError(null);
    setInputText('');
    setState({ step: 'review', ...review });
  }

  function analyzeSafely(review: ReviewData) {
    if (analysisSubmissionRef.current) {
      return;
    }

    analysisSubmissionRef.current = true;
    setAnalysisStage('masking');
    setState({ step: 'analyzing', review });
  }

  function returnToInput(review: ReviewData) {
    reviewSubmissionRef.current = false;
    setInputText(review.rawText);
    setInputError(null);
    setState({ step: 'input' });
  }

  function reset() {
    reviewSubmissionRef.current = false;
    analysisSubmissionRef.current = false;
    setInputText('');
    setInputError(null);
    setAnalysisStage('masking');
    setState({ step: 'input' });
  }

  const isProcessing = state.step === 'analyzing';

  return (
    <main className="analysis-page">
      <div className="analysis-shell">
        <header className="analysis-header">
          <Link href="/" aria-label="SHADO home" className="analysis-home-link">
            <ShadoLogo variant="full" size={26} />
          </Link>
          <div className="analysis-status-row" aria-label="Analysis and sharing status">
            <span>Analysis: Local rules</span>
            <span>Sharing: Off</span>
          </div>
        </header>

        <StateIndicator step={state.step} />

        {isProcessing ? (
          <p
            className="analysis-stage-status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {ANALYSIS_STAGE_LABELS[analysisStage]}
          </p>
        ) : null}

        <div
          ref={flowContentRef}
          className="analysis-flow"
          tabIndex={-1}
          aria-label="Current analysis step"
          aria-busy={isProcessing}
        >
          {state.step === 'input' ? (
            <TextInput
              value={inputText}
              error={inputError}
              validationAttempt={validationAttempt}
              onChange={changeInput}
              onReview={reviewMessage}
            />
          ) : null}

          {state.step === 'review' ? (
            <div className="analysis-review">
              <MaskPreview
                maskResult={state.maskResult}
                editedMaskedText={state.editedMaskedText}
                onChange={(editedMaskedText) =>
                  setState({ ...state, editedMaskedText })
                }
              />
              <div className="analysis-actions analysis-review-actions">
                <button
                  type="button"
                  className="shado-btn shado-btn-ghost"
                  onClick={() => returnToInput(state)}
                >
                  Back
                </button>
                <AnalyzeButton
                  disabled={state.editedMaskedText.trim().length === 0}
                  onClick={() => analyzeSafely(state)}
                />
              </div>
            </div>
          ) : null}

          {state.step === 'analyzing' ? (
            <section className="analysis-processing" aria-labelledby="processing-heading">
              <h1 id="processing-heading">Analyzing locally…</h1>
              <AnalyzeButton disabled processing onClick={() => undefined} />
            </section>
          ) : null}

          {state.step === 'results' ? (
            <div className="analysis-results">
              <RiskCard report={state.report} />
              <EvidenceList evidence={state.report.evidence} />
              <ActionsList actionCodes={state.report.recommendedActionCodes} />
              <LimitationsFooter report={state.report} />
              <button
                type="button"
                className="shado-btn shado-btn-primary analysis-reset"
                onClick={reset}
              >
                Analyze Another
              </button>
            </div>
          ) : null}

          {state.step === 'error' ? (
            <section className="analysis-error" role="alert">
              <h1>Analysis error</h1>
              <p>{state.message}</p>
              <button
                type="button"
                className="shado-btn shado-btn-ghost"
                onClick={() => {
                  analysisSubmissionRef.current = false;
                  setState({ step: 'review', ...state.review });
                }}
              >
                Back to Review &amp; Mask
              </button>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
