"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
export function getOrCreateUserId(): string | null {
  if (typeof window === "undefined") return "ssr";
  return localStorage.getItem("apnabazaar_user_id") || null;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const router = useRouter();

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
    if (!userId || userId === "ssr") {
      router.push("/login");
      return;
    }
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
      if (found && userId && userId !== "ssr") {
        deleteReservation(id, userId).catch(console.error);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    const userId = getOrCreateUserId();
    if (!userId || userId === "ssr") return;
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
      if (userId && userId !== "ssr") {
        prev.forEach(item => {
          deleteReservation(item.id, userId).catch(console.error);
        });
      }
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
