import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { ArrowRight, Search, ShoppingBag, X } from 'lucide-react';
import { CartDrawer } from './components/CartDrawer';
import { Header } from './components/Header';
import { MenuCard } from './components/MenuCard';
import { OrderHistorySection } from './components/OrderHistorySection';
import { OrderTrackingView } from './components/OrderTrackingView';
import { RecommendationsSection } from './components/RecommendationsSection';
import { FOOD_CATEGORIES, HERO_IMAGE, MENU_ITEMS } from './data/menu';
import {
  saveOrderToFirestore,
  saveTasteProfile,
  signInWithGoogle,
  signOutGoogle,
  subscribeTasteProfile,
  subscribeToAuth,
  subscribeUserOrders,
  updateOrderStatusInFirestore,
} from './lib/firebase';
import type {
  ActiveOrder,
  CartItem,
  CustomerDetails,
  FoodCategory,
  MenuItem,
  OrderStepIndex,
  TasteProfile,
} from './types';
import { computeRecommendations } from './utils/recommendations';

const ORDER_HISTORY_STORAGE_KEY = 'instant_deliver_order_history';
const DEFAULT_TASTE_PROFILE: TasteProfile = {
  dietaryMode: 'all',
  favoriteCategories: [],
};

function loadSavedOrderHistory(): ActiveOrder[] {
  try {
    const raw = window.localStorage.getItem(ORDER_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActiveOrder[];
    if (!Array.isArray(parsed)) return [];

    const menuById = new Map(MENU_ITEMS.map((m) => [m.id, m]));
    return parsed.map((order) => ({
      ...order,
      items: order.items.map((entry) => ({
        ...entry,
        item: menuById.get(entry.item.id) ?? entry.item,
      })),
    }));
  } catch {
    return [];
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [tasteProfile, setTasteProfile] = useState<TasteProfile>(
    DEFAULT_TASTE_PROFILE
  );
  const [cloudOrders, setCloudOrders] = useState<ActiveOrder[] | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeView, setActiveView] = useState<'menu' | 'tracking'>('menu');
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [localOrderHistory, setLocalOrderHistory] = useState<ActiveOrder[]>(() =>
    loadSavedOrderHistory()
  );

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuth((nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setTasteProfile(DEFAULT_TASTE_PROFILE);
        setCloudOrders(null);
      }
    });
    return unsubscribe;
  }, []);

  // Attach Firestore listeners only when auth is ready and user is signed in
  useEffect(() => {
    if (!authReady || !user) return;

    const unsubProfile = subscribeTasteProfile(user.uid, (profile) => {
      if (profile) {
        setTasteProfile(profile);
      }
    });

    const unsubOrders = subscribeUserOrders(user.uid, (orders) => {
      setCloudOrders(orders);
    });

    return () => {
      unsubProfile();
      unsubOrders();
    };
  }, [authReady, user]);

  // Persist local order history for guest/offline continuity
  useEffect(() => {
    try {
      window.localStorage.setItem(
        ORDER_HISTORY_STORAGE_KEY,
        JSON.stringify(localOrderHistory)
      );
    } catch {
      // Ignore storage quota or privacy mode errors
    }
  }, [localOrderHistory]);

  // Merge cloud orders (for signed-in users) with local session orders seamlessly
  const orderHistory = useMemo(() => {
    if (!user || cloudOrders === null) {
      return localOrderHistory;
    }
    const seenIds = new Set(cloudOrders.map((o) => o.orderId));
    const merged = [...cloudOrders];
    for (const localOrder of localOrderHistory) {
      if (!seenIds.has(localOrder.orderId)) {
        merged.push(localOrder);
      }
    }
    return merged;
  }, [user, cloudOrders, localOrderHistory]);

  // Live 1-second countdown timer while an order is active and not yet delivered
  useEffect(() => {
    if (!activeOrder || activeOrder.statusIndex === 3) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveOrder((prev) => {
        if (!prev || prev.statusIndex === 3 || prev.remainingSeconds <= 0) {
          return prev;
        }
        return {
          ...prev,
          remainingSeconds: prev.remainingSeconds - 1,
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeOrder?.orderId, activeOrder?.statusIndex]);

  const cartQuantityMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of cart) {
      map.set(entry.item.id, entry.quantity);
    }
    return map;
  }, [cart]);

  const totalCartCount = useMemo(
    () => cart.reduce((sum, entry) => sum + entry.quantity, 0),
    [cart]
  );

  const totalCartAmount = useMemo(
    () => cart.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0),
    [cart]
  );

  const recommendations = useMemo(
    () =>
      computeRecommendations({
        isSignedIn: Boolean(user),
        tasteProfile,
        orderHistory,
        cart,
        maxResults: 4,
      }),
    [user, tasteProfile, orderHistory, cart]
  );

  const filteredMenu = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MENU_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to sign in with Google.';
      if (!message.includes('popup-closed-by-user')) {
        setAuthError(
          'Google sign-in could not complete. Please allow popups and try again.'
        );
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setAuthError(null);
    try {
      await signOutGoogle();
    } catch {
      setAuthError('Failed to sign out. Please try again.');
    }
  };

  const handleUpdateTasteProfile = (nextProfile: TasteProfile) => {
    setTasteProfile(nextProfile);
    if (user) {
      void saveTasteProfile(user.uid, nextProfile).catch(() => {
        setAuthError('Could not save taste preferences right now.');
      });
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.item.id === item.id);
      if (existing) {
        return prev.map((entry) =>
          entry.item.id === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleIncrementItem = (itemId: string) => {
    setCart((prev) =>
      prev.map((entry) =>
        entry.item.id === itemId
          ? { ...entry, quantity: entry.quantity + 1 }
          : entry
      )
    );
  };

  const handleDecrementItem = (itemId: string) => {
    setCart((prev) =>
      prev
        .map((entry) =>
          entry.item.id === itemId
            ? { ...entry, quantity: entry.quantity - 1 }
            : entry
        )
        .filter((entry) => entry.quantity > 0)
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => prev.filter((entry) => entry.item.id !== itemId));
  };

  const handlePlaceOrder = (
    customer: CustomerDetails,
    otpOptions: { otpEnabled: boolean; orderOtp?: string }
  ) => {
    if (cart.length === 0) return;

    const longestPrepMins = Math.max(
      ...cart.map((entry) => entry.item.prepTimeMins)
    );
    const deliveryMins = 15;
    const estimatedTotalMins = longestPrepMins + deliveryMins;
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const now = new Date();
    const placedAt = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const placedDate = now.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });

    const newOrder: ActiveOrder = {
      orderId: `#ID-${randomNum}`,
      firestoreDocId: `ID-${randomNum}`,
      items: cart,
      grandTotal: totalCartAmount,
      customer,
      longestPrepMins,
      deliveryMins,
      estimatedTotalMins,
      remainingSeconds: estimatedTotalMins * 60,
      statusIndex: 0,
      placedAt,
      placedDate,
      lastOwnerUpdate: otpOptions.otpEnabled
        ? `Verified via 4-digit OTP (${otpOptions.orderOtp}) · Order received`
        : 'Order received by kitchen',
      otpEnabled: otpOptions.otpEnabled,
      orderOtp: otpOptions.otpEnabled ? otpOptions.orderOtp : undefined,
    };

    setActiveOrder(newOrder);
    setLocalOrderHistory((prev) => [newOrder, ...prev.slice(0, 19)]);
    setCart([]);
    setIsCartOpen(false);
    setActiveView('tracking');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (user) {
      void saveOrderToFirestore(user.uid, newOrder).catch(() => {
        // Keep local tracking running even if cloud sync fails
      });
    }
  };

  const handleReorderOrder = (itemsToAdd: CartItem[]) => {
    setCart((prev) => {
      const next = [...prev];
      for (const entry of itemsToAdd) {
        const existingIndex = next.findIndex((c) => c.item.id === entry.item.id);
        if (existingIndex >= 0) {
          next[existingIndex] = {
            ...next[existingIndex],
            quantity: next[existingIndex].quantity + entry.quantity,
          };
        } else {
          next.push({ item: entry.item, quantity: entry.quantity });
        }
      }
      return next;
    });
    setIsCartOpen(true);
  };

  const handleReorderSingleItem = (item: MenuItem, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((entry) => entry.item.id === item.id);
      if (existing) {
        return prev.map((entry) =>
          entry.item.id === item.id
            ? { ...entry, quantity: entry.quantity + quantity }
            : entry
        );
      }
      return [...prev, { item, quantity }];
    });
  };

  const handleSimulateOwnerProgress = () => {
    setActiveOrder((prev) => {
      if (!prev || prev.statusIndex >= 3) return prev;
      const nextStep = (prev.statusIndex + 1) as OrderStepIndex;

      let updated: ActiveOrder;
      if (nextStep === 1) {
        updated = {
          ...prev,
          statusIndex: 1,
          lastOwnerUpdate: 'Owner started preparing your dishes',
        };
      } else if (nextStep === 2) {
        const cappedDeliverySeconds = Math.min(
          prev.remainingSeconds,
          prev.deliveryMins * 60
        );
        updated = {
          ...prev,
          statusIndex: 2,
          remainingSeconds: cappedDeliverySeconds,
          lastOwnerUpdate: `Food packed! Rider out for delivery (${prev.deliveryMins} mins away)`,
        };
      } else {
        updated = {
          ...prev,
          statusIndex: 3,
          remainingSeconds: 0,
          lastOwnerUpdate: `Order delivered — Pay ₹${prev.grandTotal} in cash`,
        };
      }

      setLocalOrderHistory((history) =>
        history.map((h) => (h.orderId === updated.orderId ? updated : h))
      );

      if (user && updated.firestoreDocId) {
        void updateOrderStatusInFirestore(
          user.uid,
          updated.firestoreDocId,
          updated.statusIndex
        ).catch(() => {
          // Local state stays updated
        });
      }

      return updated;
    });
  };

  const handleAdjustMinutes = (deltaMins: number) => {
    setActiveOrder((prev) => {
      if (!prev || prev.statusIndex === 3) return prev;
      const updatedSeconds = Math.max(60, prev.remainingSeconds + deltaMins * 60);
      const sign = deltaMins > 0 ? `+${deltaMins}` : `${deltaMins}`;
      return {
        ...prev,
        remainingSeconds: updatedSeconds,
        lastOwnerUpdate: `Owner adjusted estimated time by ${sign} mins`,
      };
    });
  };

  const handleStartNewOrder = () => {
    setActiveOrder(null);
    setActiveView('menu');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalCartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        activeView={activeView}
        hasActiveOrder={activeOrder !== null}
        onNavigateView={setActiveView}
        user={user}
        authReady={authReady}
        isSigningIn={isSigningIn}
        onGoogleSignIn={() => void handleGoogleSignIn()}
        onGoogleSignOut={() => void handleGoogleSignOut()}
      />

      {authError && (
        <div
          role="alert"
          className="bg-red-50 border-b border-red-200 px-4 py-2.5 text-xs font-medium text-red-800"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <span>{authError}</span>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              aria-label="Dismiss error"
              className="text-red-700 hover:text-red-900 font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex-1">
        {activeView === 'tracking' && activeOrder ? (
          <OrderTrackingView
            order={activeOrder}
            onSimulateOwnerProgress={handleSimulateOwnerProgress}
            onAdjustMinutes={handleAdjustMinutes}
            onBackToMenu={() => setActiveView('menu')}
            onStartNewOrder={handleStartNewOrder}
          />
        ) : (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 pb-24 md:pb-12">
            {/* Active Order Quick Banner if user navigated back to menu */}
            {activeOrder && (
              <div className="rounded-2xl bg-zinc-900 text-white px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold text-orange-400 tabular-nums">
                    {activeOrder.orderId}
                  </span>
                  <span className="text-zinc-300">
                    {activeOrder.statusIndex === 3
                      ? 'Delivered — Cash on Delivery completed'
                      : 'Your order is in progress'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('tracking')}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-orange-300 transition-colors cursor-pointer"
                >
                  <span>View Live Tracking</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Storefront Hero Split */}
            <section className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
              <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
                <p className="text-xs font-semibold text-orange-600 mb-2">
                  Fresh Kitchen to Doorstep · Cash on Delivery
                </p>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-zinc-900 leading-[1.12] [text-wrap:balance]">
                  Hot, freshly cooked meals delivered fast.
                </h1>
                <p className="mt-3 text-sm sm:text-base text-zinc-600 max-w-lg leading-relaxed">
                  Order wood-fired pizzas, creamy North Indian curries, dum biryani, and chilled beverages with instant prep tracking and Cash on Delivery.
                </p>

                <div className="mt-6 pt-5 border-t border-zinc-100 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-zinc-600">
                  <span className="font-semibold text-zinc-900 tabular-nums">
                    16 Fresh Dishes
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>15 min dispatch after prep</span>
                  <span aria-hidden="true">·</span>
                  <span>Pay Cash on Arrival</span>
                </div>
              </div>

              <div className="lg:col-span-6 min-h-[220px] sm:min-h-[260px] lg:min-h-[300px] bg-zinc-100">
                <img
                  src={HERO_IMAGE}
                  alt="Freshly cooked pizza, paneer butter masala, garlic naan, and veg biryani spread"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover lg:h-full"
                />
              </div>
            </section>

            {/* Personalized Recommendations & Google Sign-In Section */}
            <RecommendationsSection
              user={user}
              authReady={authReady}
              isSigningIn={isSigningIn}
              onGoogleSignIn={() => void handleGoogleSignIn()}
              tasteProfile={tasteProfile}
              onUpdateTasteProfile={handleUpdateTasteProfile}
              recommendations={recommendations}
              cartQuantityMap={cartQuantityMap}
              onAdd={handleAddToCart}
              onIncrement={handleIncrementItem}
              onDecrement={handleDecrementItem}
            />

            {/* Mobile Search Bar (kept out of sticky header to honor mobile sticky cap) */}
            <div className="md:hidden relative">
              <Search
                className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes like Paneer, Pizza, Biryani..."
                aria-label="Search dishes"
                className="w-full h-11 pl-10 pr-10 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Tabs & Menu Grid */}
            <section aria-label="Menu catalog" className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Interactive Category Filter Buttons */}
                <div
                  role="tablist"
                  aria-label="Food categories"
                  className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0"
                >
                  {FOOD_CATEGORIES.map((category) => {
                    const isActive = selectedCategory === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setSelectedCategory(category)}
                        className={`min-h-[40px] px-4 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-orange-600 text-white'
                            : 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:text-zinc-900'
                        }`}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs font-medium text-zinc-500 tabular-nums shrink-0">
                  Showing {filteredMenu.length}{' '}
                  {filteredMenu.length === 1 ? 'dish' : 'dishes'}
                </p>
              </div>

              {filteredMenu.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded-2xl py-16 px-4 text-center">
                  <h2 className="font-display text-lg font-semibold text-zinc-900">
                    No matching dishes found
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Try searching for another dish or switching back to All categories.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    className="mt-4 min-h-[40px] px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredMenu.map((item) => (
                    <MenuCard
                      key={item.id}
                      item={item}
                      quantity={cartQuantityMap.get(item.id) ?? 0}
                      onAdd={handleAddToCart}
                      onIncrement={handleIncrementItem}
                      onDecrement={handleDecrementItem}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Order History Section */}
            <OrderHistorySection
              orders={orderHistory}
              cartQuantityMap={cartQuantityMap}
              onReorderOrder={handleReorderOrder}
              onReorderSingleItem={handleReorderSingleItem}
            />
          </main>
        )}
      </div>

      {/* Compact Mobile Bottom Cart Bar (when items in cart on menu view) */}
      {activeView === 'menu' && totalCartCount > 0 && !isCartOpen && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-zinc-200">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full h-12 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white text-sm font-bold flex items-center justify-between transition-all cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 tabular-nums">
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'} · ₹{totalCartAmount}
            </span>
            <span className="inline-flex items-center gap-1">
              View Cart
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </span>
          </button>
        </div>
      )}

      {/* Quiet Footer */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500">
          <span>Instant Deliver · Fresh Indian & Fast-Food Kitchen</span>
          <span>Cash on Delivery (COD) Only · Prices in INR (₹)</span>
        </div>
      </footer>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onIncrement={handleIncrementItem}
        onDecrement={handleDecrementItem}
        onRemove={handleRemoveItem}
        onPlaceOrder={handlePlaceOrder}
        defaultCustomerName={user?.displayName ?? ''}
      />
    </div>
  );
}
