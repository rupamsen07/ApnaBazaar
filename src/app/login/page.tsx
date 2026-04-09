"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      
      // If the email includes 'admin', we can route to admin. Otherwise home.
      if (email.includes("admin")) {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-700">
        <div className="flex justify-center mb-6 text-emerald-400">
          <LogIn size={48} />
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-100 mb-8">
          {isRegister ? "Create an Account" : "Welcome Back"}
        </h2>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-100 placeholder-slate-500 outline-none transition-colors"
              placeholder="user@example.com (include 'admin' for admin role)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-100 placeholder-slate-500 outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
          >
            {isRegister ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <div className="mt-6 flex justify-center mt-8 pt-6 border-t border-slate-700">
          <p className="text-slate-400 text-sm">
            {isRegister ? "Already have an account?" : "Don't have an account?"}
            <button 
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="ml-2 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              {isRegister ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
