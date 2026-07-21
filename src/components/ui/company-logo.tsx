import Image from "next/image";
import { cn } from "@/lib/utils";

interface CompanyLogoProps {
  ticker: string;
  size?: number;
  className?: string;
}

export function CompanyLogo({ ticker, size = 20, className }: CompanyLogoProps) {
  const cleanTicker = ticker.trim().toUpperCase().replace(/\.US$/, "");
  const token = process.env.NEXT_PUBLIC_LOGO_DEV_API_KEY ?? process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;

  if (!token || !cleanTicker) {
    return (
      <div
        aria-hidden
        className={cn("shrink-0 rounded-sm border bg-muted/20", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const src = `https://img.logo.dev/ticker/${encodeURIComponent(cleanTicker)}?token=${token}&size=${size}&format=png&theme=auto&retina=true&fallback=monogram`;

  return (
    <Image
      src={src}
      alt={`${cleanTicker} logo`}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-xs bg-muted/20 object-contain", className)}
      unoptimized
    />
  );
}
