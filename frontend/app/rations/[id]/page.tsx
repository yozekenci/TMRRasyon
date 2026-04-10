"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rationsApi, animalsApi, MixingList, ShadowPriceItem } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileDown,
  Sheet,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Pencil,
  X,
  Save,
  Users,
  DollarSign,
  TrendingDown,
  Zap,
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function RationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const rationId = Number(id);
  const router = useRouter();
  const qc = useQueryClient();

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editAmounts, setEditAmounts] = useState<Map<number, number>>(new Map());

  // Mixing list state
  const [herdSize, setHerdSize] = useState(1);
  const [showMixing, setShowMixing] = useState(false);

  // IOFC state
  const [meatPrice, setMeatPrice] = useState(280.0);  // TL/kg canlı ağırlık kazanımı

  const { data: ration, isLoading } = useQuery({
    queryKey: ["rations", rationId],
    queryFn: () => rationsApi.get(rationId),
  });

  const { data: requirements } = useQuery({
    queryKey: ["requirements", ration?.animal_profile_id],
    queryFn: () => animalsApi.requirements(ration!.animal_profile_id),
    enabled: !!ration,
  });

  const { data: animal } = useQuery({
    queryKey: ["animals", ration?.animal_profile_id],
    queryFn: () => animalsApi.get(ration!.animal_profile_id),
    enabled: !!ration,
  });

  const { data: mixingList } = useQuery<MixingList>({
    queryKey: ["mixing-list", rationId, herdSize],
    queryFn: () => rationsApi.mixingList(rationId, herdSize),
    enabled: showMixing,
  });

  const { data: shadowPrices } = useQuery<ShadowPriceItem[]>({
    queryKey: ["shadow-prices", rationId],
    queryFn: () => rationsApi.shadowPrices(rationId),
    enabled: ration?.optimization_mode === "lp",
  });

  const deleteMutation = useMutation({
    mutationFn: rationsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rations"] });
      router.push("/rations");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof rationsApi.update>[1] }) =>
      rationsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rations", rationId] });
      setEditMode(false);
    },
  });

  const startEdit = () => {
    if (!ration) return;
    const map = new Map<number, number>();
    ration.items.forEach((item) => map.set(item.ingredient_id, item.fresh_weight_kg));
    setEditAmounts(map);
    setEditMode(true);
  };

  const saveEdit = () => {
    if (!ration) return;
    updateMutation.mutate({
      id: rationId,
      data: {
        name: ration.name,
        animal_profile_id: ration.animal_profile_id,
        notes: ration.notes,
        items: ration.items.map((item) => ({
          ingredient_id: item.ingredient_id,
          fresh_weight_kg: editAmounts.get(item.ingredient_id) ?? item.fresh_weight_kg,
        })),
      },
    });
  };

  if (isLoading)
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-white rounded-xl border border-gray-200 animate-pulse" />
        ))}
      </div>
    );

  if (!ration)
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Rasyon bulunamadı.</p>
        <Link href="/rations" className="text-green-700 text-sm hover:underline mt-2 inline-block">
          Geri dön
        </Link>
      </div>
    );

  const totals = ration.items.reduce(
    (acc, item) => ({
      nel: acc.nel + (item.nel_mcal ?? 0),
      cp: acc.cp + (item.cp_g ?? 0),
      ca: acc.ca + (item.ca_g ?? 0),
      p: acc.p + (item.p_g ?? 0),
    }),
    { nel: 0, cp: 0, ca: 0, p: 0 }
  );

  // Cost breakdown data for chart
  const costData = ration.items
    .filter((i) => i.cost_tl && i.cost_tl > 0)
    .sort((a, b) => (b.cost_tl ?? 0) - (a.cost_tl ?? 0))
    .map((i) => ({
      name: i.ingredient_name_tr || i.ingredient_name,
      cost: i.cost_tl ?? 0,
    }));

  const defaultHerd = animal?.herd_size ?? 1;

  // ── IOFC calculations ──────────────────────────────────────────────
  const feedCostDay = ration.total_cost_tl ?? 0;
  const adg = animal?.target_adg_kg ?? 0;
  const incomeDay = adg * meatPrice;
  const iofcDay = incomeDay - feedCostDay;
  const iofcMonth = iofcDay * 30;
  const iofcHerdMonth = iofcMonth * defaultHerd;
  const breakEvenBeef = meatPrice > 0 ? feedCostDay / meatPrice : 0;

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb + title */}
      <div className="flex items-center gap-3 mb-7">
        <Link
          href="/rations"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Rasyonlar
        </Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">{ration.name}</h1>
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
            ration.optimization_mode === "lp"
              ? "bg-sky-100 text-sky-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {ration.optimization_mode === "lp" ? "LP Otomatik" : "Manuel"}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard label="Taze Ağırlık" value={`${ration.total_fresh_kg?.toFixed(2)} kg`} />
        <SummaryCard label="Kuru Madde" value={`${ration.total_dm_kg?.toFixed(2)} kg`} />
        <SummaryCard label="Günlük Maliyet" value={`${ration.total_cost_tl?.toFixed(2)} ₺`} accent />
        <SummaryCard label="Hammadde Sayısı" value={`${ration.items.length} kalem`} />
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 mb-5">
        <a
          href={rationsApi.pdfUrl(rationId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
        >
          <FileDown className="w-4 h-4" /> PDF İndir
        </a>
        <a
          href={rationsApi.excelUrl(rationId)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
        >
          <Sheet className="w-4 h-4" /> Excel İndir
        </a>
        {!editMode ? (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Pencil className="w-4 h-4" /> Düzenle
          </button>
        ) : (
          <>
            <button
              onClick={saveEdit}
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <X className="w-4 h-4" /> İptal
            </button>
          </>
        )}
        <button
          onClick={() => deleteMutation.mutate(rationId)}
          disabled={deleteMutation.isPending}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          {deleteMutation.isPending ? "Siliniyor…" : "Rasyonu Sil"}
        </button>
      </div>

      {/* Ingredient table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700 text-sm">Rasyon Bileşimi</h2>
          {editMode && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              Düzenleme modu — taze ağırlıkları değiştirin
            </span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Hammadde", "Taze kg", "KM kg", "NEL Mcal", "HP g", "Ca g", "P g", "Maliyet ₺"].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide ${
                    i === 0 ? "text-left" : "text-right"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ration.items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-4 py-2.5 font-medium text-gray-800">
                  {item.ingredient_name_tr || item.ingredient_name}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                  {editMode ? (
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={editAmounts.get(item.ingredient_id) ?? item.fresh_weight_kg}
                      onChange={(e) =>
                        setEditAmounts((prev) =>
                          new Map(prev).set(item.ingredient_id, Number(e.target.value))
                        )
                      }
                      className="w-20 text-right border border-green-400 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  ) : (
                    item.fresh_weight_kg.toFixed(2)
                  )}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">{item.dm_weight_kg?.toFixed(3) ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">{item.nel_mcal?.toFixed(2) ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">{item.cp_g?.toFixed(0) ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">{item.ca_g?.toFixed(1) ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">{item.p_g?.toFixed(1) ?? "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{item.cost_tl?.toFixed(2) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-50 border-t-2 border-green-200">
              <td className="px-4 py-3 font-bold text-green-800 text-sm">TOPLAM</td>
              <td className="px-4 py-3 text-right font-semibold text-green-800 tabular-nums">{ration.total_fresh_kg?.toFixed(2)}</td>
              <td className="px-4 py-3 text-right font-semibold text-green-800 tabular-nums">{ration.total_dm_kg?.toFixed(3)}</td>
              <td className="px-4 py-3 text-right font-semibold text-green-800 tabular-nums">{totals.nel.toFixed(2)}</td>
              <td className="px-4 py-3 text-right font-semibold text-green-800 tabular-nums">{totals.cp.toFixed(0)}</td>
              <td className="px-4 py-3 text-right font-semibold text-green-800 tabular-nums">{totals.ca.toFixed(1)}</td>
              <td className="px-4 py-3 text-right font-semibold text-green-800 tabular-nums">{totals.p.toFixed(1)}</td>
              <td className="px-4 py-3 text-right font-bold text-green-800 tabular-nums">
                {ration.total_cost_tl?.toFixed(2)} ₺
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Cost breakdown chart */}
      {costData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700 text-sm">Maliyet Dağılımı</h2>
          </div>
          <div className="px-5 py-4">
            <ResponsiveContainer width="100%" height={Math.max(120, costData.length * 36)}>
              <BarChart
                data={costData}
                layout="vertical"
                margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v} ₺`} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <Tooltip formatter={(v: number) => [`${v.toFixed(2)} ₺`, "Maliyet"]} />
                <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                  {costData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#15803d" : "#86efac"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* NRC comparison */}
      {requirements && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-700 text-sm">NRC 2023 Karşılaştırması</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <NrcRow label="NEL (Mcal/gün)" actual={totals.nel} target={requirements.nel_mcal_day} />
            <NrcRow label="HP / MP (g/gün)" actual={totals.cp} target={requirements.mp_g_day} />
            <NrcRow label="Ca (g/gün)" actual={totals.ca} target={requirements.ca_g_day} />
            <NrcRow label="P (g/gün)" actual={totals.p} target={requirements.p_g_day} />
          </div>
        </div>
      )}

      {/* IOFC — Income Over Feed Cost */}
      {animal && (
        <div
          className={`rounded-xl border overflow-hidden mb-5 ${
            iofcDay >= 0
              ? "bg-emerald-50 border-emerald-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
            <div className="flex items-center gap-2">
              <DollarSign
                className={`w-4 h-4 ${iofcDay >= 0 ? "text-emerald-600" : "text-red-500"}`}
              />
              <h2 className="font-semibold text-sm text-gray-800">
                IOFC — Yem Maliyeti Üzeri Gelir
              </h2>
            </div>
            {/* Price input */}
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-xs">Canlı ağırlık fiyatı</span>
              <input
                type="number"
                min={0}
                step={5}
                value={meatPrice}
                onChange={(e) => setMeatPrice(Number(e.target.value))}
                className="w-24 text-right border border-gray-300 bg-white rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-gray-500">₺/kg</span>
            </label>
          </div>

          {/* Main metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-black/5 px-0">
            <IofcCard
              label="Et Geliri / gün"
              value={`${incomeDay.toFixed(2)} ₺`}
              sub={`${adg} kg × ${meatPrice} ₺`}
              neutral
            />
            <IofcCard
              label="Yem Maliyeti / gün"
              value={`${feedCostDay.toFixed(2)} ₺`}
              sub={`${ration.total_fresh_kg?.toFixed(1)} kg taze`}
              negative
            />
            <IofcCard
              label="IOFC / gün / baş"
              value={`${iofcDay >= 0 ? "+" : ""}${iofcDay.toFixed(2)} ₺`}
              sub="Gelir − Yem Maliyeti"
              positive={iofcDay >= 0}
              highlight
            />
            <IofcCard
              label={`IOFC / ay / sürü (${defaultHerd} baş)`}
              value={`${iofcHerdMonth >= 0 ? "+" : ""}${iofcHerdMonth.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`}
              sub={`${iofcMonth >= 0 ? "+" : ""}${iofcMonth.toFixed(0)} ₺/baş/ay`}
              positive={iofcHerdMonth >= 0}
              highlight
            />
          </div>

          {/* Break-even line */}
          <div className="px-5 py-3 border-t border-black/5 flex items-center gap-2 text-sm">
            <TrendingDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-gray-500 text-xs">
              Başa baş noktası: <strong className="text-gray-700">{breakEvenBeef.toFixed(3)} kg/gün</strong> canlı ağırlık kazanımı — mevcut kazanımın{" "}
              <strong className={adg >= breakEvenBeef ? "text-emerald-700" : "text-red-600"}>
                {adg > 0 ? ((adg / breakEvenBeef) * 100).toFixed(0) : "—"}%
              </strong>'i
            </span>
          </div>
        </div>
      )}

      {/* Gölge Fiyatları — sadece LP rasyonlar */}
      {shadowPrices && shadowPrices.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-5">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-gray-700 text-sm">Gölge Fiyatları</h2>
            <span className="ml-auto text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              LP Analizi
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 text-left">Kısıt</th>
                <th className="px-4 py-3 text-right">Gölge Fiyat</th>
                <th className="px-4 py-3 text-left">Açıklama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shadowPrices.map((sp, i) => (
                <tr key={i} className="hover:bg-gray-50/80">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{sp.kisit}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    <span
                      className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                        sp.yön === "tasarruf"
                          ? "text-emerald-700 bg-emerald-50"
                          : "text-orange-600 bg-orange-50"
                      }`}
                    >
                      {sp.golge_fiyat.toFixed(4)} ₺
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{sp.aciklama}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-[11px] text-gray-400 border-t border-gray-50">
            Gölge fiyat: ilgili kısıtı 1 birim gevşetmenin günlük toplam maliyete etkisi (₺)
          </p>
        </div>
      )}

      {/* Sürü karma listesi */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
          onClick={() => {
            if (!showMixing) {
              setHerdSize(defaultHerd);
              setShowMixing(true);
            } else {
              setShowMixing(false);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-700 text-sm">Sürü Karma Listesi</h2>
          </div>
          <span className="text-xs text-gray-400">{showMixing ? "Gizle ▲" : "Göster ▼"}</span>
        </button>

        {showMixing && (
          <div className="px-5 py-4">
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm text-gray-600">Sürü büyüklüğü:</label>
              <input
                type="number"
                min={1}
                max={10000}
                step={1}
                value={herdSize}
                onChange={(e) => setHerdSize(Number(e.target.value))}
                className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-green-500"
              />
              <span className="text-sm text-gray-500">baş</span>
              {animal?.herd_size && animal.herd_size !== herdSize && (
                <button
                  onClick={() => setHerdSize(animal.herd_size!)}
                  className="text-xs text-green-700 hover:underline"
                >
                  Profil değeri kullan ({animal.herd_size} baş)
                </button>
              )}
            </div>

            {mixingList && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg px-4 py-3">
                    <div className="text-xs text-gray-500">Günlük toplam</div>
                    <div className="font-bold text-gray-800 text-lg tabular-nums">
                      {mixingList.toplam_gunluk_kg.toFixed(1)} kg
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-4 py-3">
                    <div className="text-xs text-gray-500">Haftalık toplam</div>
                    <div className="font-bold text-gray-800 text-lg tabular-nums">
                      {mixingList.toplam_haftalik_kg.toFixed(1)} kg
                    </div>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Hammadde</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Baş/gün kg</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Sürü/gün kg</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Sürü/hafta kg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {mixingList.bilesenler.map((b, i) => (
                      <tr key={i} className="hover:bg-gray-50/80">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{b.hammadde}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{b.hayvan_basi_kg.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{b.gunluk_kg.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium text-gray-800">{b.haftalik_kg.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function SummaryCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-4 ${
        accent ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
      }`}
    >
      <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className={`font-bold text-xl mt-1 tabular-nums ${accent ? "text-green-700" : "text-gray-800"}`}>
        {value}
      </dd>
    </div>
  );
}

function IofcCard({
  label,
  value,
  sub,
  positive,
  negative,
  neutral,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  negative?: boolean;
  neutral?: boolean;
  highlight?: boolean;
}) {
  const valueColor =
    highlight && positive
      ? "text-emerald-700"
      : highlight && !positive
      ? "text-red-600"
      : negative
      ? "text-gray-700"
      : "text-gray-800";

  return (
    <div className={`px-5 py-4 ${highlight ? "bg-black/[0.03]" : ""}`}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1">{label}</dt>
      <dd className={`font-bold text-2xl tabular-nums ${valueColor}`}>{value}</dd>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function NrcRow({
  label,
  actual,
  target,
}: {
  label: string;
  actual: number;
  target: number;
}) {
  const ratio = target > 0 ? actual / target : 1;
  const pct = Math.min(Math.round(ratio * 100), 130);

  type Status = { label: string; cls: string; barCls: string; Icon: React.ComponentType<{ className?: string }> };
  let status: Status;
  if (ratio < 0.9) status = { label: "Eksik", cls: "text-red-600 bg-red-50", barCls: "bg-red-400", Icon: AlertCircle };
  else if (ratio < 1.0) status = { label: "Sınırda", cls: "text-amber-600 bg-amber-50", barCls: "bg-amber-400", Icon: AlertTriangle };
  else if (ratio <= 1.2) status = { label: "Yeterli", cls: "text-green-600 bg-green-50", barCls: "bg-green-500", Icon: CheckCircle2 };
  else status = { label: "Fazla", cls: "text-orange-600 bg-orange-50", barCls: "bg-orange-400", Icon: AlertTriangle };

  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-sm text-gray-600 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${status.barCls}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-28 text-right text-xs text-gray-500 tabular-nums flex-shrink-0">
        {actual.toFixed(1)} / {target.toFixed(1)}
      </span>
      <span
        className={`w-20 inline-flex items-center justify-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md flex-shrink-0 ${status.cls}`}
      >
        <status.Icon className="w-3 h-3" />
        {status.label}
      </span>
    </div>
  );
}
