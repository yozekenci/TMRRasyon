"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ingredientsApi, api } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Save, RefreshCw, CheckCircle2 } from "lucide-react";

export default function BulkPricePage() {
  const qc = useQueryClient();
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState(false);

  const { data: ingredients, isLoading } = useQuery({
    queryKey: ["ingredients", "", ""],
    queryFn: () => ingredientsApi.list(),
    onSuccess: (data) => {
      const init: Record<number, string> = {};
      data.forEach((i) => { init[i.id] = String(i.price_per_kg_tl ?? ""); });
      setPrices(init);
    },
  } as Parameters<typeof useQuery>[0]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const items = Object.entries(prices)
        .filter(([, v]) => v !== "" && !isNaN(Number(v)))
        .map(([id, price]) => ({ id: Number(id), price_per_kg_tl: Number(price) }));
      return api.put("/api/ingredients/prices/bulk", items).then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const CATEGORY_LABELS: Record<string, string> = {
    roughage: "Kaba Yem",
    concentrate: "Kesif Yem",
    byproduct: "Yan Ürün",
    fat: "Yağ",
    mineral: "Mineral",
    additive: "Katkı",
    vitamin: "Vitamin",
  };

  const grouped = ingredients?.reduce<Record<string, typeof ingredients>>((acc, i) => {
    const cat = i.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(i);
    return acc;
  }, {}) ?? {};

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/ingredients" className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Yem Veritabanı
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Toplu Fiyat Güncelleme</h1>
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors"
        >
          {saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Kaydedildi!</>
          ) : saveMutation.isPending ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Kaydediliyor…</>
          ) : (
            <><Save className="w-4 h-4" /> Tümünü Kaydet</>
          )}
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-5">
        Fiyatları düzenleyip <strong>Tümünü Kaydet</strong>'e basın. Boş bırakılan alanlar güncellenmez.
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {CATEGORY_LABELS[cat] ?? cat}
                  <span className="ml-2 text-gray-400 font-normal normal-case">{items.length} hammadde</span>
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map((ing) => (
                  <div key={ing.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/60">
                    <div>
                      <span className="text-sm font-medium text-gray-800">
                        {ing.name_tr || ing.name}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">KM {ing.dm_pct}%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={prices[ing.id] ?? ""}
                        onChange={(e) =>
                          setPrices((p) => ({ ...p, [ing.id]: e.target.value }))
                        }
                        className="w-24 text-right border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-green-500 tabular-nums"
                        placeholder="—"
                      />
                      <span className="text-xs text-gray-400 w-8">₺/kg</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
