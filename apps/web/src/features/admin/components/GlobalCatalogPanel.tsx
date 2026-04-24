/**
 * Panel de Catálogos Globales.
 * Gestión de categorías y productos globales por tipo de negocio.
 */

import { useCallback, useEffect, useState } from "react";
import type { 
  GlobalCategory, 
  GlobalProduct, 
  GlobalProductPresentation,
  CreateGlobalCategoryInput, 
  CreateGlobalProductInput,
  BusinessType 
} from "../types/admin.types";
import { ConfirmDialog } from "@/common/components/ConfirmDialog";
import { Button } from "@/common/components/Button";
import { Select } from "@/common/components/Select";
import { Tabs } from "@/common/components/Tabs";
import { Modal } from "@/common/components/Modal";
import { SearchInput } from "@/common/components/SearchInput";
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
  const [categorySearch, setCategorySearch] = useState("");

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
  const [productSearch, setProductSearch] = useState("");

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const result = await adminService.listGlobalCategories(selectedBusinessType || undefined);
      if (result.ok) {
        setCategories(result.data || []);
      } else {
        setCategories([]);
      }
    } finally {
      setCategoriesLoading(false);
    }
  }, [selectedBusinessType]);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const result = await adminService.listGlobalProducts(selectedBusinessType || undefined);
      if (result.ok) {
        setProducts(result.data || []);
      } else {
        setProducts([]);
      }
    } finally {
      setProductsLoading(false);
    }
  }, [selectedBusinessType]);

  useEffect(() => {
    if (activeTab === "categories") {
      loadCategories();
    } else {
      loadProducts();
    }
  }, [activeTab, selectedBusinessType, loadCategories, loadProducts]);

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
            id: p.id,
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

  const updatePresentations = (presentations: GlobalProductPresentation[]) => {
    setProductForm(prev => ({
      ...prev,
      presentations
    }));
  };

  const filteredCategories = categories.filter(cat => 
    !categorySearch || 
    cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
    (cat.businessTypeName || "").toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredProducts = products.filter(prod => 
    !productSearch ||
    prod.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    prod.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
    (prod.businessTypeName || "").toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="stack-md">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Catálogos Globales</h1>
          <p className="text-content-secondary">Gestiona categorías y productos disponibles para todos los tenants</p>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <label className="text-sm font-medium text-content-secondary">Tipo de Negocio:</label>
        <Select
          className="w-64"
          value={selectedBusinessType}
          onChange={(value) => setSelectedBusinessType(value)}
          options={[
            { value: "", label: "Todos" },
            ...businessTypes.map(bt => ({ value: bt.id, label: bt.name }))
          ]}
        />
      </div>

          <Tabs
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as Tab)}
            items={[
          { id: "categories", label: `Categorías (${categories.length})` },
          { id: "products", label: `Productos (${products.length})` }
        ]}
      />

      {activeTab === "categories" && (
        <div className="stack-md">
          <div className="flex justify-between items-center">
            <Button onClick={openNewCategory} variant="primary">
              + Nueva Categoría
            </Button>
          </div>

          <SearchInput
            value={categorySearch}
            onChange={setCategorySearch}
            placeholder="Buscar categorías..."
          />

          {showCategoryForm && (
            <Modal
              isOpen={showCategoryForm}
              onClose={() => {
                setShowCategoryForm(false);
                setEditingCategory(null);
              }}
              title={editingCategory ? "Editar Categoría" : "Nueva Categoría Global"}
              size="sm"
            >
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
            </Modal>
          )}

          <CategoryList
              categories={filteredCategories}
              isLoading={categoriesLoading}
              selectedBusinessType={selectedBusinessType}
              onEdit={openEditCategory}
              onDelete={setDeletingCategory}
            />
        </div>
      )}

      {activeTab === "products" && (
        <div className="stack-md">
          <div className="flex justify-between items-center">
            <Button onClick={openNewProduct} variant="primary">
              + Nuevo Producto
            </Button>
          </div>

          <SearchInput
            value={productSearch}
            onChange={setProductSearch}
            placeholder="Buscar productos..."
          />

          {showProductForm && (
            <Modal
              isOpen={showProductForm}
              onClose={() => {
                setShowProductForm(false);
                setEditingProduct(null);
              }}
              title={editingProduct ? "Editar Producto" : "Nuevo Producto Global"}
              size="lg"
            >
               <ProductForm
                 form={productForm}
                 businessTypes={businessTypes}
                 categories={categories}
                 isEditing={!!editingProduct}
                 onChange={(field, value) => setProductForm(prev => ({ ...prev, [field]: value }))}
                 onAddPresentation={addPresentation}
                 onRemovePresentation={removePresentation}
                 onUpdatePresentation={updatePresentation}
                 onUpdatePresentations={updatePresentations}
                 onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
                 onCancel={() => {
                   setShowProductForm(false);
                   setEditingProduct(null);
                 }}
               />
            </Modal>
          )}

          <ProductList
            products={filteredProducts}
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