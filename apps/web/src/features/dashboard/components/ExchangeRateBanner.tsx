import { useState } from "react";
import { Tooltip } from "@/common";

interface ExchangeRateBannerProps {
  rate: number | null;
  isLoading?: boolean;
  onUpdateRate?: ((rate: number) => Promise<void>) | undefined;
  onFetchFromBCV?: (() => Promise<void>) | undefined;
}

export function ExchangeRateBanner({ rate, isLoading, onUpdateRate, onFetchFromBCV }: ExchangeRateBannerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  if (isLoading) {
    return (
      <div className="animate-pulse bg-surface-100 h-10 rounded-lg" />
    );
  }

  const handleClick = () => {
    if (onUpdateRate && !isEditing) {
      setIsEditing(true);
      setInputValue(rate ? rate.toString() : "");
    }
  };

  const handleSave = async () => {
    const newRate = parseFloat(inputValue.replace(/[,\s]/g, ""));
    if (isNaN(newRate) || newRate <= 0) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      if (onUpdateRate) {
        await onUpdateRate(newRate);
      }
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue("");
  };

  const handleFetchFromBCV = async () => {
    if (!onFetchFromBCV || isFetching) return;
    setIsFetching(true);
    try {
      await onFetchFromBCV();
    } finally {
      setIsFetching(false);
    }
  };

  const showFetchButton = onFetchFromBCV && !isEditing && rate !== null;

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-state-success/5 border border-state-success/20">
        <span className="text-xs text-state-success/70 font-medium">USD 1 =</span>
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="input w-24 text-sm font-bold border-state-success/20 focus:ring-state-success"
          placeholder="Bs 0.00"
          autoFocus
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-1 text-state-success hover:text-state-success/70 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="p-1 text-state-error hover:text-state-error/70 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  if (rate === null) {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 hover:bg-surface-100 transition-colors"
      >
        <svg className="w-4 h-4 text-content-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="text-xs text-content-tertiary">Tasa no configurada</span>
      </button>
    );
  }

  const formattedRate = new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(rate);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-state-success/5 border border-state-success/10 hover:bg-state-success/10 transition-colors"
      >
        <svg className="w-4 h-4 text-state-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span className="text-xs text-state-success/70 font-medium">USD 1 =</span>
        <span className="text-sm font-bold text-content-primary">Bs {formattedRate}</span>
      </button>
      {showFetchButton && (
        <Tooltip content="Actualizar tasa desde BCV" position="bottom">
          <button
            onClick={handleFetchFromBCV}
            disabled={isFetching}
            className="p-2 rounded-lg border border-surface-200 hover:bg-surface-50 text-content-tertiary hover:text-brand-600 disabled:opacity-50 transition-colors"
          >
          {isFetching ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
        </button>
        </Tooltip>
      )}
    </div>
  );
}
