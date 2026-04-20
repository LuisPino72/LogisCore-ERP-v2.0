/**
 * Componente de formulario para crear productos
 * UI para crear categorías, productos y presentaciones
 */

import { useState } from "react";
import { Button, Input, Select, Checkbox, Card } from "@/common";
import type {
  Category,
  CreateCategoryInput,
  CreateProductInput,
  CreateProductPresentationInput,
  Product,
  ProductPresentation
} from "../types/products.types";

/**
 * Props del formulario de productos
 */
interface ProductsFormProps {
  categories: Category[];
  products: Product[];
  presentations: ProductPresentation[];
  onCreateCategory: (input: CreateCategoryInput) => Promise<void>;
  onCreateProduct: (input: CreateProductInput) => Promise<void>;
  onCreatePresentation: (input: CreateProductPresentationInput) => Promise<void>;
}

/**
 * Formulario para crear elementos del catálogo
 */
export function ProductsForm({
  categories,
  products,
  presentations,
  onCreateCategory,
  onCreateProduct,
  onCreatePresentation
}: ProductsFormProps) {
  const [categoryName, setCategoryName] = useState("");
  const [productName, setProductName] = useState("");
  const [productSku, setProductSku] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedDefaultPresentationId, setSelectedDefaultPresentationId] =
    useState("");
  const [isTaxable, setIsTaxable] = useState(true);
  const [presentationName, setPresentationName] = useState("");
  const [selectedProductForPresentation, setSelectedProductForPresentation] =
    useState("");
  const [presentationFactor, setPresentationFactor] = useState("1");
  const [presentationPrice, setPresentationPrice] = useState("");

  return (
    <Card>
      <div className="card-header">
        <h2 className="card-title">Catálogo</h2>
      </div>
      <div className="card-body space-y-4">
        <div className="grid gap-3">
          <Input
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Nueva categoria"
          />
          <Button
            variant="secondary"
            onClick={() =>
              onCreateCategory({ name: categoryName, sourceModule: "purchases" })
            }
          >
            Crear categoria
          </Button>
        </div>
        <div className="grid gap-3">
          <Input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Nuevo producto"
          />
          <Input
            value={productSku}
            onChange={(e) => setProductSku(e.target.value)}
            placeholder="SKU (codigo)"
          />
          <Select
            value={selectedCategoryId}
            onChange={(val) => setSelectedCategoryId(val as string)}
            options={categories.map((c) => ({ label: c.name, value: c.localId }))}
            placeholder="Sin categoria"
          />
          <Select
            value={selectedDefaultPresentationId}
            onChange={(val) => setSelectedDefaultPresentationId(val as string)}
            options={presentations.map((p) => ({ label: p.name, value: p.id }))}
            placeholder="Sin presentacion por defecto"
          />
          <Checkbox
            label="Aplicar IVA (Impuestos globales)"
            checked={isTaxable}
            onChange={(checked) => setIsTaxable(checked)}
          />
          <Button
            variant="primary"
            onClick={() =>
              onCreateProduct({
                name: productName,
                sku: productSku || crypto.randomUUID(),
                categoryId: selectedCategoryId || "",
                defaultPresentationId: selectedDefaultPresentationId || "",
                visible: true,
                isTaxable: isTaxable,
                sourceModule: "purchases"
              })
            }
          >
            Crear producto
          </Button>
        </div>
        <div className="divider" />
        <div className="grid gap-3">
          <Select
            value={selectedProductForPresentation}
            onChange={(val) => setSelectedProductForPresentation(val as string)}
            options={products.map((p) => ({ label: p.name, value: p.localId }))}
            placeholder="Producto para presentacion"
          />
          <Input
            value={presentationName}
            onChange={(e) => setPresentationName(e.target.value)}
            placeholder="Nombre de presentacion"
          />
          <Input
            value={presentationFactor}
            onChange={(e) => setPresentationFactor(e.target.value)}
            placeholder="Factor"
            type="number"
            min="0.0001"
            step="0.0001"
          />
          <Input
            value={presentationPrice}
            onChange={(e) => setPresentationPrice(e.target.value)}
            placeholder="Precio en USD"
            type="number"
            min="0"
            step="0.01"
          />
          <Button
            variant="primary"
            onClick={() =>
              onCreatePresentation({
                productLocalId: selectedProductForPresentation,
                name: presentationName,
                factor: Number(presentationFactor),
                price: presentationPrice ? Number(presentationPrice) : 0
              })
            }
          >
            Crear presentacion
          </Button>
        </div>
      </div>
    </Card>
  );
}
