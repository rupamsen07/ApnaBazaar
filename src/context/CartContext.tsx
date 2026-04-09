"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Product } from "../lib/products";

export interface CartItem extends Product {
  cartQuantity: number;
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

    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        const newQty = Math.min(product.stockQuantity, existing.cartQuantity + 1);
        return prev.map(i =>
          i.id === product.id ? { ...i, cartQuantity: newQty } : i
        );
      }
      if (product.stockQuantity > 0) {
        return [...prev, { ...product, cartQuantity: 1 }];
      }
      return prev;
    });
  };

  const removeFromCart = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    setItems(prev => prev.map(i => {
      if (i.id === id) {
        const validQty = Math.max(1, Math.min(i.stockQuantity, qty));
        return { ...i, cartQuantity: validQty };
      }
      return i;
    }));
  };

  const clearCart = () => {
    setItems([]);
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
