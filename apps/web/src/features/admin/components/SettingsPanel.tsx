/**
 * Panel de Configuración Global.
 * Solo contiene reglas de impuestos globales.
 */

import { useEffect, useState } from "react";
import type { GlobalConfig, UpdateGlobalConfigInput } from "../types/admin.types";
import { ConfirmDialog } from "@/common/components/ConfirmDialog";

interface SettingsPanelProps {
  config: GlobalConfig | null;
  isLoading: boolean;
  onRefresh: () => void;
  onUpdate: (input: UpdateGlobalConfigInput) => Promise<{ ok: boolean; error?: { message: string } }>;
}

export function SettingsPanel({ config, isLoading, onRefresh, onUpdate }: SettingsPanelProps) {
  const [formData, setFormData] = useState<UpdateGlobalConfigInput>({
    globalTaxRules: []
  });

  const [newTax, setNewTax] = useState({ name: "", rate: 0, type: "iva" as "iva" | "islr" | "igtf" });
  const [deletingRule, setDeletingRule] = useState<{ name: string; index: number } | null>(null);

  useEffect(() => {
    if (config) {
      setFormData({
        globalTaxRules: config.globalTaxRules || []
      });
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(formData);
  };

  const addTaxRule = () => {
    if (!newTax.name || newTax.rate <= 0) return;
    const updatedRules = [...(formData.globalTaxRules || []), newTax];
    setFormData({ ...formData, globalTaxRules: updatedRules });
    setNewTax({ name: "", rate: 0, type: "iva" });
  };

  const confirmDeleteRule = (index: number) => {
    const rule = formData.globalTaxRules?.[index];
    if (rule) {
      setDeletingRule({ name: rule.name, index });
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingRule) return;
    const updatedRules = [...(formData.globalTaxRules || [])];
    updatedRules.splice(deletingRule.index, 1);
    setFormData({ ...formData, globalTaxRules: updatedRules });
    setDeletingRule(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Configuración Global</h1>
          <p className="text-content-secondary">Reglas de impuestos aplicables a todos los tenants</p>
        </div>
        <button onClick={onRefresh} disabled={isLoading} className="btn btn-secondary">
          {isLoading ? <span className="spinner" /> : "Recargar"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Global Tax Rules */}
        <div className="card">
          <div className="card-header border-b border-border bg-surface-50">
            <h2 className="font-semibold text-content-primary">Reglas de Impuestos Globales</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-surface-100 p-3 rounded-lg border border-border">
                <div className="md:col-span-1">
                  <label className="label text-xs">Nombre</label>
                  <input
                    type="text"
                    className="input input-sm"
                    value={newTax.name}
                    onChange={e => setNewTax({ ...newTax, name: e.target.value })}
                    placeholder="Ej. IVA 16%"
                  />
                </div>
                <div>
                  <label className="label text-xs">Tasa (%)</label>
                  <input
                    type="number"
                    className="input input-sm"
                    value={newTax.rate}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0) {
                        setNewTax({ ...newTax, rate: val });
                      } else if (e.target.value === "") {
                        setNewTax({ ...newTax, rate: 0 });
                      }
                    }}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="label text-xs">Tipo</label>
                  <select
                    className="input input-sm"
                    value={newTax.type}
                    onChange={e => setNewTax({ ...newTax, type: e.target.value as "iva" | "islr" | "igtf" })}
                  >
                    <option value="iva">IVA</option>
                    <option value="islr">ISLR</option>
                    <option value="igtf">IGTF</option>
                  </select>
                </div>
                <button type="button" onClick={addTaxRule} className="btn btn-secondary btn-sm h-[40px]">
                  Añadir Regla
                </button>
              </div>

              <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                {formData.globalTaxRules?.map((rule, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white hover:bg-surface-50 transition-colors">
                    <div>
                      <span className="font-medium text-content-primary uppercase text-xs bg-surface-200 px-2 py-0.5 rounded mr-2">
                        {rule.type}
                      </span>
                      <span className="text-sm font-medium">{rule.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-brand-600">{rule.rate}%</span>
                      <button
                        type="button"
                        onClick={() => confirmDeleteRule(idx)}
                        className="text-state-error hover:text-red-700 text-xs font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                {(!formData.globalTaxRules || formData.globalTaxRules.length === 0) && (
                  <div className="p-6 text-center text-content-secondary text-sm italic">
                    No hay reglas de impuestos globales configuradas
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button type="submit" className="btn btn-primary btn-lg px-12" disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar Impuestos"}
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={!!deletingRule}
        onClose={() => setDeletingRule(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Regla de Impuesto"
        message={`¿Está seguro de eliminar la regla "${deletingRule?.name}"? Esta acción puede afectar el cálculo de impuestos en todos los tenants que usen esta regla.`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  );
}
