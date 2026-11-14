export type FoodCategory =
  | 'All'
  | 'North Indian'
  | 'Pizza & Burgers'
  | 'Rice & Breads'
  | 'Beverages & Desserts';

export interface MenuItem {
  id: string;
  name: string;
  category: Exclude<FoodCategory, 'All'>;
  description: string;
  price: number;
  prepTimeMins: number;
  image: string;
  imageClassName?: string;
  isVeg: boolean;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  address: string;
}

export type OrderStepIndex = 0 | 1 | 2 | 3;

export const ORDER_STATUS_LABELS: Record<OrderStepIndex, string> = {
  0: 'Order Placed',
  1: 'Owner Preparing Food',
  2: 'Out for Delivery',
  3: 'Delivered (Pay Cash)',
};

export interface ActiveOrder {
  orderId: string;
  firestoreDocId?: string;
  items: CartItem[];
  grandTotal: number;
  customer: CustomerDetails;
  longestPrepMins: number;
  deliveryMins: number;
  estimatedTotalMins: number;
  remainingSeconds: number;
  statusIndex: OrderStepIndex;
  placedAt: string;
  placedDate?: string;
  lastOwnerUpdate?: string;
  otpEnabled?: boolean;
  orderOtp?: string;
}

export type DietaryMode = 'all' | 'veg';

export interface TasteProfile {
  dietaryMode: DietaryMode;
  favoriteCategories: Exclude<FoodCategory, 'All'>[];
}

export interface RecommendedDish {
  item: MenuItem;
  reason: string;
}
