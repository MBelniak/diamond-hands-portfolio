import { DiamondLoader } from "@/components/ui/DiamondLoader";
import React from "react";

/**
 * Blurs the whole (scrollable) height of its positioned parent, so content can't be scrolled out from under it,
 * while the loader stays centred in the visible viewport.
 *
 * The loader is a sibling of the blur layer rather than its child: an element with `backdrop-filter`
 * becomes the containing block for `position: fixed` descendants, which would break the viewport centring.
 */
export const LoaderOverlay: React.FC<{ title?: string }> = ({ title }) => {
  return (
    <div className="absolute inset-0 z-30" role="status" aria-live="polite">
      <div className="absolute inset-0 bg-white/10 backdrop-blur-md transition-opacity duration-300" />
      <div className="fixed inset-y-0 right-0 left-0 flex flex-col items-center justify-center gap-3 md:left-(--sidebar-width)">
        {title && <div className="font-medium">{title}</div>}
        <DiamondLoader />
      </div>
    </div>
  );
};
