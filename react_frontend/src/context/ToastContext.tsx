import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface Toast { id: number; type: 'success' | 'error' | 'info'; message: string; }
interface ToastCtx { showToast: (type: Toast['type'], message: string) => void; }

const ToastContext = createContext<ToastCtx>({ showToast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const icons = { success: CheckCircle, error: XCircle, info: Info };
  
  const colors = {
    success: 'bg-[#F9FAFB] border-[#D1D5DB] text-[#1F2937]',
    error:   'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]',
    info:    'bg-[#F5F5F5] border-[#E5E7EB] text-[#555555]',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 font-['Open_Sans']">
        {toasts.map(t => {
          const Icon = icons[t.type];
          return (
            <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-md border shadow-lg text-[13px] font-semibold min-w-[280px] max-w-[380px] animate-[slideIn_0.2s_ease-out_forwards] ${colors[t.type]}`}>
              <Icon size={16} className="flex-shrink-0" />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => remove(t.id)} className="text-current opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/5 flex">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
