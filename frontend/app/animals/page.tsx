"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { animalsApi, AnimalProfile } from "@/lib/api";
import { Plus, Trash2, FlaskConical, ChevronRight, Beef, Users } from "lucide-react";

export default function AnimalsPage() {
  const qc = useQueryClient();
  const { data: animals, isLoading } = useQuery({
    queryKey: ["animals"],
    queryFn: animalsApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: animalsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["animals"] }),
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Hayvan Profilleri</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isLoading ? "…" : `${animals?.length ?? 0} profil kayıtlı`}
          </p>
        </div>
        <Link
          href="/animals/new"
          className="inline-flex items-center gap-2 bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Yeni Profil
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-44" />
          ))}
        </div>
      ) : animals && animals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {animals.map((a) => (
            <AnimalCard
              key={a.id}
              animal={a}
              onDelete={() => deleteMutation.mutate(a.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm mb-5 font-medium">Henüz hayvan profili eklenmedi.</p>
          <Link
            href="/animals/new"
            className="inline-flex items-center gap-2 bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            İlk profili oluştur
          </Link>
        </div>
      )}
    </div>
  );
}

function AnimalCard({
  animal,
  onDelete,
}: {
  animal: AnimalProfile;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all duration-200 flex flex-col gap-4">
      {/* Card header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-orange-100">
            <Beef className="w-5 h-5 text-orange-700" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-[15px] leading-tight">{animal.name}</p>
            <span className="inline-block text-[11px] font-medium mt-0.5 px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
              Besi Sığırı
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <dl className="grid grid-cols-2 gap-2">
        <StatRow label="Canlı Ağırlık" value={`${animal.live_weight_kg} kg`} />
        <StatRow label="Hedef AGK" value={`${animal.target_adg_kg ?? 1.2} kg/gün`} />
        {animal.herd_size && animal.herd_size > 1 && (
          <StatRow label="Sürü" value={`${animal.herd_size} baş`} />
        )}
      </dl>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-gray-100">
        <Link
          href={`/animals/${animal.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
        >
          İhtiyaçlar <ChevronRight className="w-3 h-3" />
        </Link>
        <Link
          href={`/rations/new?animal=${animal.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium py-2 bg-sky-50 text-sky-700 rounded-lg hover:bg-sky-100 transition-colors"
        >
          <FlaskConical className="w-3 h-3" /> Rasyon Yap
        </Link>
        <button
          onClick={onDelete}
          aria-label="Profili sil"
          className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <dt className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{label}</dt>
      <dd className="text-sm font-semibold text-gray-800 mt-0.5">{value}</dd>
    </div>
  );
}
