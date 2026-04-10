"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { animalsApi } from "@/lib/api";

export default function AnimalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const animalId = Number(id);

  const { data: animal } = useQuery({
    queryKey: ["animals", animalId],
    queryFn: () => animalsApi.get(animalId),
  });

  const { data: req, isLoading: reqLoading } = useQuery({
    queryKey: ["requirements", animalId],
    queryFn: () => animalsApi.requirements(animalId),
    enabled: !!animal,
  });

  if (!animal) return <p className="text-gray-400">Yükleniyor...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/animals" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Hayvanlar
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">{animal.name}</h1>
        <span className="text-xs px-2 py-1 rounded font-medium bg-orange-100 text-orange-700">
          Besi Sığırı
        </span>
      </div>

      {/* Hayvan bilgileri */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3">Hayvan Bilgileri</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <Info label="Canlı Ağırlık" value={`${animal.live_weight_kg} kg`} />
          <Info label="Sürü Büyüklüğü" value={`${animal.herd_size ?? 1} baş`} />
          {animal.breed && <Info label="Irk" value={animal.breed} />}
          {animal.sex && <Info label="Cinsiyet" value={
            animal.sex === "steer" ? "Dana (Steer)" :
            animal.sex === "heifer" ? "Düve (Heifer)" : "Boğa (Bull)"
          } />}
          <Info label="Hedef AGK" value={`${animal.target_adg_kg ?? 1.2} kg/gün`} />
        </div>
      </div>

      {/* NRC 2016 ihtiyaçları */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3">
          NRC 2016 Günlük Besin İhtiyaçları
        </h2>
        {reqLoading ? (
          <p className="text-gray-400 text-sm">Hesaplanıyor...</p>
        ) : req ? (
          <>
            {/* Enerji kartları */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <ReqCard label="KM Alımı" value={`${req.dmi_kg_day} kg`} color="gray" />
              <ReqCard label="NEm" value={`${req.nem_mcal_day} Mcal`} color="green" />
              <ReqCard label="NEg" value={`${req.neg_mcal_day} Mcal`} color="green" />
              <ReqCard label="MP" value={`${req.mp_g_day} g`} color="blue" />
            </div>

            {/* Diyet yoğunluğu */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <ReqCard label="TDN" value={`${req.tdn_pct_dm}% KM`} color="green" />
              <ReqCard
                label="Nişasta (öneri)"
                value={`${req.starch_pct_dm_min}–${req.starch_pct_dm_max}% KM`}
                color="gray"
              />
              <ReqCard label="NDF min." value={`≥${req.ndf_pct_dm_min}% KM`} color="gray" />
            </div>

            {/* Mineral tablosu */}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs uppercase tracking-wide">
                  <th className="pb-2 font-medium">Besin</th>
                  <th className="pb-2 font-medium text-right">g/gün</th>
                  <th className="pb-2 font-medium text-right">% KM</th>
                  <th className="pb-2 font-medium pl-4">Besin</th>
                  <th className="pb-2 font-medium text-right">g/gün</th>
                  <th className="pb-2 font-medium text-right">% KM</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 divide-y divide-gray-50">
                <MineralRow a="Ca" ag={req.ca_g_day} b="Mg" bg={req.mg_g_day} dmi={req.dmi_kg_day} />
                <MineralRow a="P"  ag={req.p_g_day}  b="K"  bg={req.k_g_day}  dmi={req.dmi_kg_day} />
                <MineralRow a="Na" ag={req.na_g_day} b="S"  bg={req.s_g_day}  dmi={req.dmi_kg_day} />
                <tr>
                  <td className="py-1.5">RDP</td>
                  <td className="text-right tabular-nums">{req.rdp_g_day}</td>
                  <td className="text-right tabular-nums text-gray-400">{pctDm(req.rdp_g_day, req.dmi_kg_day)}%</td>
                  <td className="py-1.5 pl-4">RUP</td>
                  <td className="text-right tabular-nums">{req.rup_g_day}</td>
                  <td className="text-right tabular-nums text-gray-400">{pctDm(req.rup_g_day, req.dmi_kg_day)}%</td>
                </tr>
                <tr>
                  <td className="py-1.5">Vit A</td>
                  <td className="text-right tabular-nums text-xs">{req.vit_a_iu_day.toLocaleString()} IU</td>
                  <td className="text-right tabular-nums text-gray-400 text-xs">{(req.vit_a_iu_day / req.dmi_kg_day / 1000).toFixed(0)} kIU/kg</td>
                  <td className="py-1.5 pl-4">Vit D</td>
                  <td className="text-right tabular-nums text-xs">{req.vit_d_iu_day.toLocaleString()} IU</td>
                  <td className="text-right tabular-nums text-gray-400 text-xs">{(req.vit_d_iu_day / req.dmi_kg_day / 1000).toFixed(0)} kIU/kg</td>
                </tr>
              </tbody>
            </table>

            {req.notes.length > 0 && (
              <div className="mt-3 space-y-1">
                {req.notes.map((n, i) => (
                  <p key={i} className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded">
                    ⚠️ {n}
                  </p>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>

      <Link
        href={`/rations/new?animal=${animalId}`}
        className="inline-block bg-green-700 text-white px-6 py-2.5 rounded-lg hover:bg-green-800"
      >
        Bu Hayvan İçin Rasyon Oluştur →
      </Link>
    </div>
  );
}

function pctDm(g_day: number, dmi_kg: number) {
  if (!dmi_kg) return "—";
  return ((g_day / (dmi_kg * 1000)) * 100).toFixed(2);
}

function MineralRow({
  a, ag, b, bg, dmi,
}: { a: string; ag: number; b: string; bg: number; dmi: number }) {
  return (
    <tr>
      <td className="py-1.5">{a}</td>
      <td className="text-right tabular-nums">{ag}</td>
      <td className="text-right tabular-nums text-gray-400">{pctDm(ag, dmi)}%</td>
      <td className="py-1.5 pl-4">{b}</td>
      <td className="text-right tabular-nums">{bg}</td>
      <td className="text-right tabular-nums text-gray-400">{pctDm(bg, dmi)}%</td>
    </tr>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold text-gray-800">{value}</div>
    </div>
  );
}

function ReqCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "green" | "blue" | "gray";
}) {
  const cls = {
    green: "border-green-200 bg-green-50 text-green-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    gray: "border-gray-200 bg-gray-50 text-gray-800",
  }[color];
  return (
    <div className={`border rounded-lg px-3 py-3 ${cls}`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="font-bold text-lg">{value}</div>
    </div>
  );
}
