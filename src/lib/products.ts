import { db } from "./firebase";
import { collection, getDocs, setDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";

export interface Product {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
  imageUrl: string;
}

export interface Reservation {
  userId: string;
  quantityReserved: number;
  expiresAt: number; // Unix ms timestamp
}

export interface Order {
  id?: string;
  name: string;
  total: number;
  items: Array<{id: string, name: string, price: number, quantity: number}>;
  createdAt: string;
  status: string;
}

const isMock = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

const MOCK_DEFAULT_PRODUCTS: Product[] = [
  { id: "1", name: "Fresh Apples", price: 3.99, stockQuantity: 50, imageUrl: "https://images.unsplash.com/photo-1560806887-1e4cd0b6caa6?w=500&auto=format&fit=crop&q=60" },
  { id: "2", name: "Organic Bananas", price: 1.99, stockQuantity: 30, imageUrl: "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=500&auto=format&fit=crop&q=60" },
  { id: "3", name: "Whole Milk 1L", price: 2.49, stockQuantity: 20, imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=500&auto=format&fit=crop&q=60" },
];

function getMockProducts(): Product[] {
  if (typeof window === "undefined") return MOCK_DEFAULT_PRODUCTS;
  const stored = localStorage.getItem("mockProducts");
  if (stored) return JSON.parse(stored);
  localStorage.setItem("mockProducts", JSON.stringify(MOCK_DEFAULT_PRODUCTS));
  return MOCK_DEFAULT_PRODUCTS;
}

function saveMockProducts(products: Product[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("mockProducts", JSON.stringify(products));
}

/** Returns products with RAW master stockQuantity — used by admin dashboard only. */
export async function getProducts(): Promise<Product[]> {
  if (isMock) return getMockProducts();
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
}

/**
 * Returns products with AVAILABLE stock = masterStock - sum(active reservations).
 * Use this on the customer-facing product listing.
 */
export async function getProductsWithAvailableStock(): Promise<Product[]> {
  if (isMock) {
    const products = getMockProducts();
    const allReservations: Record<string, Record<string, Reservation>> =
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("mockReservations") || "{}")
        : {};
    const now = Date.now();
    return products.map(p => {
      const productRes = allReservations[p.id] || {};
      const activeReserved = Object.values(productRes)
        .filter(r => r.expiresAt > now)
        .reduce((sum, r) => sum + r.quantityReserved, 0);
      return { ...p, stockQuantity: Math.max(0, p.stockQuantity - activeReserved) };
    });
  }

  const snap = await getDocs(collection(db, "products"));
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
  const now = Date.now();
  return Promise.all(
    products.map(async p => {
      const resSnap = await getDocs(collection(db, "products", p.id, "reservations"));
      const activeReserved = resSnap.docs
        .map(d => d.data() as Reservation)
        .filter(r => r.expiresAt > now)
        .reduce((sum, r) => sum + r.quantityReserved, 0);
      return { ...p, stockQuantity: Math.max(0, p.stockQuantity - activeReserved) };
    })
  );
}

/**
 * Creates or overwrites a user's reservation for a product.
 * Resets the expiry to 5 minutes from now.
 * Returns the new expiresAt timestamp.
 */
export async function upsertReservation(
  productId: string,
  userId: string,
  quantityReserved: number
): Promise<number> {
  const expiresAt = Date.now() + 5 * 60 * 1000;

  if (isMock) {
    if (typeof window !== "undefined") {
      const all: Record<string, Record<string, Reservation>> = JSON.parse(
        localStorage.getItem("mockReservations") || "{}"
      );
      if (!all[productId]) all[productId] = {};
      all[productId][userId] = { userId, quantityReserved, expiresAt };
      localStorage.setItem("mockReservations", JSON.stringify(all));
    }
    return expiresAt;
  }

  await setDoc(doc(db, "products", productId, "reservations", userId), {
    userId,
    quantityReserved,
    expiresAt,
  });
  return expiresAt;
}

/** Removes a user's reservation for a product. */
export async function deleteReservation(productId: string, userId: string): Promise<void> {
  if (isMock) {
    if (typeof window !== "undefined") {
      const all: Record<string, Record<string, Reservation>> = JSON.parse(
        localStorage.getItem("mockReservations") || "{}"
      );
      if (all[productId]) {
        delete all[productId][userId];
        localStorage.setItem("mockReservations", JSON.stringify(all));
      }
    }
    return;
  }
  try {
    await deleteDoc(doc(db, "products", productId, "reservations", userId));
  } catch {
    // Reservation may have already been cleaned up — safe to ignore
  }
}

export async function addProduct(product: Omit<Product, "id">): Promise<void> {
  const slugId = product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

  if (isMock) {
    const products = getMockProducts();
    const newProduct = { ...product, id: slugId };
    saveMockProducts([...products, newProduct]);
    return;
  }

  const newRef = doc(db, "products", slugId);
  await setDoc(newRef, product);
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  if (isMock) {
    const products = getMockProducts();
    const updated = products.map(p => p.id === id ? { ...p, ...data } : p);
    saveMockProducts(updated);
    return;
  }
  await updateDoc(doc(db, "products", id), data);
}

export async function deleteProduct(id: string): Promise<void> {
  if (isMock) {
    const products = getMockProducts();
    saveMockProducts(products.filter(p => p.id !== id));
    return;
  }
  await deleteDoc(doc(db, "products", id));
}

export async function placeTakeawayOrder(
  orderData: {
    name: string;
    userId: string;
    total: number;
    items: Array<{id: string, name: string, price: number, quantity: number}>;
  }
): Promise<void> {
  if (isMock) {
    const products = getMockProducts();
    const updated = products.map(p => {
      const orderItem = orderData.items.find(i => i.id === p.id);
      if (orderItem) {
        return { ...p, stockQuantity: Math.max(0, p.stockQuantity - orderItem.quantity) };
      }
      return p;
    });
    saveMockProducts(updated);

    if (typeof window !== "undefined") {
      // Save mock order
      const storedOrders = localStorage.getItem("mockOrders");
      const mockOrders = storedOrders ? JSON.parse(storedOrders) : [];
      const orderId = `${orderData.name} - ${Date.now()}`;
      mockOrders.push({ ...orderData, id: orderId, createdAt: new Date().toISOString(), status: "pending" });
      localStorage.setItem("mockOrders", JSON.stringify(mockOrders));

      // Delete mock reservations for this user
      const all: Record<string, Record<string, Reservation>> = JSON.parse(
        localStorage.getItem("mockReservations") || "{}"
      );
      orderData.items.forEach(item => {
        if (all[item.id]) delete all[item.id][orderData.userId];
      });
      localStorage.setItem("mockReservations", JSON.stringify(all));
    }
    return;
  }

  // Write order document
  const orderId = `${orderData.name} - ${Date.now()}`;
  const newRef = doc(db, "orders", orderId);
  await setDoc(newRef, {
    name: orderData.name,
    total: orderData.total,
    items: orderData.items,
    createdAt: new Date().toISOString(),
    status: "pending",
  });

  // Permanently deduct master stock AND delete reservations
  for (const item of orderData.items) {
    const snap = await getProducts();
    const prod = snap.find(p => p.id === item.id);
    if (prod) {
      await updateDoc(doc(db, "products", item.id), {
        stockQuantity: Math.max(0, prod.stockQuantity - item.quantity)
      });
    }
    await deleteReservation(item.id, orderData.userId);
  }
}

export async function getPendingOrders(): Promise<Order[]> {
  if (isMock) {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("mockOrders");
      const mockOrders = stored ? JSON.parse(stored) : [];
      return mockOrders.filter((o: Order) => o.status === "pending");
    }
    return [];
  }
  const snap = await getDocs(collection(db, "orders"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Order))
    .filter(o => o.status === "pending")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateOrderStatus(id: string, status: string): Promise<void> {
  if (isMock) {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("mockOrders");
      const mockOrders = stored ? JSON.parse(stored) : [];
      const updated = mockOrders.map((o: Order) => o.id === id ? { ...o, status } : o);
      localStorage.setItem("mockOrders", JSON.stringify(updated));
    }
    return;
  }
  await updateDoc(doc(db, "orders", id), { status });
}

export async function deleteOrder(id: string): Promise<void> {
  if (isMock) {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("mockOrders");
      let mockOrders = stored ? JSON.parse(stored) : [];
      mockOrders = mockOrders.filter((o: Order) => o.id !== id);
      localStorage.setItem("mockOrders", JSON.stringify(mockOrders));
    }
    return;
  }
  await deleteDoc(doc(db, "orders", id));
}
