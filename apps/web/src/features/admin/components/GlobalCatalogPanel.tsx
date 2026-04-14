/**
 * Panel de Catálogos Globales.
 * Gestión de categorías y productos globales por tipo de negocio.
 */

import { useEffect, useState } from "react";
import type { 
  GlobalCategory, 
  GlobalProduct, 
  GlobalProductPresentation,
  CreateGlobalCategoryInput, 
  CreateGlobalProductInput,
  BusinessType 
} from "../types/admin.types";
import { ConfirmDialog } from "@/common/components/ConfirmDialog";
import { adminService } from "../services/admin.service.instance";
import { useToast } from "@/common/stores/toastStore";

import { CategoryList } from "./forms/CategoryList";
import { CategoryForm } from "./forms/CategoryForm";
import { ProductList } from "./forms/ProductList";
import { ProductForm } from "./forms/ProductForm";

interface GlobalCatalogPanelProps {
  businessTypes: BusinessType[];
  onRefreshBusinessTypes: () => void;
}

type Tab = "categories" | "products";

export function GlobalCatalogPanel({ 
  businessTypes, 
  onRefreshBusinessTypes 
}: GlobalCatalogPanelProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("categories");
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>("");
  
  useEffect(() => {
    if (businessTypes.length === 0) {
      onRefreshBusinessTypes();
    }
  }, [businessTypes.length, onRefreshBusinessTypes]);

  const [categories, setCategories] = useState<GlobalCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<GlobalCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<CreateGlobalCategoryInput>({
    name: "",
    businessTypeId: ""
  });
  const [deletingCategory, setDeletingCategory] = useState<GlobalCategory | null>(null);
  const [deletingCategoryLoading, setDeletingCategoryLoading] = useState(false);

  const [products, setProducts] = useState<GlobalProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<GlobalProduct | null>(null);
  const [productForm, setProductForm] = useState<CreateGlobalProductInput>({
    name: "",
    sku: "",
    description: "",
    businessTypeId: "",
    categoryId: "",
    isWeighted: false,
    unitOfMeasure: "unidad",
    isTaxable: true,
    isSerialized: false,
    visible: true,
    presentations: [{ name: "Unitario", factor: 1, price: 0, isDefault: true }]
  });
  const [deletingProduct, setDeletingProduct] = useState<GlobalProduct | null>(null);
  const [deletingProductLoading, setDeletingProductLoading] = useState(false);

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const result = await adminService.listGlobalCategories(selectedBusinessType || undefined);
      if (result.ok) {
        setCategories(result.data);
      }
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const result = await adminService.listGlobalProducts(selectedBusinessType || undefined);
      if (result.ok) {
        setProducts(result.data);
      }
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "categories") {
      loadCategories();
    } else {
      loadProducts();
    }
  }, [activeTab, selectedBusinessType]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await adminService.createGlobalCategory({
      name: categoryForm.name,
      businessTypeId: categoryForm.businessTypeId
    });

    if (result.ok) {
      toast.success("Categoría creada exitosamente");
      setShowCategoryForm(false);
      setCategoryForm({ name: "", businessTypeId: "" });
      loadCategories();
    } else {
      toast.error(`Error al crear categoría: ${result.error.message}`);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    const result = await adminService.updateGlobalCategory(editingCategory.id, {
      name: categoryForm.name,
      businessTypeId: categoryForm.businessTypeId
    });

    if (result.ok) {
      toast.success("Categoría actualizada exitosamente");
      setEditingCategory(null);
      setShowCategoryForm(false);
      setCategoryForm({ name: "", businessTypeId: "" });
      loadCategories();
    } else {
      toast.error(`Error al actualizar categoría: ${result.error.message}`);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setDeletingCategoryLoading(true);

    const result = await adminService.deleteGlobalCategory(deletingCategory.id);

    if (result.ok) {
      toast.success("Categoría eliminada");
      setDeletingCategory(null);
      loadCategories();
    } else {
      toast.error(`Error al eliminar categoría: ${result.error.message}`);
    }
    setDeletingCategoryLoading(false);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await adminService.createGlobalProduct(productForm as CreateGlobalProductInput);

    if (result.ok) {
      toast.success("Producto creado exitosamente");
      setShowProductForm(false);
      setProductForm({
        name: "",
        sku: "",
        description: "",
        businessTypeId: "",
        categoryId: "",
        isWeighted: false,
        unitOfMeasure: "unidad",
        isTaxable: true,
        isSerialized: false,
        visible: true,
        presentations: [{ name: "Unitario", factor: 1, price: 0, isDefault: true }]
      });
      loadProducts();
    } else {
      toast.error(`Error al crear producto: ${result.error.message}`);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const result = await adminService.updateGlobalProduct(editingProduct.id, productForm as CreateGlobalProductInput);

    if (result.ok) {
      toast.success("Producto actualizado exitosamente");
      setEditingProduct(null);
      setShowProductForm(false);
      setProductForm({
        name: "",
        sku: "",
        description: "",
        businessTypeId: "",
        categoryId: "",
        isWeighted: false,
        unitOfMeasure: "unidad",
        isTaxable: true,
        isSerialized: false,
        visible: true,
        presentations: [{ name: "Unitario", factor: 1, price: 0, isDefault: true }]
      });
      loadProducts();
    } else {
      toast.error(`Error al actualizar producto: ${result.error.message}`);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    setDeletingProductLoading(true);

    const result = await adminService.deleteGlobalProduct(deletingProduct.id);

    if (result.ok) {
      toast.success("Producto eliminado");
      setDeletingProduct(null);
      loadProducts();
    } else {
      toast.error(`Error al eliminar producto: ${result.error.message}`);
    }
    setDeletingProductLoading(false);
  };

  const openEditCategory = (category: GlobalCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      businessTypeId: category.businessTypeId
    });
    setShowCategoryForm(true);
  };

  const openEditProduct = (product: GlobalProduct) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      sku: product.sku,
      description: product.description || "",
      businessTypeId: product.businessTypeId,
      categoryId: product.categoryId || "",
      isWeighted: product.isWeighted,
      unitOfMeasure: product.unitOfMeasure,
      isTaxable: product.isTaxable,
      isSerialized: product.isSerialized,
      visible: product.visible,
      presentations: product.presentations.length > 0 
        ? product.presentations.map(p => ({
            name: p.name,
            factor: p.factor,
            price: p.price,
            isDefault: p.isDefault,
            barcode: p.barcode
          }))
        : [{ name: "Unitario", factor: 1, price: 0, isDefault: true }]
    });
    setShowProductForm(true);
  };

  const openNewCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: "", businessTypeId: selectedBusinessType || "" });
    setShowCategoryForm(true);
  };

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: "",
      sku: "",
      description: "",
      businessTypeId: selectedBusinessType || "",
      categoryId: "",
      isWeighted: false,
      unitOfMeasure: "unidad",
      isTaxable: true,
      isSerialized: false,
      visible: true,
      presentations: [{ name: "Unitario", factor: 1, price: 0, isDefault: true }]
    });
    setShowProductForm(true);
  };

  const addPresentation = () => {
    setProductForm(prev => ({
      ...prev,
      presentations: [...prev.presentations, { name: "", factor: 1, price: 0, isDefault: false } as GlobalProductPresentation]
    }));
  };

  const removePresentation = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      presentations: prev.presentations.filter((_, i) => i !== index)
    }));
  };

  const updatePresentation = (index: number, field: keyof GlobalProductPresentation, value: unknown) => {
    setProductForm(prev => ({
      ...prev,
      presentations: prev.presentations.map((pres, i) => 
        i === index ? { ...pres, [field]: value } : pres
      )
    }));
  };

  const categoryData = categories.map(c => ({
    id: c.id,
    name: c.name,
    businessTypeId: c.businessTypeId,
    businessTypeName: c.businessTypeName
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Catálogos Globales</h1>
          <p className="text-content-secondary">Gestiona categorías y productos disponibles para todos los tenants</p>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <label className="text-sm font-medium text-content-secondary">Tipo de Negocio:</label>
        <select
          className="input w-64"
          value={selectedBusinessType}
          onChange={(e) => setSelectedBusinessType(e.target.value)}
        >
          <option value="">Todos</option>
          {businessTypes.map(bt => (
            <option key={bt.id} value={bt.id}>{bt.name}</option>
          ))}
        </select>
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-8">
          <button
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === "categories"
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-content-secondary hover:text-content-primary"
            }`}
            onClick={() => setActiveTab("categories")}
          >
            Categorías ({categories.length})
          </button>
          <button
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === "products"
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-content-secondary hover:text-content-primary"
            }`}
            onClick={() => setActiveTab("products")}
          >
            Productos ({products.length})
          </button>
        </nav>
      </div>

      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <button onClick={openNewCategory} className="btn btn-primary">
              + Nueva Categoría
            </button>
          </div>

          {showCategoryForm && (
            <CategoryForm
              name={categoryForm.name}
              businessTypeId={categoryForm.businessTypeId}
              businessTypes={businessTypes}
              isEditing={!!editingCategory}
              onNameChange={(name) => setCategoryForm({ ...categoryForm, name })}
              onBusinessTypeChange={(businessTypeId) => setCategoryForm({ ...categoryForm, businessTypeId })}
              onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
              onCancel={() => {
                setShowCategoryForm(false);
                setEditingCategory(null);
              }}
            />
          )}

          <CategoryList
            categories={categoryData}
            isLoading={categoriesLoading}
            selectedBusinessType={selectedBusinessType}
            onEdit={openEditCategory}
            onDelete={setDeletingCategory}
          />
        </div>
      )}

      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <button onClick={openNewProduct} className="btn btn-primary">
              + Nuevo Producto
            </button>
          </div>

          {showProductForm && (
            <ProductForm
              form={productForm}
              businessTypes={businessTypes}
              categories={categoryData}
              isEditing={!!editingProduct}
              onChange={(field, value) => setProductForm({ ...productForm, [field]: value })}
              onAddPresentation={addPresentation}
              onRemovePresentation={removePresentation}
              onUpdatePresentation={updatePresentation}
              onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
              onCancel={() => {
                setShowProductForm(false);
                setEditingProduct(null);
              }}
            />
          )}

          <ProductList
            products={products}
            isLoading={productsLoading}
            selectedBusinessType={selectedBusinessType}
            onEdit={openEditProduct}
            onDelete={setDeletingProduct}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDeleteCategory}
        title="Eliminar Categoría"
        message={`¿Está seguro de eliminar "${deletingCategory?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={deletingCategoryLoading}
      />

      <ConfirmDialog
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteProduct}
        title="Eliminar Producto"
        message={`¿Está seguro de eliminar "${deletingProduct?.name}"? Esta acción eliminará también todas sus presentaciones.`}
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={deletingProductLoading}
      />
    </div>
  );
}