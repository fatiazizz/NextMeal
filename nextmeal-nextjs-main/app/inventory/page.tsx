import { InventoryPage } from "../../components/Inventory/InventoryPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <InventoryPage />
    </ProtectedRoute>
  );
}
