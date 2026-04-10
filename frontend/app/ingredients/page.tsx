"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ingredientsApi, Ingredient } from "@/lib/api";
import { Search, Plus, X, Database, ChevronDown } from "lucide-react";

const CATEGORIES: Record<string, string> = {
  roughage:   "Kaba Yem",
  concentrate:"Kesif Yem",
  byproduct:  "Yan Ürün",
  mineral:    "Mineral",
  fat:        "Yağ",
  vitamin:    "Vitamin",
  additive:   "Katkı",
};

const CATEGORY_COLORS: Record<string, string> = {
  roughage:    "bg-green-100 text-green-700",
  concentrate: "bg-amber-100 text-amber-700",
  byproduct:   "bg-purple-100 text-purple-700",
  mineral:     "bg-sky-100 text-sky-700",
  fat:         "bg-orange-100 text-orange-700",
  vitamin:     "bg-pink-100 text-pink-700",
  additive:    "bg-gray-100 text-gray-600",
};

export default function IngredientsPage() {
  const [search, setSearch]         = useState("");
  const [category, setCategory]     = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: ingredients, isLoading } = useQuery({
    queryKey: ["ingredients", search, category],
    queryFn: () =>
      ingredientsApi.list({
        search:   search   || undefined,
        category: category || undefined,
      }),
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Yem Veritabanı</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isLoading ? "…" : `${ingredients?.length ?? 0} hammadde`}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors shadow-sm"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? "İptal" : "Hammadde Ekle"}
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <AddIngredientForm onClose={() => setShowAddForm(false)} />
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Hammadde ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 bg-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-all"
          />
        </div>
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="appearance-none border border-gray-200 bg-white rounded-lg pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30 transition-all cursor-pointer"
          >
            <option value="">Tüm Kategoriler</option>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="space-y-3">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Hammadde", "Kategori", "KM %", "NEL", "HP %", "NDF %", "Ca %", "P %", "TL/kg", "Kaynak"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide ${
                        i >= 2 && i <= 8 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ingredients?.map((ing) => (
                <tr key={ing.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{ing.name_tr || ing.name}</p>
                    {ing.name_tr && (
                      <p className="text-[11px] text-gray-400 mt-0.5">{ing.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md ${
                      CATEGORY_COLORS[ing.category] ?? "bg-gray-100 text-gray-600"
                    }`}>
                      {CATEGORIES[ing.category] ?? ing.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{ing.dm_pct ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{ing.nel_mcal_kg ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{ing.cp_pct ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{ing.ndf_pct ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{ing.ca_pct ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{ing.p_pct ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700 tabular-nums">
                    {ing.price_per_kg_tl ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md ${
                        ing.source === "builtin"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {ing.source === "builtin" ? "NRC" : "Kullanıcı"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(!ingredients || ingredients.length === 0) && (
            <div className="py-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Database className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">Hammadde bulunamadı.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Add ingredient form ──────────────────────────────────────────── */

function AddIngredientForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: ingredientsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ingredients"] });
      onClose();
    },
  });

  const [form, setForm] = useState<Partial<Ingredient>>({ category: "concentrate" });
  const set = (k: keyof Ingredient, v: unknown) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form as any);
  };

  const fields = [
    { k: "name",           label: "Ad (EN)",     required: true, type: "text"   },
    { k: "name_tr",        label: "Ad (TR)",      type: "text"   },
    { k: "dm_pct",         label: "KM %",         type: "number" },
    { k: "nel_mcal_kg",    label: "NEL Mcal/kg",  type: "number" },
    { k: "cp_pct",         label: "HP %",         type: "number" },
    { k: "rup_pct",        label: "RUP % (HP)",   type: "number" },
    { k: "ndf_pct",        label: "NDF %",        type: "number" },
    { k: "adf_pct",        label: "ADF %",        type: "number" },
    { k: "ca_pct",         label: "Ca %",         type: "number" },
    { k: "p_pct",          label: "P %",          type: "number" },
    { k: "price_per_kg_tl",label: "Fiyat TL/kg",  type: "number" },
  ];

  return (
    <div className="bg-white border border-green-200 rounded-xl p-5 mb-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Plus className="w-4 h-4 text-green-700" />
          Yeni Hammadde
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {fields.map(({ k, label, required, type }) => (
            <div key={k}>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <input
                type={type}
                required={required}
                step="any"
                value={(form as any)[k] ?? ""}
                onChange={(e) =>
                  set(
                    k as keyof Ingredient,
                    type === "number" ? Number(e.target.value) : e.target.value
                  )
                }
                className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 focus:bg-white focus:ring-1 focus:ring-green-500/30 transition-all"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Kategori</label>
            <div className="relative">
              <select
                value={form.category ?? "concentrate"}
                onChange={(e) => set("category", e.target.value)}
                className="w-full appearance-none border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 focus:bg-white transition-all"
              >
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
        </div>
      </form>
    </div>
  );
}
