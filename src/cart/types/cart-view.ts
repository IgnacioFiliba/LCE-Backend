export type CartItemFlags = {
  priceChanged: boolean;
  insufficientStock: boolean;
  outOfStock: boolean;
};

export type CartItemView = {
  id: string;
  productId: string;
  name: string;
  imgUrl?: string;
  quantity: number;

  // valores históricos y actuales
  unitPriceSnapshot: number;
  unitPriceCurrent: number;
  lineTotalCurrent: number;

  // ✅ ALIAS para compat con el front
  unitPrice?: number;   // = unitPriceCurrent
  lineTotal?: number;   // = lineTotalCurrent

  flags: CartItemFlags;
};

export type CartSummary = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  invalidItemsCount: number;

  // ✅ ALIAS para compat con el front
  subTotal?: number;   // = subtotal
  grandTotal?: number; // = total
};

export type CartView = {
  id: string | null;
  userId: string;
  items: CartItemView[];
  summary: CartSummary;
};

export type OrderDraft = {
  orderId: string | null;
  status: 'pending';
  currency: string;
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  tax: number;
  total: number;
};