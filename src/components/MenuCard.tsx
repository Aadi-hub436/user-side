import { useState } from 'react';
import { Minus, Plus, UtensilsCrossed } from 'lucide-react';
import type { MenuItem } from '../types';

interface MenuCardProps {
  item: MenuItem;
  quantity: number;
  onAdd: (item: MenuItem) => void;
  onIncrement: (itemId: string) => void;
  onDecrement: (itemId: string) => void;
}

export function MenuCard({
  item,
  quantity,
  onAdd,
  onIncrement,
  onDecrement,
}: MenuCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden flex flex-col transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
      {/* 4:3 Dish Photography */}
      <div className="relative aspect-[4/3] w-full bg-zinc-100 overflow-hidden">
        {!imgError ? (
          <img
            src={item.image}
            alt={item.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover transition-transform duration-300 ${
              item.imageClassName ?? 'object-center'
            }`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-50 via-zinc-100 to-amber-50 flex flex-col items-center justify-center p-4 text-center">
            <UtensilsCrossed className="w-8 h-8 text-orange-500 mb-2" aria-hidden="true" />
            <span className="text-xs font-medium text-zinc-600">{item.name}</span>
          </div>
        )}

        {/* Standard Indian Veg / Non-Veg dietary symbol */}
        <span
          title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
          aria-label={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
          className="absolute top-3 left-3 w-5 h-5 rounded-sm bg-white/95 border border-zinc-300 flex items-center justify-center shadow-xs"
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              item.isVeg ? 'bg-emerald-600' : 'bg-red-600'
            }`}
          />
        </span>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          {/* Clean Unboxed Metadata */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 mb-1">
            <span className="truncate">{item.category}</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap shrink-0 tabular-nums">
              {item.prepTimeMins} mins
            </span>
          </div>

          <h3 className="font-display text-base font-semibold text-zinc-900 leading-snug">
            {item.name}
          </h3>

          <p className="mt-1 text-sm text-zinc-500 line-clamp-1" title={item.description}>
            {item.description}
          </p>
        </div>

        {/* Price + Add to Cart / Quantity Stepper */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-3">
          <span className="text-base font-bold text-zinc-900 tabular-nums">
            ₹{item.price}
          </span>

          {quantity === 0 ? (
            <button
              type="button"
              onClick={() => onAdd(item)}
              className="min-h-[40px] px-4 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
            >
              Add to Cart
            </button>
          ) : (
            <div
              className="inline-flex items-center rounded-xl border border-orange-200 bg-orange-50 overflow-hidden shrink-0"
              role="group"
              aria-label={`Quantity controls for ${item.name}`}
            >
              <button
                type="button"
                onClick={() => onDecrement(item.id)}
                aria-label={`Decrease quantity of ${item.name}`}
                className="min-h-[40px] min-w-[38px] flex items-center justify-center text-orange-700 hover:bg-orange-100 active:bg-orange-200 transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-2.5 text-sm font-bold text-orange-900 tabular-nums select-none">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onIncrement(item.id)}
                aria-label={`Increase quantity of ${item.name}`}
                className="min-h-[40px] min-w-[38px] flex items-center justify-center text-orange-700 hover:bg-orange-100 active:bg-orange-200 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
