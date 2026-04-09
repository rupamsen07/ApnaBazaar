"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ShoppingCart, LogOut, User as UserIcon, Shield } from "lucide-react";

export default function Navbar() {
  const { user, role, logout, loading } = useAuth();
  const { totalItems } = useCart();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-emerald-400">
          ApnaBazaar
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/checkout" className="relative flex items-center p-2 text-slate-300 hover:text-emerald-400 transition-colors">
            <ShoppingCart size={24} />
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>

          {loading ? (
            <div className="border-l border-slate-700 pl-4 ml-2 flex items-center justify-center p-2 text-slate-400">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : user ? (
            <div className="flex items-center gap-3 border-l border-slate-700 pl-4 ml-2">
              <div className="flex flex-col items-end hidden md:flex">
                <span className="text-sm font-medium text-slate-200">{user.email}</span>
                <span className="text-xs text-slate-400 capitalize">{role}</span>
              </div>
              
              {role === "admin" && (
                <Link href="/admin" className="p-2 bg-slate-800 text-amber-400 rounded-lg hover:bg-slate-700 transition-colors" title="Admin Dashboard">
                  <Shield size={20} />
                </Link>
              )}
              
              <button onClick={logout} className="p-2 text-slate-400 hover:text-red-400 transition-colors" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <div className="border-l border-slate-700 pl-4 ml-2">
              <Link href="/login" className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors">
                <UserIcon size={18} />
                <span>Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
