import ProfilePage from "@/components/profile/ProfilePage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function Page() {
  return (
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  );
}
