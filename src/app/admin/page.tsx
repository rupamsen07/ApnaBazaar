"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getProducts, addProduct, updateProduct, deleteProduct, Product, updateOrderStatus, deleteOrder, Order, cancelOrder, fulfillOrder } from "@/lib/products";
import { Pencil, Trash2, Plus, X, Save, CheckCircle2 } from "lucide-react";
import {collection,query,where,onSnapshot} from "firebase/firestore";
import {db} from "@/lib/firebase";

export default function AdminDashboard() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    stockQuantity: 0,
    imageUrl: ""
  });

  useEffect(()=>{if(!authLoading){if(!user||role!=="admin"){router.push("/");}else{loadData();const q=query(collection(db,"orders"),where("status","==","pending"));const unsubscribe=onSnapshot(q,(snapshot)=>{const activeOrders=snapshot.docs.map(doc=>({id:doc.id,...doc.data()} as Order)).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());setOrders(activeOrders);});return ()=>unsubscribe();}}},[user,role,authLoading,router]);
  const loadData=async()=>{setLoading(true);try{const fetchedProducts=await getProducts();setProducts(fetchedProducts);}catch(e){console.error(e);}setLoading(false);};

  const handleAdd = async () => {
    try {
      await addProduct(formData);
      setIsAdding(false);
      setFormData({ name: "", price: 0, stockQuantity: 0, imageUrl: "" });
      loadData();
    } catch (e) {
      alert("Failed to add");
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      await updateProduct(editingId, {
        name: formData.name,
        price: Number(formData.price),
        stockQuantity: Number(formData.stockQuantity),
        imageUrl: formData.imageUrl
      });
      setEditingId(null);
      loadData();
    } catch (e) {
      alert("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(id);
        loadData();
      } catch (e) {
        alert("Failed to delete product");
      }
    }
  };

  const handleCompleteOrder = async (id?: string) => {
    if (!id) return;
    try {
      await fulfillOrder(id);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to complete order");
    }
  };

  const handleCancelOrder = async (id?: string) => {
    if (!id) return;
    if (confirm("Are you sure you want to cancel this order?")) {
      try {
        await cancelOrder(id);
        loadData();
      } catch (e) {
        console.error(e);
        alert("Failed to cancel order");
      }
    }
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setFormData({
      name: p.name,
      price: p.price,
      stockQuantity: p.stockQuantity,
      imageUrl: p.imageUrl
    });
  };

  if (authLoading || (user && role !== "admin")) {
    return <div className="min-h-screen bg-slate-900"></div>; // Blank screen while redirecting
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
          <h1 className="text-3xl font-bold text-white">Inventory Management</h1>
          {!isAdding && (
            <button 
              onClick={() => {
                setIsAdding(true);
                setEditingId(null);
                setFormData({ name: "", price: 0, stockQuantity: 0, imageUrl: "" });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Plus size={18} />
              Add Product
            </button>
          )}
        </div>

        {/* Add/Edit Form Overlay */}
        {(isAdding || editingId) && (
          <div className="mb-8 p-6 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">{isAdding ? "Add New Product" : "Edit Product"}</h2>
              <button 
                onClick={() => { setIsAdding(false); setEditingId(null); }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Product Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Image URL</label>
                <input 
                  type="text" 
                  value={formData.imageUrl}
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-100 outline-none"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Price (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Stock Quantity</label>
                <input 
                  type="number" 
                  value={formData.stockQuantity}
                  onChange={e => setFormData({...formData, stockQuantity: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={isAdding ? handleAdd : handleUpdate}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors"
              >
                <Save size={18} />
                {isAdding ? "Save Product" : "Update Product"}
              </button>
            </div>
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl overflow-x-auto mb-12">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-700 text-slate-400 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium">Product</th>
                <th className="p-4 font-medium">Price</th>
                <th className="p-4 font-medium">Stock</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">Loading inventory...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">No products found. Add one to get started.</td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-lg object-cover bg-slate-900" />
                        <span className="font-bold text-slate-100 whitespace-nowrap">{product.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-emerald-400 font-medium whitespace-nowrap">
                      ₹{product.price.toFixed(2)}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${product.stockQuantity > 5 ? 'bg-slate-700 text-slate-300' : product.stockQuantity > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                        {product.stockQuantity} in stock
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => startEdit(product)}
                          className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
          <h1 className="text-3xl font-bold text-white">Active Orders</h1>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-700 text-slate-400 text-sm uppercase tracking-wider">
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Items</th>
                <th className="p-4 font-medium">Total</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">Loading orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">No active orders found.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-100 whitespace-nowrap">{order.name}</span>
                        <span className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <ul className="text-sm text-slate-300">
                        {order.items.map((i, idx) => (
                          <li key={idx} className="whitespace-nowrap">- {i.quantity}x {i.name}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-4 text-emerald-400 font-medium whitespace-nowrap">
                      ₹{order.total.toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleCompleteOrder(order.id)}
                          className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors border border-emerald-500/30 font-medium text-sm"
                          title="Complete"
                        >
                          <CheckCircle2 size={16} /> Complete
                        </button>
                        <button 
                          onClick={() => handleCancelOrder(order.id)}
                          className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/30 font-medium text-sm"
                          title="Cancel"
                        >
                          <X size={16} /> Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </main>
    </>
  );
}
