import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Flat, outlined surface used for every content block in the app.
 * Corners are sharp (radius tokens resolve to 0) and depth comes from the border, not from shadows.
 */
function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="card"
      className={cn("bg-surface text-foreground relative flex w-full flex-col border backdrop-blur-lg", className)}
      {...props}
    />
  );
}

/**
 * Common card heading: title (+ optional description) on the left, optional actions on the right,
 * separated from the card body with a hairline.
 */
function CardHeader({
  className,
  title,
  description,
  actions,
  children,
  ...props
}: Omit<React.ComponentProps<"header">, "title"> & {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header
      data-slot="card-header"
      className={cn("flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b px-6 py-4", className)}
      {...props}
    >
      {(title || description) && (
        <div className="flex min-w-0 flex-col gap-0.5">
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      )}
      {children}
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className={cn("flex items-center gap-2 text-lg leading-tight font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("p-6", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
