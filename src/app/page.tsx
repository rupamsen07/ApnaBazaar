"use client";

import { useEffect, useState } from "react";
import { getProductsWithAvailableStock, Product } from "@/lib/products";
import { useCart } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import { Minus, Plus, ShoppingCart } from "lucide-react";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { items, addToCart, removeFromCart, updateQuantity } = useCart();

  useEffect(() => {
    async function load() {
      try {
        const data = await getProductsWithAvailableStock();
        setProducts(data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-4 md:p-8 pt-8 md:pt-12">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Welcome to <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">ApnaBazaar</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Quick, reliable, and premium everyday shopping.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-80 bg-slate-800 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const cartItem = items.find(i => i.id === product.id);
              const inCartQty = cartItem?.cartQuantity ?? 0;

              return (
                <div key={product.id} className="group flex flex-col bg-slate-800 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-colors">
                  <div className="relative h-48 bg-slate-700 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {product.stockQuantity <= 0 && (
                      <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center backdrop-blur-sm">
                        <span className="text-white font-bold px-4 py-2 bg-red-500/80 rounded-lg">OUT OF STOCK</span>
                      </div>
                    )}
                    {inCartQty > 0 && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                        <ShoppingCart size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-slate-100 leading-tight">{product.name}</h3>
                      <span className="text-emerald-400 font-bold whitespace-nowrap ml-3">₹{product.price.toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-6 flex-grow">
                      Available: <span className={product.stockQuantity > 5 ? "text-slate-300" : product.stockQuantity > 0 ? "text-amber-400 font-medium" : "text-red-400 font-medium"}>{product.stockQuantity}</span>
                    </p>

                    {inCartQty > 0 ? (
                      <div className="w-full flex items-center justify-between bg-slate-900 border border-emerald-500/40 rounded-xl p-1 h-[46px]">
                        <button
                          onClick={() => {
                            if (inCartQty === 1) {
                              removeFromCart(product.id);
                            } else {
                              updateQuantity(product.id, inCartQty - 1);
                            }
                          }}
                          className="w-10 h-8 flex items-center justify-center text-slate-300 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors font-bold"
                          title={inCartQty === 1 ? "Remove from cart" : "Decrease quantity"}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="font-bold text-emerald-400 text-sm">{inCartQty} in cart</span>
                        <button
                          onClick={() => addToCart(product)}
                          disabled={inCartQty >= product.stockQuantity}
                          className="w-10 h-8 flex items-center justify-center text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Increase quantity"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        disabled={product.stockQuantity <= 0}
                        onClick={() => addToCart(product)}
                        className="w-full py-3 px-4 bg-slate-700 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-700"
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
