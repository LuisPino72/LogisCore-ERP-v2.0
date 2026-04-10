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
import { ConfirmDialog } from "../../../common/components/ConfirmDialog";
import { adminService } from "../services/admin.service.instance";
import { useToast } from "../../../common/stores/toastStore";

interface GlobalCatalogPanelProps {
  businessTypes: BusinessType[];
  onRefreshBusinessTypes: () => void;
}

type Tab = "categories" | "products";

const UNIT_OPTIONS = [
  { value: "unidad", label: "Unidad" },
  { value: "kilogramo", label: "Kilogramo (kg)" },
  { value: "gramo", label: "Gramo (g)" },
  { value: "litro", label: "Litro (L)" },
  { value: "mililitro", label: "Mililitro (ml)" },
  { value: "metro", label: "Metro (m)" },
  { value: "centimetro", label: "Centímetro (cm)" },
];

export function GlobalCatalogPanel({ 
  businessTypes, 
  onRefreshBusinessTypes 
}: GlobalCatalogPanelProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("categories");
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>("");
  
  // Cargar businessTypes si no vienen props
  useEffect(() => {
    if (businessTypes.length === 0) {
      onRefreshBusinessTypes();
    }
  }, [businessTypes.length, onRefreshBusinessTypes]);

  // Cargar categorías iniciales
  useEffect(() => {
    if (activeTab === "categories") {
      loadCategories();
    }
  }, [activeTab]);

  // Cargar categorías cuando cambia el filtro de business type
  useEffect(() => {
    if (activeTab === "categories") {
      loadCategories();
    }
  }, [selectedBusinessType]);
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

  // States para productos
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

  // Cargar categorías usando AdminService
  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const result = await adminService.listGlobalCategories(selectedBusinessType || undefined);
      if (result.ok) {
        setCategories(result.data);
      } else {
        console.error("Error loading categories:", result.error.message);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Cargar productos usando AdminService
  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const result = await adminService.listGlobalProducts(selectedBusinessType || undefined);
      if (result.ok) {
        setProducts(result.data);
      } else {
        console.error("Error loading products:", result.error.message);
      }
    } catch (error) {
      console.error("Error loading products:", error);
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
      console.error("Error creating category:", result.error.message);
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
      console.error("Error updating category:", result.error.message);
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
      console.error("Error deleting category:", result.error.message);
    }
    setDeletingCategoryLoading(false);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await adminService.createGlobalProduct({
      name: productForm.name,
      sku: productForm.sku,
      description: productForm.description || undefined,
      businessTypeId: productForm.businessTypeId,
      categoryId: productForm.categoryId || undefined,
      isWeighted: productForm.isWeighted,
      unitOfMeasure: productForm.unitOfMeasure,
      isTaxable: productForm.isTaxable,
      isSerialized: productForm.isSerialized,
      weight: productForm.weight || undefined,
      length: productForm.length || undefined,
      width: productForm.width || undefined,
      height: productForm.height || undefined,
      visible: productForm.visible,
      presentations: productForm.presentations
    } as CreateGlobalProductInput);

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
      console.error("Error creating product:", result.error.message);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const result = await adminService.updateGlobalProduct(editingProduct.id, {
      name: productForm.name,
      sku: productForm.sku,
      description: productForm.description || undefined,
      businessTypeId: productForm.businessTypeId,
      categoryId: productForm.categoryId || undefined,
      isWeighted: productForm.isWeighted,
      unitOfMeasure: productForm.unitOfMeasure,
      isTaxable: productForm.isTaxable,
      isSerialized: productForm.isSerialized,
      weight: productForm.weight || undefined,
      length: productForm.length || undefined,
      width: productForm.width || undefined,
      height: productForm.height || undefined,
      visible: productForm.visible,
      presentations: productForm.presentations
    } as CreateGlobalProductInput);

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
      console.error("Error updating product:", result.error.message);
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
      console.error("Error deleting product:", result.error.message);
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

  const updatePresentation = (index: number, field: string, value: unknown) => {
    setProductForm(prev => ({
      ...prev,
      presentations: prev.presentations.map((pres, i) => 
        i === index ? { ...pres, [field]: value } : pres
      )
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Catálogos Globales</h1>
          <p className="text-content-secondary">Gestiona categorías y productos disponibles para todos los tenants</p>
        </div>
      </div>

      {/* Filtros */}
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

      {/* Tabs */}
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

      {/* Contenido según tab */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: "", businessTypeId: selectedBusinessType || "" });
                setShowCategoryForm(true);
              }}
              className="btn btn-primary"
            >
              + Nueva Categoría
            </button>
          </div>

          {/* Formulario de categoría */}
          {showCategoryForm && (
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold">
                  {editingCategory ? "Editar Categoría" : "Nueva Categoría Global"}
                </h2>
              </div>
              <div className="card-body">
                <form onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory} className="space-y-4">
                  <div>
                    <label className="label">Nombre</label>
                    <input
                      type="text"
                      className="input"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      placeholder="Ej. Abarrotes y Víveres"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Tipo de Negocio</label>
                    <select
                      className="input"
                      value={categoryForm.businessTypeId}
                      onChange={(e) => setCategoryForm({ ...categoryForm, businessTypeId: e.target.value })}
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {businessTypes.map(bt => (
                        <option key={bt.id} value={bt.id}>{bt.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" className="btn btn-primary">
                      {editingCategory ? "Guardar Cambios" : "Crear Categoría"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowCategoryForm(false);
                        setEditingCategory(null);
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Lista de categorías */}
          {categoriesLoading ? (
            <div className="text-center py-8 text-content-secondary">Cargando...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-content-secondary">
              No hay categorías globales{selectedBusinessType ? " para este tipo de negocio" : ""}
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="card">
                  <div className="card-body flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-content-primary">{cat.name}</h3>
                      <span className="text-sm text-content-secondary">{cat.businessTypeName}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditCategory(cat)}
                        className="text-brand-600 hover:text-brand-700 text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeletingCategory(cat)}
                        className="text-state-error hover:text-red-700 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
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
              }}
              className="btn btn-primary"
            >
              + Nuevo Producto
            </button>
          </div>

          {/* Formulario de producto */}
          {showProductForm && (
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold">
                  {editingProduct ? "Editar Producto" : "Nuevo Producto Global"}
                </h2>
              </div>
              <div className="card-body">
                <form onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct} className="space-y-6">
                  {/* Información Básica */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Nombre del Producto</label>
                      <input
                        type="text"
                        className="input"
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        placeholder="Ej. Arroz Premium"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">SKU</label>
                      <input
                        type="text"
                        className="input"
                        value={productForm.sku}
                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                        placeholder="Ej. ARR-001"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Descripción</label>
                    <textarea
                      className="input min-h-[60px]"
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      placeholder="Descripción opcional..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Tipo de Negocio</label>
                      <select
                        className="input"
                        value={productForm.businessTypeId}
                        onChange={(e) => setProductForm({ ...productForm, businessTypeId: e.target.value })}
                        required
                      >
                        <option value="">Seleccionar...</option>
                        {businessTypes.map(bt => (
                          <option key={bt.id} value={bt.id}>{bt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Categoría</label>
                      <select
                        className="input"
                        value={productForm.categoryId}
                        onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                      >
                        <option value="">Seleccionar...</option>
                        {categories
                          .filter(c => c.businessTypeId === productForm.businessTypeId)
                          .map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))
                        }
                      </select>
                    </div>
                  </div>

                  {/* Características */}
                  <div className="border-t border-border pt-4">
                    <h3 className="font-medium mb-4">Características</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isWeighted"
                          checked={productForm.isWeighted}
                          onChange={(e) => setProductForm({ ...productForm, isWeighted: e.target.checked })}
                          className="checkbox"
                        />
                        <label htmlFor="isWeighted" className="text-sm">¿Es pesable?</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isTaxable"
                          checked={productForm.isTaxable}
                          onChange={(e) => setProductForm({ ...productForm, isTaxable: e.target.checked })}
                          className="checkbox"
                        />
                        <label htmlFor="isTaxable" className="text-sm">¿Es grabable?</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isSerialized"
                          checked={productForm.isSerialized}
                          onChange={(e) => setProductForm({ ...productForm, isSerialized: e.target.checked })}
                          className="checkbox"
                        />
                        <label htmlFor="isSerialized" className="text-sm">¿Tiene serie?</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="visible"
                          checked={productForm.visible}
                          onChange={(e) => setProductForm({ ...productForm, visible: e.target.checked })}
                          className="checkbox"
                        />
                        <label htmlFor="visible" className="text-sm">Visible</label>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="label">Unidad de Medida</label>
                      <select
                        className="input"
                        value={productForm.unitOfMeasure}
                        onChange={(e) => setProductForm({ ...productForm, unitOfMeasure: e.target.value })}
                      >
                        {UNIT_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Presentaciones */}
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium">Presentaciones</h3>
                      <button type="button" onClick={addPresentation} className="btn btn-secondary text-sm">
                        + Agregar Presentación
                      </button>
                    </div>
                    <div className="space-y-3">
                      {productForm.presentations.map((pres, index) => (
                        <div key={index} className="flex gap-3 items-end bg-surface-50 p-3 rounded">
                          <div className="flex-1">
                            <label className="label text-xs">Nombre</label>
                            <input
                              type="text"
                              className="input"
                              value={pres.name}
                              onChange={(e) => updatePresentation(index, "name", e.target.value)}
                              placeholder="Ej. 500ml, 1kg"
                              required
                            />
                          </div>
                          <div className="w-24">
                            <label className="label text-xs">Factor</label>
                            <input
                              type="number"
                              step="0.01"
                              className="input"
                              value={isNaN(pres.factor) ? "" : pres.factor}
                              onChange={(e) => updatePresentation(index, "factor", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                              required
                            />
                          </div>
                          <div className="w-32">
                            <label className="label text-xs">Precio</label>
                            <input
                              type="number"
                              step="0.01"
                              className="input"
                              value={isNaN(pres.price) ? "" : pres.price}
                              onChange={(e) => updatePresentation(index, "price", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                              required
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={pres.isDefault}
                              onChange={(e) => updatePresentation(index, "isDefault", e.target.checked)}
                              className="checkbox"
                              id={`default-${index}`}
                            />
                            <label htmlFor={`default-${index}`} className="text-xs">Default</label>
                          </div>
                          {productForm.presentations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePresentation(index)}
                              className="text-state-error hover:text-red-700"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="submit" className="btn btn-primary">
                      {editingProduct ? "Guardar Cambios" : "Crear Producto"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowProductForm(false);
                        setEditingProduct(null);
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Lista de productos */}
          {productsLoading ? (
            <div className="text-center py-8 text-content-secondary">Cargando...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-content-secondary">
              No hay productos globales{selectedBusinessType ? " para este tipo de negocio" : ""}
            </div>
          ) : (
            <div className="space-y-2">
              {products.map(prod => (
                <div key={prod.id} className="card">
                  <div className="card-body">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-content-primary">{prod.name}</h3>
                        <p className="text-sm text-content-secondary">
                          SKU: {prod.sku} | {prod.businessTypeName} | {prod.unitOfMeasure}
                        </p>
                        <div className="flex gap-2 mt-1">
                          {prod.isWeighted && <span className="tag tag-info text-xs">Pesable</span>}
                          {prod.isTaxable && <span className="tag tag-success text-xs">Grabable</span>}
                          {prod.isSerialized && <span className="tag tag-warning text-xs">Con serie</span>}
                        </div>
                        <div className="mt-2 text-sm text-content-secondary">
                          Presentaciones: {prod.presentations.map(p => `${p.name} ($${p.price})`).join(", ")}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditProduct(prod)}
                          className="text-brand-600 hover:text-brand-700 text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeletingProduct(prod)}
                          className="text-state-error hover:text-red-700 text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs de confirmación */}
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