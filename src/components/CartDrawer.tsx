import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Banknote,
  KeyRound,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import type { CartItem, CustomerDetails } from '../types';

export interface OtpOrderOptions {
  otpEnabled: boolean;
  orderOtp?: string;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onIncrement: (itemId: string) => void;
  onDecrement: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onPlaceOrder: (customer: CustomerDetails, otpOptions: OtpOrderOptions) => void;
  defaultCustomerName?: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  address?: string;
  cart?: string;
}

function generateFresh4DigitOtp(excludeCode?: string | null): string {
  let code = '';
  do {
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      const buf = new Uint32Array(1);
      window.crypto.getRandomValues(buf);
      code = String(1000 + (buf[0] % 9000));
    } else {
      code = String(1000 + Math.floor(Math.random() * 9000));
    }
  } while (excludeCode && code === excludeCode);
  return code;
}

export function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onIncrement,
  onDecrement,
  onRemove,
  onPlaceOrder,
  defaultCustomerName = '',
}: CartDrawerProps) {
  const [name, setName] = useState(defaultCustomerName);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  // 4-Digit OTP verification option state
  const [otpEnabled, setOtpEnabled] = useState(true);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const lastIssuedOtpRef = useRef<string | null>(null);

  useEffect(() => {
    if (defaultCustomerName && !name) {
      setName(defaultCustomerName);
    }
  }, [defaultCustomerName, name]);

  useEffect(() => {
    if (!isOpen || cartItems.length === 0) {
      setIsOtpStep(false);
      setGeneratedOtp(null);
      setEnteredOtp('');
      setOtpError(null);
    }
  }, [isOpen, cartItems.length]);

  if (!isOpen) return null;

  const grandTotal = cartItems.reduce(
    (sum, entry) => sum + entry.item.price * entry.quantity,
    0
  );
  const totalCount = cartItems.reduce((sum, entry) => sum + entry.quantity, 0);
  const longestPrepMins =
    cartItems.length > 0
      ? Math.max(...cartItems.map((entry) => entry.item.prepTimeMins))
      : 0;
  const estimatedDeliveryMins = longestPrepMins + 15;

  const issueNewOtp = () => {
    const freshCode = generateFresh4DigitOtp(
      generatedOtp ?? lastIssuedOtpRef.current
    );
    lastIssuedOtpRef.current = freshCode;
    setGeneratedOtp(freshCode);
    setEnteredOtp('');
    setOtpError(null);
  };

  const handleCheckoutSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: FormErrors = {};

    if (cartItems.length === 0) {
      nextErrors.cart = 'Add at least one dish to place an order.';
    }
    if (!name.trim()) {
      nextErrors.name = 'Please enter your full name.';
    }
    const cleanPhone = phone.replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      nextErrors.phone = 'Please enter a valid 10-digit phone number.';
    }
    if (!address.trim() || address.trim().length < 8) {
      nextErrors.address = 'Please enter your complete delivery address.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});

    if (otpEnabled) {
      issueNewOtp();
      setIsOtpStep(true);
      return;
    }

    onPlaceOrder(
      {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      },
      { otpEnabled: false }
    );
  };

  const handleVerifyOtpSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!generatedOtp) return;

    if (enteredOtp.trim().length !== 4) {
      setOtpError('Please enter the 4-digit OTP.');
      return;
    }

    if (enteredOtp.trim() !== generatedOtp) {
      setOtpError('Incorrect OTP. Please enter the 4-digit code shown above.');
      return;
    }

    const verifiedOtp = generatedOtp;
    setIsOtpStep(false);
    setGeneratedOtp(null);
    setEnteredOtp('');
    setOtpError(null);

    onPlaceOrder(
      {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      },
      {
        otpEnabled: true,
        orderOtp: verifiedOtp,
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
      />

      {/* Slide-Over Panel */}
      <div className="relative z-10 w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2
              id="cart-drawer-title"
              className="font-display text-lg font-bold text-zinc-900"
            >
              {isOtpStep ? 'Verify Order OTP' : 'Your Cart'}
            </h2>
            <p className="text-xs text-zinc-500 tabular-nums">
              {totalCount === 0
                ? 'No items selected'
                : `${totalCount} ${totalCount === 1 ? 'item' : 'items'} · Est. delivery ${estimatedDeliveryMins} mins`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart drawer"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Cart + Checkout Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {cartItems.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                <ShoppingBag className="w-7 h-7" aria-hidden="true" />
              </div>
              <h3 className="font-display text-base font-semibold text-zinc-900">
                Your cart is empty
              </h3>
              <p className="mt-1 text-sm text-zinc-500 max-w-xs">
                Browse our freshly cooked pizzas, North Indian curries, biryanis, and desserts to get started.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 min-h-[44px] px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Browse Menu
              </button>
            </div>
          ) : isOtpStep && generatedOtp ? (
            <form
              id="otp-verify-form"
              onSubmit={handleVerifyOtpSubmit}
              className="space-y-5"
              noValidate
            >
              <button
                type="button"
                onClick={() => {
                  setIsOtpStep(false);
                  setOtpError(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to delivery details</span>
              </button>

              <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
                    <KeyRound className="w-4.5 h-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-base font-bold text-zinc-900">
                      4-Digit Order Confirmation OTP
                    </h3>
                    <p className="text-xs text-zinc-600">
                      Unique one-time code generated for {phone}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-white border border-orange-200/80 px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-[11px] font-medium text-zinc-500">
                      Your 4-digit OTP
                    </span>
                    <span
                      data-testid="generated-otp-code"
                      className="font-display text-2xl font-bold tracking-[0.25em] text-zinc-900 tabular-nums"
                    >
                      {generatedOtp}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={issueNewOtp}
                    className="min-h-[36px] px-3 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-xs font-semibold text-zinc-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>New OTP</span>
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="order-otp-input"
                  className="block text-xs font-semibold text-zinc-700 mb-1.5"
                >
                  Enter 4-Digit OTP
                </label>
                <input
                  id="order-otp-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  value={enteredOtp}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setEnteredOtp(digits);
                    if (otpError) setOtpError(null);
                  }}
                  placeholder="• • • •"
                  className="w-full h-13 px-4 rounded-xl border border-zinc-300 bg-white text-center font-display text-xl font-bold tracking-[0.45em] text-zinc-900 placeholder:text-zinc-400 tabular-nums focus:border-orange-600 focus:outline-none"
                />
                {otpError && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">{otpError}</p>
                )}
              </div>

              <div className="rounded-xl bg-zinc-50 border border-zinc-200/80 p-3.5 text-xs text-zinc-600 space-y-1">
                <div className="flex items-center justify-between font-semibold text-zinc-900">
                  <span>Order Total (COD)</span>
                  <span className="tabular-nums">₹{grandTotal}</span>
                </div>
                <p className="truncate">
                  Delivering to {name} · {address}
                </p>
              </div>
            </form>
          ) : (
            <>
              {/* Itemized List */}
              <section aria-label="Cart items">
                <ul className="divide-y divide-zinc-100">
                  {cartItems.map(({ item, quantity }) => (
                    <li
                      key={item.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-xl object-cover bg-zinc-100 shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-zinc-900 truncate">
                            {item.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            aria-label={`Remove ${item.name}`}
                            className="text-zinc-400 hover:text-red-600 p-1 -mr-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-xs text-zinc-500 tabular-nums mt-0.5">
                          ₹{item.price} each · {item.prepTimeMins} mins prep
                        </p>

                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => onDecrement(item.id)}
                              aria-label={`Decrease quantity of ${item.name}`}
                              className="w-8 h-8 flex items-center justify-center text-zinc-700 hover:bg-zinc-200/70 transition-colors cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2.5 text-xs font-bold text-zinc-900 tabular-nums">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onIncrement(item.id)}
                              aria-label={`Increase quantity of ${item.name}`}
                              className="w-8 h-8 flex items-center justify-center text-zinc-700 hover:bg-zinc-200/70 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span className="text-sm font-bold text-zinc-900 tabular-nums">
                            ₹{item.price * quantity}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Price Summary */}
              <section
                aria-label="Order summary"
                className="rounded-xl bg-zinc-50 border border-zinc-200/80 p-4 space-y-2 text-sm"
              >
                <div className="flex items-center justify-between text-zinc-600">
                  <span>Item Subtotal</span>
                  <span className="font-medium text-zinc-900 tabular-nums">
                    ₹{grandTotal}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-600">
                  <span>Delivery Fee</span>
                  <span className="font-medium text-emerald-700">Free</span>
                </div>
                <div className="flex items-center justify-between text-zinc-600">
                  <span>Estimated Time</span>
                  <span className="font-medium text-zinc-900 tabular-nums">
                    {estimatedDeliveryMins} mins ({longestPrepMins}m prep + 15m ride)
                  </span>
                </div>
                <div className="pt-2.5 border-t border-zinc-200 flex items-center justify-between text-base font-bold text-zinc-900">
                  <span>Grand Total</span>
                  <span className="tabular-nums">₹{grandTotal}</span>
                </div>
              </section>

              {/* Customer Details & COD Form */}
              <form
                id="cod-checkout-form"
                onSubmit={handleCheckoutSubmit}
                className="space-y-4"
                noValidate
              >
                <h3 className="font-display text-base font-semibold text-zinc-900">
                  Delivery Details
                </h3>

                <div>
                  <label
                    htmlFor="customer-name"
                    className="block text-xs font-semibold text-zinc-700 mb-1.5"
                  >
                    Full Name
                  </label>
                  <input
                    id="customer-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Aarav Sharma"
                    required
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-300 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-orange-600 focus:outline-none"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs font-medium text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="customer-phone"
                    className="block text-xs font-semibold text-zinc-700 mb-1.5"
                  >
                    Phone Number
                  </label>
                  <input
                    id="customer-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g., 9876543210"
                    required
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-300 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 tabular-nums focus:border-orange-600 focus:outline-none"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs font-medium text-red-600">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="customer-address"
                    className="block text-xs font-semibold text-zinc-700 mb-1.5"
                  >
                    Full Delivery Address
                  </label>
                  <textarea
                    id="customer-address"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Flat / House No., Building, Street, Landmark"
                    required
                    className="w-full p-3.5 rounded-xl border border-zinc-300 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-orange-600 focus:outline-none resize-none"
                  />
                  {errors.address && (
                    <p className="mt-1 text-xs font-medium text-red-600">{errors.address}</p>
                  )}
                </div>

                {/* Locked Cash on Delivery (COD) Only Section */}
                <div className="pt-1">
                  <span className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Payment Method
                  </span>
                  <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-3.5 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0">
                      <Banknote className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-zinc-900">
                          Cash on Delivery (COD) Only
                        </span>
                        <Lock className="w-3.5 h-3.5 text-orange-700 shrink-0" aria-hidden="true" />
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-600">
                        Pay in cash when your order arrives.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4-Digit OTP Option Toggle */}
                <div className="pt-1">
                  <label
                    htmlFor="otp-option-toggle"
                    className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3.5 flex items-start gap-3 cursor-pointer hover:border-zinc-300 transition-colors"
                  >
                    <input
                      id="otp-option-toggle"
                      type="checkbox"
                      checked={otpEnabled}
                      onChange={(e) => setOtpEnabled(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded accent-orange-600 cursor-pointer shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-zinc-900">
                        Verify with 4-digit Order OTP
                      </span>
                      <span className="block mt-0.5 text-xs text-zinc-500">
                        Generates a brand-new 4-digit OTP code every time you place an order.
                      </span>
                    </div>
                  </label>
                </div>

                {errors.cart && (
                  <p className="text-xs font-medium text-red-600">{errors.cart}</p>
                )}
              </form>
            </>
          )}
        </div>

        {/* Fixed Checkout Action Footer */}
        {cartItems.length > 0 && (
          <div className="px-5 py-4 border-t border-zinc-200 bg-white shrink-0">
            {isOtpStep ? (
              <button
                type="submit"
                form="otp-verify-form"
                className="w-full min-h-[48px] px-5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white text-sm font-bold flex items-center justify-between transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
              >
                <span>Verify & Place COD Order</span>
                <span className="tabular-nums">₹{grandTotal}</span>
              </button>
            ) : (
              <button
                type="submit"
                form="cod-checkout-form"
                className="w-full min-h-[48px] px-5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white text-sm font-bold flex items-center justify-between transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
              >
                <span>
                  {otpEnabled ? 'Continue to 4-Digit OTP' : 'Place COD Order'}
                </span>
                <span className="tabular-nums">₹{grandTotal}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
