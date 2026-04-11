import { Check } from "lucide-react";
import { Modal } from "@/common/components/Modal";
import { LoadingSpinner } from "@/common/components/EmptyState";
import { FormField, Input } from "@/common";
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
            <FormField label="Nombre" htmlFor="supplierName" required>
              <Input
                id="supplierName"
                type="text"
                value={form.name}
                onChange={(e) => onChange({ ...form, name: e.target.value })}
                placeholder="Nombre del proveedor"
              />
            </FormField>
            <FormField label="RIF" htmlFor="supplierRif">
              <Input
                id="supplierRif"
                type="text"
                value={form.rif}
                onChange={(e) => onChange({ ...form, rif: e.target.value.toUpperCase() })}
                placeholder="J-12345678-9"
                className="font-mono"
              />
            </FormField>
          </div>
        </fieldset>

        <fieldset>
          <legend className="label mb-3">Contacto</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Teléfono" htmlFor="supplierPhone">
              <Input
                id="supplierPhone"
                type="tel"
                value={form.phone}
                onChange={(e) => onChange({ ...form, phone: e.target.value })}
                placeholder="0412-1234567"
              />
            </FormField>
            <FormField label="Persona de contacto" htmlFor="supplierContact">
              <Input
                id="supplierContact"
                type="text"
                value={form.contactPerson}
                onChange={(e) => onChange({ ...form, contactPerson: e.target.value })}
                placeholder="Nombre del contacto"
              />
            </FormField>
          </div>
        </fieldset>

        <fieldset>
          <legend className="label mb-3">Notas</legend>
          <FormField label="" htmlFor="supplierNotes">
            <textarea
              id="supplierNotes"
              value={form.notes}
              onChange={(e) => onChange({ ...form, notes: e.target.value })}
              placeholder="Notas adicionales sobre el proveedor..."
              className="input min-h-[80px] resize-none"
              rows={3}
            />
          </FormField>
        </fieldset>

        {error && <div className="alert alert-error">{error}</div>}
      </div>
    </Modal>
  );
}