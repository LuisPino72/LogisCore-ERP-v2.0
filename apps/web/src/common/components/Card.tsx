import React from "react";

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  children: React.ReactNode;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
}

export const Card = ({
  children,
  title,
  footer,
  headerExtra,
  className = "",
  ...props
}: CardProps) => {
  return (
    <div className={`card ${className}`} {...props}>
      {title && (
        <div className="card-header flex items-center justify-between">
          <h2 className="card-title">{title}</h2>
          {headerExtra}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
      {footer && (
        <div className={`card-footer ${className}`}>
          {footer}
        </div>
      )}
    </div>
  );
};
