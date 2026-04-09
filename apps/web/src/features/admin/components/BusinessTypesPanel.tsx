/**
 * Panel de Tipos de Negocio.
 * Configuración de las industrias soportadas por el ERP.
 */

import { useEffect, useState } from "react";
import type { BusinessType, CreateBusinessTypeInput, UpdateBusinessTypeInput } from "../types/admin.types";
import { ConfirmDialog } from "../../../common/components/ConfirmDialog";

interface BusinessTypesPanelProps {
  businessTypes: BusinessType[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreate: (input: CreateBusinessTypeInput) => Promise<{ ok: boolean; error?: { message: string } }>;
  onUpdate: (id: string, input: UpdateBusinessTypeInput) => Promise<{ ok: boolean; error?: { message: string } }>;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: { message: string } }>;
}

export function BusinessTypesPanel({ 
  businessTypes, 
  isLoading, 
  onRefresh, 
  onCreate,
  onUpdate,
  onDelete 
}: BusinessTypesPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<BusinessType | null>(null);
  const [formData, setFormData] = useState<CreateBusinessTypeInput>({ 
    name: "", 
    description: "" 
  });
  const [deletingType, setDeletingType] = useState<BusinessType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingType) {
      const result = await onUpdate(editingType.id, { 
        name: formData.name, 
        description: formData.description || undefined
      });
      if (result.ok) {
        setShowForm(false);
        setEditingType(null);
      }
    } else {
      const result = await onCreate(formData);
      if (result.ok) {
        setShowForm(false);
        setFormData({ name: "", description: "" });
      }
    }
  };

  const startEdit = (type: BusinessType) => {
    setEditingType(type);
    setFormData({ name: type.name, description: type.description || "" });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Tipos de Negocio</h1>
          <p className="text-content-secondary">Configuración de industrias y giros comerciales</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setEditingType(null);
              setFormData({ name: "", description: "" });
              setShowForm(prev => !prev);
            }} 
            className="btn btn-primary"
          >
            {showForm ? "Cancelar" : "+ Nuevo Tipo"}
          </button>
          <button onClick={onRefresh} disabled={isLoading} className="btn btn-secondary">
            {isLoading ? <span className="spinner" /> : "Actualizar"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-content-primary">
              {editingType ? `Editar ${editingType.name}` : "Nuevo Tipo de Negocio"}
            </h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nombre del Tipo</label>
                <input 
                  type="text" 
                  className="input" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Restaurante, Ferretería, Farmacia"
                  required
                />
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea 
                  className="input min-h-[100px]" 
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describa para qué tipo de negocios aplica..."
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {editingType ? "Guardar Cambios" : "Guardar Tipo de Negocio"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {businessTypes.map(type => (
          <div key={type.id} className="card hover:shadow-md transition-shadow">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <h3 className="font-bold text-content-primary">{type.name}</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => startEdit(type)}
                    className="text-brand-600 hover:text-brand-700"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => setDeletingType(type)}
                    className="text-state-error hover:text-red-700 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <p className="text-sm text-content-secondary mt-2">
                {type.description || "Sin descripción"}
              </p>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-content-tertiary">
                <span>Registrado el: {new Date(type.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {businessTypes.length === 0 && !isLoading && (
        <div className="p-8 text-center bg-surface-100 rounded-lg text-content-secondary">
          No hay tipos de negocio configurados
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deletingType}
        onClose={() => setDeletingType(null)}
        onConfirm={async () => {
          if (!deletingType) return;
          setIsDeleting(true);
          const result = await onDelete(deletingType.id);
          setIsDeleting(false);
          if (result.ok) {
            setDeletingType(null);
          }
        }}
        title="Eliminar Tipo de Negocio"
        message={`¿Está seguro de eliminar "${deletingType?.name}"? Esta acción no se puede deshacer y podría afectar tenants que usen este tipo de negocio.`}
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
