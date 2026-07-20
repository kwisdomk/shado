// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AnalysisReportSchema } from '../../lib/schema';
import AnalyzePage from '../analyze/page';

type FrameController = {
  advance: () => Promise<void>;
  pending: () => number;
};

function controlAnimationFrames(): FrameController {
  let nextId = 0;
  const frames = new Map<number, FrameRequestCallback>();

  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      nextId += 1;
      frames.set(nextId, callback);
      return nextId;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => {
      frames.delete(id);
    }),
  );

  return {
    pending: () => frames.size,
    advance: async () => {
      const entry = frames.entries().next().value as
        | [number, FrameRequestCallback]
        | undefined;
      expect(entry).toBeDefined();
      if (!entry) {
        return;
      }

      frames.delete(entry[0]);
      await act(async () => {
        entry[1](performance.now());
        await Promise.resolve();
        await Promise.resolve();
      });
    },
  };
}

function enterReview(message = 'Please call 0712345678') {
  fireEvent.change(
    screen.getByRole('textbox', { name: /suspicious message/i }),
    { target: { value: message } },
  );
  fireEvent.click(screen.getByRole('button', { name: /review message/i }));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('Review & Mask flow', () => {
  it('starts with compact truthful status and allows submission for inline validation', () => {
    render(<AnalyzePage />);

    expect(screen.getByText('Step 1 of 3 · Paste')).toBeInTheDocument();
    expect(screen.getByText('Analysis: Local rules')).toBeInTheDocument();
    expect(screen.getByText('Sharing: Off')).toBeInTheDocument();
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: /suspicious message/i }),
    ).toHaveValue('');
    expect(
      screen.getByRole('button', { name: /review message/i }),
    ).toBeEnabled();
    expect(screen.getByText('0 / 2000')).toBeInTheDocument();
  });

  it('keeps empty input in place and exposes a focused accessible inline error', () => {
    render(<AnalyzePage />);

    const input = screen.getByRole('textbox', { name: /suspicious message/i });
    fireEvent.click(screen.getByRole('button', { name: /review message/i }));

    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Paste a message to continue.');
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
    expect(screen.queryByText('Step 2 of 3 · Review & Mask')).not.toBeInTheDocument();
  });

  it('restores focus for repeated submissions of the same invalid input', () => {
    render(<AnalyzePage />);

    const input = screen.getByRole('textbox', { name: /suspicious message/i });
    const reviewButton = screen.getByRole('button', { name: /review message/i });

    fireEvent.click(reviewButton);
    expect(input).toHaveFocus();

    reviewButton.focus();
    expect(reviewButton).toHaveFocus();
    fireEvent.click(reviewButton);

    expect(input).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Paste a message to continue.',
    );
  });

  it('rejects whitespace-only input without advancing', () => {
    render(<AnalyzePage />);
    const input = screen.getByRole('textbox', { name: /suspicious message/i });

    fireEvent.change(input, { target: { value: '  \n\t  ' } });
    fireEvent.click(screen.getByRole('button', { name: /review message/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Paste a message to continue.',
    );
    expect(input).toHaveValue('  \n\t  ');
  });

  it('rejects zero-width or normalized-empty input as unreadable', () => {
    render(<AnalyzePage />);
    const input = screen.getByRole('textbox', { name: /suspicious message/i });

    fireEvent.change(input, { target: { value: '\u200B\u200C\uFEFF' } });
    fireEvent.click(screen.getByRole('button', { name: /review message/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'We couldn’t find readable text. Paste a message containing letters or numbers.',
    );
    expect(input).toHaveValue('\u200B\u200C\uFEFF');
  });

  it('rejects input over 2,000 characters without discarding it', () => {
    render(<AnalyzePage />);
    const input = screen.getByRole('textbox', { name: /suspicious message/i });
    const overLimit = 'a'.repeat(2001);

    fireEvent.change(input, { target: { value: overLimit } });
    fireEvent.click(screen.getByRole('button', { name: /review message/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This message is too long. Keep it under 2,000 characters.',
    );
    expect(input).toHaveValue(overLimit);
    expect(screen.getByText('2001 / 2000')).toBeInTheDocument();
  });

  it('clears an existing validation error once valid input is provided', () => {
    render(<AnalyzePage />);
    const input = screen.getByRole('textbox', { name: /suspicious message/i });

    fireEvent.click(screen.getByRole('button', { name: /review message/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Please verify this message' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('masks PII, highlights placeholders, and warns about names', () => {
    render(<AnalyzePage />);

    enterReview('Please call 0712345678 and ask John');

    expect(screen.getByText('Step 2 of 3 · Review & Mask')).toBeInTheDocument();
    expect(screen.getByText('[PHONE]')).toHaveClass('mask-placeholder');
    expect(
      screen.getByRole('textbox', { name: /edit masked message/i }),
    ).toHaveValue('Please call [PHONE] and ask John');
    expect(screen.queryByText(/0712345678/u)).not.toBeInTheDocument();
    expect(screen.getByText(/names may not be automatically detected/i)).toBeInTheDocument();
  });

  it('keeps the highlighted preview in sync with manual edits and gates whitespace', () => {
    render(<AnalyzePage />);
    enterReview('Call 0712345678');

    const editor = screen.getByRole('textbox', { name: /edit masked message/i });
    fireEvent.change(editor, { target: { value: 'Manually redacted' } });
    expect(screen.queryByText('[PHONE]')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Masked placeholder preview')).toHaveTextContent(
      'Manually redacted',
    );

    fireEvent.change(editor, { target: { value: '   ' } });
    expect(
      screen.getByRole('button', { name: /analyze safely/i }),
    ).toBeDisabled();
  });

  it('runs the three truthful local stages in order and prevents duplicate analysis', async () => {
    const frames = controlAnimationFrames();
    const contractParseSpy = vi.spyOn(AnalysisReportSchema, 'parse');
    render(<AnalyzePage />);
    enterReview();

    const analyzeButton = screen.getByRole('button', { name: /analyze safely/i });
    fireEvent.click(analyzeButton);
    fireEvent.click(analyzeButton);

    const flow = screen.getByLabelText('Current analysis step');
    expect(flow).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(flow).not.toContainElement(screen.getByRole('status'));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Masking sensitive details…',
    );
    expect(
      screen.getByRole('button', { name: 'Analyzing locally…' }),
    ).toBeDisabled();
    expect(frames.pending()).toBe(1);

    await frames.advance();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking warning signs…',
    );

    await frames.advance();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Preparing safety guidance…',
    );
    expect(contractParseSpy).not.toHaveBeenCalled();

    await frames.advance();
    expect(contractParseSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Results')).toBeInTheDocument();
    expect(flow).toHaveAttribute('aria-busy', 'false');
  });

  it('restores the edited masked message after an unexpected guidance failure', async () => {
    const frames = controlAnimationFrames();
    vi.spyOn(AnalysisReportSchema, 'parse').mockImplementationOnce(() => {
      throw new Error('Unexpected contract failure');
    });
    render(<AnalyzePage />);

    enterReview('Call 0712345678 now');
    const editor = screen.getByRole('textbox', { name: /edit masked message/i });
    fireEvent.change(editor, {
      target: { value: 'Keep this edited [PHONE] message' },
    });
    fireEvent.click(screen.getByRole('button', { name: /analyze safely/i }));

    await frames.advance();
    await frames.advance();
    await frames.advance();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The local analysis could not be completed.',
    );
    expect(screen.getByLabelText('Current analysis step')).toHaveAttribute(
      'aria-busy',
      'false',
    );

    fireEvent.click(
      screen.getByRole('button', { name: /back to review & mask/i }),
    );
    expect(
      screen.getByRole('textbox', { name: /edit masked message/i }),
    ).toHaveValue('Keep this edited [PHONE] message');
  });

  it('analyzes only the user-edited masked text without network, persistence, cookies, or URL transport', async () => {
    const frames = controlAnimationFrames();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Network must not be called'));
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const consoleSpy = vi.spyOn(console, 'log');
    const initialCookie = document.cookie;
    render(<AnalyzePage />);

    enterReview('Benign original text 0712345678');
    fireEvent.change(
      screen.getByRole('textbox', { name: /edit masked message/i }),
      { target: { value: 'Please share your OTP' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /analyze safely/i }));

    await frames.advance();
    await frames.advance();
    await frames.advance();

    expect(
      screen.getByRole('heading', { name: /strong fraud indicators/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Credential theft/u)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorageSpy).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(document.cookie).toBe(initialCookie);
    expect(window.location.search).toBe('');
    expect(screen.queryByText(/0712345678/u)).not.toBeInTheDocument();
  });

  it('returns from review to input without placing text in the URL', () => {
    render(<AnalyzePage />);
    enterReview('Call 0712345678');

    expect(screen.getByLabelText('Current analysis step')).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));

    expect(
      screen.getByRole('textbox', { name: /suspicious message/i }),
    ).toHaveValue('Call 0712345678');
    expect(window.location.search).toBe('');
  });

  it('loses in-memory text when the component is remounted', () => {
    const first = render(<AnalyzePage />);
    fireEvent.change(
      screen.getByRole('textbox', { name: /suspicious message/i }),
      { target: { value: 'Do not persist me' } },
    );
    first.unmount();

    render(<AnalyzePage />);
    expect(
      screen.getByRole('textbox', { name: /suspicious message/i }),
    ).toHaveValue('');
  });
});
