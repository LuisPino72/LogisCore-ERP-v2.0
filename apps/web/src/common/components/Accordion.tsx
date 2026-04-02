import { useState, type ReactNode } from "react";

export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultExpanded?: string[];
}

export function Accordion({ items, allowMultiple = false, defaultExpanded = [] }: AccordionProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(defaultExpanded));

  const toggleItem = (id: string) => {
    setExpanded((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isExpanded = expanded.has(item.id);
        return (
          <div key={item.id} className="border border-surface-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full px-4 py-3 flex items-center justify-between bg-surface-50 hover:bg-surface-100 transition-colors duration-200"
            >
              <span className="font-medium text-content-primary">{item.title}</span>
              <svg
                className={`w-5 h-5 text-content-secondary transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isExpanded && <div className="px-4 py-3 bg-white border-t border-surface-200">{item.content}</div>}
          </div>
        );
      })}
    </div>
  );
}
