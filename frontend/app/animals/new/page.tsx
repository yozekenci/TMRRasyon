"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { animalsApi } from "@/lib/api";
import { AnimalForm } from "@/components/AnimalForm";

export default function NewAnimalPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: animalsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["animals"] });
      router.push("/animals");
    },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Yeni Hayvan Profili</h1>
      <AnimalForm
        onSubmit={(data) => mutation.mutate(data as any)}
        isLoading={mutation.isPending}
        error={mutation.error?.message}
      />
    </div>
  );
}
