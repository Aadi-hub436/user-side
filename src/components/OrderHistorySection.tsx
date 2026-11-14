import { useState } from 'react';
import { Check, History, Plus, RotateCcw } from 'lucide-react';
import { ORDER_STATUS_LABELS, type ActiveOrder, type CartItem, type MenuItem } from '../types';

interface OrderHistorySectionProps {
  orders: ActiveOrder[];
  cartQuantityMap: Map<string, number>;
  onReorderOrder: (items: CartItem[]) => void;
  onReorderSingleItem: (item: MenuItem, quantity: number) => void;
}

export function OrderHistorySection({
  orders,
  cartQuantityMap,
  onReorderOrder,
  onReorderSingleItem,
}: OrderHistorySectionProps) {
  const [recentlyReorderedId, setRecentlyReorderedId] = useState<string | null>(null);

  const handleReorderAll = (order: ActiveOrder) => {
    onReorderOrder(order.items);
    setRecentlyReorderedId(order.orderId);
    window.setTimeout(() => {
      setRecentlyReorderedId((current) =>
        current === order.orderId ? null : current
      );
    }, 1800);
  };

  return (
    <section
      id="order-history"
      aria-label="Order History"
      className="pt-4 border-t border-zinc-200 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-zinc-900">
            Order History
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            View previously placed orders and re-order your favorites with a single click.
          </p>
        </div>

        {orders.length > 0 && (
          <span className="text-xs font-medium text-zinc-500 tabular-nums shrink-0">
            {orders.length} {orders.length === 1 ? 'previous order' : 'previous orders'}
          </span>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-zinc-200/90 rounded-2xl px-6 py-10 text-center flex flex-col items-center">
          <div className="w-11 h-11 rounded-xl bg-zinc-100 text-zinc-500 flex items-center justify-center mb-3">
            <History className="w-5 h-5" aria-hidden="true" />
          </div>
          <h3 className="font-display text-base font-semibold text-zinc-900">
            No previous orders yet
          </h3>
          <p className="mt-1 text-sm text-zinc-500 max-w-md">
            Once you place a Cash on Delivery order, it will appear here so you can re-order your favorite dishes in one click.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {orders.map((order) => {
            const totalItems = order.items.reduce((sum, entry) => sum + entry.quantity, 0);
            const isJustReordered = recentlyReorderedId === order.orderId;
            const statusText = ORDER_STATUS_LABELS[order.statusIndex];

            return (
              <article
                key={order.orderId}
                className="bg-white border border-zinc-200/90 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  {/* Clean Unboxed Order Metadata Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-100">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-zinc-500">
                        <span className="font-bold text-zinc-900 tabular-nums">
                          {order.orderId}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {order.placedDate
                            ? `${order.placedDate}, ${order.placedAt}`
                            : order.placedAt}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {totalItems} {totalItems === 1 ? 'item' : 'items'}
                        </span>
                        {order.otpEnabled && order.orderOtp && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums text-zinc-700 font-semibold">
                              OTP {order.orderOtp}
                            </span>
                          </>
                        )}
                      </div>
                      <p
                        className={`mt-1 text-xs font-semibold ${
                          order.statusIndex === 3
                            ? 'text-emerald-700'
                            : 'text-orange-600'
                        }`}
                      >
                        {statusText}
                      </p>
                    </div>

                    <span className="font-display text-base font-bold text-zinc-900 tabular-nums shrink-0">
                      ₹{order.grandTotal}
                    </span>
                  </div>

                  {/* Past Order Items with Individual 1-Click Re-order */}
                  <ul className="mt-3 divide-y divide-zinc-100">
                    {order.items.map(({ item, quantity }) => {
                      const inCartQty = cartQuantityMap.get(item.id) ?? 0;

                      return (
                        <li
                          key={item.id}
                          className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={item.image}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-lg object-cover bg-zinc-100 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-900 truncate">
                                <span className="tabular-nums font-semibold">
                                  {quantity}×
                                </span>{' '}
                                {item.name}
                              </p>
                              <p className="text-xs text-zinc-500 tabular-nums">
                                ₹{item.price * quantity}
                                {inCartQty > 0 ? ` · ${inCartQty} in cart` : ''}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onReorderSingleItem(item, quantity)}
                            aria-label={`Re-order ${quantity} ${item.name}`}
                            className="min-h-[34px] px-2.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:border-orange-300 hover:bg-orange-50 text-xs font-semibold text-zinc-800 hover:text-orange-700 inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Add</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Full Order 1-Click Re-order Footer */}
                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-3">
                  <span className="text-xs text-zinc-500 truncate">
                    Deliver to {order.customer.name}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleReorderAll(order)}
                    className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      isJustReordered
                        ? 'bg-emerald-600 text-white'
                        : 'bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white'
                    }`}
                  >
                    {isJustReordered ? (
                      <>
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Added to Cart</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Re-order All</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
