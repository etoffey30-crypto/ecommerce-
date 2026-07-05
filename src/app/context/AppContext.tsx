import {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import heroBannerImg from "@/imports/herobanner.png";
import newLogoImg from "@/imports/newlogo.png";

// ─── Types ─────────────────────────────────────────────────────────────────────
export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "user" | "admin";
  joinedAt: string;
  lastSeen: string;
  savedItems: string[];
  cartSnapshot: { productId: string; productName: string; qty: number; price: number }[];
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  badge?: string;
  description: string;
  stock: number;
};

export type CartItem = Product & { quantity: number };

export type Order = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: { productId: string; productName: string; qty: number; price: number }[];
  total: number;
  deliveryLocation: string;
  placedAt: string;
  status: OrderStatus;
  trackingHistory: OrderTrackingEvent[];
};

export type OrderStatus =
  | "pending" | "confirmed" | "making" | "packed"
  | "shipped" | "delivered" | "cancelled";

export type OrderTrackingEvent = {
  status: OrderStatus;
  label: string;
  note: string;
  at: string;
};

export type Notification = {
  id: string;
  type: "purchase" | "signup";
  message: string;
  at: string;
  read: boolean;
  userId: string;
};

export type Category = {
  id: string;
  name: string;
  desc: string;
  image: string;
};

export type SiteSettings = {
  announcement: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  heroImage: string;
  logoImage: string;
  navLinks: string[];
  categories: Category[];
  footerTagline: string;
  footerEmail: string;
  footerPhone: string;
  footerAddress: string;
  footerCopyright: string;
  promoLabel: string;
  promoTitle: string;
  promoHighlight: string;
  promoSubtitle: string;
  promoCta: string;
  currencyCode: string;
  currencySymbol: string;
  currencyPosition: "before" | "after";
};

type AppCtx = {
  user: User | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<string | null>;
  logout: () => void;
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  products: Product[];
  addProduct: (p: Omit<Product, "id">) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  settings: SiteSettings;
  updateSettings: (s: Partial<SiteSettings>) => Promise<void>;
  authOpen: boolean;
  setAuthOpen: (v: boolean) => void;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  allUsers: User[];
  toggleSaveItem: (productId: string) => void;
  orders: Order[];
  placeOrder: (deliveryLocation: string) => Promise<void>;
  purchaseProduct: (product: Product, deliveryLocation: string, qty?: number) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => Promise<void>;
  notifications: Notification[];
  markNotificationsRead: () => Promise<void>;
  unreadCount: number;
  formatMoney: (amount: number) => string;
  loading: boolean;
};

const AppContext = createContext<AppCtx | null>(null);

// ─── Constants ──────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: SiteSettings = {
  announcement: "Fait Main, Fait Avec Amour · Free shipping over $99",
  heroTitle: "Handcrafted\nWith Love",
  heroSubtitle: "Discover unique crochet wear & accessories made by hand, for you.",
  heroCta: "Shop Collection",
  heroImage: heroBannerImg,
  logoImage: newLogoImg,
  navLinks: ["Home", "Shop", "Crochet Wear", "Accessories", "Sale"],
  categories: [
    { id: "c1", name: "Crochet Wear", desc: "Handmade Elegance", image: "https://images.unsplash.com/photo-1533659828870-95ee305cee3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600" },
    { id: "c2", name: "Accessories", desc: "Finishing Touches", image: "https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600" },
    { id: "c3", name: "New In", desc: "Latest Drops", image: "https://images.unsplash.com/photo-1555529771-835f59fc5efe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600" },
    { id: "c4", name: "Sale", desc: "Special Offers", image: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600" },
  ],
  footerTagline: "Handcrafted crochet wear & accessories made with love, one stitch at a time.",
  footerEmail: "hello@atelier-angelique.com",
  footerPhone: "+1 (555) 123-4567",
  footerAddress: "Paris, France",
  footerCopyright: "© 2024 Atelier Angélique. All rights reserved.",
  promoLabel: "Limited Time",
  promoTitle: "Seasonal Sale",
  promoHighlight: "30% Off",
  promoSubtitle: "Each piece is unique — don't miss your favourite while it lasts.",
  promoCta: "Shop Sale",
  currencyCode: "USD",
  currencySymbol: "$",
  currencyPosition: "before",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Order placed",
  confirmed: "Confirmed",
  making: "Being handmade",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending", "confirmed", "making", "packed", "shipped", "delivered",
];

export const CURRENCY_OPTIONS = [
  { code: "USD", symbol: "$",  label: "USD - US Dollar" },
  { code: "GBP", symbol: "£",  label: "GBP - British Pound" },
  { code: "EUR", symbol: "€",  label: "EUR - Euro" },
  { code: "CAD", symbol: "C$", label: "CAD - Canadian Dollar" },
  { code: "NGN", symbol: "₦",  label: "NGN - Nigerian Naira" },
  { code: "GHS", symbol: "₵",  label: "GHS - Ghanaian Cedi" },
];

