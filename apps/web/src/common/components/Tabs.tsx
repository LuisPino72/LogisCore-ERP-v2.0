import { useState, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  variant?: "underline" | "pills";
}

export function Tabs({ items, defaultTab, onChange, variant = "underline" }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? items[0]?.id);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeContent = items.find((item) => item.id === activeTab)?.content;

  const tabBaseClass = "px-4 py-2 text-sm font-medium transition-colors duration-200";
  const underlineVariant = {
    active: "border-b-2 border-brand-500 text-brand-600",
    inactive: "border-b-2 border-transparent text-content-secondary hover:text-content-primary hover:border-surface-300"
  };
  const pillsVariant = {
    active: "bg-brand-100 text-brand-700 rounded-md",
    inactive: "text-content-secondary hover:bg-surface-100 rounded-md"
  };
  const variantStyles = variant === "underline" ? underlineVariant : pillsVariant;

  return (
    <div>
      <div className={variant === "underline" ? "border-b border-surface-200" : "flex gap-2"}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.disabled && handleTabClick(item.id)}
            disabled={item.disabled}
            className={`${tabBaseClass} ${item.id === activeTab ? variantStyles.active : variantStyles.inactive} ${item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{activeContent}</div>
    </div>
  );
}
