/**
 * Panel de Tipos de Negocio.
 * Gestión de categorías de negocio disponibles para tenants.
 * 
 * Funcionalidades:
 * - Listar tipos de negocio en cards
 * - Crear nuevo tipo de negocio
 * - Eliminar tipo de negocio
 */

import { useEffect, useState } from "react";
import type { BusinessType, CreateBusinessTypeInput } from "../types/admin.types";

interface BusinessTypesPanelProps {
  businessTypes: BusinessType[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreate: (input: CreateBusinessTypeInput) => Promise<{ ok: boolean; error?: { message: string } }>;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: { message: string } }>;
}

export function BusinessTypesPanel({ businessTypes, isLoading, onRefresh, onCreate, onDelete }: BusinessTypesPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateBusinessTypeInput>({ name: "", description: "" });

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreate(formData);
    setShowForm(false);
    setFormData({ name: "", description: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Tipos de Negocio</h1>
          <p className="text-content-secondary">Categorías de negocio disponibles</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary">
          + Nuevo Tipo
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-content-primary">Nuevo Tipo de Negocio</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea
                  className="input"
                  rows={3}
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary">Crear</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {businessTypes.map(bt => (
          <div key={bt.id} className="card">
            <div className="card-body">
              <h3 className="font-semibold text-content-primary mb-1">{bt.name}</h3>
              <p className="text-sm text-content-secondary mb-3">{bt.description || "Sin descripción"}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-content-tertiary">
                  Creado: {new Date(bt.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => onDelete(bt.id)}
                  className="text-sm text-state-error hover:text-red-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
        {businessTypes.length === 0 && !isLoading && (
          <div className="col-span-full p-8 text-center text-content-secondary">
            No hay tipos de negocio registrados
          </div>
        )}
      </div>
    </div>
  );
}
