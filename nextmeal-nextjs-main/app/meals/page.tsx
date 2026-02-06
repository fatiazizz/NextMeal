import { MealSuggestionsPage } from "../../components/meals/MealSuggestionPage";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function MealsPage() {
  return (
    <ProtectedRoute>
      <MealSuggestionsPage />
    </ProtectedRoute>
  );
}
