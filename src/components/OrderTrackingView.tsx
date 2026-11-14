import {
  ArrowLeft,
  Banknote,
  Bike,
  Check,
  ChefHat,
  Clock,
  FastForward,
  KeyRound,
  MapPin,
  Phone,
  ReceiptText,
  User,
} from 'lucide-react';
import type { ActiveOrder, OrderStepIndex } from '../types';

interface OrderTrackingViewProps {
  order: ActiveOrder;
  onSimulateOwnerProgress: () => void;
  onAdjustMinutes: (deltaMins: number) => void;
  onBackToMenu: () => void;
  onStartNewOrder: () => void;
}

const ORDER_STEPS: {
  index: OrderStepIndex;
  title: string;
  subtitle: string;
  icon: typeof ReceiptText;
}[] = [
  {
    index: 0,
    title: 'Order Placed',
    subtitle: 'Your COD order has been confirmed by the restaurant.',
    icon: ReceiptText,
  },
  {
    index: 1,
    title: 'Owner Preparing Food',
    subtitle: 'Fresh ingredients are on the stove right now.',
    icon: ChefHat,
  },
  {
    index: 2,
    title: 'Out for Delivery',
    subtitle: 'Delivery partner is on the way to your address.',
    icon: Bike,
  },
  {
    index: 3,
    title: 'Delivered (Pay Cash)',
    subtitle: 'Order arrived. Please pay cash to the delivery partner.',
    icon: Banknote,
  },
];

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function OrderTrackingView({
  order,
  onSimulateOwnerProgress,
  onAdjustMinutes,
  onBackToMenu,
  onStartNewOrder,
}: OrderTrackingViewProps) {
  const isDelivered = order.statusIndex === 3;
  const currentStep = ORDER_STEPS[order.statusIndex];

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToMenu}
          className="min-h-[40px] inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </button>

        <span className="text-xs font-medium text-zinc-500 tabular-nums">
          Placed at {order.placedAt}
        </span>
      </div>

      {/* Hero Status & Countdown Banner */}
      <section className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 mb-1.5">
              <span>Order {order.orderId}</span>
              <span aria-hidden="true">·</span>
              <span>Cash on Delivery</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-zinc-900">
              {currentStep.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">{currentStep.subtitle}</p>
            {order.lastOwnerUpdate && (
              <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-md">
                <Clock className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
                <span>{order.lastOwnerUpdate}</span>
              </p>
            )}
          </div>

          {/* Live Countdown Timer */}
          <div className="sm:text-right shrink-0 rounded-xl bg-zinc-50 border border-zinc-200/80 px-5 py-4 min-w-[190px]">
            <span className="block text-xs font-medium text-zinc-500">
              {isDelivered ? 'Cash Due on Delivery' : 'Estimated Arrival'}
            </span>
            {isDelivered ? (
              <div className="mt-1 font-display text-3xl font-bold text-emerald-700 tabular-nums">
                ₹{order.grandTotal}
              </div>
            ) : (
              <div className="mt-1 font-display text-3xl font-bold text-zinc-900 tabular-nums">
                {formatCountdown(order.remainingSeconds)}
              </div>
            )}
            <span className="block mt-1 text-xs text-zinc-500 tabular-nums">
              {isDelivered
                ? 'Pay in cash to rider'
                : `${order.longestPrepMins}m max prep + ${order.deliveryMins}m delivery`}
            </span>
          </div>
        </div>

        {/* 4-Step Order Status Stepper */}
        <div className="mt-8 pt-6 border-t border-zinc-100">
          <ol className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-3">
            {ORDER_STEPS.map((step) => {
              const Icon = step.icon;
              const isCompleted = order.statusIndex > step.index;
              const isCurrent = order.statusIndex === step.index;

              return (
                <li
                  key={step.index}
                  className={`relative rounded-xl border p-3.5 transition-colors ${
                    isCurrent
                      ? 'border-orange-500 bg-orange-50/70'
                      : isCompleted
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-zinc-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isCurrent
                          ? 'bg-orange-600 text-white'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-zinc-100 text-zinc-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[11px] font-semibold text-zinc-500 tabular-nums">
                        Step {step.index + 1}
                      </span>
                      <span
                        className={`block text-xs font-bold leading-snug ${
                          isCurrent
                            ? 'text-orange-950'
                            : isCompleted
                            ? 'text-emerald-950'
                            : 'text-zinc-500'
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Receipt + Delivery Address 2-Column Split */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Itemized Receipt (3 cols) */}
        <section className="md:col-span-3 bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6">
          <h2 className="font-display text-base font-bold text-zinc-900 mb-4">
            Itemized Receipt ({order.orderId})
          </h2>

          <ul className="divide-y divide-zinc-100">
            {order.items.map(({ item, quantity }) => (
              <li key={item.id} className="py-3 first:pt-0 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="font-semibold text-zinc-900">
                    {quantity} × {item.name}
                  </span>
                  <span className="block text-xs text-zinc-500 tabular-nums">
                    ₹{item.price} each · {item.prepTimeMins} mins prep
                  </span>
                </div>
                <span className="font-bold text-zinc-900 tabular-nums shrink-0">
                  ₹{item.price * quantity}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 pt-4 border-t border-zinc-200 space-y-2 text-sm">
            <div className="flex items-center justify-between text-zinc-600">
              <span>Delivery Fee</span>
              <span className="font-medium text-emerald-700">Free</span>
            </div>
            <div className="flex items-center justify-between text-zinc-600">
              <span>Payment Mode</span>
              <span className="font-medium text-zinc-900">Cash on Delivery (COD)</span>
            </div>
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-base font-bold text-zinc-900">
              <span>Total to Pay in Cash</span>
              <span className="tabular-nums">₹{order.grandTotal}</span>
            </div>
          </div>
        </section>

        {/* Delivery Info (2 cols) */}
        <section className="md:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <h2 className="font-display text-base font-bold text-zinc-900">
              Delivery Address
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2.5 text-zinc-700">
                <User className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" aria-hidden="true" />
                <span className="font-medium text-zinc-900">{order.customer.name}</span>
              </div>
              <div className="flex items-start gap-2.5 text-zinc-700">
                <Phone className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" aria-hidden="true" />
                <span className="tabular-nums">{order.customer.phone}</span>
              </div>
              <div className="flex items-start gap-2.5 text-zinc-700">
                <MapPin className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" aria-hidden="true" />
                <span className="leading-relaxed">{order.customer.address}</span>
              </div>
            </div>

            {order.otpEnabled && order.orderOtp && (
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <KeyRound className="w-4 h-4 text-orange-600 shrink-0" aria-hidden="true" />
                  <span>Order Delivery OTP</span>
                </div>
                <span className="font-display text-lg font-bold tracking-[0.2em] text-zinc-900 tabular-nums">
                  {order.orderOtp}
                </span>
              </div>
            )}
          </div>

          {isDelivered && (
            <button
              type="button"
              onClick={onStartNewOrder}
              className="w-full min-h-[44px] px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Order More Food
            </button>
          )}
        </section>
      </div>

      {/* Bottom Owner Simulation Controls */}
      <section
        aria-label="Owner simulation controls"
        className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="text-xs text-zinc-600">
          <span className="font-semibold text-zinc-900">Test Buyer Tracking View:</span>{' '}
          Preview live status transitions and kitchen ETA adjustments from the restaurant owner.
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isDelivered && (
            <>
              <button
                type="button"
                onClick={() => onAdjustMinutes(-5)}
                className="min-h-[36px] px-3 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 text-xs font-semibold text-zinc-700 tabular-nums transition-colors cursor-pointer"
              >
                -5 mins
              </button>
              <button
                type="button"
                onClick={() => onAdjustMinutes(5)}
                className="min-h-[36px] px-3 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 text-xs font-semibold text-zinc-700 tabular-nums transition-colors cursor-pointer"
              >
                +5 mins
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onSimulateOwnerProgress}
            disabled={isDelivered}
            className="min-h-[36px] px-3.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 disabled:text-zinc-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <FastForward className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
            <span>{isDelivered ? 'Order Completed' : 'Simulate Owner Progress'}</span>
          </button>
        </div>
      </section>
    </main>
  );
}
