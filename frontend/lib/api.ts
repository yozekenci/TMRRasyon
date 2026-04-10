import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// ─── Tipler ──────────────────────────────────────────────────────────────────

export interface Ingredient {
  id: number;
  name: string;
  name_tr?: string;
  category: string;
  source: string;
  is_active: boolean;
  dm_pct?: number;
  nel_mcal_kg?: number;
  nem_mcal_kg?: number;
  neg_mcal_kg?: number;
  cp_pct?: number;
  rup_pct?: number;
  rdp_pct?: number;
  ndf_pct?: number;
  adf_pct?: number;
  nfc_pct?: number;
  ca_pct?: number;
  p_pct?: number;
  mg_pct?: number;
  k_pct?: number;
  na_pct?: number;
  cl_pct?: number;
  s_pct?: number;
  vit_a_iu_kg?: number;
  vit_d_iu_kg?: number;
  vit_e_iu_kg?: number;
  price_per_kg_tl?: number;
  notes?: string;
}

export interface AnimalProfile {
  id: number;
  name: string;
  species: "beef";
  breed?: string;
  sex?: string;
  live_weight_kg: number;
  target_adg_kg?: number;
  herd_size?: number;
}

export interface NutrientRequirements {
  nel_mcal_day: number;
  nem_mcal_day: number;
  neg_mcal_day: number;
  mp_g_day: number;
  rdp_g_day: number;
  rup_g_day: number;
  dmi_kg_day: number;
  ca_g_day: number;
  p_g_day: number;
  mg_g_day: number;
  k_g_day: number;
  na_g_day: number;
  cl_g_day: number;
  s_g_day: number;
  vit_a_iu_day: number;
  vit_d_iu_day: number;
  vit_e_iu_day: number;
  tdn_pct_dm: number;
  starch_pct_dm_min: number;
  starch_pct_dm_max: number;
  ndf_pct_dm_min: number;
  notes: string[];
}

export interface RationItem {
  id: number;
  ingredient_id: number;
  ingredient_name: string;
  ingredient_name_tr?: string;
  fresh_weight_kg: number;
  dm_weight_kg?: number;
  nel_mcal?: number;
  cp_g?: number;
  ca_g?: number;
  p_g?: number;
  cost_tl?: number;
}

export interface Ration {
  id: number;
  name: string;
  animal_profile_id: number;
  optimization_mode: string;
  total_dm_kg?: number;
  total_fresh_kg?: number;
  total_cost_tl?: number;
  notes?: string;
  items: RationItem[];
}

export interface RationSummary {
  id: number;
  name: string;
  animal_profile_id: number;
  animal_name: string;
  optimization_mode: string;
  total_dm_kg?: number;
  total_cost_tl?: number;
}

// ─── API Fonksiyonları ────────────────────────────────────────────────────────

export const ingredientsApi = {
  list: (params?: { category?: string; search?: string }) =>
    api.get<Ingredient[]>("/api/ingredients/", { params }).then((r) => r.data),
  get: (id: number) =>
    api.get<Ingredient>(`/api/ingredients/${id}`).then((r) => r.data),
  create: (data: Omit<Ingredient, "id" | "source" | "is_active">) =>
    api.post<Ingredient>("/api/ingredients/", data).then((r) => r.data),
  update: (id: number, data: Partial<Ingredient>) =>
    api.put<Ingredient>(`/api/ingredients/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/api/ingredients/${id}`),
};

export const animalsApi = {
  list: () => api.get<AnimalProfile[]>("/api/animals/").then((r) => r.data),
  get: (id: number) =>
    api.get<AnimalProfile>(`/api/animals/${id}`).then((r) => r.data),
  create: (data: Omit<AnimalProfile, "id">) =>
    api.post<AnimalProfile>("/api/animals/", data).then((r) => r.data),
  update: (id: number, data: Partial<AnimalProfile>) =>
    api.put<AnimalProfile>(`/api/animals/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/api/animals/${id}`),
  requirements: (id: number) =>
    api.get<NutrientRequirements>(`/api/animals/${id}/requirements`).then((r) => r.data),
};

export const rationsApi = {
  list: () => api.get<RationSummary[]>("/api/rations/").then((r) => r.data),
  get: (id: number) =>
    api.get<Ration>(`/api/rations/${id}`).then((r) => r.data),
  create: (data: { name: string; animal_profile_id: number; items: { ingredient_id: number; fresh_weight_kg: number }[]; notes?: string }) =>
    api.post<Ration>("/api/rations/", data).then((r) => r.data),
  optimize: (data: {
    name: string;
    animal_profile_id: number;
    ingredient_constraints: { ingredient_id: number; min_kg: number; max_kg?: number }[];
    notes?: string;
  }) => api.post<Ration>("/api/rations/optimize", data).then((r) => r.data),
  update: (id: number, data: { name: string; animal_profile_id: number; items: { ingredient_id: number; fresh_weight_kg: number }[]; notes?: string }) =>
    api.put<Ration>(`/api/rations/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/api/rations/${id}`),
  pdfUrl: (id: number) => `${API_BASE}/api/rations/${id}/pdf`,
  excelUrl: (id: number) => `${API_BASE}/api/rations/${id}/excel`,
  mixingList: (id: number, herdSize = 1) =>
    api.get<MixingList>(`/api/rations/${id}/mixing-list`, { params: { herd_size: herdSize } }).then((r) => r.data),
  shadowPrices: (id: number) =>
    api.get<ShadowPriceItem[]>(`/api/rations/${id}/shadow-prices`).then((r) => r.data),
};

export interface ShadowPriceItem {
  kisit: string;
  golge_fiyat: number;
  yön: "tasarruf" | "maliyet";
  aciklama: string;
}

export interface MixingListItem {
  hammadde: string;
  hayvan_basi_kg: number;
  gunluk_kg: number;
  haftalik_kg: number;
}

export interface MixingList {
  rasyon_adi: string;
  hayvan_sayisi: number;
  toplam_gunluk_kg: number;
  toplam_haftalik_kg: number;
  bilesenler: MixingListItem[];
}
