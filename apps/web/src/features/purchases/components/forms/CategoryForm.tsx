import { Check } from "lucide-react";
import { Modal } from "@/common/components/Modal";
import { LoadingSpinner } from "@/common/components/EmptyState";
import { FormField, Input } from "@/common";

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  form: { name: string };
  onChange: (form: { name: string }) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
}

export function CategoryForm({
  isOpen,
  onClose,
  form,
  onChange,
  onSubmit,
  isSubmitting,
  error
}: CategoryFormProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Categoría"
      size="sm"
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
      <div className="space-y-4">
        <FormField label="Nombre" htmlFor="categoryName" required>
          <Input
            id="categoryName"
            type="text"
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ej: Bebidas, Snacks, Lacteos"
            maxLength={25}
          />
          <p className="text-xs text-content-tertiary mt-1">{form.name.length}/25 caracteres</p>
          {error && <p className="text-sm text-state-error mt-1">{error}</p>}
        </FormField>
      </div>
    </Modal>
  );
}