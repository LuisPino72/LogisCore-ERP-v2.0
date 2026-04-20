import { useState } from "react";
import { Tooltip, Button, Input } from "@/common";
import { Check, X, AlertTriangle, TrendingUp, RefreshCw } from "lucide-react";

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
        <Input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-24 text-sm font-bold"
          placeholder="Bs 0.00"
          autoFocus
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="p-1 text-state-success hover:bg-state-success/10"
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isSaving}
          className="p-1 text-state-error hover:bg-state-error/10"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (rate === null) {
    return (
      <Button
        variant="ghost"
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-2"
      >
        <AlertTriangle className="w-4 h-4 text-content-tertiary" />
        <span className="text-xs text-content-tertiary">Tasa no configurada</span>
      </Button>
    );
  }

  const formattedRate = new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(rate);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-2 bg-state-success/5 border border-state-success/10 hover:bg-state-success/10"
      >
        <TrendingUp className="w-4 h-4 text-state-success" />
        <span className="text-xs text-state-success/70 font-medium">USD 1 =</span>
        <span className="text-sm font-bold text-content-primary">Bs {formattedRate}</span>
      </Button>
      {showFetchButton && (
        <Tooltip content="Actualizar tasa desde BCV" position="bottom">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFetchFromBCV}
            disabled={isFetching}
            className="p-2"
          >
          {isFetching ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
        </Tooltip>
      )}
    </div>
  );
}
