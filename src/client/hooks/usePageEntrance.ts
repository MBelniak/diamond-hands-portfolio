import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";

export function usePageEntrance<T extends HTMLElement = HTMLDivElement>(willRenderContent: boolean) {
  const ref = useRef<T | null>(null);

  useLayoutEffect(() => {
    if (willRenderContent && ref.current) {
      const ctx = gsap.context(() => {
        gsap.from(ref.current, {
          opacity: 0,
          y: 100,
          duration: 0.8,
          ease: "power1.out",
        });
      });

      return () => ctx.revert();
    }
  }, [willRenderContent]);

  return ref;
}
