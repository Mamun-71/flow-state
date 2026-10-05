"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartBucket } from "@/lib/stats";
import { formatMinutes } from "@/lib/time";

function hoursLabel(h: number) {
  return formatMinutes(Math.round(h * 60));
}

export function HoursChart({ buckets, granularity }: { buckets: ChartBucket[]; granularity: "day" | "week" }) {
  const many = buckets.length > 16;
  return (
    <figure>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-chart-1" aria-hidden="true" />
          Tracked
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 rounded-full bg-chart-2" aria-hidden="true" />
          Planned (estimated)
        </span>
        <span className="ml-auto">Hours per {granularity}</span>
      </div>
      <div className="h-64 w-full md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={buckets} margin={{ top: 4, right: 4, bottom: 0, left: -18 }} barCategoryGap={many ? "18%" : "28%"}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={14}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(v: number) => `${v}h`}
              width={44}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const b = payload[0].payload as ChartBucket;
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                    <p className="mb-1 font-medium">{granularity === "week" ? `Week of ${b.label}` : b.label}</p>
                    <p className="flex items-center gap-1.5 tabular-nums">
                      <span className="size-2 rounded-[2px] bg-chart-1" /> Tracked {hoursLabel(b.trackedHours)}
                    </p>
                    <p className="flex items-center gap-1.5 text-muted-foreground tabular-nums">
                      <span className="h-0.5 w-2 bg-chart-2" /> Planned {hoursLabel(b.plannedHours)}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="trackedHours" name="Tracked" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Line
              dataKey="plannedHours"
              name="Planned"
              type="monotone"
              stroke="var(--chart-2)"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={many ? false : { r: 3, strokeWidth: 0, fill: "var(--chart-2)" }}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show as table</summary>
        <div className="mt-2 max-h-64 overflow-auto rounded-lg border">
          <table className="w-full text-left tabular-nums">
            <thead className="sticky top-0 bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-1.5 font-medium">{granularity === "week" ? "Week of" : "Day"}</th>
                <th className="px-3 py-1.5 text-right font-medium">Tracked</th>
                <th className="px-3 py-1.5 text-right font-medium">Planned</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {buckets.map((b) => (
                <tr key={b.key}>
                  <td className="px-3 py-1.5">{b.label}</td>
                  <td className="px-3 py-1.5 text-right">{hoursLabel(b.trackedHours)}</td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground">{hoursLabel(b.plannedHours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
