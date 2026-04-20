import { useState } from "react";
import { Plus, X, Grid3X3 } from "lucide-react";
import { Modal } from "@/common/components/Modal";
import { Button } from "@/common/components/Button";
import { FormField, Select, Input, Checkbox, Radio } from "@/common";
import type { Category } from "../types/products.types";

interface VariantGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSave: (input: unknown) => void;
}

interface PresentationInput {
  name: string;
  factor: number;
  price: number;
  isDefault: boolean;
}

interface VariantInput {
  size: string;
  color: string;
}

export function VariantGeneratorModal({
  isOpen,
  onClose,
  categories,
  onSave
}: VariantGeneratorModalProps) {
  const [productData, setProductData] = useState({
    name: "",
    sku: "",
    description: "",
    categoryId: "",
    visible: true,
    isTaxable: false,
    isWeighted: false,
    unitOfMeasure: "unidad"
  });

  const [presentations, setPresentations] = useState<PresentationInput[]>([
    { name: "Unidad", factor: 1, price: 0, isDefault: true }
  ]);

  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");
  const [showMatrix, setShowMatrix] = useState(false);

  const handleAddSize = () => {
    if (newSize.trim() && !sizes.includes(newSize.trim())) {
      setSizes([...sizes, newSize.trim()]);
      setNewSize("");
    }
  };

  const handleRemoveSize = (size: string) => {
    setSizes(sizes.filter(s => s !== size));
  };

  const handleAddColor = () => {
    if (newColor.trim() && !colors.includes(newColor.trim())) {
      setColors([...colors, newColor.trim()]);
      setNewColor("");
    }
  };

  const handleRemoveColor = (color: string) => {
    setColors(colors.filter(c => c !== color));
  };

  const handleAddPresentation = () => {
    setPresentations([
      ...presentations,
      { name: "", factor: 1, price: 0, isDefault: false }
    ]);
  };

  const handleRemovePresentation = (index: number) => {
    setPresentations(presentations.filter((_, i) => i !== index));
  };

  const handlePresentationChange = (index: number, field: keyof PresentationInput, value: string | number | boolean) => {
    const updated = [...presentations];
    if (field === "isDefault" && value === true) {
      updated.forEach((p, i) => { p.isDefault = i === index; });
    }
    (updated[index] as unknown as Record<string, unknown>)[field] = value;
    setPresentations(updated);
  };

  const generateVariants = () => {
    const variants: VariantInput[] = [];
    sizes.forEach(size => {
      colors.forEach(color => {
        variants.push({ size, color });
      });
    });
    if (sizes.length === 0 && colors.length > 0) {
      colors.forEach(color => variants.push({ size: "", color }));
    }
    if (colors.length === 0 && sizes.length > 0) {
      sizes.forEach(size => variants.push({ size, color: "" }));
    }
    return variants;
  };

  const handleSave = () => {
    const hasSizeOrColor = sizes.length > 0 || colors.length > 0;
    
    const input = {
      name: productData.name,
      description: productData.description || undefined,
      categoryId: productData.categoryId || undefined,
      sku: productData.sku,
      visible: productData.visible,
      isTaxable: productData.isTaxable,
      isWeighted: productData.isWeighted,
      unitOfMeasure: productData.unitOfMeasure,
      presentations: presentations.filter(p => p.name && p.factor > 0).map(p => ({
        name: p.name,
        factor: p.factor,
        price: p.price,
        isDefault: p.isDefault
      })),
      sizeColors: hasSizeOrColor ? generateVariants().map(v => ({
        size: v.size || undefined,
        color: v.color || undefined
      })) : undefined,
      sourceModule: "purchases" as const
    };

    onSave(input);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setProductData({
      name: "",
      sku: "",
      description: "",
      categoryId: "",
      visible: true,
      isTaxable: false,
      isWeighted: false,
      unitOfMeasure: "unidad"
    });
    setPresentations([{ name: "Unidad", factor: 1, price: 0, isDefault: true }]);
    setSizes([]);
    setColors([]);
    setShowMatrix(false);
  };

  const categoryOptions = categories.map(c => ({ value: c.localId, label: c.name }));
  const variants = generateVariants();
  const hasValidVariants = variants.length > 0 && variants.some(v => v.size || v.color);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Producto con Variantes"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={!productData.name || !productData.sku}
          >
            Crear
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <h4 className="label mb-3">Producto Base</h4>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nombre" htmlFor="variantName" required>
              <Input
                id="variantName"
                type="text"
                value={productData.name}
                onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                placeholder="Nombre del producto"
              />
            </FormField>
            <FormField label="SKU" htmlFor="variantSku" required>
              <Input
                id="variantSku"
                type="text"
                value={productData.sku}
                onChange={(e) => setProductData({ ...productData, sku: e.target.value })}
                placeholder="Código único"
              />
            </FormField>
            <FormField label="Categoría" htmlFor="variantCategory">
              <Select
                value={productData.categoryId}
                onChange={(value) => setProductData({ ...productData, categoryId: String(value) })}
                options={categoryOptions}
                placeholder="Sin categoría"
              />
            </FormField>
            <FormField label="Unidad de Medida" htmlFor="variantUnit">
              <Select
                value={productData.unitOfMeasure}
                onChange={(value) => setProductData({ ...productData, unitOfMeasure: String(value) })}
                options={[
                  { value: "unidad", label: "Unidad" },
                  { value: "kg", label: "Kilogramos (kg)" },
                  { value: "lt", label: "Litros (lt)" },
                  { value: "m", label: "Metros (m)" }
                ]}
              />
            </FormField>
          </div>
          <div className="flex gap-4 mt-4">
            <Checkbox
              label="Gravable (IVA)"
              checked={productData.isTaxable}
              onChange={(checked) => setProductData({ ...productData, isTaxable: checked })}
            />
            <Checkbox
              label="Pesable"
              checked={productData.isWeighted}
              onChange={(checked) => setProductData({ ...productData, isWeighted: checked })}
            />
            <Checkbox
              label="Visible en POS"
              checked={productData.visible}
              onChange={(checked) => setProductData({ ...productData, visible: checked })}
            />
          </div>
        </div>

        <div>
          <h4 className="label mb-3">Presentaciones</h4>
          <div className="overflow-x-auto border border-surface-200 rounded-lg">
            <table className="w-full">
              <thead className="bg-surface-50">
                <tr>
                  <th className="px-3 py-2 text-sm font-medium text-content-primary text-left">Nombre</th>
                  <th className="px-3 py-2 text-sm font-medium text-content-primary text-center w-24">Factor</th>
                  <th className="px-3 py-2 text-sm font-medium text-content-primary text-right w-32">Precio USD</th>
                  <th className="px-3 py-2 text-sm font-medium text-content-primary text-center w-24">Por defecto</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {presentations.map((pres, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2">
                      <Input
                        type="text"
                        value={pres.name}
                        onChange={(e) => handlePresentationChange(index, "name", e.target.value)}
                        placeholder="Nombre"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="1"
                        className="text-center"
                        value={pres.factor}
                        onChange={(e) => handlePresentationChange(index, "factor", parseInt(e.target.value) || 1)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="text-right"
                        value={pres.price}
                        onChange={(e) => handlePresentationChange(index, "price", parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Radio
                        name="defaultPresentation"
                        checked={pres.isDefault}
                        onChange={(e) => handlePresentationChange(index, "isDefault", e.target.checked)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {presentations.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemovePresentation(index)}
                          className="text-state-error hover:bg-state-error/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddPresentation}
            className="mt-2"
          >
            <Plus className="w-4 h-4" />
            Agregar presentación
          </Button>
        </div>

        <div>
          <h4 className="label mb-3">Variantes (Tallas/Colores)</h4>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="label">Tallas</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {sizes.map(size => (
                  <span key={size} className="badge badge-info flex items-center gap-1">
                    {size}
                    <Button size="sm" variant="ghost" onClick={() => handleRemoveSize(size)} className="hover:text-state-error p-0 h-auto">
                      <X className="w-3 h-3" />
                    </Button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  placeholder="Agregar talla (S, M, L...)"
                  onKeyDown={(e) => e.key === "Enter" && handleAddSize()}
                />
<Button onClick={handleAddSize} variant="secondary" size="sm">
                  Agregar
                </Button>
              </div>
            </div>
            <div>
              <label className="label">Colores</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {colors.map(color => (
                  <span key={color} className="badge badge-warning flex items-center gap-1">
                    {color}
                    <Button size="sm" variant="ghost" onClick={() => handleRemoveColor(color)} className="hover:text-state-error p-0 h-auto">
                      <X className="w-3 h-3" />
                    </Button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  placeholder="Agregar color (Rojo, Azul...)"
                  onKeyDown={(e) => e.key === "Enter" && handleAddColor()}
                />
<Button onClick={handleAddColor} variant="secondary" size="sm">
                  Agregar
                </Button>
              </div>
            </div>
          </div>

          {hasValidVariants && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMatrix(!showMatrix)}
                className="flex items-center gap-2"
              >
                <Grid3X3 className="w-4 h-4" />
                {showMatrix ? "Ocultar" : "Ver"} matriz de variantes ({variants.length})
              </Button>

              {showMatrix && (
                <div className="mt-3 p-4 bg-surface-50 rounded-lg border border-surface-200">
                  <p className="text-sm text-content-secondary mb-2">
                    Cada variante tendrá al menos talla o color definido.
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {variants.map((variant, index) => (
                      <div key={index} className="p-2 bg-white rounded border border-surface-200 text-center">
                        {variant.size && <span className="block text-xs font-medium">{variant.size}</span>}
                        {variant.color && <span className="block text-xs text-content-secondary">{variant.color}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
