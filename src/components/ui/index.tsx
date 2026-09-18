import {
  cloneElement,
  forwardRef,
  useId,
  useState,
  type FormEvent,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Inbox,
  Loader2,
  type LucideIcon
} from 'lucide-react';
export { Modal, ConfirmModal } from './Modal';
export { ComboBox } from './ComboBox';
export type { ComboBoxOption } from './ComboBox';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading,
    disabled,
    className = '',
    children,
    type = 'button',
    ...props
  },
  ref
) {
  const variants = {
    primary: 'border-brand-700 bg-brand-700 text-white hover:bg-brand-800',
    secondary: 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50',
    ghost: 'border-transparent bg-transparent text-brand-700 hover:bg-brand-50',
    danger: 'border-red-700 bg-red-700 text-white hover:bg-red-800'
  };
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-xl border font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${size === 'lg' ? 'px-6 py-4' : size === 'sm' ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-sm'} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', type, max, ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        max={type === 'number' ? (max ?? 1e12) : max}
        className={`control ${className}`}
        {...props}
      />
    );
  }
);
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = '', ...props }, ref) {
    return <select ref={ref} className={`control ${className}`} {...props} />;
  }
);
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = '', ...props }, ref) {
  return <textarea ref={ref} className={`control ${className}`} {...props} />;
});
type FieldChild = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  onInvalid?: (
    event: FormEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  onInput?: (event: FormEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
};
export function Field({
  label,
  help,
  error,
  children,
  className = ''
}: {
  label: string;
  help?: ReactNode;
  error?: string;
  children: ReactElement<FieldChild>;
  className?: string;
}) {
  const autoId = useId();
  const id = children.props.id || autoId;
  const [nativeError, setNativeError] = useState('');
  const message = error || nativeError;
  return (
    <div className={`min-w-0 space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-sm font-semibold text-stone-700">
        {label}
      </label>
      {cloneElement(children, {
        id,
        'aria-describedby': `${id}-hint`,
        'aria-invalid': !!message,
        onInvalid: event => {
          const v = event.currentTarget.validity;
          setNativeError(
            v.valueMissing
              ? 'Completa este campo.'
              : v.rangeUnderflow || v.rangeOverflow
                ? 'El valor está fuera del intervalo permitido.'
                : v.tooShort
                  ? 'El texto es demasiado corto.'
                  : 'Revisa el formato de este campo.'
          );
          children.props.onInvalid?.(event);
        },
        onInput: event => {
          setNativeError('');
          children.props.onInput?.(event);
        }
      })}
      <div id={`${id}-hint`} aria-live="polite">
        {message ? (
          <p className="text-sm text-red-800">{message}</p>
        ) : help ? (
          <p className="text-xs text-stone-600">{help}</p>
        ) : null}
      </div>
    </div>
  );
}
export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`min-w-0 rounded-2xl border border-stone-200 bg-white p-5 shadow-card ${className}`}
      {...props}
    />
  );
}
const badgeStyles: Record<string, string> = {
  Sano: 'bg-sano-bg text-sano-text border-sano-border',
  'En tratamiento': 'bg-tratamiento-bg text-tratamiento-text border-tratamiento-border',
  'En cuarentena': 'bg-cuarentena-bg text-cuarentena-text border-cuarentena-border',
  Vacunado: 'bg-vacunado-bg text-vacunado-text border-vacunado-border',
  Observación: 'bg-observacion-bg text-observacion-text border-observacion-border'
};
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      className={`inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${badgeStyles[String(children)] || 'border-stone-200 bg-stone-100 text-stone-700'}`}
    >
      {children}
    </span>
  );
}
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
      <div className="rounded-2xl bg-brand-50 p-4 text-brand-700">
        <Icon size={30} aria-hidden="true" />
      </div>
      <div className="max-w-md space-y-2">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-sm leading-relaxed text-stone-600">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function StatTile({
  label,
  value,
  help,
  icon: Icon,
  onClick,
  expanded
}: {
  label: string;
  value: ReactNode;
  help?: string;
  icon?: LucideIcon;
  /** Si se indica, el dato deja de ser un rótulo y pasa a ser una puerta. */
  onClick?: () => void;
  expanded?: boolean;
}) {
  const contenido = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-stone-600 sm:text-sm">{label}</p>
        {Icon && (
          <Icon size={20} className="hidden shrink-0 text-brand-700 sm:block" aria-hidden="true" />
        )}
      </div>
      <p className="mt-3 break-words text-2xl font-bold tracking-tight text-brand-900">{value}</p>
      {help && <p className="mt-1 text-xs text-stone-600">{help}</p>}
    </>
  );
  if (!onClick) return <Card className="!p-3 sm:!p-5">{contenido}</Card>;
  return (
    <Card
      className={`!p-0 ${expanded ? 'border-brand-400 ring-1 ring-brand-300' : 'hover:border-brand-300'}`}
    >
      <button
        type="button"
        onClick={onClick}
        aria-expanded={expanded}
        className="w-full rounded-2xl p-3 text-left sm:p-5"
      >
        {contenido}
        <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-700">
          {expanded ? 'Ocultar' : 'Ver cuáles'}
          <ChevronDown
            size={14}
            className={expanded ? 'rotate-180' : undefined}
            aria-hidden="true"
          />
        </span>
      </button>
    </Card>
  );
}
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | '';
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-stone-700">{label}</legend>
      <div className="flex gap-1 rounded-xl border border-stone-200 bg-stone-100 p-1">
        {options.map(option => (
          <Button
            key={option.value}
            variant={value === option.value ? 'primary' : 'ghost'}
            aria-pressed={value === option.value}
            className="flex-1 px-2"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}
export function Banner({
  children,
  tone = 'warning'
}: {
  children: ReactNode;
  tone?: 'warning' | 'success' | 'error';
}) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm leading-relaxed ${tone === 'success' ? 'border-brand-200 bg-brand-50 text-brand-800' : tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-tierra-300 bg-tierra-50 text-tierra-700'}`}
    >
      <Icon size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
