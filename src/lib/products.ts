import { db } from "./firebase";
import { collection, getDocs, getDoc, setDoc, doc, deleteDoc, updateDoc, increment, runTransaction } from "firebase/firestore";

export interface Product {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
  imageUrl: string;
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

export async function getProducts(): Promise<Product[]> {
  if (isMock) return getMockProducts();
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
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
    for (const orderItem of orderData.items) {
      const p = products.find(prod => prod.id === orderItem.id);
      if (!p || p.stockQuantity < orderItem.quantity) {
        throw new Error(`Sorry! Another neighbor just bought the last ${orderItem.name}. Please adjust your cart.`);
      }
    }
    const updated = products.map(p => {
      const orderItem = orderData.items.find(i => i.id === p.id);
      if (orderItem) {
        return { ...p, stockQuantity: p.stockQuantity - orderItem.quantity };
      }
      return p;
    });
    saveMockProducts(updated);

    if (typeof window !== "undefined") {
      const storedOrders = localStorage.getItem("mockOrders");
      const mockOrders = storedOrders ? JSON.parse(storedOrders) : [];
      const orderId = `${orderData.name} - ${Date.now()}`;
      mockOrders.push({ ...orderData, id: orderId, createdAt: new Date().toISOString(), status: "pending" });
      localStorage.setItem("mockOrders", JSON.stringify(mockOrders));
    }
    return;
  }

  await runTransaction(db, async (transaction) => {
    // Read all products first
    const productRefs = orderData.items.map(item => doc(db, "products", item.id));
    const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));
    
    // Check stock
    for (let i = 0; i < productDocs.length; i++) {
        const pDoc = productDocs[i];
        if (!pDoc.exists()) {
             throw new Error(`Product ${orderData.items[i].name} no longer exists.`);
        }
        const currentStock = pDoc.data().stockQuantity;
        if (currentStock < orderData.items[i].quantity) {
             throw new Error(`Sorry! Another neighbor just bought the last ${orderData.items[i].name}. Please adjust your cart.`);
        }
    }

    // Deduct stock
    for (let i = 0; i < productDocs.length; i++) {
        const newStock = productDocs[i].data().stockQuantity - orderData.items[i].quantity;
        transaction.update(productRefs[i], { stockQuantity: newStock });
    }

    // Create Order
    const orderId = `${orderData.name} - ${Date.now()}`;
    const orderRef = doc(db, "orders", orderId);
    transaction.set(orderRef, {
      name: orderData.name,
      total: orderData.total,
      items: orderData.items,
      createdAt: new Date().toISOString(),
      status: "pending",
    });
  });
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

export async function cancelOrder(orderId: string): Promise<void> {
  if (isMock) {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("mockOrders");
      const mockOrders = stored ? JSON.parse(stored) : [];
      const order = mockOrders.find((o: Order) => o.id === orderId);
      if (order && order.status === "pending") {
        const products = getMockProducts();
        const updatedProducts = products.map(p => {
          const item = order.items.find((i: any) => i.id === p.id);
          if (item) {
            return { ...p, stockQuantity: p.stockQuantity + item.quantity };
          }
          return p;
        });
        saveMockProducts(updatedProducts);
        
        const updatedOrders = mockOrders.map((o: Order) => o.id === orderId ? { ...o, status: "cancelled" } : o);
        localStorage.setItem("mockOrders", JSON.stringify(updatedOrders));
      }
    }
    return;
  }
  
  const orderDoc = await getDoc(doc(db, "orders", orderId));
  if (orderDoc.exists()) {
    const orderData = orderDoc.data() as Order;
    if (orderData.status === "pending") {
      for (const item of orderData.items) {
        await updateDoc(doc(db, "products", item.id), {
          stockQuantity: increment(item.quantity)
        });
      }
      await updateDoc(doc(db, "orders", orderId), { status: "cancelled" });
    }
  }
}
