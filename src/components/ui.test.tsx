import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HoldToReveal, Modal, Segmented, Stepper, Timer } from './ui';

afterEach(() => vi.useRealTimers());

describe('shared mobile controls', () => {
  it('requires a deliberate 650ms hold to reveal private data', () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    render(<HoldToReveal onReveal={onReveal} />);
    const button = screen.getByRole('button', { name: 'Удерживайте, чтобы открыть' });

    fireEvent.pointerDown(button);
    vi.advanceTimersByTime(649);
    expect(onReveal).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onReveal).toHaveBeenCalledOnce();
  });

  it('cancels reveal when the user releases early', () => {
    vi.useFakeTimers();
    const onReveal = vi.fn();
    render(<HoldToReveal onReveal={onReveal} />);
    const button = screen.getByRole('button');

    fireEvent.pointerDown(button);
    vi.advanceTimersByTime(300);
    fireEvent.pointerUp(button);
    vi.advanceTimersByTime(500);
    expect(onReveal).not.toHaveBeenCalled();
  });

  it('exposes stepper limits and segmented state accessibly', () => {
    const onStep = vi.fn();
    const onSegment = vi.fn();
    render(
      <>
        <Stepper label="Игроки" value={5} min={5} max={6} onChange={onStep} />
        <Segmented
          label="Режим"
          value="one"
          options={[
            { value: 'one', label: 'Один' },
            { value: 'two', label: 'Два' },
          ]}
          onChange={onSegment}
        />
      </>,
    );

    expect(screen.getByRole('button', { name: 'Уменьшить: Игроки' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Увеличить: Игроки' }));
    expect(onStep).toHaveBeenCalledWith(6);
    expect(screen.getByRole('radio', { name: 'Один' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Два' }));
    expect(onSegment).toHaveBeenCalledWith('two');
  });

  it('closes a modal with Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Проверка" onClose={onClose}>
        <button type="button">Действие</button>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Проверка' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('stops at zero and requires an explicit reset', () => {
    vi.useFakeTimers();
    render(
      <Timer
        initialSeconds={1}
        preferences={{ haptics: false, sound: false, reducedMotion: false }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Старт' }));
    act(() => vi.advanceTimersByTime(1000));

    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Старт' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить таймер' }));
    expect(screen.getByText('0:01')).toBeInTheDocument();
  });

  it('accepts a custom duration and uses it as the new reset value', () => {
    render(<Timer initialSeconds={180} />);

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Минуты таймера' }), {
      target: { value: '12' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Секунды таймера' }), {
      target: { value: '34' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Задать' }));

    expect(screen.getByText('12:34')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Старт' }));
    fireEvent.click(screen.getByRole('button', { name: 'Пауза' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить таймер' }));
    expect(screen.getByText('12:34')).toBeInTheDocument();
  });
});
