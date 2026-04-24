/**
 * Builder de Atributos Dinámicos para Productos Globales.
 * Permite añadir "Tallas" y "Colores" (u otros atributos) al crear/editar un producto.
 */

import { useState } from "react";
import { Button, Input, Select, Checkbox, FormField } from "@/common";
import type { CreateGlobalProductInput } from "../../types/admin.types";

interface Attribute {
  id: string; // Usamos shortId para evitar complejidad
  name: string;
  type: string;
  values: string[];
}

interface DynamicAttributeBuilderProps {
  form: CreateGlobalProductInput;
  onChange: (field: "attributes" | "isWeighted", value: unknown) => void;
  isWeighted: boolean;
}

const AttributeTypeOptions = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "boolean", label: "Sí/No" },
  { value: "date", label: "Fecha" },
];

export function DynamicAttributeBuilder({
  form,
  onChange,
  isWeighted,
}: DynamicAttributeBuilderProps) {
  const [attributes, setAttributes] = useState<Attribute[]>(() =>
    form.attributes?.length ? form.attributes : []
  );

  // Sincronizar cambios locales al formulario padre
  const handleFormChange = (field: "attributes" | "isWeighted", value: unknown) => {
    onChange(field, value);
  };

  const addAttribute = () => {
    const newAttr: Attribute = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      type: "text",
      values: [],
    };
    setAttributes([...attributes, newAttr]);
    handleFormChange("attributes", attributes.concat(newAttr));
  };

  const updateAttributeName = (id: string, name: string) => {
    const updated = attributes.map((a) =>
      a.id === id ? { ...a, name } : a
    );
    setAttributes(updated);
    handleFormChange("attributes", updated);
  };

  const addAttributeValue = (id: string) => {
    const updated = attributes.map((a) =>
      a.id === id ? { ...a, values: [...a.values, ""] } : a
    );
    setAttributes(updated);
    handleFormChange("attributes", updated);
  };

  const updateAttributeValue = (attrId: string, index: number, value: string) => {
    const updated = attributes.map((a) =>
      a.id === attrId
        ? {
            ...a,
            values: a.values.map((v, i) => (i === index ? value : v)),
          }
        : a
    );
    setAttributes(updated);
    handleFormChange("attributes", updated);
  };

  const updateAttributeType = (id: string, type: string) => {
    const updated = attributes.map((a) =>
      a.id === id ? { ...a, type } : a
    );
    setAttributes(updated);
    handleFormChange("attributes", updated);
  };

  const removeAttribute = (id: string) => {
    const updated = attributes.filter((a) => a.id !== id);
    setAttributes(updated);
    handleFormChange("attributes", updated);
  };

  return (
    <div className="border-t border-border pt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Atributos Dinámicos</h3>
        <Button variant="secondary" size="sm" onClick={addAttribute}>
          + Agregar Atributo
        </Button>
      </div>

      {attributes.map((attr) => (
        <div key={attr.id} className="bg-surface-50 p-3 rounded space-y-3 mb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <FormField label="Nombre del Atributo" required>
                <Input
                  value={attr.name}
                  onChange={(e) => updateAttributeName(attr.id, e.target.value)}
                  placeholder="Ej. Talla, Color, Material"
                  required
                  className="w-full"
                />
              </FormField>
            </div>
            {attributes.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAttribute(attr.id)}
                className="text-state-error hover:bg-state-error/10 ml-2"
              >
                ✕
              </Button>
            )}
          </div>

          <div>
            <FormField label="Tipo de Dato">
              <Select
                value={attr.type}
                onChange={(val) => updateAttributeType(attr.id, val)}
                options={AttributeTypeOptions}
                placeholder="Seleccionar tipo"
              />
            </FormField>
          </div>

          <div>
            <FormField label="Valores Disponibles">
              <div className="space-y-2">
                {attr.values.map((value, index) => (
                  <Input
                    key={index}
                    type="text"
                    value={value}
                    onChange={(e) => updateAttributeValue(attr.id, index, e.target.value)}
                    placeholder={`Valor ${index + 1}`}
                    className="w-full"
                  />
                ))}
                <Button variant="outline" size="sm" onClick={() => addAttributeValue(attr.id)}>
                  + Agregar Valor
                </Button>
              </div>
            </FormField>
          </div>
        </div>
      ))}

      <div className="mt-4">
        <Checkbox
          label="¿Es un producto pesable?"
          checked={isWeighted}
          onChange={(checked) => handleFormChange("isWeighted", checked)}
        />
      </div>
    </div>
  );
}
