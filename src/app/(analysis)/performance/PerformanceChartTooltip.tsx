import { useMemo } from "react";
import { TooltipContentProps } from "recharts";

const formatValue = (value: number) => (typeof value === "number" ? value.toFixed(2) : value);
const formatLabel = (l: unknown) => `Date: ${l}`;

const contentStyle: React.CSSProperties = {
  background: "var(--tooltip-background)",
  borderRadius: "0.75rem",
  color: "var(--foreground)",
  border: "1px solid #a5b4fc",
  padding: "0.5rem 0.75rem",
};

const labelStyle: React.CSSProperties = { color: "var(--foreground)", fontWeight: 600, marginBottom: 6 };

export const CustomTooltip = ({ active, payload, label }: Partial<TooltipContentProps<string | number, string>>) => {
  const filteredKeys = useMemo(
    () =>
      payload
        ?.filter((p) => p.dataKey !== "profitPositive" && p.dataKey !== "profitNegative")
        .sort((a, b) => b.value - a.value),
    [payload],
  );

  if (!active || !payload || !payload.length) return null;

  return (
    <div style={contentStyle}>
      <div style={labelStyle}>{formatLabel(label)}</div>
      {(filteredKeys ?? []).map((entry, idx: number) => (
        <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: entry.color ?? entry.stroke ?? "transparent",
                display: "inline-block",
              }}
            />
            <span style={{ color: "var(--foreground)" }}>{entry.name ?? entry.dataKey}</span>
          </div>
          <div style={{ color: "var(--foreground)", fontVariantNumeric: "tabular-nums" }}>
            {formatValue(entry.value)}
          </div>
        </div>
      ))}
    </div>
  );
};
