"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Product, upsertReservation, deleteReservation } from "../lib/products";

export interface CartItem extends Product {
  cartQuantity: number;
  reservationExpiresAt: number; // Unix ms timestamp for the soft-lock expiry
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalCost: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

/**
 * Returns a stable user ID for reservation tracking.
 * Priority: authenticated email (written by AuthContext) > stable anon ID from localStorage.
 */
export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "ssr";
  const authId = localStorage.getItem("apnabazaar_user_id");
  if (authId) return authId;
  let anonId = localStorage.getItem("apnabazaar_anon_id");
  if (!anonId) {
    anonId = "anon_" + Math.random().toString(36).slice(2, 11);
    localStorage.setItem("apnabazaar_anon_id", anonId);
  }
  return anonId;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Hydrate cart from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("cart");
    if (saved) {
      try { setItems(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product) => {
    const userId = getOrCreateUserId();
    // Pre-compute expiry so cart item is immediately accurate
    const reservationExpiresAt = Date.now() + 5 * 60 * 1000;

    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        const newQty = Math.min(product.stockQuantity, existing.cartQuantity + 1);
        // Fire-and-forget reservation upsert — refreshes the 5-min window
        upsertReservation(product.id, userId, newQty).catch(console.error);
        return prev.map(i =>
          i.id === product.id ? { ...i, cartQuantity: newQty, reservationExpiresAt } : i
        );
      }
      if (product.stockQuantity > 0) {
        upsertReservation(product.id, userId, 1).catch(console.error);
        return [...prev, { ...product, cartQuantity: 1, reservationExpiresAt }];
      }
      return prev;
    });
  };

  const removeFromCart = (id: string) => {
    const userId = getOrCreateUserId();
    setItems(prev => {
      const found = prev.find(i => i.id === id);
      if (found) {
        deleteReservation(id, userId).catch(console.error);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const updateQuantity = (id: string, qty: number) => {
    const userId = getOrCreateUserId();
    const reservationExpiresAt = Date.now() + 5 * 60 * 1000;
    setItems(prev => prev.map(i => {
      if (i.id === id) {
        const validQty = Math.max(1, Math.min(i.stockQuantity, qty));
        upsertReservation(id, userId, validQty).catch(console.error);
        return { ...i, cartQuantity: validQty, reservationExpiresAt };
      }
      return i;
    }));
  };

  const clearCart = () => {
    const userId = getOrCreateUserId();
    setItems(prev => {
      prev.forEach(item => {
        deleteReservation(item.id, userId).catch(console.error);
      });
      return [];
    });
  };

  const totalCost = items.reduce((acc, item) => acc + (item.price * item.cartQuantity), 0);
  const totalItems = items.reduce((acc, item) => acc + item.cartQuantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalCost, totalItems }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
