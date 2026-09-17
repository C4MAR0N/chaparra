import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './index';
export function Modal({
  title,
  children,
  onClose,
  wide = false
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>('input:not([type="file"]),select,textarea,button')?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = oldOverflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={id}
      onCancel={e => {
        e.preventDefault();
        closeRef.current();
      }}
      onKeyDown={e => {
        if (e.key !== 'Tab') return;
        const nodes = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]'
          ) || []
        ).filter(el => el.getClientRects().length > 0);
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      className={`w-[calc(100%-24px)] rounded-2xl border border-stone-200 bg-white p-0 text-stone-900 shadow-card ${wide ? 'max-w-4xl' : 'max-w-xl'}`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-5 py-3">
        <h2 id={id} className="min-w-0 text-lg font-bold">
          {title}
        </h2>
        <Button variant="ghost" aria-label="Cerrar ventana" onClick={onClose}>
          <X size={22} />
        </Button>
      </div>
      <div className="space-y-5 p-5 sm:p-6">{children}</div>
    </dialog>,
    document.body
  );
}
export function ConfirmModal({
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = 'Eliminar',
  danger = true
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="text-sm leading-relaxed text-stone-600">{children}</div>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
