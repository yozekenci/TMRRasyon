"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { rationsApi, animalsApi, Ration } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function RationComparePage() {
  const [idA, setIdA] = useState<number | null>(null);
  const [idB, setIdB] = useState<number | null>(null);

  const { data: allRations } = useQuery({
    queryKey: ["rations"],
    queryFn: rationsApi.list,
  });

  const { data: rationA } = useQuery({
    queryKey: ["rations", idA],
    queryFn: () => rationsApi.get(idA!),
    enabled: idA !== null,
  });

  const { data: rationB } = useQuery({
    queryKey: ["rations", idB],
    queryFn: () => rationsApi.get(idB!),
    enabled: idB !== null,
  });

  const { data: reqA } = useQuery({
    queryKey: ["requirements", rationA?.animal_profile_id],
    queryFn: () => animalsApi.requirements(rationA!.animal_profile_id),
    enabled: !!rationA,
  });

  const { data: reqB } = useQuery({
    queryKey: ["requirements", rationB?.animal_profile_id],
    queryFn: () => animalsApi.requirements(rationB!.animal_profile_id),
    enabled: !!rationB,
  });

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/rations" className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Rasyonlar
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Senaryo Karşılaştırma</h1>
      </div>

      {/* Selector row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <RationSelector
          label="Rasyon A"
          value={idA}
          options={allRations ?? []}
          exclude={idB}
          onChange={setIdA}
          color="blue"
        />
        <RationSelector
          label="Rasyon B"
          value={idB}
          options={allRations ?? []}
          exclude={idA}
          onChange={setIdB}
          color="orange"
        />
      </div>

      {rationA && rationB ? (
        <div className="space-y-5">
          {/* Özet karşılaştırma */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-700 text-sm">Özet Karşılaştırma</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">Metrik</th>
                  <th className="px-4 py-3 text-right text-blue-700">{rationA.name}</th>
                  <th className="px-4 py-3 text-right text-orange-700">{rationB.name}</th>
                  <th className="px-4 py-3 text-right">Fark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <CompRow label="Taze Ağırlık (kg)" a={rationA.total_fresh_kg} b={rationB.total_fresh_kg} unit="kg" lowerBetter />
                <CompRow label="Kuru Madde (kg)" a={rationA.total_dm_kg} b={rationB.total_dm_kg} unit="kg" />
                <CompRow label="Günlük Maliyet (₺)" a={rationA.total_cost_tl} b={rationB.total_cost_tl} unit="₺" lowerBetter />
                <CompRow label="NEL toplam (Mcal)" a={totalNel(rationA)} b={totalNel(rationB)} unit="Mcal" />
                <CompRow label="HP toplam (g)" a={totalCp(rationA)} b={totalCp(rationB)} unit="g" />
                <CompRow label="Ca toplam (g)" a={totalCa(rationA)} b={totalCa(rationB)} unit="g" />
                <CompRow label="P toplam (g)" a={totalP(rationA)} b={totalP(rationB)} unit="g" />
              </tbody>
            </table>
          </div>

          {/* NRC karşılaştırması */}
          {reqA && reqB && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <h2 className="font-semibold text-gray-700 text-sm">NRC İhtiyaç Karşılama (%)</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 text-left">Besin</th>
                    <th className="px-4 py-3 text-right text-blue-700">{rationA.name}</th>
                    <th className="px-4 py-3 text-right text-orange-700">{rationB.name}</th>
                    <th className="px-4 py-3 text-right">İhtiyaç</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <NrcRow label="NEL/NEm+NEg" actA={totalNel(rationA)} actB={totalNel(rationB)} target={reqA.nem_mcal_day + reqA.neg_mcal_day} unit="Mcal" />
                  <NrcRow label="MP (g)" actA={totalCp(rationA) * 0.67} actB={totalCp(rationB) * 0.67} target={reqA.mp_g_day} unit="g" />
                  <NrcRow label="Ca (g)" actA={totalCa(rationA)} actB={totalCa(rationB)} target={reqA.ca_g_day} unit="g" />
                  <NrcRow label="P (g)" actA={totalP(rationA)} actB={totalP(rationB)} target={reqA.p_g_day} unit="g" />
                </tbody>
              </table>
            </div>
          )}

          {/* Hammadde listesi */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-700 text-sm">Hammadde Bileşimi</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">Hammadde</th>
                  <th className="px-4 py-3 text-right text-blue-700">{rationA.name} (kg)</th>
                  <th className="px-4 py-3 text-right text-orange-700">{rationB.name} (kg)</th>
                  <th className="px-4 py-3 text-right">Fark (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mergeIngredients(rationA, rationB).map((row) => (
                  <tr key={row.name} className="hover:bg-gray-50/80">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{row.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-blue-700">
                      {row.a > 0 ? row.a.toFixed(2) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-orange-700">
                      {row.b > 0 ? row.b.toFixed(2) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <DiffBadge diff={row.b - row.a} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center text-gray-400 text-sm">
          Karşılaştırmak için iki rasyon seçin
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────── */

function totalNel(r: Ration) {
  return r.items.reduce((s, i) => s + (i.nel_mcal ?? 0), 0);
}
function totalCp(r: Ration) {
  return r.items.reduce((s, i) => s + (i.cp_g ?? 0), 0);
}
function totalCa(r: Ration) {
  return r.items.reduce((s, i) => s + (i.ca_g ?? 0), 0);
}
function totalP(r: Ration) {
  return r.items.reduce((s, i) => s + (i.p_g ?? 0), 0);
}

function mergeIngredients(a: Ration, b: Ration) {
  const map = new Map<string, { name: string; a: number; b: number }>();
  a.items.forEach((i) => {
    const name = i.ingredient_name_tr || i.ingredient_name;
    map.set(name, { name, a: i.fresh_weight_kg, b: 0 });
  });
  b.items.forEach((i) => {
    const name = i.ingredient_name_tr || i.ingredient_name;
    const existing = map.get(name);
    if (existing) existing.b = i.fresh_weight_kg;
    else map.set(name, { name, a: 0, b: i.fresh_weight_kg });
  });
  return Array.from(map.values()).sort((x, y) => (y.a + y.b) - (x.a + x.b));
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function RationSelector({
  label, value, options, exclude, onChange, color,
}: {
  label: string;
  value: number | null;
  options: { id: number; name: string }[];
  exclude: number | null;
  onChange: (id: number | null) => void;
  color: "blue" | "orange";
}) {
  const ring = color === "blue" ? "ring-blue-400 border-blue-200" : "ring-orange-400 border-orange-200";
  const text = color === "blue" ? "text-blue-700" : "text-orange-700";
  return (
    <div>
      <label className={`block text-xs font-semibold mb-1.5 ${text}`}>{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${ring} bg-white`}
      >
        <option value="">— Rasyon seçin —</option>
        {options.filter((o) => o.id !== exclude).map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </div>
  );
}

function CompRow({
  label, a, b, unit, lowerBetter,
}: {
  label: string;
  a?: number | null;
  b?: number | null;
  unit: string;
  lowerBetter?: boolean;
}) {
  const diff = (b ?? 0) - (a ?? 0);
  return (
    <tr className="hover:bg-gray-50/80">
      <td className="px-4 py-2.5 text-gray-600">{label}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-blue-700 font-medium">
        {a != null ? `${a.toFixed(2)} ${unit}` : "—"}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-orange-700 font-medium">
        {b != null ? `${b.toFixed(2)} ${unit}` : "—"}
      </td>
      <td className="px-4 py-2.5 text-right">
        <DiffBadge diff={diff} lowerBetter={lowerBetter} suffix={` ${unit}`} />
      </td>
    </tr>
  );
}

function NrcRow({
  label, actA, actB, target, unit,
}: {
  label: string;
  actA: number;
  actB: number;
  target: number;
  unit: string;
}) {
  const pctA = target > 0 ? (actA / target * 100) : 0;
  const pctB = target > 0 ? (actB / target * 100) : 0;
  return (
    <tr className="hover:bg-gray-50/80">
      <td className="px-4 py-2.5 text-gray-600">{label}</td>
      <td className="px-4 py-2.5 text-right">
        <PctBadge pct={pctA} />
      </td>
      <td className="px-4 py-2.5 text-right">
        <PctBadge pct={pctB} />
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-xs text-gray-400">
        {target.toFixed(1)} {unit}
      </td>
    </tr>
  );
}

function PctBadge({ pct }: { pct: number }) {
  const cls =
    pct < 90 ? "text-red-600 bg-red-50" :
    pct < 100 ? "text-amber-600 bg-amber-50" :
    pct <= 120 ? "text-emerald-700 bg-emerald-50" :
    "text-orange-600 bg-orange-50";
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${cls} tabular-nums`}>
      %{pct.toFixed(0)}
    </span>
  );
}

function DiffBadge({
  diff, lowerBetter, suffix = "",
}: {
  diff: number;
  lowerBetter?: boolean;
  suffix?: string;
}) {
  if (Math.abs(diff) < 0.005) return <Minus className="w-3.5 h-3.5 text-gray-300 inline" />;
  const positive = lowerBetter ? diff < 0 : diff > 0;
  const cls = positive ? "text-emerald-700" : "text-red-600";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${cls}`}>
      {diff > 0
        ? <TrendingUp className="w-3 h-3" />
        : <TrendingDown className="w-3 h-3" />
      }
      {diff > 0 ? "+" : ""}{diff.toFixed(2)}{suffix}
    </span>
  );
}
