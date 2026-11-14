import { MENU_ITEMS } from '../data/menu';
import type {
  ActiveOrder,
  CartItem,
  FoodCategory,
  MenuItem,
  RecommendedDish,
  TasteProfile,
} from '../types';

const PAIRING_MAP: Record<string, { targetId: string; reason: string }[]> = {
  'paneer-butter-masala': [
    { targetId: 'garlic-naan', reason: 'Classic pairing with Paneer Butter Masala' },
    { targetId: 'butter-naan', reason: 'Soft butter naan for rich curries' },
    { targetId: 'jeera-rice', reason: 'Fragrant cumin rice pairs with curry' },
  ],
  'dal-makhani': [
    { targetId: 'butter-naan', reason: 'Ideal match for creamy Dal Makhani' },
    { targetId: 'jeera-rice', reason: 'Comfort pairing with slow-cooked dal' },
    { targetId: 'tandoori-roti', reason: 'Crisp whole-wheat pairing for dal' },
  ],
  'margherita-pizza': [
    { targetId: 'cold-coffee', reason: 'Chilled drink for pizza night' },
  ],
  'farmhouse-veg-pizza': [
    { targetId: 'cold-coffee', reason: 'Refreshing pairing with wood-fired pizza' },
  ],
  'spicy-paneer-pizza': [
    { targetId: 'cold-coffee', reason: 'Cools down spicy paneer toppings' },
  ],
  'veg-hyderabadi-biryani': [
    { targetId: 'gulab-jamun', reason: 'Sweet finish after Hyderabadi Biryani' },
  ],
  'chole-bhature': [
    { targetId: 'cold-coffee', reason: 'Chilled beverage with hearty Chole Bhature' },
  ],
};

export function computeRecommendations({
  isSignedIn,
  tasteProfile,
  orderHistory,
  cart,
  maxResults = 4,
}: {
  isSignedIn: boolean;
  tasteProfile: TasteProfile;
  orderHistory: ActiveOrder[];
  cart: CartItem[];
  maxResults?: number;
}): RecommendedDish[] {
  const eligible = MENU_ITEMS.filter(
    (item) => tasteProfile.dietaryMode === 'all' || item.isVeg
  );

  // Track frequency of previously ordered dishes and categories
  const orderFrequency = new Map<string, number>();
  const categoryFrequency = new Map<Exclude<FoodCategory, 'All'>, number>();

  for (const order of orderHistory) {
    for (const entry of order.items) {
      orderFrequency.set(
        entry.item.id,
        (orderFrequency.get(entry.item.id) ?? 0) + entry.quantity
      );
      categoryFrequency.set(
        entry.item.category,
        (categoryFrequency.get(entry.item.category) ?? 0) + entry.quantity
      );
    }
  }

  // Track pairing boosts from current cart + recent orders
  const pairingReasonById = new Map<string, string>();
  const cartIds = new Set(cart.map((c) => c.item.id));

  for (const cartEntry of cart) {
    const pairings = PAIRING_MAP[cartEntry.item.id] ?? [];
    for (const p of pairings) {
      if (!cartIds.has(p.targetId) && !pairingReasonById.has(p.targetId)) {
        pairingReasonById.set(p.targetId, p.reason);
      }
    }
  }

  for (const order of orderHistory.slice(0, 3)) {
    for (const entry of order.items) {
      const pairings = PAIRING_MAP[entry.item.id] ?? [];
      for (const p of pairings) {
        if (!pairingReasonById.has(p.targetId)) {
          pairingReasonById.set(p.targetId, p.reason);
        }
      }
    }
  }

  const favCatSet = new Set(tasteProfile.favoriteCategories);

  const scored: { item: MenuItem; score: number; reason: string }[] = eligible.map(
    (item) => {
      let score = 0;
      let reason = 'Chef’s popular pick';

      const pastCount = orderFrequency.get(item.id) ?? 0;
      const pairingReason = pairingReasonById.get(item.id);
      const inFavCategory = favCatSet.has(item.category);
      const pastCatCount = categoryFrequency.get(item.category) ?? 0;

      if (pairingReason && !cartIds.has(item.id)) {
        score += 40;
        reason = pairingReason;
      }

      if (pastCount > 0) {
        score += 30 + Math.min(20, pastCount * 5);
        if (!pairingReason) {
          reason =
            pastCount > 1
              ? `Ordered ${pastCount}× · Your favorite`
              : 'Re-order your past pick';
        }
      }

      if (inFavCategory) {
        score += 25;
        if (pastCount === 0 && !pairingReason) {
          reason = `Matches your ${item.category} taste`;
        }
      }

      if (pastCatCount > 0 && pastCount === 0 && !inFavCategory && !pairingReason) {
        score += 12 + Math.min(10, pastCatCount * 2);
        reason = `Similar to your ${item.category} orders`;
      }

      // Slight boost to fast-prep favorites for tie-breaking when not yet ordered
      if (score === 0) {
        if (item.id === 'paneer-butter-masala') {
          score = 8;
          reason = 'Top-rated North Indian classic';
        } else if (item.id === 'margherita-pizza') {
          score = 7;
          reason = 'Fresh wood-fired crowd favorite';
        } else if (item.id === 'veg-hyderabadi-biryani') {
          score = 6;
          reason = 'Aromatic saffron dum specialty';
        } else if (item.id === 'cold-coffee') {
          score = 5;
          reason = 'Ready in 5 mins · Chilled favorite';
        } else {
          score = item.prepTimeMins <= 10 ? 3 : 1;
          reason = isSignedIn ? 'Recommended for you' : 'Popular on Instant Deliver';
        }
      }

      return { item, score, reason };
    }
  );

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map(({ item, reason }) => ({ item, reason }));
}