export function formatCurrencyAmount(
  amount: number,
  settings: Pick<SiteSettings, "currencySymbol" | "currencyPosition">
) {
  const value = amount.toFixed(2);
  return settings.currencyPosition === "after"
    ? `${value} ${settings.currencySymbol}`
    : `${settings.currencySymbol}${value}`;
}

// ─── Cart helpers (localStorage only — cart stays client-side) ─────────────────
function loadCart(): CartItem[] {
  try { const s = localStorage.getItem("aa_cart"); return s ? JSON.parse(s) : []; }
  catch { return []; }
}
function saveCart(cart: CartItem[]) {
  try { localStorage.setItem("aa_cart", JSON.stringify(cart)); } catch { /* ignore */ }
}

// ─── DB row → app type mappers ──────────────────────────────────────────────────
function rowToProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    image: row.image,
    images: row.images ?? [],
    badge: row.badge ?? undefined,
    description: row.description,
    stock: row.stock,
  };
}

function rowToOrder(row: any): Order {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    items: row.items ?? [],
    total: Number(row.total),
    deliveryLocation: row.delivery_location ?? "",
    placedAt: row.placed_at,
    status: row.status as OrderStatus,
    trackingHistory: row.tracking_history ?? [],
  };
}

function rowToNotification(row: any): Notification {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    at: row.at,
    read: row.read,
    userId: row.user_id,
  };
}

function rowToSettings(row: any): Partial<SiteSettings> {
  if (!row) return {};
  const pick = (val: any, fallback?: any) =>
    (val !== null && val !== undefined && val !== "") ? val : fallback;
  return {
    announcement:    pick(row.announcement),
    heroTitle:       pick(row.hero_title),
    heroSubtitle:    pick(row.hero_subtitle),
    heroCta:         pick(row.hero_cta),
    navLinks:        (row.nav_links?.length)   ? row.nav_links   : undefined,
    categories:      (row.categories?.length)  ? row.categories  : undefined,
    footerTagline:   pick(row.footer_tagline),
    footerEmail:     pick(row.footer_email),
    footerPhone:     pick(row.footer_phone),
    footerAddress:   pick(row.footer_address),
    footerCopyright: pick(row.footer_copyright),
    promoLabel:      pick(row.promo_label),
    promoTitle:      pick(row.promo_title),
    promoHighlight:  pick(row.promo_highlight),
    promoSubtitle:   pick(row.promo_subtitle),
    promoCta:        pick(row.promo_cta),
    currencyCode:    pick(row.currency_code),
    currencySymbol:  pick(row.currency_symbol),
    currencyPosition: pick(row.currency_position),
  };
}

