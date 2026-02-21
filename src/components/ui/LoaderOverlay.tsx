import { cn } from "@/lib/utils";
import { DiamondLoader } from "@/components/ui/DiamondLoader";
import React from "react";

export const LoaderOverlay: React.FC<{ title?: string }> = ({ title }) => {
  return (
    <div
      className={cn(
        "absolute inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center transition-opacity duration-300",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="font-medium">{title}</div>
        <DiamondLoader />
      </div>
    </div>
  );
};
