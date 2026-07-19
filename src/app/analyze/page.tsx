'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import type { AnalysisReport } from '../../lib/schema';
import { analyzeMessage } from '../../lib/engine';
import { maskPII } from '../../lib/pii-masker';
import { normalize } from '../../lib/normalize';
import ActionsList from '../components/ActionsList';
import AnalyzeButton from '../components/AnalyzeButton';
import EvidenceList from '../components/EvidenceList';
import LimitationsFooter from '../components/LimitationsFooter';
import MaskPreview, {
  type MaskingPreviewResult,
} from '../components/MaskPreview';
import MethodBadge from '../components/MethodBadge';
import RiskCard from '../components/RiskCard';
import ShadoLogo from '../components/ShadoLogo';
import StateIndicator from '../components/StateIndicator';
import TextInput from '../components/TextInput';

type AnalyzeState =
  | { step: 'input' }
  | {
      step: 'review';
      rawText: string;
      maskResult: MaskingPreviewResult;
      editedMaskedText: string;
    }
  | { step: 'analyzing'; maskedText: string }
  | { step: 'results'; report: AnalysisReport }
  | { step: 'error'; message: string; fallbackReport?: AnalysisReport };

export default function AnalyzePage() {
  const [inputText, setInputText] = useState('');
  const [state, setState] = useState<AnalyzeState>({ step: 'input' });
  const flowContentRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef(state.step);

  useEffect(() => {
    if (previousStepRef.current !== state.step) {
      flowContentRef.current?.focus();
      previousStepRef.current = state.step;
    }
  }, [state.step]);

  useEffect(() => {
    if (state.step !== 'analyzing') {
      return;
    }

    const maskedText = state.maskedText;
    const timer = window.setTimeout(() => {
      try {
        const report = analyzeMessage(maskedText);
        setState({ step: 'results', report });
      } catch {
        setState({
          step: 'error',
          message:
            'The local analysis could not be completed. Please review the message and try again.',
        });
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [state]);

  function reviewMessage() {
    const normalized = normalize(inputText);
    const maskResult = maskPII(normalized.display);
    const rawText = inputText;
    setInputText('');
    setState({
      step: 'review',
      rawText,
      maskResult: {
        maskedText: maskResult.maskedText,
        hasUnmaskedNames: maskResult.hasUnmaskedNames,
      },
      editedMaskedText: maskResult.maskedText,
    });
  }

  function analyzeSafely(maskedText: string) {
    setState({ step: 'analyzing', maskedText });
  }

  function reset() {
    setInputText('');
    setState({ step: 'input' });
  }

  return (
    <main style={{ minHeight: '100vh', padding: 'var(--space-lg)' }}>
      <header
        style={{
          maxWidth: 880,
          margin: '0 auto var(--space-xl)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}
      >
        <Link href="/" aria-label="SHADO home" style={{ textDecoration: 'none' }}>
          <ShadoLogo variant="full" size={30} />
        </Link>
        <span className="shado-badge">Local only</span>
      </header>

      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <StateIndicator step={state.step} />

        <div
          ref={flowContentRef}
          tabIndex={-1}
          aria-label="Current analysis step"
          aria-live="polite"
        >

        {state.step === 'input' ? (
          <TextInput
            value={inputText}
            onChange={setInputText}
            onReview={reviewMessage}
          />
        ) : null}

        {state.step === 'review' ? (
          <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
            <MaskPreview
              maskResult={state.maskResult}
              editedMaskedText={state.editedMaskedText}
              onChange={(editedMaskedText) =>
                setState({ ...state, editedMaskedText })
              }
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 'var(--space-md)',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="shado-btn shado-btn-ghost"
                onClick={() => {
                  setInputText(state.rawText);
                  setState({ step: 'input' });
                }}
              >
                Back
              </button>
              <AnalyzeButton
                disabled={state.editedMaskedText.trim().length === 0}
                onClick={() => analyzeSafely(state.editedMaskedText)}
              />
            </div>
          </div>
        ) : null}

        {state.step === 'analyzing' ? (
          <section className="shado-card" aria-live="polite">
            <h1>Analyzing locally…</h1>
            <p>No network request is being made.</p>
          </section>
        ) : null}

        {state.step === 'results' ? (
          <div style={{ display: 'grid', gap: 'var(--space-xl)' }}>
            <RiskCard report={state.report} />
            <EvidenceList evidence={state.report.evidence} />
            <ActionsList actionCodes={state.report.recommendedActionCodes} />
            <MethodBadge method={state.report.method} />
            <LimitationsFooter report={state.report} />
            <button
              type="button"
              className="shado-btn shado-btn-primary"
              onClick={reset}
            >
              Analyze Another
            </button>
          </div>
        ) : null}

        {state.step === 'error' ? (
          <section className="shado-card" role="alert">
            <h1>Analysis error</h1>
            <p>{state.message}</p>
            <button
              type="button"
              className="shado-btn shado-btn-ghost"
              onClick={() => setState({ step: 'input' })}
            >
              Back
            </button>
          </section>
        ) : null}
        </div>
      </div>
    </main>
  );
}
