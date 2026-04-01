import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onDismiss: () => void;
}

export function Toast({ message, type = 'success', onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const bg =
    type === 'success'
      ? 'bg-emerald-500/90'
      : type === 'error'
        ? 'bg-red-500/90'
        : 'bg-blue-500/90';

  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl text-sm font-semibold text-white shadow-2xl transition-all duration-300 max-w-xs text-center ${bg} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      {message}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const ToastComponent = toast ? (
    <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
  ) : null;

  return { showToast, ToastComponent };
}
