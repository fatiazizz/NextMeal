import { ShoppingListPage } from "@/components/shopping/ShoppingListPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function ShoppingPage() {
  return (
    <ProtectedRoute>
      <ShoppingListPage />
    </ProtectedRoute>
  );
}