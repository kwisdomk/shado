// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AnalyzePage from '../analyze/page';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('Review & Mask flow', () => {
  it('starts with an empty input and disabled review button', () => {
    render(<AnalyzePage />);

    expect(
      screen.getByRole('textbox', { name: /suspicious message/i }),
    ).toHaveValue('');
    expect(
      screen.getByRole('button', { name: /review message/i }),
    ).toBeDisabled();
    expect(screen.getByText('0 / 2000')).toBeInTheDocument();
  });

  it('enables review only after text is entered', () => {
    render(<AnalyzePage />);

    fireEvent.change(
      screen.getByRole('textbox', { name: /suspicious message/i }),
      { target: { value: 'Please call 0712345678' } },
    );

    expect(
      screen.getByRole('button', { name: /review message/i }),
    ).toBeEnabled();
  });

  it('masks PII, highlights placeholders, and warns about names', () => {
    render(<AnalyzePage />);

    fireEvent.change(
      screen.getByRole('textbox', { name: /suspicious message/i }),
      { target: { value: 'Please call 0712345678 and ask John' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /review message/i }));

    expect(screen.getByText('[PHONE]')).toHaveClass('mask-placeholder');
    expect(
      screen.getByRole('textbox', { name: /edit masked message/i }),
    ).toHaveValue('Please call [PHONE] and ask John');
    expect(screen.queryByText(/0712345678/u)).not.toBeInTheDocument();
    expect(screen.getByText(/names may not be automatically detected/i)).toBeInTheDocument();
  });

  it('keeps the highlighted preview in sync with manual edits and gates whitespace', () => {
    render(<AnalyzePage />);
    fireEvent.change(
      screen.getByRole('textbox', { name: /suspicious message/i }),
      { target: { value: 'Call 0712345678' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /review message/i }));

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
    expect(screen.getByRole('button', { name: /^back$/i }).parentElement).toHaveStyle({
      flexWrap: 'wrap',
    });
  });

  it('analyzes the user-edited masked text locally without network or storage', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Network must not be called'));
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const consoleSpy = vi.spyOn(console, 'log');
    render(<AnalyzePage />);

    fireEvent.change(
      screen.getByRole('textbox', { name: /suspicious message/i }),
      { target: { value: 'Benign original text 0712345678' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /review message/i }));
    fireEvent.change(
      screen.getByRole('textbox', { name: /edit masked message/i }),
      { target: { value: 'Please share your OTP' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /analyze safely/i }));

    expect(
      screen.getByRole('heading', { name: /analyzing locally/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /strong fraud indicators/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Credential theft')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorageSpy).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
    expect(screen.queryByText(/0712345678/u)).not.toBeInTheDocument();

    fetchSpy.mockRestore();
    localStorageSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('returns from review to input without placing text in the URL', () => {
    render(<AnalyzePage />);
    const input = screen.getByRole('textbox', { name: /suspicious message/i });

    fireEvent.change(input, { target: { value: 'Call 0712345678' } });
    fireEvent.click(screen.getByRole('button', { name: /review message/i }));
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
