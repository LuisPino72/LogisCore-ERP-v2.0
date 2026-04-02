import { useState, useRef, type ReactNode } from "react";

export interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

const positionClasses = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2"
};

const arrowClasses = {
  top: "top-full -translate-x-1/2 border-t-surface-700 border-x-transparent border-b-transparent left-1/2",
  bottom: "bottom-full -translate-x-1/2 border-b-surface-700 border-x-transparent border-t-transparent left-1/2",
  left: "left-full -translate-y-1/2 border-l-surface-700 border-y-transparent border-r-transparent top-1/2",
  right: "right-full -translate-y-1/2 border-r-surface-700 border-y-transparent border-l-transparent top-1/2"
};

export function Tooltip({ children, content, position = "top", delay = 300 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 px-2 py-1 text-xs text-white bg-surface-700 rounded whitespace-nowrap ${positionClasses[position]}`}
        >
          {content}
          <div className={`absolute border-4 ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  );
}
