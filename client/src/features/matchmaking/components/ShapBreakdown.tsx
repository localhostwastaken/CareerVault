import { useMemo } from "react";
import { Bar, BarChart, Cell, LabelList, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { ShapWeight } from "../types";

interface Props {
  shap: ShapWeight[];
  totalScore: number;
}

export const ShapBreakdown = ({ shap, totalScore }: Props) => {
  const data = useMemo(
    () =>
      shap.slice(0, 6).map((w) => ({
        name: w.factor,
        value: Math.round(w.contribution),
        positive: w.contribution >= 0,
        description: w.description,
      })),
    [shap],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
          Total match score
        </p>
        <p className="text-2xl font-extrabold text-primary tnum">{totalScore}<span className="text-sm font-medium text-text-muted">/100</span></p>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 8 }}>
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} domain={[-25, 35]} />
            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#0F172A", fontSize: 12 }} width={170} />
            <ReferenceLine x={0} stroke="#CBD5E1" />
            <Bar dataKey="value" radius={[4, 4, 4, 4]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.positive ? "#059669" : "#DC2626"} />
              ))}
              <LabelList dataKey="value" position="right" fill="#0F172A" fontSize={11} formatter={((v) => (typeof v === "number" && v > 0 ? `+${v}` : String(v))) as (v: unknown) => string} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-1.5 text-xs text-text-muted">
        {data.map((d) => (
          <li key={d.name} className="flex items-start gap-2">
            <span
              className="mt-0.5 inline-block size-2 shrink-0 rounded-full"
              style={{ background: d.positive ? "#059669" : "#DC2626" }}
            />
            <span><span className="font-medium text-text">{d.name}</span> · {d.description}</span>
          </li>
        ))}
      </ul>

      <p className="rounded-lg bg-surface-2 px-3 py-2 text-[11px] text-text-muted">
        Built on SHAP feature-importance values. The algorithm strictly ignores demographic attributes — auditable
        and compliant with the EU AI Act.
      </p>
    </div>
  );
};
