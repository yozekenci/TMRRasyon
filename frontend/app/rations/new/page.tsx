"use client";

import { use, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  animalsApi,
  ingredientsApi,
  rationsApi,
  AnimalProfile,
  Ingredient,
  NutrientRequirements,
} from "@/lib/api";
import Link from "next/link";

type Mode = "manual" | "lp";
type Step = 1 | 2 | 3 | 4 | 5;

export default function NewRationPage() {
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>(1);
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(
    params.get("animal") ? Number(params.get("animal")) : null
  );
  const [mode, setMode] = useState<Mode>("manual");
  const [rationName, setRationName] = useState("");
  const [rationPhase, setRationPhase] = useState<string>("");

  // Manuel mod: ingredient_id → kg
  const [manualItems, setManualItems] = useState<Map<number, number>>(new Map());

  // LP mod: ingredient_id → {min, max}
  const [lpConstraints, setLpConstraints] = useState<
    Map<number, { min: number; max?: number }>
  >(new Map());

  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());

  const { data: animals } = useQuery({ queryKey: ["animals"], queryFn: animalsApi.list });
  const { data: ingredients } = useQuery({ queryKey: ["ingredients"], queryFn: () => ingredientsApi.list() });
  const { data: requirements } = useQuery({
    queryKey: ["requirements", selectedAnimalId],
    queryFn: () => animalsApi.requirements(selectedAnimalId!),
    enabled: !!selectedAnimalId,
  });
  const { data: selectedAnimal } = useQuery({
    queryKey: ["animals", selectedAnimalId],
    queryFn: () => animalsApi.get(selectedAnimalId!),
    enabled: !!selectedAnimalId,
  });

  const createMutation = useMutation({
    mutationFn: rationsApi.create,
    onSuccess: (ration) => {
      qc.invalidateQueries({ queryKey: ["rations"] });
      router.push(`/rations/${ration.id}`);
    },
  });

  const optimizeMutation = useMutation({
    mutationFn: rationsApi.optimize,
    onSuccess: (ration) => {
      qc.invalidateQueries({ queryKey: ["rations"] });
      router.push(`/rations/${ration.id}`);
    },
  });

  const handleSave = () => {
    if (!selectedAnimalId || !rationName) return;
    if (mode === "manual") {
      const items = Array.from(manualItems.entries())
        .filter(([, kg]) => kg > 0)
        .map(([ingredient_id, fresh_weight_kg]) => ({ ingredient_id, fresh_weight_kg }));
      createMutation.mutate({ name: rationName, animal_profile_id: selectedAnimalId, items, phase: rationPhase || null });
    } else {
      const constraints = Array.from(lpConstraints.entries()).map(([ingredient_id, c]) => ({
        ingredient_id,
        min_kg: c.min,
        max_kg: c.max,
      }));
      optimizeMutation.mutate({
        name: rationName,
        animal_profile_id: selectedAnimalId,
        ingredient_constraints: constraints,
        phase: rationPhase || null,
      });
    }
  };

  const isLoading = createMutation.isPending || optimizeMutation.isPending;
  const error = createMutation.error?.message || optimizeMutation.error?.message;

  const steps = [
    { n: 1, label: "Hayvan" },
    { n: 2, label: "İhtiyaçlar" },
    { n: 3, label: "Hammaddeler" },
    { n: 4, label: "Rasyon" },
    { n: 5, label: "Kaydet" },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Rasyon Oluştur</h1>

      {/* Adım göstergesi */}
      <div className="flex items-center gap-1 mb-8">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-1">
            <button
              onClick={() => step > s.n && setStep(s.n as Step)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                step === s.n
                  ? "bg-green-700 text-white"
                  : step > s.n
                  ? "bg-green-100 text-green-700 cursor-pointer hover:bg-green-200"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <span>{s.n}</span> {s.label}
            </button>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-6 ${step > s.n ? "bg-green-400" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Adım 1: Hayvan Seç */}
      {step === 1 && (
        <div>
          <h2 className="font-semibold text-gray-700 mb-4">Hayvan Profilini Seçin</h2>
          {animals && animals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {animals.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAnimalId(a.id)}
                  className={`text-left border rounded-xl p-4 transition-colors ${
                    selectedAnimalId === a.id
                      ? "border-green-600 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium text-gray-800">
                    {a.species === "dairy" ? "🐄" : "🐂"} {a.name}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {a.live_weight_kg} kg
                    {a.species === "dairy" && ` · ${a.milk_yield_kg_day} kg/gün süt`}
                    {a.species === "beef" && ` · ${a.target_adg_kg} kg/gün AGK`}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <p className="text-gray-500 mb-3">Henüz hayvan profili yok.</p>
              <Link href="/animals/new" className="text-green-700 underline text-sm">
                Önce profil oluşturun
              </Link>
            </div>
          )}
          <button
            disabled={!selectedAnimalId}
            onClick={() => setStep(2)}
            className="mt-4 bg-green-700 text-white px-6 py-2.5 rounded-lg hover:bg-green-800 disabled:opacity-40"
          >
            Devam →
          </button>
        </div>
      )}

      {/* Adım 2: NRC İhtiyaçları */}
      {step === 2 && requirements && selectedAnimal && (
        <div>
          <h2 className="font-semibold text-gray-700 mb-2">
            NRC 2023 — {selectedAnimal.name} Günlük İhtiyaçları
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Bu değerler rasyon optimizasyonunda referans alınacak.
          </p>
          <RequirementsGrid req={requirements} species={selectedAnimal.species} />
          {requirements.notes.map((n, i) => (
            <p key={i} className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded mt-2">⚠️ {n}</p>
          ))}
          <div className="flex gap-3 mt-4">
            <button onClick={() => setStep(1)} className={backBtn}>← Geri</button>
            <button onClick={() => setStep(3)} className={nextBtn}>Devam →</button>
          </div>
        </div>
      )}

      {/* Adım 3: Hammadde Seçimi + Mod */}
      {step === 3 && (
        <div>
          <div className="flex gap-3 mb-4">
            {(["manual", "lp"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium ${
                  mode === m
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {m === "manual" ? "✏️ Manuel Giriş" : "⚡ LP Otomatik Optimizasyon"}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            {mode === "manual"
              ? "Her hammadde için taze ağırlık (kg/gün) gireceksiniz."
              : "Min/max kısıtları girin — program minimum maliyetli rasyonu hesaplar."}
          </p>

          <h3 className="font-medium text-gray-700 mb-2">Hammaddeleri Seçin</h3>
          <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-lg">
            {ingredients?.map((ing) => {
              const checked = selectedIngredients.has(ing.id);
              return (
                <label
                  key={ing.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(selectedIngredients);
                      if (e.target.checked) next.add(ing.id);
                      else {
                        next.delete(ing.id);
                        manualItems.delete(ing.id);
                        lpConstraints.delete(ing.id);
                      }
                      setSelectedIngredients(next);
                    }}
                    className="rounded border-gray-300 text-green-600"
                  />
                  <span className="flex-1 text-sm text-gray-700">{ing.name_tr || ing.name}</span>
                  <span className="text-xs text-gray-400">
                    {ing.nel_mcal_kg ? `NEL: ${ing.nel_mcal_kg}` : ""} {ing.cp_pct ? `HP: ${ing.cp_pct}%` : ""}
                  </span>
                  {ing.price_per_kg_tl && (
                    <span className="text-xs text-gray-500 ml-2">{ing.price_per_kg_tl} TL/kg</span>
                  )}
                </label>
              );
            })}
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={() => setStep(2)} className={backBtn}>← Geri</button>
            <button
              disabled={selectedIngredients.size === 0}
              onClick={() => setStep(4)}
              className={nextBtn + " disabled:opacity-40"}
            >
              Devam ({selectedIngredients.size} hammadde) →
            </button>
          </div>
        </div>
      )}

      {/* Adım 4: Miktarlar */}
      {step === 4 && ingredients && (
        <div>
          <h2 className="font-semibold text-gray-700 mb-4">
            {mode === "manual" ? "Hammadde Miktarları (kg/gün taze ağırlık)" : "LP Kısıtları"}
          </h2>
          <div className="space-y-2">
            {ingredients
              .filter((ing) => selectedIngredients.has(ing.id))
              .map((ing) => (
                <IngredientRow
                  key={ing.id}
                  ing={ing}
                  mode={mode}
                  manualKg={manualItems.get(ing.id) ?? 0}
                  lpConstraint={lpConstraints.get(ing.id) ?? { min: 0 }}
                  onManualChange={(kg) =>
                    setManualItems((prev) => new Map(prev).set(ing.id, kg))
                  }
                  onLpChange={(c) =>
                    setLpConstraints((prev) => new Map(prev).set(ing.id, c))
                  }
                />
              ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setStep(3)} className={backBtn}>← Geri</button>
            <button onClick={() => setStep(5)} className={nextBtn}>Devam →</button>
          </div>
        </div>
      )}

      {/* Adım 5: Kaydet */}
      {step === 5 && (
        <div className="max-w-md">
          <h2 className="font-semibold text-gray-700 mb-4">Rasyon Adı & Kaydet</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rasyon Adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="örn. Besi Başlangıç Rasyonu #1"
                value={rationName}
                onChange={(e) => setRationName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Besi Dönemi
              </label>
              <div className="flex gap-2">
                {[
                  { value: "başlangıç", label: "Başlangıç", cls: "border-blue-300 bg-blue-50 text-blue-700" },
                  { value: "geliştirme", label: "Geliştirme", cls: "border-amber-300 bg-amber-50 text-amber-700" },
                  { value: "bitirme", label: "Bitirme", cls: "border-purple-300 bg-purple-50 text-purple-700" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRationPhase(rationPhase === opt.value ? "" : opt.value)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      rationPhase === opt.value ? opt.cls : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">İsteğe bağlı — rasyona etiket ekler</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1 text-gray-600">
              <div className="flex justify-between">
                <span>Hayvan:</span>
                <span className="font-medium">{selectedAnimal?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Hammadde sayısı:</span>
                <span className="font-medium">{selectedIngredients.size}</span>
              </div>
              <div className="flex justify-between">
                <span>Mod:</span>
                <span className="font-medium">{mode === "lp" ? "LP Otomatik" : "Manuel"}</span>
              </div>
              {rationPhase && (
                <div className="flex justify-between">
                  <span>Besi Dönemi:</span>
                  <span className="font-medium capitalize">{rationPhase}</span>
                </div>
              )}
            </div>
            {error && (
              <p className="text-red-600 bg-red-50 px-3 py-2 rounded text-sm">⚠️ {error}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setStep(4)} className={backBtn}>← Geri</button>
              <button
                disabled={!rationName || isLoading}
                onClick={handleSave}
                className="flex-1 bg-green-700 text-white py-2.5 rounded-lg font-medium hover:bg-green-800 disabled:opacity-40"
              >
                {isLoading
                  ? mode === "lp" ? "Optimizasyon çalışıyor..." : "Kaydediliyor..."
                  : "Rasyonu Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RequirementsGrid({ req, species }: { req: NutrientRequirements; species: string }) {
  const isDairy = species === "dairy";
  const items = [
    { label: "KM Alımı", value: `${req.dmi_kg_day} kg/gün` },
    isDairy
      ? { label: "NEL", value: `${req.nel_mcal_day} Mcal/gün` }
      : { label: "NEm + NEg", value: `${(req.nem_mcal_day + req.neg_mcal_day).toFixed(2)} Mcal/gün` },
    { label: "MP", value: `${req.mp_g_day} g/gün` },
    { label: "TDN", value: `${req.tdn_pct_dm}% KM` },
    { label: "Nişasta", value: `${req.starch_pct_dm_min}–${req.starch_pct_dm_max}% KM` },
    { label: "Ca / P", value: `${req.ca_g_day} / ${req.p_g_day} g` },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((i) => (
        <div key={i.label} className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <div className="text-xs text-green-600">{i.label}</div>
          <div className="font-semibold text-green-800 text-sm">{i.value}</div>
        </div>
      ))}
    </div>
  );
}

function IngredientRow({
  ing,
  mode,
  manualKg,
  lpConstraint,
  onManualChange,
  onLpChange,
}: {
  ing: Ingredient;
  mode: Mode;
  manualKg: number;
  lpConstraint: { min: number; max?: number };
  onManualChange: (kg: number) => void;
  onLpChange: (c: { min: number; max?: number }) => void;
}) {
  const inputCls =
    "border border-gray-300 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:border-green-500";
  return (
    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5">
      <span className="flex-1 text-sm font-medium text-gray-700">{ing.name_tr || ing.name}</span>
      <span className="text-xs text-gray-400 w-32 text-right">
        NEL: {ing.nel_mcal_kg ?? "—"} · HP: {ing.cp_pct ?? "—"}%
      </span>
      {mode === "manual" ? (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            step={0.1}
            value={manualKg || ""}
            onChange={(e) => onManualChange(Number(e.target.value))}
            placeholder="kg/gün"
            className={inputCls}
          />
          <span className="text-xs text-gray-500">kg/gün</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Min:</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={lpConstraint.min || ""}
              onChange={(e) => onLpChange({ ...lpConstraint, min: Number(e.target.value) })}
              placeholder="0"
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Max:</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={lpConstraint.max ?? ""}
              onChange={(e) =>
                onLpChange({
                  ...lpConstraint,
                  max: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder="∞"
              className={inputCls}
            />
          </div>
          <span className="text-xs text-gray-500">kg/gün</span>
        </div>
      )}
    </div>
  );
}

const backBtn =
  "px-4 py-2.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 text-gray-600";
const nextBtn = "bg-green-700 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-green-800";
