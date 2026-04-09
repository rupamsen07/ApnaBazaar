"use client";

import { useCart, getOrCreateUserId } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import { placeTakeawayOrder } from "@/lib/products";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Trash2, MessageCircle, AlertTriangle } from "lucide-react";

export default function CheckoutPage() {
  const { items, totalCost, removeFromCart, updateQuantity, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [expiredItemNames, setExpiredItemNames] = useState<string[]>([]);
  const router = useRouter();

  // On mount: detect and evict expired cart reservations
  useEffect(() => {
    const now = Date.now();
    const expired = items.filter(i => i.reservationExpiresAt < now);
    if (expired.length > 0) {
      setExpiredItemNames(expired.map(i => i.name));
      expired.forEach(i => removeFromCart(i.id));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !name.trim()) return;

    setIsProcessing(true);

    try {
      const userId = getOrCreateUserId();
      const orderItems = items.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.cartQuantity
      }));

      // Create Firestore order, deduct master stock, and delete reservations
      await placeTakeawayOrder({
        name: name.trim(),
        userId,
        total: totalCost,
        items: orderItems,
      });

      // Format WhatsApp message
      const formattedItems = orderItems.map(item => `- ${item.quantity}x ${item.name} (₹${item.price})`).join("\n");
      const text = `Hi, I'd like to place a takeaway order!\nName: ${name.trim()}\nOrder:\n${formattedItems}\nTotal to pay: ₹${totalCost.toFixed(2)}`;

      const whatsappUrl = `https://wa.me/917001187981?text=${encodeURIComponent(text)}`;

      clearCart();
      window.open(whatsappUrl, "_blank");
      setIsSubmitted(true);

    } catch (e: any) {
      console.error("Failed to process order", e);
      alert(e.message || "An error occurred during checkout.");
      setIsProcessing(false);
    }
  };

  // Success screen shown after order submission
  if (isSubmitted) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[70vh] text-center">
          <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mb-6 animate-pulse">
            <CheckCircle2 size={48} className="text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Order Placed!</h1>
          <p className="text-slate-400 max-w-sm mb-2">
            Your order has been sent to WhatsApp. Please complete the conversation to confirm your takeaway.
          </p>
          <p className="text-slate-500 text-sm mb-8">Your cart has been cleared.</p>
          <button
            onClick={() => router.push("/")}
            className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
          >
            Back to Home
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold text-white mb-8 border-b border-slate-800 pb-4">Takeaway Order</h1>

        {/* Reservation expiry warning banner */}
        {expiredItemNames.length > 0 && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold mb-1">Some reserved items have expired and been removed:</p>
              <p className="text-amber-400/80 text-sm">{expiredItemNames.join(", ")}</p>
              <p className="text-amber-500/60 text-xs mt-1">Reservations are held for 5 minutes. Re-add them from the store if still available.</p>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-xl text-slate-300 font-medium mb-4">Your cart is empty</h2>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium rounded-xl transition-colors border border-slate-700"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map(item => {
                const isExpiringSoon = item.reservationExpiresAt - Date.now() < 60 * 1000; // < 1 min left
                return (
                  <div key={item.id} className={`flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-800 border rounded-2xl gap-4 ${isExpiringSoon ? 'border-amber-500/50' : 'border-slate-700'}`}>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt={item.name} className="w-20 h-20 object-cover rounded-xl bg-slate-700" />
                      <div>
                        <h3 className="font-bold text-slate-100">{item.name}</h3>
                        <p className="text-emerald-400 font-medium">₹{item.price.toFixed(2)}</p>
                        {isExpiringSoon && (
                          <p className="text-amber-400 text-xs flex items-center gap-1 mt-1">
                            <AlertTriangle size={11} /> Reservation expiring soon
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 w-full sm:w-auto justify-between">
                      <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.cartQuantity - 1)}
                          disabled={item.cartQuantity <= 1}
                          className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white rounded disabled:opacity-50 transition-colors"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold">{item.cartQuantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.cartQuantity + 1)}
                          disabled={item.cartQuantity >= item.stockQuantity}
                          className="w-8 h-8 flex items-center justify-center text-slate-300 hover:bg-slate-700 hover:text-white rounded disabled:opacity-50 transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-400 hover:text-red-300 p-2 bg-slate-900 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 h-fit sticky top-24">
              <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal</span>
                  <span>₹{totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Delivery</span>
                  <span className="text-emerald-400 font-medium">Local Takeaway</span>
                </div>
                <div className="pt-4 border-t border-slate-700 flex justify-between text-xl font-bold text-white">
                  <span>Total</span>
                  <span className="text-emerald-400">₹{totalCost.toFixed(2)}</span>
                </div>
              </div>

              <form onSubmit={handleCheckout} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Enter your name"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing || !name.trim()}
                  className="w-full py-4 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
                >
                  <MessageCircle size={20} />
                  {isProcessing ? "Processing..." : "Submit Order via WhatsApp"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
