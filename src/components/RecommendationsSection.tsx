import type { User } from 'firebase/auth';
import { Minus, Plus } from 'lucide-react';
import { FOOD_CATEGORIES } from '../data/menu';
import type {
  DietaryMode,
  FoodCategory,
  MenuItem,
  RecommendedDish,
  TasteProfile,
} from '../types';
import { GoogleIcon } from './GoogleIcon';

interface RecommendationsSectionProps {
  user: User | null;
  authReady: boolean;
  isSigningIn: boolean;
  onGoogleSignIn: () => void;
  tasteProfile: TasteProfile;
  onUpdateTasteProfile: (next: TasteProfile) => void;
  recommendations: RecommendedDish[];
  cartQuantityMap: Map<string, number>;
  onAdd: (item: MenuItem) => void;
  onIncrement: (itemId: string) => void;
  onDecrement: (itemId: string) => void;
}

const CUISINE_CATEGORIES = FOOD_CATEGORIES.filter(
  (c): c is Exclude<FoodCategory, 'All'> => c !== 'All'
);

export function RecommendationsSection({
  user,
  authReady,
  isSigningIn,
  onGoogleSignIn,
  tasteProfile,
  onUpdateTasteProfile,
  recommendations,
  cartQuantityMap,
  onAdd,
  onIncrement,
  onDecrement,
}: RecommendationsSectionProps) {
  const firstName = user?.displayName?.split(' ')[0] || 'You';

  const handleToggleCategory = (cat: Exclude<FoodCategory, 'All'>) => {
    const exists = tasteProfile.favoriteCategories.includes(cat);
    const nextCategories = exists
      ? tasteProfile.favoriteCategories.filter((c) => c !== cat)
      : [...tasteProfile.favoriteCategories, cat];
    onUpdateTasteProfile({
      ...tasteProfile,
      favoriteCategories: nextCategories,
    });
  };

  const handleDietaryChange = (mode: DietaryMode) => {
    onUpdateTasteProfile({
      ...tasteProfile,
      dietaryMode: mode,
    });
  };

  return (
    <section
      aria-label="Personalized recommendations"
      className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-zinc-900">
            {user ? `Recommended for ${firstName}` : 'Recommended Picks'}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {user
              ? 'Tailored from your saved taste preferences, past orders, and cart pairings.'
              : 'Sign in with Google to save your dietary preferences and personalize recommendations.'}
          </p>
        </div>

        {/* Google Login CTA when signed out, or saved Taste Preference toggles when signed in */}
        {authReady && !user && (
          <button
            type="button"
            onClick={onGoogleSignIn}
            disabled={isSigningIn}
            className="self-start lg:self-auto min-h-[42px] px-4 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 active:scale-[0.99] text-sm font-semibold text-zinc-800 inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 transition-all cursor-pointer disabled:opacity-60"
          >
            <GoogleIcon className="w-4 h-4 shrink-0" />
            <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>
        )}

        {user && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Dietary preference segmented toggle */}
            <div
              className="inline-flex items-center p-1 rounded-xl bg-zinc-100"
              role="group"
              aria-label="Dietary preference"
            >
              <button
                type="button"
                onClick={() => handleDietaryChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  tasteProfile.dietaryMode === 'all'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                All Dishes
              </button>
              <button
                type="button"
                onClick={() => handleDietaryChange('veg')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  tasteProfile.dietaryMode === 'veg'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Pure Veg
              </button>
            </div>

            {/* Cuisine taste selectors */}
            {CUISINE_CATEGORIES.map((category) => {
              const selected = tasteProfile.favoriteCategories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleToggleCategory(category)}
                  aria-pressed={selected}
                  className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                    selected
                      ? 'border-orange-500 bg-orange-50 text-orange-800'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4 Recommended Dish Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {recommendations.map(({ item, reason }) => {
          const quantity = cartQuantityMap.get(item.id) ?? 0;

          return (
            <div
              key={item.id}
              className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-3 flex items-center gap-3"
            >
              <img
                src={item.image}
                alt={item.name}
                referrerPolicy="no-referrer"
                className={`w-16 h-16 rounded-xl object-cover bg-zinc-100 shrink-0 ${
                  item.imageClassName ?? 'object-center'
                }`}
              />

              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-orange-700 truncate">
                  {reason}
                </p>
                <h3 className="text-sm font-semibold text-zinc-900 truncate">
                  {item.name}
                </h3>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-zinc-900 tabular-nums">
                    ₹{item.price}
                  </span>

                  {quantity === 0 ? (
                    <button
                      type="button"
                      onClick={() => onAdd(item)}
                      className="min-h-[32px] px-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                    >
                      + Add
                    </button>
                  ) : (
                    <div className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-50 overflow-hidden shrink-0">
                      <button
                        type="button"
                        onClick={() => onDecrement(item.id)}
                        aria-label={`Decrease ${item.name}`}
                        className="w-7 h-7 flex items-center justify-center text-orange-700 hover:bg-orange-100 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-1.5 text-xs font-bold text-orange-900 tabular-nums">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onIncrement(item.id)}
                        aria-label={`Increase ${item.name}`}
                        className="w-7 h-7 flex items-center justify-center text-orange-700 hover:bg-orange-100 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
