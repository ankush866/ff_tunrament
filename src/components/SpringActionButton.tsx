import React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

export type SaveStatus = 'idle' | 'loading' | 'success';

interface SpringActionButtonProps {
  type?: 'button' | 'submit';
  status: SaveStatus;
  idleLabel: string;
  loadingLabel?: string;
  successLabel?: string;
  onClick?: () => void;
  disabled?: boolean;
  form?: string;
  variant?: 'orange' | 'danger' | 'amber';
  className?: string;
}

export const SpringActionButton: React.FC<SpringActionButtonProps> = ({
  type = 'submit',
  status,
  idleLabel,
  loadingLabel = 'Saving...',
  successLabel = 'Confirmed & Saved!',
  onClick,
  disabled = false,
  form,
  variant = 'orange',
  className = ''
}) => {
  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  const variantCls =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm'
      : variant === 'amber'
        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm'
        : 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm';

  const activeCls = isSuccess
    ? 'bg-emerald-600 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 animate-spring-pop'
    : variantCls;

  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`min-h-[46px] px-4 py-3 font-gaming font-bold text-xs sm:text-sm rounded-xl transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2 whitespace-normal text-center leading-tight cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed ${activeCls} ${className}`}
    >
      {isLoading && (
        <span className="relative inline-flex items-center justify-center shrink-0">
          <span className="absolute inset-0 rounded-full bg-white/40 animate-ping" />
          <Loader2 className="w-4 h-4 animate-spin relative" />
        </span>
      )}
      {isSuccess && <CheckCircle2 className="w-4 h-4 shrink-0" />}
      <span>
        {isLoading ? loadingLabel : isSuccess ? successLabel : idleLabel}
      </span>
    </button>
  );
};
