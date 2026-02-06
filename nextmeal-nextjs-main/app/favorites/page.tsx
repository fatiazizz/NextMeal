import { FavoritesPage } from "@/components/favorites/FavoritesPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function FavoritesRoutePage() {
  return (
    <ProtectedRoute>
      <FavoritesPage />
    </ProtectedRoute>
  );
}
