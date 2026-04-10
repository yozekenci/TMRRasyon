"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { animalsApi, rationsApi } from "@/lib/api";
import {
  Users,
  ClipboardList,
  FlaskConical,
  ArrowRight,
  TrendingUp,
  Plus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function Dashboard() {
  const { data: animals } = useQuery({
    queryKey: ["animals"],
    queryFn: animalsApi.list,
  });
  const { data: rations } = useQuery({
    queryKey: ["rations"],
    queryFn: rationsApi.list,
  });

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          NRC 2023 tabanlı TMR rasyon formülasyon sistemi
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Hayvan Profili"
          value={animals?.length ?? 0}
          href="/animals"
          Icon={Users}
          accentColor="green"
        />
        <StatCard
          label="Kayıtlı Rasyon"
          value={rations?.length ?? 0}
          href="/rations"
          Icon={ClipboardList}
          accentColor="sky"
        />

        {/* CTA card */}
        <Link
          href="/rations/new"
          className="group flex items-center justify-between gap-4 rounded-xl bg-green-700 px-5 py-5 text-white hover:bg-green-800 transition-colors shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-[15px] leading-tight">Yeni Rasyon</div>
              <div className="text-green-200 text-xs mt-0.5">NRC 2023 ile formüle et</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-green-300 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
        </Link>
      </div>

      {/* Cost chart */}
      {rations && rations.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-700 text-sm">Son Rasyonlar — Günlük Maliyet (₺)</h2>
          </div>
          <div className="px-5 py-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={rations.slice(0, 8).reverse().map((r) => ({
                  name: r.name.length > 18 ? r.name.slice(0, 16) + "…" : r.name,
                  maliyet: r.total_cost_tl ?? 0,
                  dm: r.total_dm_kg ?? 0,
                }))}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}₺`} />
                <Tooltip
                  formatter={(v: number, name: string) =>
                    name === "maliyet" ? [`${v.toFixed(2)} ₺`, "Maliyet"] : [`${v.toFixed(2)} kg`, "KM"]
                  }
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="maliyet" fill="#15803d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent rations */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-700 text-sm">Son Rasyonlar</h2>
          </div>
          {rations && rations.length > 0 && (
            <Link
              href="/rations"
              className="text-xs text-green-700 hover:text-green-800 font-medium flex items-center gap-1"
            >
              Tümünü gör <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {rations && rations.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Rasyon Adı</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Hayvan</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide text-right">KM kg</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide text-right">Maliyet TL</th>
                <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Mod</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rations.slice(0, 8).map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      href={`/rations/${r.id}`}
                      className="font-medium text-green-700 hover:text-green-900 hover:underline underline-offset-2"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{r.animal_name}</td>
                  <td className="px-5 py-3 text-gray-600 text-right tabular-nums">
                    {r.total_dm_kg?.toFixed(2) ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-right tabular-nums">
                    {r.total_cost_tl?.toFixed(2) ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={r.optimization_mode === "lp" ? "blue" : "gray"}>
                      {r.optimization_mode === "lp" ? "LP" : "Manuel"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-14 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm mb-4">Henüz rasyon oluşturulmadı.</p>
            <Link
              href="/rations/new"
              className="inline-flex items-center gap-2 bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              İlk rasyonu oluştur
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  href,
  Icon,
  accentColor,
}: {
  label: string;
  value: number;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  accentColor: "green" | "sky";
}) {
  const accent =
    accentColor === "green"
      ? { icon: "bg-green-100 text-green-700", text: "text-green-700", border: "border-l-green-500" }
      : { icon: "bg-sky-100 text-sky-700",   text: "text-sky-700",   border: "border-l-sky-500"   };

  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 bg-white rounded-xl border border-gray-200 border-l-4 ${accent.border} px-5 py-5 hover:shadow-md transition-all duration-200`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accent.icon}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className={`text-3xl font-bold tabular-nums leading-none ${accent.text}`}>{value}</div>
        <div className="text-xs text-gray-500 font-medium mt-1">{label}</div>
      </div>
    </Link>
  );
}

function Badge({
  variant,
  children,
}: {
  variant: "blue" | "gray";
  children: React.ReactNode;
}) {
  const cls =
    variant === "blue"
      ? "bg-sky-100 text-sky-700"
      : "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}
