import type { ReactNode } from "react";

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export function FormField({ label, htmlFor, error, hint, required, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-content-tertiary">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className = "", ...props }: InputProps) {
  return (
    <input
      className={`input ${
        error
          ? "border-red-500 bg-red-50 focus:border-red-500"
          : ""
      } ${className}`}
      {...props}
    />
  );
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ error, className = "", ...props }: TextareaProps) {
  return (
    <textarea
      className={`input resize-none ${
        error
          ? "border-red-500 bg-red-50 focus:border-red-500"
          : ""
      } ${className}`}
      {...props}
    />
  );
}

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Radio({ label, className = "", ...props }: RadioProps) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer text-sm ${className}`}>
      <input
        type="radio"
        className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-500"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
