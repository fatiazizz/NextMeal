"use client";

import { useParams } from "next/navigation";
import { RecipePage } from "@/components/recipes/RecipePage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function RecipeRoutePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  if (!id) return null;

  return (
    <ProtectedRoute>
      <RecipePage id={id} />
    </ProtectedRoute>
  );
}
