// frontend/src/context/CartContext.jsx

import React, { createContext, useContext, useState, useCallback } from "react";
import { toast } from "sonner";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]); // [{book, quantity}]

  const addToCart = useCallback((book, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.book.slug === book.slug);
      if (existing) {
        const newQty = Math.min(existing.quantity + qty, 10);
        toast.success(`🛒 Updated — ${book.title} (x${newQty})`);
        return prev.map(i => i.book.slug === book.slug ? { ...i, quantity: newQty } : i);
      }
      toast.success(`✅ Added to cart — ${book.title}`);
      return [...prev, { book, quantity: qty }];
    });
  }, []);

  const removeFromCart = useCallback((slug) => {
    setItems(prev => prev.filter(i => i.book.slug !== slug));
  }, []);

  const updateQty = useCallback((slug, qty) => {
    if (qty < 1) { removeFromCart(slug); return; }
    setItems(prev => prev.map(i => i.book.slug === slug ? { ...i, quantity: Math.min(qty, 10) } : i));
  }, [removeFromCart]);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  // Shipping: ₹60 for first book + ₹30 for each extra book
  const totalBooks = items.reduce((s, i) => s + i.quantity, 0);
  const shipping = totalBooks === 0 ? 0 : 60 + (totalBooks - 1) * 30;

  const subtotal = items.reduce((s, i) => {
    const price = parseInt(i.book.price?.replace(/[^\d]/g, "") || "249");
    return s + price * i.quantity;
  }, 0);

  const total = subtotal + shipping;

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQty, clearCart, totalItems, subtotal, shipping, total }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
