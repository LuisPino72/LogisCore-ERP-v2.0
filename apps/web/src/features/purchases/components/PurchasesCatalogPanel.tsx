/**
 * Panel para gestionar el catálogo de compras y proveedores.
 * Permite crear categorías, productos y presentaciones desde el módulo de compras.
 * 
 * Features:
 * - Layout de pestañas: Productos, Categorías, Presentaciones
 * - Dashboard con tablas para cada sección
 * - Creación vía Modal
 * - Búsqueda filtrada por tenant_slug (multi-tenant)
 * - Validaciones: nombre requerido (max 25), SKU único, is_default único por producto
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Package, Folder, Box, Search, Check, Building2, Edit2, X } from "lucide-react";
import type { Category, Product, ProductPresentation } from "@/features/products/types/products.types";
import type { PurchasesActorContext, Supplier, CreateSupplierInput, UpdateSupplierInput } from "../types/purchases.types";
import { eventBus } from "@/lib/core/runtime";
import { Modal } from "@/common/components/Modal";
import { EmptyState, LoadingSpinner } from "@/common/components/EmptyState";
import { Badge } from "@/common/components/Badge";
import { Tabs, type TabItem } from "@/common/components/Tabs";
import { purchasesService } from "../services/purchases.service.instance";
import { purchasesCatalogService } from "../services/purchases-catalog.service.instance";
import type { PurchasesTenantContext } from "../types/purchases.types";

interface PurchasesCatalogPanelProps {
  tenantSlug: string;
  actor: PurchasesActorContext;
  categories: Category[];
  products: Product[];
  presentations: ProductPresentation[];
  suppliers: Supplier[];
  onCreateSupplier: (input: CreateSupplierInput) => Promise<unknown>;
  onUpdateSupplier: (input: UpdateSupplierInput) => Promise<unknown>;
  isLoadingSuppliers?: boolean;
}

interface CategoryFormData {
  name: string;
}

interface ProductFormData {
  name: string;
  sku: string;
  categoryId: string;
  isTaxable: boolean;
  isWeighted: boolean;
  unitOfMeasure: string;
  defaultPresentationId: string;
  preferredSupplierLocalId: string;
}

interface PresentationFormData {
  productLocalId: string;
  name: string;
  factor: string;
  isDefault: boolean;
}

interface SupplierFormData {
  name: string;
  rif: string;
  phone: string;
  contactPerson: string;
  notes: string;
}

const initialCategoryForm: CategoryFormData = { name: "" };

const initialProductForm: ProductFormData = {
  name: "",
  sku: "",
  categoryId: "",
  isTaxable: true,
  isWeighted: false,
  unitOfMeasure: "unidad",
  defaultPresentationId: "",
  preferredSupplierLocalId: ""
};

const initialPresentationForm: PresentationFormData = {
  productLocalId: "",
  name: "",
  factor: "1",
  isDefault: false
};

const initialSupplierForm: SupplierFormData = {
  name: "",
  rif: "",
  phone: "",
  contactPerson: "",
  notes: ""
};

const unitOptions = [
  { value: "unidad", label: "Unidad" },
  { value: "kg", label: "Kilogramo (kg)" },
  { value: "lt", label: "Litro (lt)" },
  { value: "m", label: "Metro (m)" }
];

function SimpleTable<T extends Record<string, unknown>>({ 
  columns, 
  data, 
  emptyMessage = "No hay datos",
  loading = false
}: { 
  columns: { key: string; header: string; render?: (row: T) => React.ReactNode }[];
  data: T[];
  emptyMessage?: string;
  loading?: boolean;
}) {
  if (loading) {
    return <LoadingSpinner message="Cargando..." />;
  }
  
  if (data.length === 0) {
    return (
      <p className="text-center py-8 text-content-tertiary text-sm">{emptyMessage}</p>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface-100 border-b border-surface-200">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-left font-medium text-content-secondary">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-surface-50">
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-content-primary">
                  {col.render ? col.render(row) : String(row[col.key] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PurchasesCatalogPanel({
  tenantSlug,
  actor: _actor,
  categories: initialCategories,
  products: initialProducts,
  presentations: initialPresentations,
  suppliers: initialSuppliers,
  onCreateSupplier,
  onUpdateSupplier,
  isLoadingSuppliers = false
}: PurchasesCatalogPanelProps) {
  void _actor;
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "presentations" | "suppliers">("products");
  
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [presentations, setPresentations] = useState<ProductPresentation[]>(initialPresentations);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(initialCategoryForm);
  const [productForm, setProductForm] = useState<ProductFormData>(initialProductForm);
  const [presentationForm, setPresentationForm] = useState<PresentationFormData>(initialPresentationForm);
  const [supplierForm, setSupplierForm] = useState<SupplierFormData>(initialSupplierForm);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [productErrors, setProductErrors] = useState<Record<string, string>>({});
  const [presentationErrors, setPresentationErrors] = useState<Record<string, string>>({});
  const [supplierError, setSupplierError] = useState<string | null>(null);

  const tenant: PurchasesTenantContext = { tenantSlug };

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);
    
    const [categoriesResult, productsResult, presentationsResult] = await Promise.all([
      purchasesCatalogService.listCategories(tenant),
      purchasesCatalogService.listProducts(tenant),
      purchasesCatalogService.listPresentations(tenant)
    ]);
    
    if (!categoriesResult.ok) setLastError(categoriesResult.error.message);
    else setCategories(categoriesResult.data);
    
    if (!productsResult.ok) setLastError(productsResult.error.message);
    else setProducts(productsResult.data);
    
    if (!presentationsResult.ok) setLastError(presentationsResult.error.message);
    else setPresentations(presentationsResult.data);
    
    setIsLoading(false);
  }, [tenant]);

  useEffect(() => {
    setCategories(initialCategories);
    setProducts(initialProducts);
    setPresentations(initialPresentations);
    setSuppliers(initialSuppliers);
  }, [initialCategories, initialProducts, initialPresentations, initialSuppliers]);

  const filteredCategories = useMemo(() => {
    return categories.filter(c => 
      c.tenantId === tenantSlug && 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !c.deletedAt
    );
  }, [categories, tenantSlug, searchQuery]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.tenantId === tenantSlug && 
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       p.sku.toLowerCase().includes(searchQuery.toLowerCase())) &&
      !p.deletedAt
    );
  }, [products, tenantSlug, searchQuery]);

  const filteredPresentations = useMemo(() => {
    return presentations.filter(p => 
      p.tenantId === tenantSlug && 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [presentations, tenantSlug, searchQuery]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.rif && s.rif.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [suppliers, searchQuery]);

  const handleCreateCategory = useCallback(async () => {
    const name = categoryForm.name.trim();
    if (!name) {
      setCategoryError("El nombre es requerido");
      return;
    }
    if (name.length > 25) {
      setCategoryError("El nombre no puede exceder 25 caracteres");
      return;
    }
    
    setIsSubmitting(true);
    setCategoryError(null);
    
    const result = await purchasesCatalogService.createCategory({
      name,
      sourceModule: "purchases"
    });
    
    if (!result.ok) {
      setCategoryError(result.error.message);
      setIsSubmitting(false);
      return;
    }
    
    eventBus.emit("CATALOG.CATEGORY_CREATED", { localId: result.data.localId, name });
    setShowCategoryModal(false);
    setCategoryForm(initialCategoryForm);
    setIsSubmitting(false);
    void refreshData();
  }, [categoryForm.name, refreshData]);

  const handleCreateProduct = useCallback(async () => {
    const errors: Record<string, string> = {};
    const name = productForm.name.trim();
    const sku = productForm.sku.trim();
    
    if (!name) {
      errors.name = "El nombre es requerido";
    } else if (name.length > 25) {
      errors.name = "El nombre no puede exceder 25 caracteres";
    }
    
    if (!sku) {
      errors.sku = "El SKU es requerido";
    } else {
      const existingProduct = products.find(p => 
        p.tenantId === tenantSlug && 
        p.sku.toLowerCase() === sku.toLowerCase() &&
        !p.deletedAt
      );
      if (existingProduct) {
        errors.sku = "El SKU ya está en uso";
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setProductErrors(errors);
      return;
    }
    
    setIsSubmitting(true);
    setProductErrors({});
    
    const input = {
      name,
      sku,
      visible: true,
      sourceModule: "purchases" as const
    };
    
    if (productForm.categoryId) Object.assign(input, { categoryId: productForm.categoryId });
    if (productForm.isTaxable) Object.assign(input, { isTaxable: productForm.isTaxable });
    if (productForm.isWeighted) Object.assign(input, { isWeighted: productForm.isWeighted });
    if (productForm.unitOfMeasure) Object.assign(input, { unitOfMeasure: productForm.unitOfMeasure });
    if (productForm.defaultPresentationId) Object.assign(input, { defaultPresentationId: productForm.defaultPresentationId });
    
    const result = await purchasesCatalogService.createProduct(input);
    
    if (!result.ok) {
      setProductErrors({ submit: result.error.message });
      setIsSubmitting(false);
      return;
    }
    
    if (productForm.preferredSupplierLocalId) {
      await purchasesService.setProductPreferredSupplier(
        tenant,
        result.data.localId,
        productForm.preferredSupplierLocalId
      );
    }
    
    eventBus.emit("CATALOG.PRODUCT_CREATED", { localId: result.data.localId, name });
    setShowProductModal(false);
    setProductForm(initialProductForm);
    setIsSubmitting(false);
    void refreshData();
  }, [productForm, products, tenantSlug, tenant, refreshData]);

  const handleCreatePresentation = useCallback(async () => {
    const errors: Record<string, string> = {};
    const name = presentationForm.name.trim();
    const factor = parseFloat(presentationForm.factor);
    
    if (!presentationForm.productLocalId) {
      errors.productLocalId = "Selecciona un producto";
    }
    if (!name) {
      errors.name = "El nombre es requerido";
    }
    if (isNaN(factor)) {
      errors.factor = "El factor debe ser un número";
    } else if (factor <= 0) {
      errors.factor = "El factor debe ser mayor a cero";
    }
    
    if (Object.keys(errors).length > 0) {
      setPresentationErrors(errors);
      return;
    }
    
    setIsSubmitting(true);
    setPresentationErrors({});
    
    const result = await purchasesCatalogService.createPresentation({
      productLocalId: presentationForm.productLocalId,
      name,
      factor,
      isDefault: presentationForm.isDefault
    });
    
    if (!result.ok) {
      setPresentationErrors({ submit: result.error.message });
      setIsSubmitting(false);
      return;
    }
    
    eventBus.emit("CATALOG.PRESENTATION_CREATED", { productLocalId: presentationForm.productLocalId, name });
    setShowPresentationModal(false);
    setPresentationForm(initialPresentationForm);
    setIsSubmitting(false);
    void refreshData();
  }, [presentationForm, refreshData]);

  const handleCreateSupplier = useCallback(async () => {
    if (!supplierForm.name.trim()) {
      setSupplierError("El nombre es requerido");
      return;
    }
    
    setIsSubmitting(true);
    setSupplierError(null);
    
    const input: CreateSupplierInput | UpdateSupplierInput = editingSupplier
      ? { localId: editingSupplier.localId, ...supplierForm }
      : supplierForm;
    
    const result = editingSupplier
      ? await onUpdateSupplier(input as UpdateSupplierInput)
      : await onCreateSupplier(input as CreateSupplierInput);

    if (result) {
      setShowSupplierModal(false);
      setSupplierForm(initialSupplierForm);
      setEditingSupplier(null);
      void refreshData();
    } else {
      setSupplierError("Error al guardar el proveedor");
    }
    
    setIsSubmitting(false);
  }, [supplierForm, editingSupplier, onUpdateSupplier, onCreateSupplier, refreshData]);

  const handleOpenEditSupplier = (supplier: Supplier) => {
    setSupplierForm({
      name: supplier.name,
      rif: supplier.rif ?? "",
      phone: supplier.phone ?? "",
      contactPerson: supplier.contactPerson ?? "",
      notes: supplier.notes ?? ""
    });
    setEditingSupplier(supplier);
    setSupplierError(null);
    setShowSupplierModal(true);
  };

  const categoryColumns: { key: string; header: string; render?: (row: Category) => React.ReactNode }[] = [
    { key: "name", header: "Nombre" },
    { key: "createdAt", header: "Creado", render: (row: Category) => 
      row.createdAt ? new Date(row.createdAt).toLocaleDateString("es-VE") : "-"
    }
  ];

  const productColumns: { key: string; header: string; render?: (row: Product) => React.ReactNode }[] = [
    { key: "name", header: "Nombre" },
    { key: "sku", header: "SKU" },
    { key: "categoryId", header: "Categoría", render: (row: Product) => {
      const cat = categories.find(c => c.localId === row.categoryId);
      return cat?.name || "-";
    }},
    { key: "isWeighted", header: "Tipo", render: (row: Product) => 
      row.isWeighted ? <Badge variant="info">Pesable</Badge> : <Badge variant="default">Unitario</Badge>
    },
    { key: "isTaxable", header: "IVA", render: (row: Product) => 
      row.isTaxable ? <Badge variant="warning">Gravable</Badge> : <Badge variant="default">Exento</Badge>
    }
  ];

  const presentationColumns: { key: string; header: string; render?: (row: ProductPresentation) => React.ReactNode }[] = [
    { key: "name", header: "Nombre" },
    { key: "productLocalId", header: "Producto", render: (row: ProductPresentation) => {
      const prod = products.find(p => p.localId === row.productLocalId);
      return prod?.name || row.productLocalId;
    }},
    { key: "factor", header: "Factor", render: (row: ProductPresentation) => 
      row.factor?.toFixed(4) || "-"
    },
    { key: "isDefault", header: "Por defecto", render: (row: ProductPresentation) => 
      row.isDefault ? <Badge variant="success">Default</Badge> : <span className="text-content-tertiary">-</span>
    }
  ];

  const supplierColumns: { key: string; header: string; render?: (row: Supplier) => React.ReactNode }[] = [
    { key: "name", header: "Nombre" },
    { key: "rif", header: "RIF", render: (row: Supplier) => <span className="font-mono text-xs">{row.rif || "-"}</span> },
    { key: "phone", header: "Teléfono" },
    { key: "contactPerson", header: "Contacto" },
    { key: "isActive", header: "Estado", render: (row: Supplier) => 
      <Badge variant={row.isActive ? "success" : "default"}>{row.isActive ? "Activo" : "Inactivo"}</Badge>
    },
    { key: "actions", header: "", render: (row: Supplier) => (
      <button onClick={() => handleOpenEditSupplier(row)} className="p-1 hover:text-brand-500 transition-colors">
        <Edit2 className="w-4 h-4" />
      </button>
    )}
  ];

  const CategoriesTabContent = () => (
    <div className="card">
      <div className="card-body">
        {isLoading ? (
          <LoadingSpinner message="Cargando categorías..." />
        ) : filteredCategories.length === 0 ? (
          <EmptyState
            icon={<Folder className="w-12 h-12" />}
            title="No hay categorías"
            description="Crea la primera categoría para organizar tus productos"
            action={
              <button onClick={() => setShowCategoryModal(true)} className="btn btn-primary">
                <Plus className="w-4 h-4" /> Nueva Categoría
              </button>
            }
          />
        ) : (
          <SimpleTable columns={categoryColumns as unknown as { key: string; header: string; render?: (row: Record<string, unknown>) => React.ReactNode }[]} data={filteredCategories as unknown as Record<string, unknown>[]} />
        )}
      </div>
    </div>
  );

  const ProductsTabContent = () => (
    <div className="card">
      <div className="card-body">
        {isLoading ? (
          <LoadingSpinner message="Cargando productos..." />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={<Package className="w-12 h-12" />}
            title="No hay productos"
            description="Crea el primer producto para el catálogo"
            action={
              <button onClick={() => setShowProductModal(true)} className="btn btn-primary">
                <Plus className="w-4 h-4" /> Nuevo Producto
              </button>
            }
          />
        ) : (
          <SimpleTable columns={productColumns as unknown as { key: string; header: string; render?: (row: Record<string, unknown>) => React.ReactNode }[]} data={filteredProducts as unknown as Record<string, unknown>[]} />
        )}
      </div>
    </div>
  );

  const PresentationsTabContent = () => (
    <div className="card">
      <div className="card-body">
        {isLoading ? (
          <LoadingSpinner message="Cargando presentaciones..." />
        ) : filteredPresentations.length === 0 ? (
          <EmptyState
            icon={<Box className="w-12 h-12" />}
            title="No hay presentaciones"
            description="Crea presentaciones para tus productos (ej: 1kg, 500ml)"
            action={
              <button onClick={() => setShowPresentationModal(true)} className="btn btn-primary">
                <Plus className="w-4 h-4" /> Nueva Presentación
              </button>
            }
          />
        ) : (
          <SimpleTable columns={presentationColumns as unknown as { key: string; header: string; render?: (row: Record<string, unknown>) => React.ReactNode }[]} data={filteredPresentations as unknown as Record<string, unknown>[]} />
        )}
      </div>
    </div>
  );

  const SuppliersTabContent = () => (
    <div className="card">
      <div className="card-body">
        {isLoadingSuppliers ? (
          <LoadingSpinner message="Cargando proveedores..." />
        ) : filteredSuppliers.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-12 h-12" />}
            title="No hay proveedores"
            description="Crea tu primer proveedor para comenzar"
            action={
              <button onClick={() => { setShowSupplierModal(true); setEditingSupplier(null); setSupplierForm(initialSupplierForm); }} className="btn btn-primary">
                <Plus className="w-4 h-4" /> Nuevo Proveedor
              </button>
            }
          />
        ) : (
          <SimpleTable columns={supplierColumns as unknown as { key: string; header: string; render?: (row: Record<string, unknown>) => React.ReactNode }[]} data={filteredSuppliers as unknown as Record<string, unknown>[]} />
        )}
      </div>
    </div>
  );

  const tabs: TabItem[] = [
    { id: "products", label: "Productos", content: <ProductsTabContent /> },
    { id: "categories", label: "Categorías", content: <CategoriesTabContent /> },
    { id: "presentations", label: "Presentaciones", content: <PresentationsTabContent /> },
    { id: "suppliers", label: "Proveedores", content: <SuppliersTabContent /> }
  ];

  const activeProducts = useMemo(() => 
    products.filter(p => p.tenantId === tenantSlug && !p.deletedAt),
    [products, tenantSlug]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="card-title">Gestión del Catálogo</h2>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar..."
            className="input pl-10 w-full sm:w-64"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {activeTab === "products" && (
          <button
            onClick={() => { setShowProductModal(true); setProductForm(initialProductForm); setProductErrors({}); }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
        )}
        {activeTab === "categories" && (
          <button
            onClick={() => { setShowCategoryModal(true); setCategoryForm(initialCategoryForm); setCategoryError(null); }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> Nueva Categoría
          </button>
        )}
        {activeTab === "presentations" && (
          <button
            onClick={() => { setShowPresentationModal(true); setPresentationForm(initialPresentationForm); setPresentationErrors({}); }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> Nueva Presentación
          </button>
        )}
        {activeTab === "suppliers" && (
          <button
            onClick={() => { setShowSupplierModal(true); setEditingSupplier(null); setSupplierForm(initialSupplierForm); setSupplierError(null); }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> Nuevo Proveedor
          </button>
        )}
      </div>

      {lastError && <div className="alert alert-error">{lastError}</div>}

      <Tabs
        items={tabs}
        defaultTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as "products" | "categories" | "presentations" | "suppliers")}
        variant="underline"
      />

      <Modal
        isOpen={showCategoryModal}
        onClose={() => { setShowCategoryModal(false); setCategoryForm(initialCategoryForm); setCategoryError(null); }}
        title="Nueva Categoría"
        size="sm"
        footer={
          <>
            <button onClick={() => { setShowCategoryModal(false); setCategoryForm(initialCategoryForm); setCategoryError(null); }} className="btn btn-secondary">
              Cancelar
            </button>
            <button onClick={handleCreateCategory} disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? <LoadingSpinner size="sm" /> : <><Check className="w-4 h-4" /> Crear</>}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ name: e.target.value })}
              placeholder="Ej: Bebidas, Snacks, Lacteos"
              className="input"
              maxLength={25}
            />
            <p className="text-xs text-content-tertiary mt-1">{categoryForm.name.length}/25 caracteres</p>
            {categoryError && <p className="text-sm text-state-error mt-1">{categoryError}</p>}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showProductModal}
        onClose={() => { setShowProductModal(false); setProductForm(initialProductForm); setProductErrors({}); }}
        title="Nuevo Producto"
        size="lg"
        footer={
          <>
            <button onClick={() => { setShowProductModal(false); setProductForm(initialProductForm); setProductErrors({}); }} className="btn btn-secondary">
              Cancelar
            </button>
            <button onClick={handleCreateProduct} disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? <LoadingSpinner size="sm" /> : <><Check className="w-4 h-4" /> Crear</>}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <fieldset>
            <legend className="label mb-3">Información General</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">Nombre *</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Nombre del producto"
                  className="input"
                  maxLength={25}
                />
                <p className="text-xs text-content-tertiary mt-1">{productForm.name.length}/25 caracteres</p>
                {productErrors.name && <p className="text-sm text-state-error mt-1">{productErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">SKU *</label>
                <input
                  type="text"
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                  placeholder="COD-001"
                  className="input font-mono"
                />
                {productErrors.sku && <p className="text-sm text-state-error mt-1">{productErrors.sku}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-content-secondary mb-1">Categoría</label>
                <select
                  value={productForm.categoryId}
                  onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                  className="input"
                >
                  <option value="">Sin categoría</option>
                  {categories.filter(c => c.tenantId === tenantSlug && !c.deletedAt).map((cat) => (
                    <option key={cat.localId} value={cat.localId}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend className="label mb-3">Atributos Técnicos</legend>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={productForm.isTaxable}
                  onChange={(e) => setProductForm({ ...productForm, isTaxable: e.target.checked })}
                  className="w-4 h-4 rounded border-surface-300 text-brand-500"
                />
                <span className="text-sm text-content-primary">Gravable con IVA</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={productForm.isWeighted}
                  onChange={(e) => setProductForm({ ...productForm, isWeighted: e.target.checked })}
                  className="w-4 h-4 rounded border-surface-300 text-brand-500"
                />
                <span className="text-sm text-content-primary">Producto pesable (maneja 4 decimales)</span>
              </label>
              {productForm.isWeighted && (
                <div className="ml-7 p-3 bg-surface-50 rounded-lg border border-surface-200">
                  <p className="text-xs text-content-secondary">Para productos pesables, usa 4 decimales para precisión (ej: 0.2500 kg)</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">Unidad de medida</label>
                <select
                  value={productForm.unitOfMeasure}
                  onChange={(e) => setProductForm({ ...productForm, unitOfMeasure: e.target.value })}
                  className="input"
                  disabled={!productForm.isWeighted}
                >
                  {unitOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend className="label mb-3">Inventario</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">Proveedor preferido</label>
                <select
                  value={productForm.preferredSupplierLocalId}
                  onChange={(e) => setProductForm({ ...productForm, preferredSupplierLocalId: e.target.value })}
                  className="input"
                >
                  <option value="">Sin proveedor</option>
                  {suppliers.filter(s => s.isActive).map(s => (
                    <option key={s.localId} value={s.localId}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">Presentación por defecto</label>
                <select
                  value={productForm.defaultPresentationId}
                  onChange={(e) => setProductForm({ ...productForm, defaultPresentationId: e.target.value })}
                  className="input"
                >
                  <option value="">Sin presentación</option>
                </select>
              </div>
            </div>
          </fieldset>

          {productErrors.submit && <div className="alert alert-error">{productErrors.submit}</div>}
        </div>
      </Modal>

      <Modal
        isOpen={showPresentationModal}
        onClose={() => { setShowPresentationModal(false); setPresentationForm(initialPresentationForm); setPresentationErrors({}); }}
        title="Nueva Presentación"
        size="sm"
        footer={
          <>
            <button onClick={() => { setShowPresentationModal(false); setPresentationForm(initialPresentationForm); setPresentationErrors({}); }} className="btn btn-secondary">
              Cancelar
            </button>
            <button onClick={handleCreatePresentation} disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? <LoadingSpinner size="sm" /> : <><Check className="w-4 h-4" /> Crear</>}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">Producto *</label>
            <select
              value={presentationForm.productLocalId}
              onChange={(e) => setPresentationForm({ ...presentationForm, productLocalId: e.target.value, isDefault: false })}
              className="input"
            >
              <option value="">Selecciona un producto</option>
              {activeProducts.map((prod) => (
                <option key={prod.localId} value={prod.localId}>{prod.name} ({prod.sku})</option>
              ))}
            </select>
            {presentationErrors.productLocalId && <p className="text-sm text-state-error mt-1">{presentationErrors.productLocalId}</p>}
          </div>

          <div>
            <label className="label">Nombre *</label>
            <input
              type="text"
              value={presentationForm.name}
              onChange={(e) => setPresentationForm({ ...presentationForm, name: e.target.value })}
              placeholder="Ej: 1kg, 500ml, 2L"
              className="input"
            />
            {presentationErrors.name && <p className="text-sm text-state-error mt-1">{presentationErrors.name}</p>}
          </div>

          <div>
            <label className="label">Factor de conversión *</label>
            <input
              type="number"
              value={presentationForm.factor}
              onChange={(e) => setPresentationForm({ ...presentationForm, factor: e.target.value })}
              placeholder="1"
              step="0.0001"
              min="0.0001"
              className="input"
            />
            <p className="text-xs text-content-tertiary mt-1">Cantidad de unidades base que representa esta presentación</p>
            {presentationErrors.factor && <p className="text-sm text-state-error mt-1">{presentationErrors.factor}</p>}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={presentationForm.isDefault}
              onChange={(e) => setPresentationForm({ ...presentationForm, isDefault: e.target.checked })}
              className="w-4 h-4 rounded border-surface-300 text-brand-500"
            />
            <span className="text-sm text-content-primary">Presentación por defecto</span>
          </label>

          {presentationErrors.submit && <div className="alert alert-error">{presentationErrors.submit}</div>}
        </div>
      </Modal>

      <Modal
        isOpen={showSupplierModal}
        onClose={() => { setShowSupplierModal(false); setSupplierForm(initialSupplierForm); setEditingSupplier(null); setSupplierError(null); }}
        title={editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
        size="lg"
        footer={
          <>
            <button onClick={() => { setShowSupplierModal(false); setSupplierForm(initialSupplierForm); setEditingSupplier(null); setSupplierError(null); }} className="btn btn-secondary">
              Cancelar
            </button>
            <button onClick={handleCreateSupplier} disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? <LoadingSpinner size="sm" /> : <><Check className="w-4 h-4" /> {editingSupplier ? "Guardar" : "Crear"}</>}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <fieldset>
            <legend className="label mb-3">Información Básica</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">Nombre *</label>
                <input
                  type="text"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="Nombre del proveedor"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">RIF</label>
                <input
                  type="text"
                  value={supplierForm.rif}
                  onChange={(e) => setSupplierForm({ ...supplierForm, rif: e.target.value.toUpperCase() })}
                  placeholder="J-12345678-9"
                  className="input font-mono"
                />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend className="label mb-3">Contacto</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  placeholder="0412-1234567"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">Persona de contacto</label>
                <input
                  type="text"
                  value={supplierForm.contactPerson}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                  placeholder="Nombre del contacto"
                  className="input"
                />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend className="label mb-3">Notas</legend>
            <textarea
              value={supplierForm.notes}
              onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
              placeholder="Notas adicionales sobre el proveedor..."
              className="input min-h-[80px] resize-none"
              rows={3}
            />
          </fieldset>

          {supplierError && <div className="alert alert-error">{supplierError}</div>}
        </div>
      </Modal>
    </div>
  );
}
