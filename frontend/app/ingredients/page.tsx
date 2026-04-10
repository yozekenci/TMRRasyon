"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ingredientsApi, Ingredient } from "@/lib/api";
import { Search, Plus, X, Database, ChevronDown } from "lucide-react";
import { Badge, BadgeVariant, PageHeader, EmptyState, Button, buttonVariants } from "@/components/ui";

const CATEGORIES: Record<string, string> = {
  roughage:    "Kaba Yem",
  concentrate: "Kesif Yem",
  byproduct:   "Yan Ürün",
  mineral:     "Mineral",
  fat:         "Yağ",
  vitamin:     "Vitamin",
  additive:    "Katkı",
};

const CATEGORY_VARIANT: Record<string, BadgeVariant> = {
  roughage:    "green",
  concentrate: "amber",
  byproduct:   "purple",
  mineral:     "sky",
  fat:         "orange",
  vitamin:     "pink",
  additive:    "gray",
};

export default function IngredientsPage() {
  const [search, setSearch]           = useState("");
  const [category, setCategory]       = useState("");
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
      <PageHeader
        title="Yem Veritabanı"
        subtitle={isLoading ? "…" : `${ingredients?.length ?? 0} hammadde`}
        action={
          <Button
            variant={showAddForm ? "secondary" : "primary"}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? "İptal" : "Hammadde Ekle"}
          </Button>
        }
      />

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
                    <Badge variant={CATEGORY_VARIANT[ing.category] ?? "gray"}>
                      {CATEGORIES[ing.category] ?? ing.category}
                    </Badge>
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
                    <Badge variant={ing.source === "builtin" ? "blue" : "green"}>
                      {ing.source === "builtin" ? "NRC" : "Kullanıcı"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(!ingredients || ingredients.length === 0) && (
            <EmptyState
              contained={false}
              icon={Database}
              title="Hammadde bulunamadı."
            />
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
    mutation.mutate(form as Ingredient);
  };

  const fields: Array<{
    k: keyof Ingredient;
    label: string;
    required?: boolean;
    type: string;
  }> = [
    { k: "name",            label: "Ad (EN)",     required: true, type: "text"   },
    { k: "name_tr",         label: "Ad (TR)",      type: "text"   },
    { k: "dm_pct",          label: "KM %",         type: "number" },
    { k: "nel_mcal_kg",     label: "NEL Mcal/kg",  type: "number" },
    { k: "cp_pct",          label: "HP %",         type: "number" },
    { k: "rup_pct",         label: "RUP % (HP)",   type: "number" },
    { k: "ndf_pct",         label: "NDF %",        type: "number" },
    { k: "adf_pct",         label: "ADF %",        type: "number" },
    { k: "ca_pct",          label: "Ca %",         type: "number" },
    { k: "p_pct",           label: "P %",          type: "number" },
    { k: "price_per_kg_tl", label: "Fiyat TL/kg",  type: "number" },
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
                value={(form[k] ?? "") as string | number}
                onChange={(e) =>
                  set(
                    k,
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
          <Button type="submit" isLoading={mutation.isPending}>
            {mutation.isPending ? "Kaydediliyor…" : "Kaydet"}
          </Button>
          <button
            type="button"
            onClick={onClose}
            className={buttonVariants("secondary")}
          >
            İptal
          </button>
        </div>
      </form>
    </div>
  );
}
