"use client";
import { useCurrentTheme } from "@/hooks/useCurrentTheme";
import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Slice = { label: string; value: number };

export function AssetsDonut({ data }: { data: Slice[] }) {
  const { theme } = useCurrentTheme();

  const total = data.reduce((s, d) => s + d.value, 0);

  const lightColors = ["#60a5fa", "#34d399", "#fb923c", "#f87171", "#a78bfa", "#2dd4bf", "#fbbf24", "#9ca3af"];

  const darkColors = ["#3b82f6", "#10b981", "#f97316", "#ef4444", "#8b5cf6", "#06b6d4", "#f59e0b", "#d1d5db"];

  const colors = theme === "dark" ? darkColors : lightColors;

  if (!data || data.length === 0 || total === 0) {
    return <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data</div>;
  }

  return (
    <div className="w-full h-[90svh]">
      <ResponsiveContainer className={"w-full h-full"}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius="40%"
            outerRadius="65%"
            paddingAngle={2}
            label={({ percent, name }) => `${name} ${Math.round(((percent || 0) as number) * 100)}%`}
            labelLine={true}
          >
            {data.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => value.toFixed(2)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
