import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg';
}

export default function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-['Open_Sans'] animate-fade-in" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`w-full bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-xl animate-fade-up overflow-y-auto max-h-[90vh] ${size === 'lg' ? 'max-w-[640px]' : 'max-w-[480px]'}`}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-[18px] font-bold text-[#1F2937] leading-none tracking-tight">{title}</span>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#555555] transition-colors p-1 rounded-md hover:bg-[#F5F5F5]"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
