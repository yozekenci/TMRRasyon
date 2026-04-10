"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rationsApi } from "@/lib/api";
import { Plus, ClipboardList, FileDown, Sheet, Trash2 } from "lucide-react";

export default function RationsPage() {
  const qc = useQueryClient();
  const { data: rations, isLoading } = useQuery({
    queryKey: ["rations"],
    queryFn: rationsApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: rationsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rations"] }),
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Kayıtlı Rasyonlar</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isLoading ? "…" : `${rations?.length ?? 0} rasyon`}
          </p>
        </div>
        <Link
          href="/rations/new"
          className="inline-flex items-center gap-2 bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Yeni Rasyon
        </Link>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : rations && rations.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Rasyon Adı", "Hayvan", "KM kg", "Maliyet", "Mod", "İşlemler"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide ${
                      i === 2 || i === 3 ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rations.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/rations/${r.id}`}
                      className="font-medium text-green-700 hover:text-green-900 hover:underline underline-offset-2"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.animal_name}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                    {r.total_dm_kg?.toFixed(2) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700 tabular-nums">
                    {r.total_cost_tl != null ? `${r.total_cost_tl.toFixed(2)} ₺` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md ${
                        r.optimization_mode === "lp"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {r.optimization_mode === "lp" ? "LP" : "Manuel"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={rationsApi.pdfUrl(r.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="PDF İndir"
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                      >
                        <FileDown className="w-3 h-3" /> PDF
                      </a>
                      <a
                        href={rationsApi.excelUrl(r.id)}
                        title="Excel İndir"
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
                      >
                        <Sheet className="w-3 h-3" /> Excel
                      </a>
                      <button
                        onClick={() => deleteMutation.mutate(r.id)}
                        aria-label="Rasyonu sil"
                        className="inline-flex items-center p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm mb-5 font-medium">Henüz rasyon oluşturulmadı.</p>
          <Link
            href="/rations/new"
            className="inline-flex items-center gap-2 bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            İlk rasyonu oluştur
          </Link>
        </div>
      )}
    </div>
  );
}
