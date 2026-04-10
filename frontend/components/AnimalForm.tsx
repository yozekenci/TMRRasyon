"use client";

import { useState } from "react";

interface AnimalFormData {
  name: string;
  species: "beef";
  breed?: string;
  sex?: string;
  live_weight_kg: number;
  target_adg_kg?: number;
  herd_size?: number;
}

interface Props {
  initial?: Partial<AnimalFormData>;
  onSubmit: (data: AnimalFormData) => void;
  isLoading?: boolean;
  error?: string;
}

export function AnimalForm({ initial, onSubmit, isLoading, error }: Props) {
  const [form, setForm] = useState<Partial<AnimalFormData>>({
    species: "beef",
    target_adg_kg: 1.2,
    herd_size: 1,
    ...initial,
  });

  const set = (k: keyof AnimalFormData, v: unknown) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...form, species: "beef" } as AnimalFormData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      {error && (
        <p className="text-red-600 bg-red-50 px-3 py-2 rounded text-sm">{error}</p>
      )}

      {/* Temel bilgiler */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Profil Adı" required>
          <input
            type="text"
            required
            placeholder="örn. Besi Grubu A"
            value={form.name ?? ""}
            onChange={(e) => set("name", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Canlı Ağırlık (kg)" required>
          <input
            type="number"
            required
            min={100}
            max={1000}
            step={1}
            value={form.live_weight_kg ?? ""}
            onChange={(e) => set("live_weight_kg", Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="Irk">
          <input
            type="text"
            placeholder="örn. Simental"
            value={form.breed ?? ""}
            onChange={(e) => set("breed", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Cinsiyet">
          <select
            value={form.sex ?? "steer"}
            onChange={(e) => set("sex", e.target.value)}
            className={inputCls}
          >
            <option value="steer">Dana (Steer)</option>
            <option value="heifer">Düve (Heifer)</option>
            <option value="bull">Boğa (Bull)</option>
          </select>
        </Field>
      </div>

      {/* Besi parametreleri */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">
          Besi Parametreleri
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Günlük Kazanım Hedefi (kg)">
            <input
              type="number"
              min={0.5}
              max={3}
              step={0.1}
              value={form.target_adg_kg ?? 1.2}
              onChange={(e) => set("target_adg_kg", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* Sürü büyüklüğü */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-1">Sürü Yönetimi</h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sürü Büyüklüğü (baş)">
            <input
              type="number"
              min={1}
              max={10000}
              step={1}
              value={form.herd_size ?? 1}
              onChange={(e) => set("herd_size", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Karma talimatı ve IOFC hesabı bu sayıya göre yapılır.</p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-700 text-white py-2.5 rounded-lg font-medium hover:bg-green-800 disabled:opacity-50"
      >
        {isLoading ? "Kaydediliyor..." : "Profili Kaydet"}
      </button>
    </form>
  );
}

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
