import { Check, ChevronLeft, Minus, Plus, RotateCcw, Settings, X } from 'lucide-react';
import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { feedback } from '../lib/feedback';
import type { GamePreferences } from '../types';

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ReactNode;
  block?: boolean;
}

export function Button({
  variant = 'secondary',
  icon,
  block,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx('button', `button--${variant}`, block && 'button--block', className)}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function IconButton({
  label,
  children,
  ...props
}: PropsWithChildren<{ label: string }> & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="icon-button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

export function GameHeader({
  eyebrow,
  title,
  onBack,
  onSettings,
}: {
  eyebrow: string;
  title: string;
  onBack: () => void;
  onSettings?: () => void;
}) {
  return (
    <header className="game-header">
      <IconButton label="Вернуться к выбору игры" onClick={onBack}>
        <ChevronLeft aria-hidden="true" />
      </IconButton>
      <div className="game-header__title">
        <span>{eyebrow}</span>
        <strong>{title}</strong>
      </div>
      {onSettings ? (
        <IconButton label="Настройки" onClick={onSettings}>
          <Settings aria-hidden="true" />
        </IconButton>
      ) : (
        <span className="icon-button icon-button--placeholder" aria-hidden="true" />
      )}
    </header>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="stepper">
      <div>
        <span className="field-label">{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="stepper__actions">
        <IconButton
          label={`Уменьшить: ${label}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus aria-hidden="true" />
        </IconButton>
        <IconButton
          label={`Увеличить: ${label}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; note?: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="segmented-field">
      <legend className="field-label">{label}</legend>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={cx('segment', value === option.value && 'segment--active')}
            key={option.value}
            onClick={() => onChange(option.value)}
          >
            <strong>{option.label}</strong>
            {option.note && <span>{option.note}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ProgressRail({ items, current }: { items: string[]; current: number }) {
  return (
    <ol className="progress-rail" aria-label="Прогресс партии">
      {items.map((item, index) => (
        <li
          key={item}
          className={cx(index < current && 'done', index === current && 'current')}
          aria-current={index === current ? 'step' : undefined}
        >
          <span>{index < current ? <Check aria-hidden="true" /> : index + 1}</span>
          <small>{item}</small>
        </li>
      ))}
    </ol>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
  labelledBy,
}: PropsWithChildren<{
  open: boolean;
  title: string;
  onClose: () => void;
  labelledBy?: string;
}>) {
  const generatedId = useId();
  const titleId = labelledBy ?? generatedId;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const backdrop = panelRef.current?.parentElement;
    const parent = backdrop?.parentElement;
    const background = parent
      ? Array.from(parent.children).filter(
          (element): element is HTMLElement =>
            element instanceof HTMLElement && element !== backdrop,
        )
      : [];
    const backgroundState = background.map((element) => ({
      element,
      ariaHidden: element.getAttribute('aria-hidden'),
      inert: element.inert,
    }));
    background.forEach((element) => {
      element.setAttribute('aria-hidden', 'true');
      element.inert = true;
    });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      backgroundState.forEach(({ element, ariaHidden, inert }) => {
        if (ariaHidden === null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', ariaHidden);
        element.inert = inert;
      });
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-header">
          <h2 id={titleId}>{title}</h2>
          <IconButton label="Закрыть" onClick={onClose}>
            <X aria-hidden="true" />
          </IconButton>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function HoldToReveal({
  label = 'Удерживайте, чтобы открыть',
  haptics = false,
  onReveal,
}: {
  label?: string;
  haptics?: boolean;
  onReveal: () => void;
}) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const cancel = () => {
    setHolding(false);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const start = () => {
    if (timer.current) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(false);
      if (haptics && navigator.vibrate) navigator.vibrate(35);
      onReveal();
    }, 650);
  };

  return (
    <button
      type="button"
      className={cx('hold-button', holding && 'hold-button--active')}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') start();
      }}
      onKeyUp={cancel}
      aria-label={label}
    >
      <span className="hold-button__progress" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

export function Timer({
  initialSeconds = 180,
  preferences,
}: {
  initialSeconds?: number;
  preferences?: GamePreferences;
}) {
  const [{ remaining, running }, setTimer] = useState({
    remaining: initialSeconds,
    running: false,
  });

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const id = window.setInterval(
      () =>
        setTimer((current) =>
          current.remaining <= 1
            ? { remaining: 0, running: false }
            : { ...current, remaining: current.remaining - 1 },
        ),
      1000,
    );
    return () => window.clearInterval(id);
  }, [remaining, running]);

  useEffect(() => {
    if (remaining !== 0) return;
    if (preferences) feedback(preferences, 'alert');
  }, [preferences, remaining]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return (
    <div
      className={cx('timer', remaining <= 15 && 'timer--urgent')}
      aria-label={`Осталось ${minutes} минут ${seconds} секунд`}
    >
      <span className="sr-only" aria-live="polite">
        {remaining === 0 ? 'Время вышло' : ''}
      </span>
      <strong>
        {minutes}:{String(seconds).padStart(2, '0')}
      </strong>
      <div>
        <Button
          variant="ghost"
          disabled={remaining === 0}
          onClick={() => setTimer((current) => ({ ...current, running: !current.running }))}
        >
          {running ? 'Пауза' : 'Старт'}
        </Button>
        <IconButton
          label="Сбросить таймер"
          onClick={() => setTimer({ remaining: initialSeconds, running: false })}
        >
          <RotateCcw aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
