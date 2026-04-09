"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export type Role = "user" | "admin" | null;

interface AuthContextType {
  user: FirebaseUser | null;
  role: Role;
  loading: boolean;
  login: (e: string, p: string) => Promise<void>;
  register: (e: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Using a mock auth if real Firebase config is missing
const isMock = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMock) {
      // Setup a dummy user if we are in mock mode
      const savedMockUser = typeof window !== 'undefined' ? localStorage.getItem('mockUser') : null;
      if (savedMockUser) {
        const u = JSON.parse(savedMockUser);
        setUser(u as any);
        setRole(u.role);
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Write userId to localStorage so CartContext can build reservations without importing AuthContext
        if (firebaseUser.email) {
          localStorage.setItem("apnabazaar_user_id", firebaseUser.email);
        }
        try {
          if (firebaseUser.email) {
            const userDoc = await getDoc(doc(db, "users", firebaseUser.email));
            if (userDoc.exists()) {
              setRole(userDoc.data().role as Role);
            } else {
              setRole("user");
            }
          } else {
            setRole("user");
          }
        } catch (e) {
          console.error("Error fetching user role", e);
          setRole("user");
        }
      } else {
        setUser(null);
        setRole(null);
        localStorage.removeItem("apnabazaar_user_id");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    if (isMock) {
      const r: Role = email.includes('admin') ? 'admin' : 'user';
      const u = { uid: "mock-uid-123", email, role: r };
      localStorage.setItem('mockUser', JSON.stringify(u));
      localStorage.setItem('apnabazaar_user_id', email);
      setUser(u as any);
      setRole(r);
      return;
    }
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const register = async (email: string, pass: string) => {
    if (isMock) {
      const r: Role = email.includes('admin') ? 'admin' : 'user';
      const u = { uid: "mock-uid-" + Date.now(), email, role: r };
      localStorage.setItem('mockUser', JSON.stringify(u));
      setUser(u as any);
      setRole(r);
      return;
    }
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, "users", email), {
      email,
      role: "user",
      createdAt: new Date(),
    });
    setRole("user");
  };

  const logout = async () => {
    if (isMock) {
      localStorage.removeItem('mockUser');
      localStorage.removeItem('apnabazaar_user_id');
      setUser(null);
      setRole(null);
      return;
    }
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
