import { useState, useEffect } from "react";
import { Modal } from "@/common/components/Modal";
import type { Product, Category } from "../types/products.types";
import { UNITS_OF_MEASURE } from "../utils/products.utils";

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
  onSave: (product: Partial<Product>) => void;
}

export function ProductEditModal({
  isOpen,
  onClose,
  product,
  categories,
  onSave
}: ProductEditModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    categoryId: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    isTaxable: false,
    isWeighted: false,
    visible: true,
    unitOfMeasure: "unidad"
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku,
        description: product.description ?? "",
        categoryId: product.categoryId ?? "",
        weight: product.weight?.toString() ?? "",
        length: product.length?.toString() ?? "",
        width: product.width?.toString() ?? "",
        height: product.height?.toString() ?? "",
        isTaxable: product.isTaxable ?? false,
        isWeighted: product.isWeighted ?? false,
        visible: product.visible,
        unitOfMeasure: product.unitOfMeasure ?? "unidad"
      });
    }
  }, [product]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!product) return;
    
    onSave({
      localId: product.localId,
      name: formData.name,
      sku: formData.sku,
      description: formData.description || null,
      categoryId: formData.categoryId || null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      length: formData.length ? parseFloat(formData.length) : null,
      width: formData.width ? parseFloat(formData.width) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      isTaxable: formData.isTaxable,
      isWeighted: formData.isWeighted,
      visible: formData.visible,
      unitOfMeasure: formData.unitOfMeasure
    });
    onClose();
  };

  const categoryOptions = categories.map(c => ({ value: c.localId, label: c.name }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Producto"
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSubmit}>
            Guardar
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="label mb-3">Información General</h4>
          <div className="space-y-4">
            <div>
              <label className="label">Nombre</label>
              <input
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>
            <div>
              <label className="label">SKU</label>
              <input
                type="text"
                className="input"
                value={formData.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea
                className="input"
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select
                className="input"
                value={formData.categoryId}
                onChange={(e) => handleChange("categoryId", e.target.value)}
              >
                <option value="">Sin categoría</option>
                {categoryOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h4 className="label mb-3">Configuración Fiscal</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isTaxable}
                onChange={(e) => handleChange("isTaxable", e.target.checked)}
                className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm">Gravable (IVA 16%)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isWeighted}
                onChange={(e) => handleChange("isWeighted", e.target.checked)}
                className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm">Pesable (báscula)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.visible}
                onChange={(e) => handleChange("visible", e.target.checked)}
                className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm">Visible en POS</span>
            </label>
          </div>

          <h4 className="label mb-3 mt-6">Unidad de Medida</h4>
          <div className="grid grid-cols-2 gap-2">
            {UNITS_OF_MEASURE.map(unit => (
              <label key={unit} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="unitOfMeasure"
                  value={unit}
                  checked={formData.unitOfMeasure === unit}
                  onChange={(e) => handleChange("unitOfMeasure", e.target.value)}
                  className="w-4 h-4 border-surface-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm capitalize">{unit}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="col-span-2">
          <h4 className="label mb-3">Atributos Técnicos</h4>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="label">Peso (kg)</label>
              <input
                type="number"
                step="0.001"
                className="input"
                value={formData.weight}
                onChange={(e) => handleChange("weight", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Largo (cm)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.length}
                onChange={(e) => handleChange("length", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Ancho (cm)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.width}
                onChange={(e) => handleChange("width", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Alto (cm)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.height}
                onChange={(e) => handleChange("height", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
