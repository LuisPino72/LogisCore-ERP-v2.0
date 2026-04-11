import { Check } from "lucide-react";
import { Modal } from "@/common/components/Modal";
import { LoadingSpinner } from "@/common/components/EmptyState";
import type { Supplier } from "../../types/purchases.types";

interface SupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  form: {
    name: string;
    rif: string;
    phone: string;
    contactPerson: string;
    notes: string;
  };
  onChange: (form: SupplierFormProps["form"]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
}

export function SupplierForm({
  isOpen,
  onClose,
  title,
  form,
  onChange,
  onSubmit,
  isSubmitting,
  error
}: SupplierFormProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button onClick={onSubmit} disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting ? <LoadingSpinner size="sm" /> : <><Check className="w-4 h-4" /> Crear</>}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <fieldset>
          <legend className="label mb-3">Información Básica</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => onChange({ ...form, name: e.target.value })}
                placeholder="Nombre del proveedor"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">RIF</label>
              <input
                type="text"
                value={form.rif}
                onChange={(e) => onChange({ ...form, rif: e.target.value.toUpperCase() })}
                placeholder="J-12345678-9"
                className="input font-mono"
              />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="label mb-3">Contacto</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => onChange({ ...form, phone: e.target.value })}
                placeholder="0412-1234567"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Persona de contacto</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => onChange({ ...form, contactPerson: e.target.value })}
                placeholder="Nombre del contacto"
                className="input"
              />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="label mb-3">Notas</legend>
          <textarea
            value={form.notes}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
            placeholder="Notas adicionales sobre el proveedor..."
            className="input min-h-[80px] resize-none"
            rows={3}
          />
        </fieldset>

        {error && <div className="alert alert-error">{error}</div>}
      </div>
    </Modal>
  );
}