/**
 * Componente de selección de logo.
 */

import { useRef } from "react";

interface LogoUploadProps {
  logoPreview: string | null;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function LogoUpload({ logoPreview, onLogoChange }: LogoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Logo</h3>
      <div 
        className="w-20 h-20 rounded-lg border-2 border-dashed border-surface-300 flex items-center justify-center bg-surface-50 overflow-hidden cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" /> : <span>+</span>}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
    </div>
  );
}