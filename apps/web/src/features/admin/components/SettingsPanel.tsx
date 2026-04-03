/**
 * Panel de Configuración Global.
 * Ajustes del sistema como nombre, moneda y reglas de impuestos.
 */

import { useEffect, useState } from "react";
import type { GlobalConfig, UpdateGlobalConfigInput } from "../types/admin.types";

interface SettingsPanelProps {
  config: GlobalConfig | null;
  isLoading: boolean;
  onRefresh: () => void;
  onUpdate: (input: UpdateGlobalConfigInput) => Promise<{ ok: boolean; error?: { message: string } }>;
}

export function SettingsPanel({ config, isLoading, onRefresh, onUpdate }: SettingsPanelProps) {
  const [formData, setFormData] = useState<UpdateGlobalConfigInput>({
    systemName: "",
    defaultCurrency: "VES",
    maintenanceMode: false,
    supportContact: "",
    welcomeMessage: "",
    globalTaxRules: []
  });

  const [newTax, setNewTax] = useState({ name: "", rate: 0, type: "iva" as "iva" | "islr" | "igtf" });

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  useEffect(() => {
    if (config) {
      setFormData({
        systemName: config.systemName,
        defaultCurrency: config.defaultCurrency,
        maintenanceMode: config.maintenanceMode,
        supportContact: config.supportContact ?? undefined,
        welcomeMessage: config.welcomeMessage ?? undefined,
        globalTaxRules: config.globalTaxRules
      });
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(formData);
  };

  const addTaxRule = () => {
    const updatedRules = [...(formData.globalTaxRules || []), newTax];
    setFormData({ ...formData, globalTaxRules: updatedRules });
    setNewTax({ name: "", rate: 0, type: "iva" });
  };

  const removeTaxRule = (index: number) => {
    const updatedRules = [...(formData.globalTaxRules || [])];
    updatedRules.splice(index, 1);
    setFormData({ ...formData, globalTaxRules: updatedRules });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Configuración Global</h1>
          <p className="text-content-secondary">Ajustes generales del ecosistema LogisCore</p>
        </div>
        <button onClick={onRefresh} disabled={isLoading} className="btn btn-secondary">
          {isLoading ? <span className="spinner" /> : "Recargar"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings */}
        <div className="card">
          <div className="card-header border-b border-border bg-surface-50">
            <h2 className="font-semibold text-content-primary">Ajustes Generales</h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre del Sistema</label>
              <input
                type="text"
                className="input"
                value={formData.systemName}
                onChange={e => setFormData({ ...formData, systemName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Moneda por Defecto</label>
              <select
                className="input"
                value={formData.defaultCurrency}
                onChange={e => setFormData({ ...formData, defaultCurrency: e.target.value })}
                required
              >
                <option value="VES">Bolívares (VES)</option>
                <option value="USD">Dólares (USD)</option>
                <option value="COP">Pesos Colombianos (COP)</option>
                <option value="EUR">Euros (EUR)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Mensaje de Bienvenida</label>
              <textarea
                className="input min-h-[80px]"
                value={formData.welcomeMessage}
                onChange={e => setFormData({ ...formData, welcomeMessage: e.target.value })}
                placeholder="Mensaje que verán los usuarios al iniciar sesión..."
              />
            </div>
          </div>
        </div>

        {/* Support & Maintenance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header border-b border-border bg-surface-50">
              <h2 className="font-semibold text-content-primary">Soporte</h2>
            </div>
            <div className="card-body">
              <label className="label">Contacto de Soporte (Email/Link)</label>
              <input
                type="text"
                className="input"
                value={formData.supportContact}
                onChange={e => setFormData({ ...formData, supportContact: e.target.value })}
                placeholder="soporte@empresa.com o t.me/soporte"
              />
            </div>
          </div>

          <div className="card">
            <div className="card-header border-b border-border bg-surface-50">
              <h2 className="font-semibold text-content-primary">Mantenimiento</h2>
            </div>
            <div className="card-body flex items-center justify-between">
              <div>
                <p className="font-medium text-content-primary">Modo Mantenimiento</p>
                <p className="text-xs text-content-tertiary">Bloquea el acceso a todos los usuarios</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.maintenanceMode}
                  onChange={e => setFormData({ ...formData, maintenanceMode: e.target.checked })}
                />
                <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>
          </div>
        </div>

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
                    onChange={e => setNewTax({ ...newTax, rate: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label text-xs">Tipo</label>
                  <select
                    className="input input-sm"
                    value={newTax.type}
                    onChange={e => setNewTax({ ...newTax, type: e.target.value as any })}
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
                        onClick={() => removeTaxRule(idx)}
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
            {isLoading ? "Guardando..." : "Guardar Toda la Configuración"}
          </button>
        </div>
      </form>
    </div>
  );
}