// ─── Provider ──────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCartState] = useState<CartItem[]>(loadCart);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettingsState] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const setCart = (updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setCartState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveCart(next);
      return next;
    });
  };

  const formatMoney = (amount: number) => formatCurrencyAmount(amount, settings);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Bootstrap: auth listener + initial data load ────────────────────────────
  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) resolveProfile(session.user.id, session.user.email ?? "");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        resolveProfile(session.user.id, session.user.email ?? "");
      } else {
        setUser(null);
      }
    });

    loadPublicData();

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch admin-only data when user role changes
  useEffect(() => {
    if (user?.role === "admin") {
      loadAdminData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  // Re-fetch orders when user changes
  useEffect(() => {
    if (user) loadUserOrders(user.id, user.role === "admin");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function resolveProfile(uid: string, email: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();

    if (data) {
      setUser({
        id: uid,
        email,
        name: data.name,
        phone: data.phone,
        role: data.role,
        joinedAt: data.joined_at,
        lastSeen: data.last_seen,
        savedItems: data.saved_items ?? [],
        cartSnapshot: data.cart_snapshot ?? [],
      });
    }
    setLoading(false);
  }

  async function loadPublicData() {
    const [{ data: prods }, { data: settingsRow }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("site_settings").select("*").eq("id", 1).single(),
    ]);
    if (prods) setProducts(prods.map(rowToProduct));
    if (settingsRow) setSettingsState((prev) => ({ ...prev, ...rowToSettings(settingsRow) }));
    setLoading(false);
  }

  async function loadAdminData() {
    const [{ data: usersData }, { data: notifsData }] = await Promise.all([
      supabase.from("profiles").select("*").order("joined_at", { ascending: false }),
      supabase.from("notifications").select("*").order("at", { ascending: false }),
    ]);
    if (usersData) {
      setAllUsers(usersData.map((u: any) => ({
        id: u.id, name: u.name, email: u.email ?? "",
        phone: u.phone, role: u.role,
        joinedAt: u.joined_at, lastSeen: u.last_seen,
        savedItems: u.saved_items ?? [], cartSnapshot: u.cart_snapshot ?? [],
      })));
    }
    if (notifsData) setNotifications(notifsData.map(rowToNotification));
  }

  async function loadUserOrders(uid: string, isAdmin: boolean) {
    const query = supabase.from("orders").select("*").order("placed_at", { ascending: false });
    const { data } = isAdmin ? await query : await query.eq("user_id", uid);
    if (data) setOrders(data.map(rowToOrder));
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  };

  const register = async (
    name: string, email: string, password: string, phone?: string
  ): Promise<string | null> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone: phone ?? "", role: "user" } },
    });
    if (error) return error.message;
    if (data.user) {
      const now = new Date().toISOString();
      const notif = {
        id: `n-${Date.now()}`,
        type: "signup" as const,
        message: `${name} just created an account${phone ? ` (${phone})` : ""}.`,
        at: now,
        read: false,
        user_id: data.user.id,
      };
      await supabase.from("notifications").insert(notif);
    }
    return null;
  };

  const logout = useCallback(async () => {
    if (user) {
      const snapshot = cart.map((i) => ({
        productId: i.id, productName: i.name, qty: i.quantity, price: i.price,
      }));
      await supabase.from("profiles").update({
        cart_snapshot: snapshot,
        last_seen: new Date().toISOString(),
      }).eq("id", user.id);
    }
    await supabase.auth.signOut();
    setUser(null);
  }, [user, cart]);

  // ── Cart (client-side only) ─────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    setCart((p) => {
      const ex = p.find((i) => i.id === product.id);
      return ex
        ? p.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...p, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => setCart((p) => p.filter((i) => i.id !== id));

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart((p) => p.map((i) => i.id === id ? { ...i, quantity: qty } : i));
  };

  const clearCart = () => setCart([]);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  // ── Products ────────────────────────────────────────────────────────────────
  const addProduct = async (p: Omit<Product, "id">) => {
    const imgs = p.images?.length ? p.images : (p.image ? [p.image] : []);
    const row = {
      id: `p-${Date.now()}`,
      name: p.name, category: p.category,
      price: p.price, original_price: p.originalPrice ?? null,
      image: imgs[0] ?? "", images: imgs,
      badge: p.badge ?? null, description: p.description, stock: p.stock,
    };
    const { data, error } = await supabase.from("products").insert(row).select().single();
    if (!error && data) setProducts((prev) => [rowToProduct(data), ...prev]);
  };

  const updateProduct = async (p: Product) => {
    const imgs = p.images?.length ? p.images : (p.image ? [p.image] : []);
    const row = {
      name: p.name, category: p.category,
      price: p.price, original_price: p.originalPrice ?? null,
      image: imgs[0] ?? "", images: imgs,
      badge: p.badge ?? null, description: p.description, stock: p.stock,
    };
    const { data, error } = await supabase.from("products").update(row).eq("id", p.id).select().single();
    if (!error && data) setProducts((prev) => prev.map((x) => x.id === p.id ? rowToProduct(data) : x));
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) setProducts((prev) => prev.filter((x) => x.id !== id));
  };

  // ── Settings ────────────────────────────────────────────────────────────────
  const updateSettings = async (s: Partial<SiteSettings>) => {
    const dbRow: Record<string, unknown> = {};
    if (s.announcement    !== undefined) dbRow.announcement     = s.announcement;
    if (s.heroTitle       !== undefined) dbRow.hero_title       = s.heroTitle;
    if (s.heroSubtitle    !== undefined) dbRow.hero_subtitle    = s.heroSubtitle;
    if (s.heroCta         !== undefined) dbRow.hero_cta         = s.heroCta;
    if (s.navLinks        !== undefined) dbRow.nav_links        = s.navLinks;
    if (s.categories      !== undefined) dbRow.categories       = s.categories;
    if (s.footerTagline   !== undefined) dbRow.footer_tagline   = s.footerTagline;
    if (s.footerEmail     !== undefined) dbRow.footer_email     = s.footerEmail;
    if (s.footerPhone     !== undefined) dbRow.footer_phone     = s.footerPhone;
    if (s.footerAddress   !== undefined) dbRow.footer_address   = s.footerAddress;
    if (s.footerCopyright !== undefined) dbRow.footer_copyright = s.footerCopyright;
    if (s.promoLabel      !== undefined) dbRow.promo_label      = s.promoLabel;
    if (s.promoTitle      !== undefined) dbRow.promo_title      = s.promoTitle;
    if (s.promoHighlight  !== undefined) dbRow.promo_highlight  = s.promoHighlight;
    if (s.promoSubtitle   !== undefined) dbRow.promo_subtitle   = s.promoSubtitle;
    if (s.promoCta        !== undefined) dbRow.promo_cta        = s.promoCta;
    if (s.currencyCode    !== undefined) dbRow.currency_code    = s.currencyCode;
    if (s.currencySymbol  !== undefined) dbRow.currency_symbol  = s.currencySymbol;
    if (s.currencyPosition !== undefined) dbRow.currency_position = s.currencyPosition;

    if (Object.keys(dbRow).length > 0) {
      await supabase.from("site_settings").upsert({ id: 1, ...dbRow });
    }
    // heroImage and logoImage stay in memory only (they're bundled assets)
    setSettingsState((prev) => ({ ...prev, ...s }));
  };

  // ── Orders ──────────────────────────────────────────────────────────────────
  const placeOrder = async (deliveryLocation: string) => {
    if (!user || cart.length === 0) return;
    const items = cart.map((i) => ({
      productId: i.id, productName: i.name, qty: i.quantity, price: i.price,
    }));
    await createOrderInDB(items, cart.reduce((s, i) => s + i.quantity, 0), true, deliveryLocation);
  };

  const purchaseProduct = async (product: Product, deliveryLocation: string, qty = 1) => {
    if (!user) return;
    await createOrderInDB(
      [{ productId: product.id, productName: product.name, qty, price: product.price }],
      qty, false, deliveryLocation
    );
  };

  async function createOrderInDB(
    items: { productId: string; productName: string; qty: number; price: number }[],
    notificationItemCount: number,
    clearAfter: boolean,
    deliveryLocation: string,
  ) {
    if (!user || items.length === 0) return;
    const now = new Date().toISOString();
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const orderId = `ord-${Date.now()}`;
    const trackingHistory: OrderTrackingEvent[] = [{
      status: "pending",
      label: ORDER_STATUS_LABELS.pending,
      note: "Payment received. We received your order and are preparing the next step.",
      at: now,
    }];

    const row = {
      id: orderId,
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      items,
      total,
      delivery_location: deliveryLocation.trim(),
      placed_at: now,
      status: "pending",
      tracking_history: trackingHistory,
    };

    const { data, error } = await supabase.from("orders").insert(row).select().single();
    if (!error && data) {
      setOrders((prev) => [rowToOrder(data), ...prev]);
      // purchase notification
      const notif = {
        id: `n-${Date.now()}`,
        type: "purchase" as const,
        message: `${user.name} placed an order for ${formatMoney(total)} (${notificationItemCount} item${notificationItemCount !== 1 ? "s" : ""}) to ${deliveryLocation.trim()}.`,
        at: now,
        read: false,
        user_id: user.id,
      };
      const { data: nd } = await supabase.from("notifications").insert(notif).select().single();
      if (nd) setNotifications((prev) => [rowToNotification(nd), ...prev]);
      if (clearAfter) clearCart();
    }
  }

  const updateOrderStatus = async (orderId: string, status: OrderStatus, note?: string) => {
    const now = new Date().toISOString();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const label = ORDER_STATUS_LABELS[status];
    const event: OrderTrackingEvent = {
      status, label,
      note: note || (status === "cancelled"
        ? "This order was cancelled by the admin."
        : `Order status updated to ${label.toLowerCase()}.`),
      at: now,
    };
    const trackingHistory = [...(order.trackingHistory ?? []), event];
    const { data, error } = await supabase.from("orders")
      .update({ status, tracking_history: trackingHistory })
      .eq("id", orderId).select().single();
    if (!error && data) setOrders((prev) => prev.map((o) => o.id === orderId ? rowToOrder(data) : o));
  };

  // ── Notifications ────────────────────────────────────────────────────────────
  const markNotificationsRead = async () => {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // ── Saved items ──────────────────────────────────────────────────────────────
  const toggleSaveItem = async (productId: string) => {
    if (!user) return;
    const saved = user.savedItems.includes(productId)
      ? user.savedItems.filter((id) => id !== productId)
      : [...user.savedItems, productId];
    await supabase.from("profiles").update({ saved_items: saved }).eq("id", user.id);
    setUser((prev) => prev ? { ...prev, savedItems: saved } : prev);
  };

  return (
    <AppContext.Provider value={{
      user, login, register, logout,
      cart, addToCart, removeFromCart, updateQty, clearCart, cartTotal,
      products, addProduct, updateProduct, deleteProduct,
      settings, updateSettings,
      authOpen, setAuthOpen, cartOpen, setCartOpen,
      allUsers,
      toggleSaveItem,
      orders, placeOrder, purchaseProduct, updateOrderStatus,
      notifications, markNotificationsRead, unreadCount,
      formatMoney,
      loading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
