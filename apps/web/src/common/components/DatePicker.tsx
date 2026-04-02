import { useState, useRef, useEffect } from "react";

export interface DatePickerProps {
  value?: string;
  onChange?: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  minDate?: string;
  maxDate?: string;
  className?: string;
}

const months = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  disabled,
  error,
  minDate,
  maxDate,
  className = ""
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const parts = value.split("/").map(Number);
      const d = parts[0] ?? 1;
      const m = parts[1] ?? 1;
      const y = parts[2] ?? new Date().getFullYear();
      return new Date(y, m - 1, d);
    }
    return new Date();
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const formatted = `${String(day).padStart(2, "0")}/${String(newDate.getMonth() + 1).padStart(2, "0")}/${newDate.getFullYear()}`;
    onChange?.(formatted);
    setIsOpen(false);
  };

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const [d, m, y] = dateStr.split("/");
    return `${d}/${m}/${y}`;
  };

  const daysInMonth = getDaysInMonth(viewDate);
  const firstDay = getFirstDayOfMonth(viewDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDay }, () => null);

  const goToPrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const isDateDisabled = (day: number) => {
    const currentStr = `${String(day).padStart(2, "0")}/${String(viewDate.getMonth() + 1).padStart(2, "0")}/${viewDate.getFullYear()}`;
    if (minDate && currentStr < minDate) return true;
    if (maxDate && currentStr > maxDate) return true;
    return false;
  };

  const selectedDate = value ? value.split("/") : [];

  return (
    <div ref={ref} className={`relative ${className}`}>
      <input
        type="text"
        readOnly
        value={formatDisplayDate(value ?? undefined)}
        placeholder={placeholder}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 text-sm border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer ${
          error
            ? "border-red-500 bg-red-50 focus:border-red-500"
            : "border-surface-300 bg-white focus:border-brand-500"
        } ${disabled ? "bg-surface-100 cursor-not-allowed" : "cursor-pointer"}`}
      />
      {isOpen && (
        <div className="absolute z-50 mt-1 p-3 bg-white border border-surface-200 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={goToPrevMonth} className="p-1 hover:bg-surface-100 rounded">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium">
              {months[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button type="button" onClick={goToNextMonth} className="p-1 hover:bg-surface-100 rounded">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {["D", "L", "M", "X", "J", "V", "S"].map((d, i) => (
              <span key={i} className="text-xs text-content-tertiary">{d}</span>
            ))}
            {padding.map((_, i) => (
              <div key={`pad-${i}`} className="w-8 h-8" />
            ))}
            {days.map((day) => {
              const isSelected = selectedDate[0] === String(day).padStart(2, "0") &&
                selectedDate[1] === String(viewDate.getMonth() + 1).padStart(2, "0") &&
                selectedDate[2] === String(viewDate.getFullYear());
              const disabled = isDateDisabled(day);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleDayClick(day)}
                  className={`w-8 h-8 text-sm rounded transition-colors ${
                    isSelected
                      ? "bg-brand-500 text-white"
                      : disabled
                        ? "text-content-tertiary cursor-not-allowed"
                        : "hover:bg-surface-100"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
