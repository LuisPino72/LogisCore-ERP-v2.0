import { useState, useRef, useEffect } from "react";
import type { SelectOption } from "../types/common.types";

export interface SelectProps {
  options: SelectOption[];
  value?: string | number | null;
  onChange?: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function Select({ options, value, onChange, placeholder = "Seleccionar...", disabled, error, className = "" }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string | number) => {
    onChange?.(optionValue);
    setIsOpen(false);
  };

  const groups = options.reduce<Record<string, SelectOption[]>>((acc, opt) => {
    const group = opt.group ?? "default";
    if (!acc[group]) acc[group] = [];
    acc[group]!.push(opt);
    return acc;
  }, {});

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm text-left border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
          error
            ? "border-red-500 bg-red-50 focus:border-red-500"
            : "border-surface-300 bg-white focus:border-brand-500"
        } ${disabled ? "bg-surface-100 cursor-not-allowed" : "cursor-pointer"} flex items-center justify-between`}
      >
        <span className={selectedOption ? "text-content-primary" : "text-content-tertiary"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <svg className={`w-4 h-4 text-content-secondary transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-surface-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {Object.entries(groups).map(([group, groupOptions]) => (
            <div key={group}>
              {group !== "default" && (
                <div className="px-3 py-1.5 text-xs font-medium text-content-tertiary bg-surface-50 sticky top-0">
                  {group}
                </div>
              )}
              {groupOptions?.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  disabled={option.disabled}
                  className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                    option.value === value
                      ? "bg-brand-50 text-brand-700"
                      : "text-content-primary hover:bg-surface-50"
                  } ${option.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
