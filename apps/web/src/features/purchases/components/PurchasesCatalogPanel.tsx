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
import { Plus, Search } from "lucide-react";
import type { Category, Product, ProductPresentation, CreateProductInput } from "@/features/products/types/products.types";
import type { PurchasesActorContext, Supplier, CreateSupplierInput, UpdateSupplierInput } from "../types/purchases.types";
import { eventBus } from "@/lib/core/runtime";
import { Tabs, type TabItem } from "@/common/components/Tabs";
import { purchasesService } from "../services/purchases.service.instance";
import { purchasesCatalogService } from "../services/purchases-catalog.service.instance";
import type { PurchasesTenantContext } from "../types/purchases.types";

import { CategoryForm } from "./forms/CategoryForm";
import { ProductForm } from "./forms/ProductForm";
import { PresentationForm } from "./forms/PresentationForm";
import { SupplierForm } from "./forms/SupplierForm";
import { CategoryTable } from "./CategoryTable";
import { ProductTable } from "./ProductTable";
import { PresentationTable } from "./PresentationTable";
import { SupplierTable } from "./SupplierTable";

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

interface CategoryFormData { name: string; }
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

export function PurchasesCatalogPanel({
  tenantSlug,
  actor,
  categories: initialCategories,
  products: initialProducts,
  presentations: initialPresentations,
  suppliers: initialSuppliers,
  onCreateSupplier,
  onUpdateSupplier,
  isLoadingSuppliers = false
}: PurchasesCatalogPanelProps) {
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

  const tenant = useMemo<PurchasesTenantContext>(() => ({ tenantSlug }), [tenantSlug]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setLastError(null);
    try {
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
    } finally {
      setIsLoading(false);
    }
  }, [tenant]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refreshData(); }, [refreshData]);

  const [prevInitialSuppliers, setPrevInitialSuppliers] = useState(initialSuppliers);
  if (initialSuppliers !== prevInitialSuppliers) {
    setSuppliers(initialSuppliers);
    setPrevInitialSuppliers(initialSuppliers);
  }

  useEffect(() => {
    const offCatalogPulled = eventBus.on("CORE.CATALOGS_PULLED", () => void refreshData());
    const offGlobalHydrated = eventBus.on("CATALOG.GLOBAL_PRODUCTS_HYDRATED", () => void refreshData());
    return () => { offCatalogPulled(); offGlobalHydrated(); };
  }, [refreshData]);

  const filteredCategories = useMemo(() => 
    categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.deletedAt),
    [categories, searchQuery]);

  const filteredProducts = useMemo(() => 
    products.filter(p => 
      p.tenantId === tenantSlug && 
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase())) &&
      !p.deletedAt
    ), [products, tenantSlug, searchQuery]);

  const filteredPresentations = useMemo(() => 
    presentations.filter(p => p.tenantId === tenantSlug && p.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [presentations, tenantSlug, searchQuery]);

  const filteredSuppliers = useMemo(() => 
    suppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.rif && s.rif.toLowerCase().includes(searchQuery.toLowerCase()))),
    [suppliers, searchQuery]);

  const handleCreateCategory = useCallback(async () => {
    const name = categoryForm.name.trim();
    if (!name) { setCategoryError("El nombre es requerido"); return; }
    if (name.length > 25) { setCategoryError("El nombre no puede exceder 25 caracteres"); return; }
    
    setIsSubmitting(true);
    setCategoryError(null);
    
    const result = await purchasesCatalogService.createCategory(tenant, actor, { name, sourceModule: "purchases" });
    
    if (!result.ok) { setCategoryError(result.error.message); setIsSubmitting(false); return; }
    
    setShowCategoryModal(false);
    setCategoryForm(initialCategoryForm);
    setIsSubmitting(false);
    void refreshData();
  }, [categoryForm.name, refreshData, tenant, actor]);

  const handleCreateProduct = useCallback(async () => {
    const errors: Record<string, string> = {};
    const name = productForm.name.trim();
    const sku = productForm.sku.trim();
    
    if (!name) errors.name = "El nombre es requerido";
    else if (name.length > 25) errors.name = "El nombre no puede exceder 25 caracteres";
    
    if (!sku) errors.sku = "El SKU es requerido";
    else if (products.find(p => p.tenantId === tenantSlug && p.sku.toLowerCase() === sku.toLowerCase() && !p.deletedAt)) {
      errors.sku = "El SKU ya está en uso";
    }
    
    if (Object.keys(errors).length > 0) { setProductErrors(errors); return; }
    
    setIsSubmitting(true);
    setProductErrors({});
    
    const input: CreateProductInput = { name, sku, visible: true, sourceModule: "purchases" };
    if (productForm.categoryId) input.categoryId = productForm.categoryId;
    if (productForm.isTaxable) input.isTaxable = productForm.isTaxable;
    if (productForm.isWeighted) input.isWeighted = productForm.isWeighted;
    if (productForm.unitOfMeasure) input.unitOfMeasure = productForm.unitOfMeasure;
    if (productForm.defaultPresentationId) input.defaultPresentationId = productForm.defaultPresentationId;
    
    const result = await purchasesCatalogService.createProduct(tenant, actor, input);
    
    if (!result.ok) { setProductErrors({ submit: result.error.message }); setIsSubmitting(false); return; }
    
    if (productForm.preferredSupplierLocalId) {
      await purchasesService.setProductPreferredSupplier(tenant, result.data.localId, productForm.preferredSupplierLocalId);
    }
    
    setShowProductModal(false);
    setProductForm(initialProductForm);
    setIsSubmitting(false);
    void refreshData();
  }, [productForm, products, tenantSlug, tenant, actor, refreshData]);

  const handleCreatePresentation = useCallback(async () => {
    const errors: Record<string, string> = {};
    const name = presentationForm.name.trim();
    const factor = parseFloat(presentationForm.factor);
    
    if (!presentationForm.productLocalId) errors.productLocalId = "Selecciona un producto";
    if (!name) errors.name = "El nombre es requerido";
    if (isNaN(factor) || factor <= 0) errors.factor = "El factor debe ser mayor a cero";
    
    if (Object.keys(errors).length > 0) { setPresentationErrors(errors); return; }
    
    setIsSubmitting(true);
    setPresentationErrors({});
    
    const result = await purchasesCatalogService.createPresentation(tenant, actor, {
      productLocalId: presentationForm.productLocalId,
      name,
      factor,
      isDefault: presentationForm.isDefault
    });
    
    if (!result.ok) { setPresentationErrors({ submit: result.error.message }); setIsSubmitting(false); return; }
    
    eventBus.emit("PRESENTATION.CREATED", { productLocalId: presentationForm.productLocalId, name });
    setShowPresentationModal(false);
    setPresentationForm(initialPresentationForm);
    setIsSubmitting(false);
    void refreshData();
  }, [presentationForm, refreshData, tenant, actor]);

  const handleCreateSupplier = useCallback(async () => {
    if (!supplierForm.name.trim()) { setSupplierError("El nombre es requerido"); return; }
    
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

  const activeProducts = useMemo(() => products.filter(p => p.tenantId === tenantSlug && !p.deletedAt), [products, tenantSlug]);

  const openCategoryModal = () => { setShowCategoryModal(true); setCategoryForm(initialCategoryForm); setCategoryError(null); };
  const openProductModal = () => { setShowProductModal(true); setProductForm(initialProductForm); setProductErrors({}); };
  const openPresentationModal = () => { setShowPresentationModal(true); setPresentationForm(initialPresentationForm); setPresentationErrors({}); };
  const openSupplierModal = () => { setShowSupplierModal(true); setEditingSupplier(null); setSupplierForm(initialSupplierForm); setSupplierError(null); };

  const handleDeleteSupplier = async (supplier: Supplier) => {
    const confirmed = window.confirm(
      `¿Eliminar proveedor "${supplier.name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    try {
      await purchasesService.deleteSupplier(supplier.localId, { tenantSlug });
    } catch {
      // Handle error silently
    }
  };

  const tabs: TabItem[] = [
    { id: "products", label: "Productos", content: <ProductTable products={filteredProducts} categories={categories} isLoading={isLoading} onAddNew={openProductModal} /> },
    { id: "categories", label: "Categorías", content: <CategoryTable categories={filteredCategories} isLoading={isLoading} onAddNew={openCategoryModal} /> },
    { id: "presentations", label: "Presentaciones", content: <PresentationTable presentations={filteredPresentations} products={products} isLoading={isLoading} onAddNew={openPresentationModal} /> },
    { id: "suppliers", label: "Proveedores", content: <SupplierTable suppliers={filteredSuppliers} isLoading={isLoadingSuppliers} onAddNew={openSupplierModal} onEdit={handleOpenEditSupplier} onDelete={handleDeleteSupplier} /> }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="card-title">Gestión del Catálogo</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar..." className="input pl-10 w-full sm:w-64" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {activeTab === "products" && <button onClick={openProductModal} className="btn btn-primary"><Plus className="w-4 h-4" /> Nuevo Producto</button>}
        {activeTab === "categories" && <button onClick={openCategoryModal} className="btn btn-primary"><Plus className="w-4 h-4" /> Nueva Categoría</button>}
        {activeTab === "presentations" && <button onClick={openPresentationModal} className="btn btn-primary"><Plus className="w-4 h-4" /> Nueva Presentación</button>}
        {activeTab === "suppliers" && <button onClick={openSupplierModal} className="btn btn-primary"><Plus className="w-4 h-4" /> Nuevo Proveedor</button>}
      </div>

      {lastError && <div className="alert alert-error">{lastError}</div>}

      <Tabs items={tabs} defaultTab={activeTab} onChange={(tabId) => setActiveTab(tabId as typeof activeTab)} variant="underline" />

      <CategoryForm isOpen={showCategoryModal} onClose={() => { setShowCategoryModal(false); setCategoryForm(initialCategoryForm); }} form={categoryForm} onChange={setCategoryForm} onSubmit={handleCreateCategory} isSubmitting={isSubmitting} error={categoryError} />

      <ProductForm isOpen={showProductModal} onClose={() => { setShowProductModal(false); setProductForm(initialProductForm); }} form={productForm} onChange={setProductForm} onSubmit={handleCreateProduct} isSubmitting={isSubmitting} errors={productErrors} categories={categories} suppliers={suppliers} />

      <PresentationForm isOpen={showPresentationModal} onClose={() => { setShowPresentationModal(false); setPresentationForm(initialPresentationForm); }} form={presentationForm} onChange={setPresentationForm} onSubmit={handleCreatePresentation} isSubmitting={isSubmitting} errors={presentationErrors} products={activeProducts} />

      <SupplierForm isOpen={showSupplierModal} onClose={() => { setShowSupplierModal(false); setSupplierForm(initialSupplierForm); setEditingSupplier(null); }} title={editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"} form={supplierForm} onChange={setSupplierForm} onSubmit={handleCreateSupplier} isSubmitting={isSubmitting} error={supplierError} />
    </div>
  );
}