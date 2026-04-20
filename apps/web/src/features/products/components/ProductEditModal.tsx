import { useState } from "react";
import { Modal } from "@/common/components/Modal";
import { Button } from "@/common/components/Button";
import { FormField, Select, Input, Textarea, Checkbox, Radio } from "@/common";
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

  const [prevProduct, setPrevProduct] = useState(product);
  if (product !== prevProduct) {
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
    setPrevProduct(product);
  }

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
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="label mb-3">Información General</h4>
          <div className="space-y-4">
            <FormField label="Nombre" htmlFor="productName">
              <Input
                id="productName"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </FormField>
            <FormField label="SKU" htmlFor="productSku">
              <Input
                id="productSku"
                type="text"
                value={formData.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
              />
            </FormField>
            <FormField label="Descripción" htmlFor="productDescription">
              <Textarea
                id="productDescription"
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </FormField>
            <FormField label="Categoría" htmlFor="productCategory">
              <Select
                value={formData.categoryId}
                onChange={(value) => handleChange("categoryId", String(value))}
                options={categoryOptions}
                placeholder="Sin categoría"
              />
            </FormField>
          </div>
        </div>

        <div>
          <h4 className="label mb-3">Configuración Fiscal</h4>
          <div className="space-y-3">
            <Checkbox
              label="Gravable (IVA 16%)"
              checked={formData.isTaxable}
              onChange={(checked) => handleChange("isTaxable", checked)}
            />
            <Checkbox
              label="Pesable (báscula)"
              checked={formData.isWeighted}
              onChange={(checked) => handleChange("isWeighted", checked)}
            />
            <Checkbox
              label="Visible en POS"
              checked={formData.visible}
              onChange={(checked) => handleChange("visible", checked)}
            />
          </div>

          <h4 className="label mb-3 mt-6">Unidad de Medida</h4>
          <div className="grid grid-cols-2 gap-2">
            {UNITS_OF_MEASURE.map(unit => (
              <Radio
                key={unit}
                name="unitOfMeasure"
                value={unit}
                label={unit}
                checked={formData.unitOfMeasure === unit}
                onChange={(e) => handleChange("unitOfMeasure", e.target.value)}
              />
            ))}
          </div>
        </div>

        <div className="col-span-2">
          <h4 className="label mb-3">Atributos Técnicos</h4>
          <div className="grid grid-cols-4 gap-4">
            <FormField label="Peso (kg)" htmlFor="productWeight">
              <Input
                id="productWeight"
                type="number"
                step="0.001"
                value={formData.weight}
                onChange={(e) => handleChange("weight", e.target.value)}
              />
            </FormField>
            <FormField label="Largo (cm)" htmlFor="productLength">
              <Input
                id="productLength"
                type="number"
                step="0.01"
                value={formData.length}
                onChange={(e) => handleChange("length", e.target.value)}
              />
            </FormField>
            <FormField label="Ancho (cm)" htmlFor="productWidth">
              <Input
                id="productWidth"
                type="number"
                step="0.01"
                value={formData.width}
                onChange={(e) => handleChange("width", e.target.value)}
              />
            </FormField>
            <FormField label="Alto (cm)" htmlFor="productHeight">
              <Input
                id="productHeight"
                type="number"
                step="0.01"
                value={formData.height}
                onChange={(e) => handleChange("height", e.target.value)}
              />
            </FormField>
          </div>
        </div>
      </div>
    </Modal>
  );
}
