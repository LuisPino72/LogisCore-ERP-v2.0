/**
 * Panel de Seguridad.
 * Gestión de usuarios y roles del sistema.
 */

import { useEffect, useState } from "react";
import type { SecurityUser, Tenant, CreateUserInput, UpdateUserInput } from "../types/admin.types";

interface SecurityPanelProps {
  users: SecurityUser[];
  tenants: Tenant[];
  isLoading: boolean;
  onRefresh: () => void;
  onToggleUser: (userId: string, isActive: boolean) => Promise<{ ok: boolean; error?: { message: string } }>;
  onCreate: (input: CreateUserInput) => Promise<{ ok: boolean; error?: { message: string } }>;
  onUpdate: (userId: string, input: UpdateUserInput) => Promise<{ ok: boolean; error?: { message: string } }>;
}

export function SecurityPanel({ 
  users, 
  tenants,
  isLoading, 
  onRefresh, 
  onToggleUser,
  onCreate,
  onUpdate
}: SecurityPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<SecurityUser | null>(null);
  const [formData, setFormData] = useState<CreateUserInput>({
    email: "",
    fullName: "",
    role: "employee",
    tenantId: "",
    password: ""
  });

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const result = await onUpdate(editingUser.userId, {
        fullName: formData.fullName,
        role: formData.role,
      });
      if (result.ok) {
        setEditingUser(null);
        setShowForm(false);
      }
    } else {
      const result = await onCreate(formData);
      if (result.ok) {
        setShowForm(false);
        setFormData({ email: "", fullName: "", role: "employee", tenantId: "", password: "" });
      }
    }
  };

  const startEdit = (user: SecurityUser) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      fullName: user.fullName || "",
      role: user.role as "owner" | "employee",
      tenantId: user.tenantId || "",
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Seguridad</h1>
          <p className="text-content-secondary">Gestión de usuarios y accesos</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setEditingUser(null);
              setFormData({ email: "", fullName: "", role: "employee", tenantId: "", password: "" });
              setShowForm(true);
            }} 
            className="btn btn-primary"
          >
            + Nuevo Usuario
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
              {editingUser ? `Editar Usuario: ${editingUser.email}` : "Nuevo Usuario"}
            </h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingUser}
                  required
                />
              </div>
              <div>
                <label className="label">Nombre Completo</label>
                <input
                  type="text"
                  className="input"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Rol</label>
                <select
                  className="input"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as "owner" | "employee" })}
                  required
                >
                  <option value="owner">Owner</option>
                  <option value="employee">Employee</option>
                </select>
              </div>
              <div>
                <label className="label">Tenant (Empresa)</label>
                <select
                  className="input"
                  value={formData.tenantId}
                  onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                  disabled={!!editingUser}
                  required
                >
                  <option value="">Seleccione un tenant...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                  ))}
                </select>
              </div>
              {!editingUser && (
                <div>
                  <label className="label">Contraseña (Opcional)</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Dejar vacío para generar"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              )}
              <div className="md:col-span-2 flex gap-3 pt-4">
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {editingUser ? "Guardar Cambios" : "Crear Usuario"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)} 
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="card-body p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-100 text-left border-b border-border">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Usuario</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Email</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Tenant</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Rol</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Estado</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-surface-50 text-sm">
                  <td className="px-4 py-3">
                    <span className="font-medium text-content-primary">{user.fullName || "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-content-secondary">{user.email}</td>
                  <td className="px-4 py-3 text-content-secondary">{user.tenantName || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${user.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${user.isActive ? "badge-success" : "badge-error"}`}>
                      {user.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => startEdit(user)}
                        className="text-brand-600 hover:text-brand-700"
                      >
                        Editar
                      </button>
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => onToggleUser(user.userId, !user.isActive)}
                          className={user.isActive ? "text-state-error" : "text-state-success"}
                        >
                          {user.isActive ? "Desactivar" : "Activar"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && !isLoading && (
            <div className="p-8 text-center text-content-secondary">
              No hay usuarios registrados
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
