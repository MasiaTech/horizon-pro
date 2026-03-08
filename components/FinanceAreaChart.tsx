"use client";

import { useState, useRef, useCallback } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type FinanceChartSeries = {
  dataKey: string;
  name: string;
  color: string;
};

export interface FinanceAreaChartProps {
  /** Données du graphique (chaque point = record avec clés pour x et séries) */
  data: Array<Record<string, number | string>>;
  /** Séries à afficher (courbes + légende + détail au survol) */
  series: FinanceChartSeries[];
  /** Clé de l’axe X (ex. "month") */
  xAxisKey: string;
  /** Format du libellé axe X */
  formatXLabel: (value: number) => string;
  /** Ticks pour l’axe X (ex. [0, 6, 12, 18]) */
  xAxisTicks: number[];
  /** Clé optionnelle à afficher en gros (ex. "total", "balance"). Si absente, pas de gros chiffre. */
  totalDataKey?: string;
  /** Hauteur du graphique en px */
  height?: number;
  /** Ligne de référence horizontale (ex. objectif) */
  referenceLineY?: { value: number; label: string };
  /** Ligne de référence verticale (ex. atteint à X mois) */
  referenceLineX?: { value: number; label: string };
  /** Id unique pour les dégradés SVG */
  chartId: string;
  /** Si true, le bloc déborde en pleine largeur (-mx-8) */
  fullWidth?: boolean;
  /** Si true, affiche le bloc résumé (label + total + détail) au-dessus du graphique */
  showSummaryBlock?: boolean;
  /** Callback appelé au survol (pour afficher le résumé ailleurs, ex. colonne droite) */
  onHover?: (row: Record<string, number | string> | null) => void;
}

function formatYLabel(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(0)} k €` : `${value} €`;
}

/**
 * Graphique type finance : bloc résumé (label + total + détail par série) mis à jour au survol,
 * courbes en aires, axe Y à l’intérieur, pas de tooltip carte, légende minimaliste en bas.
 */
export function FinanceAreaChart({
  data,
  series,
  xAxisKey,
  formatXLabel,
  xAxisTicks,
  totalDataKey,
  height = 360,
  referenceLineY,
  referenceLineX,
  chartId,
  fullWidth = true,
  showSummaryBlock = true,
  onHover,
}: FinanceAreaChartProps) {
  const [hoveredRow, setHoveredRow] = useState<Record<string, number | string> | null>(null);
  const hoveredRef = useRef<Record<string, number | string> | null>(null);

  const updateHover = useCallback(
    (next: Record<string, number | string> | null) => {
      setHoveredRow(next);
      onHover?.(next);
    },
    [onHover]
  );

  const currentRow = data[0] ?? {};
  const row = hoveredRow ?? currentRow;
  const displayLabel = hoveredRow
    ? formatXLabel(Number(hoveredRow[xAxisKey]))
    : "Actuel";

  const handleTooltipPayload = useCallback(
    (rowData: Record<string, number | string> | undefined) => {
      if (!rowData) {
        hoveredRef.current = null;
        updateHover(null);
        return;
      }
      const next = { ...rowData } as Record<string, number | string>;
      if (hoveredRef.current?.[xAxisKey] !== next[xAxisKey]) {
        hoveredRef.current = next;
        updateHover(next);
      }
    },
    [xAxisKey, updateHover]
  );

  const containerClass = fullWidth
    ? "-mx-8 w-[calc(100%+4rem)]"
    : "w-full";

  const summaryBlock = showSummaryBlock && (
    <div className="mb-3 space-y-2 px-8">
      <p className="text-xs text-muted-foreground">{displayLabel}</p>
      {totalDataKey != null && row[totalDataKey] != null && (
        <p className="text-2xl font-semibold tabular-nums text-foreground">
          {Number(row[totalDataKey]).toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          €
        </p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {series
          .filter((s) => totalDataKey == null || s.dataKey !== totalDataKey)
          .map((s) => {
            const val = Number(row[s.dataKey]) ?? 0;
            return (
              <span
                key={s.dataKey}
                className="tabular-nums"
                style={{ color: s.color }}
              >
                {s.name}:{" "}
                {val.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                €
              </span>
            );
          })}
      </div>
    </div>
  );

  return (
    <div
      className={containerClass}
      onMouseLeave={() => {
        hoveredRef.current = null;
        updateHover(null);
      }}
    >
      {showSummaryBlock && summaryBlock}
      <div className="w-full px-1" style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 0, left: 6, bottom: 0 }}
          >
            <defs>
              {series.map((s) => (
                <linearGradient
                  key={s.dataKey}
                  id={`fill-${chartId}-${s.dataKey.replace(/\s/g, "-")}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
              vertical={false}
              horizontal={true}
            />
            <XAxis
              dataKey={xAxisKey}
              type="number"
              domain={[0, "dataMax"]}
              ticks={xAxisTicks}
              tickFormatter={(m) => formatXLabel(Number(m))}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              tickFormatter={(v) => formatYLabel(Number(v))}
              tick={({ y, payload }) => {
                const val =
                  typeof payload?.value === "number"
                    ? payload.value
                    : Number(payload?.value) || 0;
                return (
                  <text
                    x={14}
                    y={y}
                    textAnchor="start"
                    fill="hsl(var(--muted-foreground))"
                    fontSize={10}
                    className="tabular-nums"
                  >
                    {formatYLabel(val)}
                  </text>
                );
              }}
              axisLine={false}
              tickLine={false}
              width={1}
              interval="preserveStartEnd"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const rowData = payload[0]?.payload as Record<string, number | string> | undefined;
                if (!rowData) return null;
                handleTooltipPayload(rowData);
                return null;
              }}
            />
            {series.map((s) => (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#fill-${chartId}-${s.dataKey.replace(/\s/g, "-")})`}
                isAnimationActive={true}
                connectNulls={false}
              />
            ))}
            {referenceLineY && (
              <ReferenceLine
                y={referenceLineY.value}
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: referenceLineY.label,
                  position: "right",
                  fill: "hsl(var(--destructive))",
                  fontSize: 11,
                }}
              />
            )}
            {referenceLineX && referenceLineX.value > 0 && (
              <ReferenceLine
                x={referenceLineX.value}
                stroke="rgba(255, 255, 255, 0.85)"
                strokeWidth={2.5}
                strokeDasharray="6 6"
                label={{
                  value: referenceLineX.label,
                  position: "insideTopRight",
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 11,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1">
        {series.map((s) => (
          <div
            key={s.dataKey}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span
              className="h-1 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="tabular-nums">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
