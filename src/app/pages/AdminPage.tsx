import { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, Package, DollarSign, Plus, Pencil, Trash2,
  X, Save, LogOut, ShoppingBag, TrendingUp, Search, AlertTriangle,
  Check, Upload, Menu, Settings, Image, Globe, Tag, ChevronUp,
  ChevronDown, GripVertical, RefreshCw, Eye, Layers, Users, Bell,
  UserCheck, UserX, ShoppingCart, Truck
} from "lucide-react";
import { useApp, Product, Category, SiteSettings, Order, User, OrderStatus, ORDER_STATUS_LABELS, CURRENCY_OPTIONS } from "../context/AppContext";
import { useNavigate } from "react-router";
import AuthModal from "../components/AuthModal";
import logoImg from "@/imports/file_000000003fc871f49445ac650550dbcd.png";

type Tab = "dashboard" | "orders" | "products" | "pricing" | "collections" | "users" | "site";
type SiteSubTab = "hero" | "promo" | "logo" | "footer" | "navigation" | "currency" | "general";

// ─── Helpers ────────────────────────────────────────────────────────────────────
function useImageUpload(onResult: (dataUrl: string) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const trigger = () => ref.current?.click();
  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        compressImageFile(file).then(onResult);
        e.target.value = "";
      }}
    />
  );
  return { trigger, input };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-['Poppins'] text-[10px] text-[#7a4060] tracking-widest uppercase mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-[#FFD1DC] focus:border-[#FF007F] bg-[#fff9fb] px-3 py-2.5 font-['Poppins'] text-sm text-[#2d1a26] outline-none transition-colors";

function compressImageFile(file: File, maxSize = 1000, quality = 0.72): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement("img");
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function ImageInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const { trigger, input } = useImageUpload(onChange);
  return (
    <Field label={label ?? "Image"}>
      <div className="space-y-2">
        <div className="flex gap-2">
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://... or upload" className={inputCls + " flex-1"} />
          <button type="button" onClick={trigger} title="Upload file"
            className="flex-shrink-0 px-3 bg-[#FFD1DC] hover:bg-[#FF6ECF] text-[#2d1a26] hover:text-white transition-colors flex items-center gap-1.5 font-['Poppins'] text-[10px] uppercase tracking-widest">
            <Upload size={12} /> Upload
          </button>
        </div>
        {value && (
          <img src={value} alt="preview" className="h-20 w-16 object-cover bg-[#FFD1DC]/20" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        )}
        {input}
      </div>
    </Field>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub?: string; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-white border border-[#FFD1DC] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-['Poppins'] text-[10px] text-[#7a4060] tracking-widest uppercase mb-1">{label}</p>
          <p className="font-['Playfair_Display'] text-2xl font-bold text-[#2d1a26]">{value}</p>
          {sub && <p className="font-['Poppins'] text-[10px] text-green-600 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
    </motion.div>
  );
}

const ADMIN_ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "making", "packed", "shipped", "delivered", "cancelled"];

function OrderStatusSelect({ order, onUpdate }: { order: Order; onUpdate: (orderId: string, status: OrderStatus) => void }) {
  return (
    <select
      value={order.status}
      onChange={(e) => onUpdate(order.id, e.target.value as OrderStatus)}
      className="bg-white border border-[#FFD1DC] font-['Poppins'] text-[10px] text-[#7a4060] px-2 py-1.5 outline-none cursor-pointer"
      title="Update customer tracker status"
    >
      {ADMIN_ORDER_STATUSES.map((status) => (
        <option key={status} value={status}>{ORDER_STATUS_LABELS[status]}</option>
      ))}
    </select>
  );
}

// ─── Product Modal ───────────────────────────────────────────────────────────────
const EMPTY_PRODUCT: Omit<Product, "id"> = { name: "", category: "Crochet Wear", price: 0, originalPrice: undefined, image: "", images: [], badge: undefined, description: "", stock: 0 };

function MultiImageUploader({ images, onChange }: { images: string[]; onChange: (imgs: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    Promise.all(files.map((file) => compressImageFile(file))).then((results) => onChange([...images, ...results.filter(Boolean)]));
    e.target.value = "";
  };

  const remove = (i: number) => onChange(images.filter((_, idx) => idx !== i));
  const moveUp = (i: number) => { if (i === 0) return; const a = [...images]; [a[i], a[i - 1]] = [a[i - 1], a[i]]; onChange(a); };

  return (
    <Field label="Product Images *">
      <div className="space-y-3">
        {/* Upload button */}
        <div className="flex gap-2">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 bg-[#FFD1DC] hover:bg-[#FF007F] text-[#2d1a26] hover:text-white transition-colors font-['Poppins'] text-[10px] uppercase tracking-widest px-4 py-2.5">
            <Upload size={13} /> Add Images
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          <span className="font-['Poppins'] text-[10px] text-[#7a4060] self-center">
            {images.length === 0 ? "No images yet" : `${images.length} image${images.length > 1 ? "s" : ""} · first is the cover`}
          </span>
        </div>

        {/* URL input for external images */}
        <div className="flex gap-2">
          <input
            placeholder="Or paste an image URL and press Enter"
            className={inputCls + " flex-1 text-xs"}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) { onChange([...images, val]); (e.target as HTMLInputElement).value = ""; }
              }
            }}
          />
        </div>

        {/* Thumbnails grid */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((src, i) => (
              <div key={i} className="relative group">
                <img src={src} alt={`img-${i}`} className={`w-16 h-20 object-cover bg-[#FFD1DC]/20 ${i === 0 ? "ring-2 ring-[#FF007F]" : ""}`}
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                {i === 0 && (
                  <span className="absolute top-0 left-0 bg-[#FF007F] text-white font-['Poppins'] text-[7px] px-1 py-0.5 uppercase tracking-wide">Cover</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  {i > 0 && (
                    <button type="button" onClick={() => moveUp(i)}
                      className="text-white bg-[#FF007F]/80 rounded-full w-5 h-5 flex items-center justify-center text-[9px]" title="Set as cover">
                      ★
                    </button>
                  )}
                  <button type="button" onClick={() => remove(i)}
                    className="text-white bg-black/60 rounded-full w-5 h-5 flex items-center justify-center" title="Remove">
                    <X size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Field>
  );
}

function ProductModal({ product, onSave, onClose }: { product: Partial<Product>; onSave: (p: any) => void; onClose: () => void }) {
  const isNew = !product.id;
  const { settings } = useApp();
  const categoryOptions = settings.categories.map(c => c.name);
  const defaultCategory = categoryOptions[0] ?? "Crochet Wear";

  const [form, setForm] = useState({
    ...EMPTY_PRODUCT,
    category: defaultCategory,
    ...product,
    images: product.images ?? (product.image ? [product.image] : [])
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    const savedProduct = { ...form, image: form.images[0] ?? "", id: product.id };
    onSave(savedProduct);
    setSaving(false);
    setSaved(true);
    setTimeout(onClose, 600);
  };

  const badges = ["", "New", "Sale", "Hot"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#FFD1DC] sticky top-0 bg-white z-10">
          <h2 className="font-['Playfair_Display'] text-lg font-bold text-[#2d1a26]">{isNew ? "Add Product" : "Edit Product"}</h2>
          <button onClick={onClose} className="text-[#7a4060] hover:text-[#FF007F] transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Product Name *">
                <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="e.g. Crochet Summer Dress" />
              </Field>
            </div>

            <Field label="Category *">
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls + " cursor-pointer appearance-none"}>
                {categoryOptions.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>

            <Field label="Badge">
              <select value={form.badge ?? ""} onChange={(e) => set("badge", e.target.value || undefined)} className={inputCls + " cursor-pointer appearance-none"}>
                {badges.map((b) => <option key={b} value={b}>{b || "None"}</option>)}
              </select>
            </Field>

            <Field label={`Price (${settings.currencySymbol}) *`}>
              <input type="number" required min={0} step={0.01} value={form.price} onChange={(e) => set("price", parseFloat(e.target.value) || 0)} className={inputCls} />
            </Field>

            <Field label={`Original / Compare Price (${settings.currencySymbol})`}>
              <input type="number" min={0} step={0.01} value={form.originalPrice ?? ""} onChange={(e) => set("originalPrice", parseFloat(e.target.value) || undefined)} placeholder="Leave blank if not on sale" className={inputCls} />
            </Field>

            <Field label="Stock *">
              <input type="number" required min={0} value={form.stock} onChange={(e) => set("stock", parseInt(e.target.value) || 0)} className={inputCls} />
            </Field>

            <div className="md:col-span-2">
              <Field label="Description">
                <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className={inputCls + " resize-none"} />
              </Field>
            </div>

            <div className="md:col-span-2">
              <MultiImageUploader images={form.images} onChange={(imgs) => set("images", imgs)} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <motion.button type="submit" disabled={saving || saved} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="flex-1 bg-[#FF007F] hover:bg-[#d4006a] disabled:opacity-60 text-white font-['Poppins'] text-[10px] tracking-widest uppercase py-3 flex items-center justify-center gap-2 transition-colors duration-200">
              {saved ? <><Check size={13} /> Saved!</> : saving ? "Saving..." : <><Save size={13} /> {isNew ? "Add Product" : "Save Changes"}</>}
            </motion.button>
            <button type="button" onClick={onClose} className="px-6 border border-[#FFD1DC] text-[#7a4060] font-['Poppins'] text-[10px] tracking-widest uppercase hover:border-[#FF6ECF] transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Pricing Tab ────────────────────────────────────────────────────────────────
function PricingTab({ products, updateProduct, formatMoney }: { products: Product[]; updateProduct: (p: Product) => void; formatMoney: (amount: number) => string }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, { price: string; orig: string }>>({});
  const [saved, setSaved] = useState<string | null>(null);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));

  const startEdit = (p: Product) => {
    setEditing(p.id);
    setPrices((prev) => ({ ...prev, [p.id]: { price: String(p.price), orig: String(p.originalPrice ?? "") } }));
  };

  const save = (p: Product) => {
    const d = prices[p.id];
    const newPrice = parseFloat(d?.price);
    if (isNaN(newPrice) || newPrice <= 0) return;
    updateProduct({ ...p, price: newPrice, originalPrice: d?.orig ? parseFloat(d.orig) : undefined });
    setEditing(null); setSaved(p.id); setTimeout(() => setSaved(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-white border border-[#FFD1DC] px-4 py-2.5">
        <Search size={15} className="text-[#FF6ECF]" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="flex-1 bg-transparent outline-none font-['Poppins'] text-sm placeholder-[#FF6ECF]/50" />
      </div>
      <div className="bg-white border border-[#FFD1DC] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#fff9fb] border-b border-[#FFD1DC]">
              <tr>
                {["Product", "Category", "Price", "Compare Price", "Action"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-['Poppins'] text-[9px] text-[#7a4060] tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FFD1DC]/50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-[#fff9fb] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt={p.name} className="w-9 h-11 object-cover bg-[#FFD1DC]/20 flex-shrink-0" />
                      <span className="font-['Poppins'] text-sm text-[#2d1a26] font-medium whitespace-nowrap">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="font-['Poppins'] text-[10px] text-[#FF007F] tracking-widest uppercase">{p.category}</span></td>
                  <td className="px-4 py-3">
                    {editing === p.id ? (
                      <input type="number" min={0} step={0.01} value={prices[p.id]?.price ?? ""} onChange={(e) => setPrices((prev) => ({ ...prev, [p.id]: { ...prev[p.id], price: e.target.value } }))}
                        className="w-24 border border-[#FF007F] bg-[#fff9fb] px-2 py-1 font-['Poppins'] text-sm outline-none" />
                    ) : <span className="font-['Poppins'] text-sm font-semibold text-[#2d1a26]">{formatMoney(p.price)}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {editing === p.id ? (
                      <input type="number" min={0} step={0.01} value={prices[p.id]?.orig ?? ""} onChange={(e) => setPrices((prev) => ({ ...prev, [p.id]: { ...prev[p.id], orig: e.target.value } }))}
                        placeholder="none" className="w-24 border border-[#FF007F] bg-[#fff9fb] px-2 py-1 font-['Poppins'] text-sm outline-none" />
                    ) : <span className="font-['Poppins'] text-sm text-[#7a4060]/60">{p.originalPrice ? formatMoney(p.originalPrice) : "—"}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {editing === p.id ? (
                      <div className="flex gap-2">
                        <button onClick={() => save(p)} className="bg-[#FF007F] text-white px-3 py-1.5 font-['Poppins'] text-[10px] hover:bg-[#d4006a] transition-colors">Save</button>
                        <button onClick={() => setEditing(null)} className="border border-[#FFD1DC] px-3 py-1.5 font-['Poppins'] text-[10px] text-[#7a4060] hover:border-[#FF6ECF] transition-colors">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(p)} className="flex items-center gap-1.5 font-['Poppins'] text-[10px] text-[#FF007F] hover:text-[#2d1a26] transition-colors">
                        {saved === p.id ? <><Check size={12} /> Saved</> : <><Pencil size={12} /> Edit</>}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-10"><p className="font-['Poppins'] text-sm text-[#7a4060]">No products found.</p></div>}
        </div>
      </div>
    </div>
  );
}

// ─── Collections Tab ────────────────────────────────────────────────────────────
function CollectionsTab() {
  const { settings, updateSettings } = useApp();
  const [cats, setCats] = useState<Category[]>(settings.categories);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateSettings({ categories: cats });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-['Poppins'] text-[#FF007F] text-[10px] tracking-[0.4em] uppercase mb-1">Store Front</p>
          <h2 className="font-['Playfair_Display'] text-[#2d1a26] text-xl font-bold">Collections</h2>
        </div>
        <button
          onClick={() => setCats((p) => [...p, { id: `c-${Date.now()}`, name: "New Collection", desc: "Description", image: "" }])}
          className="flex items-center gap-1.5 bg-[#FF007F] text-white font-['Poppins'] text-[10px] tracking-widest uppercase px-4 py-2.5 hover:bg-[#d4006a] transition-colors">
          <Plus size={12} /> Add Collection
        </button>
      </div>

      <p className="font-['Poppins'] text-xs text-[#7a4060]">
        These are the category cards shown in the "Browse by Collections" section on the store. Upload a new image to change what visitors see.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cats.map((cat, i) => (
          <motion.div key={cat.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-white border border-[#FFD1DC] overflow-hidden">
            {/* Image preview header */}
            <div className="relative h-36 bg-[#FFD1DC]/20 overflow-hidden">
              {cat.image ? (
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image size={28} className="text-[#FFD1DC]" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              <div className="absolute bottom-2 left-3 text-white">
                <p className="font-['Playfair_Display'] text-sm font-semibold">{cat.name || "Unnamed"}</p>
                <p className="font-['Poppins'] text-[10px] text-white/70">{cat.desc}</p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Title">
                  <input value={cat.name} onChange={(e) => setCats((p) => p.map((c) => c.id === cat.id ? { ...c, name: e.target.value } : c))}
                    className={inputCls} placeholder="e.g. Crochet Wear" />
                </Field>
                <Field label="Subtitle">
                  <input value={cat.desc} onChange={(e) => setCats((p) => p.map((c) => c.id === cat.id ? { ...c, desc: e.target.value } : c))}
                    className={inputCls} placeholder="e.g. Handmade Elegance" />
                </Field>
              </div>

              {/* Image upload */}
              <Field label="Collection Image">
                <CollectionImageUploader
                  value={cat.image}
                  onChange={(url) => setCats((p) => p.map((c) => c.id === cat.id ? { ...c, image: url } : c))}
                />
              </Field>

              <button onClick={() => setCats((p) => p.filter((c) => c.id !== cat.id))}
                className="flex items-center gap-1 font-['Poppins'] text-[10px] text-[#7a4060] hover:text-[#FF007F] transition-colors uppercase tracking-widest">
                <Trash2 size={11} /> Remove
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <button onClick={handleSave}
        className="flex items-center gap-2 bg-[#FF007F] hover:bg-[#d4006a] text-white font-['Poppins'] text-[10px] tracking-widest uppercase px-6 py-3 transition-colors">
        {saved ? <><Check size={13} /> Saved!</> : <><Save size={13} /> Save Collections</>}
      </button>
    </div>
  );
}

function CollectionImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImageFile(file).then(onChange);
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://... or upload below"
          className={inputCls + " flex-1 text-xs"} />
        <button type="button" onClick={() => fileRef.current?.click()}
          className="flex-shrink-0 flex items-center gap-1.5 bg-[#FFD1DC] hover:bg-[#FF007F] text-[#2d1a26] hover:text-white transition-colors font-['Poppins'] text-[10px] uppercase tracking-widest px-3 py-2">
          <Upload size={12} /> Upload
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── Site Settings Tab ──────────────────────────────────────────────────────────
function SiteTab() {
  const { settings, updateSettings } = useApp();
  const [sub, setSub] = useState<SiteSubTab>("hero");
  const [heroForm, setHeroForm] = useState<typeof settings>({ ...settings });
  const [saved, setSaved] = useState<string | null>(null);
  const [cats, setCats] = useState<Category[]>(settings.categories);
  const [navLinks, setNavLinks] = useState<string[]>(settings.navLinks);
  const [newLink, setNewLink] = useState("");

  const save = (section: string, data: Partial<SiteSettings>) => {
    updateSettings(data);
    setSaved(section);
    setTimeout(() => setSaved(null), 2000);
  };

  const { trigger: triggerHeroUpload, input: heroUploadInput } = useImageUpload((url) => setHeroForm((f) => ({ ...f, heroImage: url })));
  const { trigger: triggerCatUpload, input: catUploadInput } = useImageUpload(() => {});

  const subTabs: { id: SiteSubTab; label: string; icon: React.ElementType }[] = [
    { id: "hero", label: "Hero Banner", icon: Image },
    { id: "promo", label: "Promo Banner", icon: Tag },
    { id: "logo", label: "Logo", icon: RefreshCw },
    { id: "footer", label: "Footer", icon: Globe },
    { id: "navigation", label: "Navigation", icon: Settings },
    { id: "currency", label: "Currency", icon: DollarSign },
    { id: "general", label: "Overview", icon: Eye },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex gap-1 flex-wrap bg-white border border-[#FFD1DC] p-1">
        {subTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSub(id)}
            className={`flex items-center gap-1.5 px-4 py-2 font-['Poppins'] text-[10px] tracking-widest uppercase transition-all ${sub === id ? "bg-[#FF007F] text-white" : "text-[#7a4060] hover:bg-[#FFD1DC]/40"}`}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Hero Banner */}
      {sub === "hero" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-[#FFD1DC] p-6 space-y-4">
          <h3 className="font-['Playfair_Display'] text-base font-bold text-[#2d1a26]">Hero Banner Settings</h3>

          <Field label="Announcement Bar Text">
            <input value={heroForm.announcement} onChange={(e) => setHeroForm((f) => ({ ...f, announcement: e.target.value }))} className={inputCls} />
          </Field>

          <Field label="Hero Title (use \\n for new line / italic line)">
            <textarea value={heroForm.heroTitle} onChange={(e) => setHeroForm((f) => ({ ...f, heroTitle: e.target.value }))} rows={2} className={inputCls + " resize-none"} />
          </Field>

          <Field label="Hero Subtitle">
            <textarea value={heroForm.heroSubtitle} onChange={(e) => setHeroForm((f) => ({ ...f, heroSubtitle: e.target.value }))} rows={2} className={inputCls + " resize-none"} />
          </Field>

          <Field label="CTA Button Text">
            <input value={heroForm.heroCta} onChange={(e) => setHeroForm((f) => ({ ...f, heroCta: e.target.value }))} className={inputCls} />
          </Field>

          <Field label="Hero Background Image">
            <div className="space-y-2">
              <div className="flex gap-2">
                <input value={heroForm.heroImage} onChange={(e) => setHeroForm((f) => ({ ...f, heroImage: e.target.value }))} placeholder="https://... or upload" className={inputCls + " flex-1"} />
                <button type="button" onClick={triggerHeroUpload} className="flex-shrink-0 px-3 bg-[#FFD1DC] hover:bg-[#FF007F] text-[#2d1a26] hover:text-white transition-colors flex items-center gap-1.5 font-['Poppins'] text-[10px] uppercase tracking-widest">
                  <Upload size={12} /> Upload
                </button>
              </div>
              {heroForm.heroImage && <img src={heroForm.heroImage} alt="hero preview" className="h-24 w-40 object-cover bg-[#FFD1DC]/20" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
              {heroUploadInput}
            </div>
          </Field>

          <Field label="Footer Tagline">
            <textarea value={heroForm.footerTagline} onChange={(e) => setHeroForm((f) => ({ ...f, footerTagline: e.target.value }))} rows={2} className={inputCls + " resize-none"} />
          </Field>

          <button onClick={() => save("hero", { announcement: heroForm.announcement, heroTitle: heroForm.heroTitle, heroSubtitle: heroForm.heroSubtitle, heroCta: heroForm.heroCta, heroImage: heroForm.heroImage, footerTagline: heroForm.footerTagline })}
            className="flex items-center gap-2 bg-[#FF007F] hover:bg-[#d4006a] text-white font-['Poppins'] text-[10px] tracking-widest uppercase px-6 py-2.5 transition-colors">
            {saved === "hero" ? <><Check size={13} /> Saved!</> : <><Save size={13} /> Save Banner</>}
          </button>
        </motion.div>
      )}

      {/* Categories */}
      {sub === "categories" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-['Playfair_Display'] text-base font-bold text-[#2d1a26]">Category Cards</h3>
            <button onClick={() => { const newCat: Category = { id: `c-${Date.now()}`, name: "New Category", desc: "Description", image: "" }; setCats((p) => [...p, newCat]); }}
              className="flex items-center gap-1.5 bg-[#FF007F] text-white font-['Poppins'] text-[10px] tracking-widest uppercase px-4 py-2 hover:bg-[#d4006a] transition-colors">
              <Plus size={12} /> Add
            </button>
          </div>

          {cats.map((cat, i) => (
            <div key={cat.id} className="bg-white border border-[#FFD1DC] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-['Poppins'] text-xs font-semibold text-[#2d1a26]">{cat.name || "Category " + (i + 1)}</span>
                <button onClick={() => setCats((p) => p.filter((c) => c.id !== cat.id))} className="text-[#7a4060] hover:text-[#FF007F] transition-colors"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Name">
                  <input value={cat.name} onChange={(e) => setCats((p) => p.map((c) => c.id === cat.id ? { ...c, name: e.target.value } : c))} className={inputCls} />
                </Field>
                <Field label="Description">
                  <input value={cat.desc} onChange={(e) => setCats((p) => p.map((c) => c.id === cat.id ? { ...c, desc: e.target.value } : c))} className={inputCls} />
                </Field>
                <div className="md:col-span-2">
                  <ImageInput label="Image" value={cat.image} onChange={(url) => setCats((p) => p.map((c) => c.id === cat.id ? { ...c, image: url } : c))} />
                </div>
              </div>
            </div>
          ))}

          <button onClick={() => save("categories", { categories: cats })}
            className="flex items-center gap-2 bg-[#FF007F] hover:bg-[#d4006a] text-white font-['Poppins'] text-[10px] tracking-widest uppercase px-6 py-2.5 transition-colors">
            {saved === "categories" ? <><Check size={13} /> Saved!</> : <><Save size={13} /> Save Categories</>}
          </button>
        </motion.div>
      )}

      {/* Navigation */}
      {sub === "navigation" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-[#FFD1DC] p-6 space-y-4">
          <h3 className="font-['Playfair_Display'] text-base font-bold text-[#2d1a26]">Navigation Links</h3>
          <p className="font-['Poppins'] text-xs text-[#7a4060]">These links appear in the header and footer. Drag to reorder (or use the buttons).</p>

          <div className="space-y-2">
            {navLinks.map((link, i) => (
              <div key={i} className="flex items-center gap-2 bg-[#fff9fb] border border-[#FFD1DC] px-3 py-2">
                <GripVertical size={14} className="text-[#FFD1DC] flex-shrink-0" />
                <input value={link} onChange={(e) => setNavLinks((p) => p.map((l, j) => j === i ? e.target.value : l))} className="flex-1 bg-transparent outline-none font-['Poppins'] text-sm text-[#2d1a26]" />
                <div className="flex gap-1">
                  <button onClick={() => setNavLinks((p) => { const a = [...p]; [a[i], a[i - 1]] = [a[i - 1], a[i]]; return a; })} disabled={i === 0} className="p-1 text-[#7a4060] hover:text-[#FF007F] disabled:opacity-30 transition-colors"><ChevronUp size={13} /></button>
                  <button onClick={() => setNavLinks((p) => { const a = [...p]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a; })} disabled={i === navLinks.length - 1} className="p-1 text-[#7a4060] hover:text-[#FF007F] disabled:opacity-30 transition-colors"><ChevronDown size={13} /></button>
                  <button onClick={() => setNavLinks((p) => p.filter((_, j) => j !== i))} className="p-1 text-[#7a4060] hover:text-[#FF007F] transition-colors"><X size={13} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input value={newLink} onChange={(e) => setNewLink(e.target.value)} placeholder="New link label..." className={inputCls + " flex-1"} onKeyDown={(e) => { if (e.key === "Enter" && newLink.trim()) { setNavLinks((p) => [...p, newLink.trim()]); setNewLink(""); } }} />
            <button onClick={() => { if (newLink.trim()) { setNavLinks((p) => [...p, newLink.trim()]); setNewLink(""); } }}
              className="px-4 bg-[#FFD1DC] hover:bg-[#FF6ECF] text-[#2d1a26] hover:text-white transition-colors font-['Poppins'] text-[10px] uppercase tracking-widest flex items-center gap-1">
              <Plus size={12} /> Add
            </button>
          </div>

          <button onClick={() => save("navigation", { navLinks })}
            className="flex items-center gap-2 bg-[#FF007F] hover:bg-[#d4006a] text-white font-['Poppins'] text-[10px] tracking-widest uppercase px-6 py-2.5 transition-colors">
            {saved === "navigation" ? <><Check size={13} /> Saved!</> : <><Save size={13} /> Save Navigation</>}
          </button>
        </motion.div>
      )}

      {/* Promo Banner */}
      {sub === "promo" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-[#FFD1DC] p-6 space-y-4">
          <h3 className="font-['Playfair_Display'] text-base font-bold text-[#2d1a26]">Promo Banner</h3>
          <p className="font-['Poppins'] text-xs text-[#7a4060]">The full-width dark banner between the product grid and newsletter sections.</p>

          {/* Live mini preview */}
          <div className="rounded overflow-hidden border border-[#FFD1DC]">
            <div className="bg-[#2d1a26] px-6 py-8 text-center space-y-2">
              <p className="font-['Poppins'] text-[#FF6ECF] text-[9px] tracking-[0.3em] uppercase">{heroForm.promoLabel || "Limited Time"}</p>
              <p className="font-['Playfair_Display'] text-white text-xl font-bold leading-tight">
                Up to <span className="text-[#FF6ECF]">{heroForm.promoHighlight || "30% Off"}</span>{" "}{heroForm.promoTitle || "Seasonal Sale"}
              </p>
              <p className="font-['Poppins'] text-white/50 text-xs">{heroForm.promoSubtitle || "Each piece is unique..."}</p>
              <div className="inline-flex items-center gap-2 bg-[#FF007F] text-white font-['Poppins'] text-[9px] tracking-widest uppercase px-5 py-2 mt-1">
                {heroForm.promoCta || "Shop Sale"} →
              </div>
            </div>
          </div>

          <Field label="Label (above headline)">
            <input value={heroForm.promoLabel ?? ""} onChange={(e) => setHeroForm((f) => ({ ...f, promoLabel: e.target.value }))} className={inputCls} placeholder="e.g. Limited Time" />
          </Field>

          <Field label="Headline — Main Title">
            <input value={heroForm.promoTitle ?? ""} onChange={(e) => setHeroForm((f) => ({ ...f, promoTitle: e.target.value }))} className={inputCls} placeholder="e.g. Seasonal Sale" />
          </Field>

          <Field label="Headline — Highlighted Text (shown in pink)">
            <input value={heroForm.promoHighlight ?? ""} onChange={(e) => setHeroForm((f) => ({ ...f, promoHighlight: e.target.value }))} className={inputCls} placeholder="e.g. 30% Off" />
          </Field>

          <Field label="Subtitle">
            <textarea value={heroForm.promoSubtitle ?? ""} onChange={(e) => setHeroForm((f) => ({ ...f, promoSubtitle: e.target.value }))} rows={2} className={inputCls + " resize-none"} placeholder="e.g. Each piece is unique — don't miss your favourite while it lasts." />
          </Field>

          <Field label="Button Text">
            <input value={heroForm.promoCta ?? ""} onChange={(e) => setHeroForm((f) => ({ ...f, promoCta: e.target.value }))} className={inputCls} placeholder="e.g. Shop Sale" />
          </Field>

          <button onClick={() => save("promo", {
            promoLabel: heroForm.promoLabel,
            promoTitle: heroForm.promoTitle,
            promoHighlight: heroForm.promoHighlight,
            promoSubtitle: heroForm.promoSubtitle,
            promoCta: heroForm.promoCta,
          })} className="flex items-center gap-2 bg-[#FF007F] hover:bg-[#d4006a] text-white font-['Poppins'] text-[10px] tracking-widest uppercase px-6 py-2.5 transition-colors">
            {saved === "promo" ? <><Check size={13} /> Saved!</> : <><Save size={13} /> Save Promo Banner</>}
          </button>
        </motion.div>
      )}

      {/* Logo */}
      {sub === "logo" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-[#FFD1DC] p-6 space-y-5">
          <h3 className="font-['Playfair_Display'] text-base font-bold text-[#2d1a26]">Logo</h3>
          <p className="font-['Poppins'] text-xs text-[#7a4060]">This logo appears in the header navbar, footer, hero watermark, promo banner, and newsletter section.</p>

          {/* Current preview */}
          <div className="flex gap-6 flex-wrap">
            <div className="space-y-1">
              <p className="font-['Poppins'] text-[9px] text-[#7a4060] tracking-widest uppercase">Header (light bg)</p>
              <div className="bg-white border border-[#FFD1DC] p-3 w-40 flex items-center justify-center">
                <img src={heroForm.logoImage ?? settings.logoImage} alt="logo preview" className="h-12 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-['Poppins'] text-[9px] text-[#7a4060] tracking-widest uppercase">Footer (dark bg)</p>
              <div className="bg-[#2d1a26] border border-[#FFD1DC] p-3 w-40 flex items-center justify-center">
                <img src={heroForm.logoImage ?? settings.logoImage} alt="logo preview dark" className="h-12 object-contain" style={{ filter: "brightness(0) invert(1)" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            </div>
          </div>

          <Field label="Upload New Logo">
            <div className="space-y-2">
              <div className="flex gap-2">
                <input value={heroForm.logoImage ?? ""} onChange={(e) => setHeroForm((f) => ({ ...f, logoImage: e.target.value }))}
                  placeholder="https://... or upload" className={inputCls + " flex-1"} />
                <button type="button" onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file"; input.accept = "image/*";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    compressImageFile(file).then((url) => setHeroForm((f) => ({ ...f, logoImage: url })));
                  };
                  input.click();
                }} className="flex-shrink-0 px-3 bg-[#FFD1DC] hover:bg-[#FF007F] text-[#2d1a26] hover:text-white transition-colors flex items-center gap-1.5 font-['Poppins'] text-[10px] uppercase tracking-widest">
                  <Upload size={12} /> Upload
                </button>
              </div>
            </div>
          </Field>

          <button onClick={() => save("logo", { logoImage: heroForm.logoImage })}
            className="flex items-center gap-2 bg-[#FF007F] hover:bg-[#d4006a] text-white font-['Poppins'] text-[10px] tracking-widest uppercase px-6 py-2.5 transition-colors">
            {saved === "logo" ? <><Check size={13} /> Saved!</> : <><Save size={13} /> Save Logo</>}
          </button>
        </motion.div>
      )}

      {/* Footer */}
      {sub === "footer" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-[#FFD1DC] p-6 space-y-4">
          <h3 className="font-['Playfair_Display'] text-base font-bold text-[#2d1a26]">Footer Settings</h3>

          <Field label="Tagline">
            <textarea value={heroForm.footerTagline ?? ""} onChange={(e) => setHeroForm((f) => ({ ...f, footerTagline: e.target.value }))} rows={2} className={inputCls + " resize-none"} placeholder="Handcrafted with love..." />
          </Field>

          <Field label="Email Address">
            <input value={heroForm.footerEmail ?? ""} onChange={(e) => setHeroForm((f) => ({ ...f, footerEmail: e.target.value }))} className={inputCls} placeholder="hello@yourstore.com" />
          </Field>

          <Field label="Phone Number">
            <input value={heroForm.footerPhone ?? ""} onChange={(e) => setHeroForm((f) => ({ ...f, footerPhone: e.target.value }))} className={inputCls} placeholder="+1 (555) 123-4567" />
          </Field>

          <Field label="Address">
            <input value={heroForm.footerAddress ?? ""} onChange={(e) => setHeroForm((f) => ({ ...f, footerAddress: e.target.value }))} className={inputCls} placeholder="Paris, France" />
          </Field>

          <Field label="Copyright Text">
            <input value={heroForm.footerCopyright ?? ""} onChange={(e) => setHeroForm((f) => ({ ...f, footerCopyright: e.target.value }))} className={inputCls} placeholder="© 2024 Your Store. All rights reserved." />
          </Field>

          <button onClick={() => save("footer", {
            footerTagline: heroForm.footerTagline,
            footerEmail: heroForm.footerEmail,
            footerPhone: heroForm.footerPhone,
            footerAddress: heroForm.footerAddress,
            footerCopyright: heroForm.footerCopyright,
          })} className="flex items-center gap-2 bg-[#FF007F] hover:bg-[#d4006a] text-white font-['Poppins'] text-[10px] tracking-widest uppercase px-6 py-2.5 transition-colors">
            {saved === "footer" ? <><Check size={13} /> Saved!</> : <><Save size={13} /> Save Footer</>}
          </button>
        </motion.div>
      )}

      {/* Currency */}
      {sub === "currency" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-[#FFD1DC] p-6 space-y-4">
          <h3 className="font-['Playfair_Display'] text-base font-bold text-[#2d1a26]">Currency Settings</h3>
          <p className="font-['Poppins'] text-xs text-[#7a4060]">Controls product prices, cart totals, order history, and admin revenue displays.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Currency">
              <select
                value={heroForm.currencyCode}
                onChange={(e) => {
                  const option = CURRENCY_OPTIONS.find((currency) => currency.code === e.target.value);
                  setHeroForm((f) => ({ ...f, currencyCode: e.target.value, currencySymbol: option?.symbol ?? f.currencySymbol }));
                }}
                className={inputCls + " cursor-pointer"}
              >
                {CURRENCY_OPTIONS.map((currency) => (
                  <option key={currency.code} value={currency.code}>{currency.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Symbol">
              <input value={heroForm.currencySymbol} onChange={(e) => setHeroForm((f) => ({ ...f, currencySymbol: e.target.value }))} className={inputCls} />
            </Field>

            <Field label="Symbol Position">
              <select value={heroForm.currencyPosition} onChange={(e) => setHeroForm((f) => ({ ...f, currencyPosition: e.target.value as SiteSettings["currencyPosition"] }))} className={inputCls + " cursor-pointer"}>
                <option value="before">Before amount</option>
                <option value="after">After amount</option>
              </select>
            </Field>
          </div>

          <div className="bg-[#fff9fb] border border-[#FFD1DC] p-4">
            <p className="font-['Poppins'] text-[10px] text-[#7a4060] tracking-widest uppercase mb-1">Preview</p>
            <p className="font-['Playfair_Display'] text-2xl font-bold text-[#2d1a26]">
              {heroForm.currencyPosition === "after" ? `48.00 ${heroForm.currencySymbol}` : `${heroForm.currencySymbol}48.00`}
            </p>
          </div>

          <button onClick={() => save("currency", {
            currencyCode: heroForm.currencyCode,
            currencySymbol: heroForm.currencySymbol,
            currencyPosition: heroForm.currencyPosition,
          })} className="flex items-center gap-2 bg-[#FF007F] hover:bg-[#d4006a] text-white font-['Poppins'] text-[10px] tracking-widest uppercase px-6 py-2.5 transition-colors">
            {saved === "currency" ? <><Check size={13} /> Saved!</> : <><Save size={13} /> Save Currency</>}
          </button>
        </motion.div>
      )}

      {/* General / Preview */}
      {sub === "general" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-white border border-[#FFD1DC] p-6 space-y-4">
            <h3 className="font-['Playfair_Display'] text-base font-bold text-[#2d1a26]">Settings Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[
                { label: "Announcement", value: settings.announcement },
                { label: "Hero Title", value: settings.heroTitle.replace("\n", " / ") },
                { label: "CTA Button", value: settings.heroCta },
                { label: "Nav Links", value: settings.navLinks.join(", ") },
                { label: "Categories", value: settings.categories.map((c) => c.name).join(", ") },
                { label: "Currency", value: `${settings.currencyCode} (${settings.currencySymbol})` },
                { label: "Footer Tagline", value: settings.footerTagline },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#fff9fb] border border-[#FFD1DC] p-3">
                  <p className="font-['Poppins'] text-[9px] text-[#7a4060] tracking-widest uppercase mb-1">{label}</p>
                  <p className="font-['Poppins'] text-xs text-[#2d1a26] line-clamp-2">{value}</p>
                </div>
              ))}
            </div>
            <a href="/" target="_blank" className="inline-flex items-center gap-2 border border-[#FFD1DC] hover:border-[#FF007F] text-[#7a4060] hover:text-[#FF007F] font-['Poppins'] text-[10px] uppercase tracking-widest px-4 py-2.5 transition-colors">
              <Eye size={13} /> Preview Store
            </a>
          </div>

          <div className="bg-[#fff0f5] border border-[#FFD1DC] p-4">
            <p className="font-['Poppins'] text-xs text-[#7a4060]">
              <strong className="text-[#FF007F]">Admin credentials:</strong> admin@angelique.com / Angelique123
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Users Tab ──────────────────────────────────────────────────────────────────
function UsersTab({ allUsers, orders, updateOrderStatus, formatMoney }: {
  allUsers: User[];
  orders: Order[];
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  formatMoney: (amount: number) => string;
}) {
  const [userSearch, setUserSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "with-bag" | "with-orders" | "today">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "orders">("newest");

  const customerOrders = (userId: string) => orders.filter(o => o.userId === userId);
  const baseUsers = allUsers.filter(u => u.role !== "admin");

  const filteredUsers = baseUsers
    .filter(u => {
      const q = userSearch.toLowerCase();
      const matchQ = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || (u.phone ?? "").toLowerCase().includes(q);
      if (!matchQ) return false;
      if (filterType === "with-bag") return (u.cartSnapshot?.length ?? 0) > 0;
      if (filterType === "with-orders") return customerOrders(u.id).length > 0;
      if (filterType === "today") return new Date(u.joinedAt ?? 0).toDateString() === new Date().toDateString();
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.joinedAt ?? 0).getTime() - new Date(a.joinedAt ?? 0).getTime();
      if (sortBy === "oldest") return new Date(a.joinedAt ?? 0).getTime() - new Date(b.joinedAt ?? 0).getTime();
      if (sortBy === "name") return (a.name ?? "").localeCompare(b.name ?? "");
      if (sortBy === "orders") return customerOrders(b.id).length - customerOrders(a.id).length;
      return 0;
    });

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={String(baseUsers.length)} color="bg-[#FF007F]" />
        <StatCard icon={ShoppingCart} label="With Items in Bag" value={String(baseUsers.filter(u => (u.cartSnapshot?.length ?? 0) > 0).length)} color="bg-[#2d1a26]" />
        <StatCard icon={ShoppingBag} label="Have Ordered" value={String(baseUsers.filter(u => customerOrders(u.id).length > 0).length)} color="bg-[#FF6ECF]" />
        <StatCard icon={UserCheck} label="Joined Today" value={String(baseUsers.filter(u => new Date(u.joinedAt ?? 0).toDateString() === new Date().toDateString()).length)} color="bg-amber-400" />
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-[#FFD1DC] px-3 py-2 flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="text-[#FF6ECF] flex-shrink-0" />
          <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
            placeholder="Search name, email or phone..."
            className="flex-1 bg-transparent outline-none font-['Poppins'] text-sm placeholder-[#FF6ECF]/50" />
          {userSearch && <button onClick={() => setUserSearch("")}><X size={12} className="text-[#FF6ECF]" /></button>}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {([["all", "All"], ["with-bag", "Has Bag"], ["with-orders", "Ordered"], ["today", "Today"]] as const).map(([val, label]) => (
            <button key={val} onClick={() => setFilterType(val)}
              className={`font-['Poppins'] text-[10px] tracking-widest uppercase px-3 py-2 border transition-all ${filterType === val ? "bg-[#FF007F] text-white border-[#FF007F]" : "text-[#7a4060] border-[#FFD1DC] hover:border-[#FF6ECF]"}`}>
              {label}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="bg-white border border-[#FFD1DC] font-['Poppins'] text-xs text-[#7a4060] px-3 py-2 outline-none cursor-pointer">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
          <option value="orders">Most orders</option>
        </select>
      </div>

      {/* Users table */}
      <div className="bg-white border border-[#FFD1DC] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#FFD1DC]">
          <p className="font-['Poppins'] text-[10px] text-[#7a4060]">
            Showing <strong className="text-[#FF007F]">{filteredUsers.length}</strong> of {baseUsers.length} user{baseUsers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#fff9fb] border-b border-[#FFD1DC]">
              <tr>
                {["User", "Email", "Phone", "Joined", "Last Seen", "Orders", "Bag"].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-['Poppins'] text-[9px] text-[#7a4060] tracking-widest uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FFD1DC]/40">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <UserX size={28} className="mx-auto text-[#FFD1DC] mb-2" />
                    <p className="font-['Poppins'] text-sm text-[#7a4060]">
                      {baseUsers.length === 0 ? "No users have signed up yet." : "No users match this filter."}
                    </p>
                  </td>
                </tr>
              ) : filteredUsers.map(u => {
                const uOrders = customerOrders(u.id);
                const orderTotal = uOrders.reduce((s, o) => s + o.total, 0);
                return (
                  <tr key={u.id} className="hover:bg-[#fff9fb] transition-colors">
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#FFD1DC] flex items-center justify-center flex-shrink-0">
                          <span className="font-['Poppins'] text-[10px] text-[#FF007F] font-bold">{u.name?.[0]?.toUpperCase() ?? "?"}</span>
                        </div>
                        <div>
                          <p className="font-['Poppins'] text-sm text-[#2d1a26] font-medium whitespace-nowrap">{u.name}</p>
                          {orderTotal > 0 && <p className="font-['Poppins'] text-[9px] text-green-600">{formatMoney(orderTotal)} spent</p>}
                        </div>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3 font-['Poppins'] text-xs text-[#7a4060] whitespace-nowrap">{u.email}</td>
                    {/* Phone */}
                    <td className="px-4 py-3 font-['Poppins'] text-xs text-[#7a4060] whitespace-nowrap">
                      {u.phone ? u.phone : <span className="text-[#FFD1DC]">—</span>}
                    </td>
                    {/* Joined */}
                    <td className="px-4 py-3 font-['Poppins'] text-[10px] text-[#7a4060] whitespace-nowrap">
                      {u.joinedAt ? new Date(u.joinedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    {/* Last seen */}
                    <td className="px-4 py-3 font-['Poppins'] text-[10px] text-[#7a4060] whitespace-nowrap">
                      {u.lastSeen ? new Date(u.lastSeen).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    {/* Orders */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {uOrders.length === 0 ? (
                        <span className="font-['Poppins'] text-[10px] text-[#7a4060]/40">None</span>
                      ) : (
                        <div className="space-y-2">
                          <span className="font-['Poppins'] text-[10px] px-2 py-0.5 bg-green-50 text-green-700 inline-block">
                            {uOrders.length} order{uOrders.length !== 1 ? "s" : ""}
                          </span>
                          {uOrders.slice(0, 2).map((order) => (
                            <div key={order.id} className="flex items-center gap-2">
                              <Truck size={12} className="text-[#FF007F] flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="font-['Poppins'] text-[9px] text-[#2d1a26] truncate">{order.id} · {formatMoney(order.total)}</p>
                                <OrderStatusSelect order={order} onUpdate={updateOrderStatus} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    {/* Bag snapshot */}
                    <td className="px-4 py-3">
                      {(u.cartSnapshot?.length ?? 0) === 0 ? (
                        <span className="font-['Poppins'] text-[10px] text-[#7a4060]/40">Empty</span>
                      ) : (
                        <div className="space-y-0.5">
                          {u.cartSnapshot.slice(0, 2).map((item, i) => (
                            <p key={i} className="font-['Poppins'] text-[10px] text-[#2d1a26] whitespace-nowrap">
                              {item.qty}× <span className="text-[#7a4060]">{item.productName}</span>
                              <span className="text-[#FF007F] ml-1">{formatMoney(item.price * item.qty)}</span>
                            </p>
                          ))}
                          {u.cartSnapshot.length > 2 && (
                            <p className="font-['Poppins'] text-[9px] text-[#7a4060]/60">+{u.cartSnapshot.length - 2} more</p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Page ─────────────────────────────────────────────────────────────
function OrdersTab({ orders, updateOrderStatus, formatMoney }: {
  orders: Order[];
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  formatMoney: (amount: number) => string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
    return orders
      .filter((order) => {
        const placed = new Date(order.placedAt).getTime();
        if (status !== "all" && order.status !== status) return false;
        if (from !== null && placed < from) return false;
        if (to !== null && placed > to) return false;
        if (!q) return true;
        return [order.id, order.userName, order.userEmail, order.deliveryLocation, ...order.items.map((item) => item.productName)]
          .some((value) => value?.toLowerCase().includes(q));
      })
      .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());
  }, [orders, query, status, fromDate, toDate]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="All Orders" value={String(orders.length)} color="bg-[#FF007F]" />
        <StatCard icon={Truck} label="Shipped" value={String(orders.filter((o) => o.status === "shipped").length)} color="bg-[#2d1a26]" />
        <StatCard icon={Check} label="Delivered" value={String(orders.filter((o) => o.status === "delivered").length)} color="bg-green-600" />
        <StatCard icon={DollarSign} label="Filtered Revenue" value={formatMoney(filteredOrders.reduce((s, o) => s + o.total, 0))} color="bg-amber-400" />
      </div>

      <div className="bg-white border border-[#FFD1DC] p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-3">
          <div className="flex items-center gap-3 bg-[#fff9fb] border border-[#FFD1DC] px-3 py-2.5">
            <Search size={15} className="text-[#FF6ECF]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search order, customer, product, delivery location..."
              className="flex-1 bg-transparent outline-none font-['Poppins'] text-sm placeholder-[#FF6ECF]/50" />
            {query && <button onClick={() => setQuery("")}><X size={13} className="text-[#FF6ECF]" /></button>}
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus | "all")}
            className="bg-[#fff9fb] border border-[#FFD1DC] font-['Poppins'] text-xs text-[#7a4060] px-3 py-2.5 outline-none">
            <option value="all">All statuses</option>
            {ADMIN_ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="bg-[#fff9fb] border border-[#FFD1DC] font-['Poppins'] text-xs text-[#7a4060] px-3 py-2.5 outline-none" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="bg-[#fff9fb] border border-[#FFD1DC] font-['Poppins'] text-xs text-[#7a4060] px-3 py-2.5 outline-none" />
        </div>
        <p className="font-['Poppins'] text-[10px] text-[#7a4060]">
          Showing <strong className="text-[#FF007F]">{filteredOrders.length}</strong> of {orders.length} order{orders.length !== 1 ? "s" : ""}.
        </p>
      </div>

      <div className="bg-white border border-[#FFD1DC] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#fff9fb] border-b border-[#FFD1DC]">
              <tr>
                {["Order", "Customer", "Items", "Delivery Location", "Date", "Total", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-['Poppins'] text-[9px] text-[#7a4060] tracking-widest uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FFD1DC]/40">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <ShoppingBag size={30} className="mx-auto text-[#FFD1DC] mb-2" />
                    <p className="font-['Poppins'] text-sm text-[#7a4060]">No orders match your filters.</p>
                  </td>
                </tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-[#fff9fb] transition-colors align-top">
                  <td className="px-4 py-3">
                    <p className="font-['Poppins'] text-xs text-[#2d1a26] font-semibold whitespace-nowrap">{order.id}</p>
                    <p className="font-['Poppins'] text-[10px] text-[#7a4060]">{ORDER_STATUS_LABELS[order.status]}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-['Poppins'] text-xs text-[#2d1a26] font-medium whitespace-nowrap">{order.userName}</p>
                    <p className="font-['Poppins'] text-[10px] text-[#7a4060] whitespace-nowrap">{order.userEmail}</p>
                  </td>
                  <td className="px-4 py-3 min-w-[180px]">
                    {order.items.map((item) => (
                      <p key={item.productId} className="font-['Poppins'] text-[10px] text-[#2d1a26]">
                        {item.qty}x <span className="text-[#7a4060]">{item.productName}</span>
                      </p>
                    ))}
                  </td>
                  <td className="px-4 py-3 min-w-[240px]">
                    <p className="font-['Poppins'] text-xs text-[#2d1a26] leading-relaxed">{order.deliveryLocation}</p>
                  </td>
                  <td className="px-4 py-3 font-['Poppins'] text-[10px] text-[#7a4060] whitespace-nowrap">
                    {new Date(order.placedAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 font-['Poppins'] text-sm font-semibold text-[#FF007F] whitespace-nowrap">{formatMoney(order.total)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <OrderStatusSelect order={order} onUpdate={updateOrderStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, logout, products, addProduct, updateProduct, deleteProduct, authOpen, setAuthOpen, allUsers, orders, updateOrderStatus, notifications, markNotificationsRead, unreadCount, formatMoney } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [modalProduct, setModalProduct] = useState<Partial<Product> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#fff9fb] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
          <img src={logoImg} alt="Atelier Angélique" className="h-20 mx-auto mb-6 object-contain" />
          <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[#2d1a26] mb-2">Admin Panel</h1>
          <p className="font-['Poppins'] text-[#7a4060] text-sm mb-6">Sign in with your admin credentials to continue.</p>
          <button onClick={() => setAuthOpen(true)} className="bg-[#FF007F] hover:bg-[#d4006a] text-white font-['Poppins'] text-xs tracking-widest uppercase px-8 py-3.5 transition-colors duration-200">
            Sign In
          </button>
          <p className="font-['Poppins'] text-xs text-[#7a4060] mt-4">
            <button onClick={() => navigate("/")} className="text-[#FF007F] hover:underline">← Back to Store</button>
          </p>
        </motion.div>
        <AnimatePresence>
          {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#fff9fb] flex items-center justify-center px-4">
        <div className="text-center">
          <AlertTriangle size={36} className="mx-auto text-[#FF007F] mb-3" />
          <h1 className="font-['Playfair_Display'] text-xl font-bold text-[#2d1a26] mb-2">Access Denied</h1>
          <p className="font-['Poppins'] text-[#7a4060] text-sm mb-4">You don&apos;t have admin privileges.</p>
          <button onClick={() => navigate("/")} className="text-[#FF007F] font-['Poppins'] text-sm hover:underline">← Back to Store</button>
        </div>
      </div>
    );
  }

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));

  const sidebarItems: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "products", label: "Products", icon: Package },
    { id: "pricing", label: "Pricing", icon: DollarSign },
    { id: "collections", label: "Collections", icon: Layers },
    { id: "users", label: "Users", icon: Users },
    { id: "site", label: "Site Settings", icon: Settings },
  ];

  const SidebarContent = () => {
    const { settings } = useApp();
    return (
    <aside className="w-56 bg-[#2d1a26] min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-[#FF007F]/20">
        <img src={settings.logoImage} alt="Atelier Angélique" className="h-10 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
        <p className="font-['Poppins'] text-white/30 text-[9px] tracking-widest uppercase mt-1">Admin Panel</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {sidebarItems.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setTab(id); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 font-['Poppins'] text-[10px] tracking-widest uppercase transition-all ${tab === id ? "bg-[#FF007F] text-white" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
        <a href="/" target="_blank" className="w-full flex items-center gap-3 px-3 py-2.5 font-['Poppins'] text-[10px] text-white/30 hover:text-[#FF6ECF] uppercase tracking-widest transition-colors">
          <ShoppingBag size={14} /> View Store
        </a>
        <button onClick={() => { logout(); navigate("/"); }} className="w-full flex items-center gap-3 px-3 py-2.5 font-['Poppins'] text-[10px] text-white/30 hover:text-[#FF007F] uppercase tracking-widest transition-colors">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );
  };

  return (
    <div className="min-h-screen bg-[#fff9fb] flex">
      {/* Desktop sidebar */}
      <div className="hidden md:block flex-shrink-0"><SidebarContent /></div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="fixed left-0 top-0 h-full z-50 md:hidden">
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-[#FFD1DC] px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1 text-[#7a4060]" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            <div>
              <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#2d1a26] capitalize">
                {tab === "site" ? "Site Settings" : tab === "collections" ? "Collections" : tab === "users" ? "Users" : tab === "orders" ? "Orders" : tab}
              </h2>
              <p className="font-['Poppins'] text-[9px] text-[#7a4060] uppercase tracking-widest hidden sm:block">Atelier Angélique Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <div className="relative">
              <button onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) markNotificationsRead(); }}
                className="relative p-1.5 text-[#7a4060] hover:text-[#FF007F] transition-colors">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FF007F] text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div initial={{ opacity: 0, y: -8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#FFD1DC] shadow-xl z-50 max-h-96 overflow-y-auto">
                    <div className="px-4 py-3 border-b border-[#FFD1DC] flex items-center justify-between">
                      <p className="font-['Poppins'] text-xs font-semibold text-[#2d1a26] uppercase tracking-widest">Notifications</p>
                      <button onClick={() => setNotifOpen(false)}><X size={14} className="text-[#7a4060]" /></button>
                    </div>
                    {notifications.length === 0 ? (
                      <p className="font-['Poppins'] text-xs text-[#7a4060] text-center py-6">No notifications yet.</p>
                    ) : notifications.slice(0, 20).map((n) => (
                      <div key={n.id} className={`px-4 py-3 border-b border-[#FFD1DC]/40 flex items-start gap-3 ${n.read ? "opacity-60" : "bg-[#fff0f5]"}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === "purchase" ? "bg-[#FF007F]/10" : "bg-[#FFD1DC]"}`}>
                          {n.type === "purchase" ? <ShoppingCart size={12} className="text-[#FF007F]" /> : <UserCheck size={12} className="text-[#7a4060]" />}
                        </div>
                        <div>
                          <p className="font-['Poppins'] text-xs text-[#2d1a26]">{n.message}</p>
                          <p className="font-['Poppins'] text-[10px] text-[#7a4060] mt-0.5">
                            {new Date(n.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="w-8 h-8 bg-[#FF007F] rounded-full flex items-center justify-center">
              <span className="font-['Poppins'] text-white text-xs font-bold">{user.name[0].toUpperCase()}</span>
            </div>
            <span className="hidden sm:block font-['Poppins'] text-sm text-[#2d1a26] font-medium">{user.name}</span>
          </div>
        </header>

        <main className="p-4 md:p-6 space-y-6">
          {/* Dashboard */}
          {tab === "dashboard" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Package} label="Products" value={String(products.length)} color="bg-[#FF007F]" />
                <StatCard icon={Users} label="Customers" value={String(allUsers.filter(u => u.role !== "admin").length)} color="bg-[#2d1a26]" />
                <StatCard icon={ShoppingBag} label="Orders" value={String(orders.length)} color="bg-[#FF6ECF]" />
                <StatCard icon={DollarSign} label="Revenue" value={formatMoney(orders.reduce((s, o) => s + o.total, 0))} color="bg-amber-400" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent notifications */}
                <div className="bg-white border border-[#FFD1DC]">
                  <div className="px-5 py-4 border-b border-[#FFD1DC] flex items-center justify-between">
                    <h3 className="font-['Playfair_Display'] text-base font-semibold text-[#2d1a26] flex items-center gap-2">
                      <Bell size={15} className="text-[#FF007F]" /> Activity
                    </h3>
                    {unreadCount > 0 && (
                      <span className="bg-[#FF007F] text-white font-['Poppins'] text-[9px] px-2 py-0.5 uppercase tracking-widest">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-[#FFD1DC]/40 max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="font-['Poppins'] text-xs text-[#7a4060] text-center py-8">No activity yet.</p>
                    ) : notifications.slice(0, 10).map((n) => (
                      <div key={n.id} className={`px-4 py-3 flex items-start gap-3 ${!n.read ? "bg-[#fff0f5]" : ""}`}>
                        <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${n.type === "purchase" ? "bg-[#FF007F]/10" : "bg-[#FFD1DC]"}`}>
                          {n.type === "purchase" ? <ShoppingCart size={12} className="text-[#FF007F]" /> : <UserCheck size={12} className="text-[#7a4060]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-['Poppins'] text-xs text-[#2d1a26]">{n.message}</p>
                          <p className="font-['Poppins'] text-[10px] text-[#7a4060] mt-0.5">
                            {new Date(n.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-[#FF007F] flex-shrink-0 mt-1" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent orders */}
                <div className="bg-white border border-[#FFD1DC]">
                  <div className="px-5 py-4 border-b border-[#FFD1DC] flex items-center justify-between">
                    <h3 className="font-['Playfair_Display'] text-base font-semibold text-[#2d1a26]">Recent Orders</h3>
                    <button onClick={() => setTab("orders")} className="font-['Poppins'] text-[10px] text-[#FF007F] hover:underline uppercase tracking-widest">View Orders</button>
                  </div>
                  <div className="divide-y divide-[#FFD1DC]/40 max-h-72 overflow-y-auto">
                    {orders.length === 0 ? (
                      <p className="font-['Poppins'] text-xs text-[#7a4060] text-center py-8">No orders yet.</p>
                    ) : orders.slice(0, 8).map((o) => (
                      <div key={o.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#FFD1DC] flex-shrink-0 flex items-center justify-center">
                          <span className="font-['Poppins'] text-[10px] text-[#FF007F] font-bold">{o.userName[0]?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-['Poppins'] text-xs text-[#2d1a26] font-medium truncate">{o.userName}</p>
                          <p className="font-['Poppins'] text-[10px] text-[#7a4060]">
                            {o.items.length} item{o.items.length !== 1 ? "s" : ""} · {new Date(o.placedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-['Poppins'] text-sm font-semibold text-[#FF007F]">{formatMoney(o.total)}</span>
                          <OrderStatusSelect order={o} onUpdate={updateOrderStatus} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Products table */}
              <div className="bg-white border border-[#FFD1DC]">
                <div className="px-5 py-4 border-b border-[#FFD1DC] flex items-center justify-between">
                  <h3 className="font-['Playfair_Display'] text-base font-semibold text-[#2d1a26]">Products</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setSearch(""); setTab("products"); setModalProduct({}); }} className="flex items-center gap-1.5 bg-[#FF007F] text-white font-['Poppins'] text-[10px] tracking-widest uppercase px-3 py-1.5 hover:bg-[#d4006a] transition-colors">
                      <Plus size={11} /> Add
                    </button>
                    <button onClick={() => setTab("products")} className="font-['Poppins'] text-[10px] text-[#FF007F] hover:underline uppercase tracking-widest">View All</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#fff9fb] border-b border-[#FFD1DC]">
                      <tr>{["Product", "Category", "Price", "Stock", "Badge"].map((h) => <th key={h} className="text-left px-4 py-3 font-['Poppins'] text-[9px] text-[#7a4060] tracking-widest uppercase">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-[#FFD1DC]/40">
                      {products.slice(0, 6).map((p) => (
                        <tr key={p.id} className="hover:bg-[#fff9fb]">
                          <td className="px-4 py-3"><div className="flex items-center gap-3"><img src={p.image} alt={p.name} className="w-8 h-10 object-cover bg-[#FFD1DC]/20" /><span className="font-['Poppins'] text-sm text-[#2d1a26]">{p.name}</span></div></td>
                          <td className="px-4 py-3"><span className="font-['Poppins'] text-[9px] text-[#FF007F] tracking-widest uppercase">{p.category}</span></td>
                          <td className="px-4 py-3 font-['Poppins'] text-sm font-semibold text-[#2d1a26]">{formatMoney(p.price)}</td>
                          <td className="px-4 py-3"><span className={`font-['Poppins'] text-[10px] px-2 py-0.5 ${p.stock < 10 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>{p.stock}</span></td>
                          <td className="px-4 py-3">{p.badge ? <span className="font-['Poppins'] text-[9px] tracking-widest uppercase px-2 py-0.5 bg-[#FFD1DC]/60 text-[#FF007F]">{p.badge}</span> : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* Orders */}
          {tab === "orders" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <OrdersTab orders={orders} updateOrderStatus={updateOrderStatus} formatMoney={formatMoney} />
            </motion.div>
          )}

          {/* Products */}
          {tab === "products" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-between">
                <div className="flex items-center gap-3 bg-white border border-[#FFD1DC] px-4 py-2.5 flex-1 max-w-sm">
                  <Search size={15} className="text-[#FF6ECF]" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="flex-1 bg-transparent outline-none font-['Poppins'] text-sm placeholder-[#FF6ECF]/50" />
                  {search && <button onClick={() => setSearch("")}><X size={13} className="text-[#FF6ECF]" /></button>}
                </div>
                <button onClick={() => setModalProduct({})} className="flex items-center gap-2 bg-[#FF007F] hover:bg-[#d4006a] text-white font-['Poppins'] text-[10px] tracking-widest uppercase px-5 py-2.5 transition-colors flex-shrink-0">
                  <Plus size={13} /> Add Product
                </button>
              </div>

              <div className="bg-white border border-[#FFD1DC] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#fff9fb] border-b border-[#FFD1DC]">
                      <tr>{["Product", "Category", "Price / Compare", "Stock", "Badge", "Actions"].map((h) => <th key={h} className="text-left px-4 py-3 font-['Poppins'] text-[9px] text-[#7a4060] tracking-widest uppercase whitespace-nowrap">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-[#FFD1DC]/40">
                      {filtered.map((p) => (
                        <tr key={p.id} className="hover:bg-[#fff9fb] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img src={p.image} alt={p.name} className="w-9 h-11 object-cover bg-[#FFD1DC]/20 flex-shrink-0" />
                              <div>
                                <p className="font-['Poppins'] text-sm text-[#2d1a26] font-medium whitespace-nowrap">{p.name}</p>
                                <p className="font-['Poppins'] text-[10px] text-[#7a4060] truncate max-w-[140px]">{p.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap"><span className="font-['Poppins'] text-[9px] text-[#FF007F] tracking-widest uppercase">{p.category}</span></td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-['Poppins'] text-sm font-semibold text-[#2d1a26]">{formatMoney(p.price)}</span>
                            {p.originalPrice && <span className="font-['Poppins'] text-[10px] text-[#7a4060]/50 line-through ml-1">{formatMoney(p.originalPrice)}</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`font-['Poppins'] text-[10px] px-2 py-0.5 ${p.stock < 10 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>{p.stock} units</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {p.badge ? <span className="font-['Poppins'] text-[9px] tracking-widest uppercase px-2 py-0.5 bg-[#FFD1DC]/60 text-[#FF007F]">{p.badge}</span> : <span className="text-[#7a4060]">—</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button onClick={() => setModalProduct(p)} className="p-1.5 text-[#7a4060] hover:text-[#FF007F] transition-colors" title="Edit"><Pencil size={14} /></button>
                              <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 text-[#7a4060] hover:text-[#FF007F] transition-colors" title="Delete"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length === 0 && <div className="text-center py-12">
                    <Package size={32} className="mx-auto text-[#FFD1DC] mb-3" />
                    <p className="font-['Poppins'] text-sm text-[#7a4060] mb-3">No products yet.</p>
                    <button onClick={() => setModalProduct({})} className="inline-flex items-center gap-2 bg-[#FF007F] text-white font-['Poppins'] text-[10px] tracking-widest uppercase px-5 py-2.5 hover:bg-[#d4006a] transition-colors">
                      <Plus size={13} /> Add Your First Product
                    </button>
                  </div>}
                </div>
              </div>
            </motion.div>
          )}

          {/* Pricing */}
          {tab === "pricing" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="font-['Poppins'] text-sm text-[#7a4060] mb-4">Update prices and sale prices inline — changes save immediately to the store.</p>
              <PricingTab products={products} updateProduct={updateProduct} formatMoney={formatMoney} />
            </motion.div>
          )}

          {/* Collections */}
          {tab === "collections" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <CollectionsTab />
            </motion.div>
          )}

          {/* Users */}
          {tab === "users" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <UsersTab allUsers={allUsers} orders={orders} updateOrderStatus={updateOrderStatus} formatMoney={formatMoney} />
            </motion.div>
          )}

          {/* Site Settings */}
          {tab === "site" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="font-['Poppins'] text-sm text-[#7a4060] mb-4">Control every piece of content your customers see on the storefront.</p>
              <SiteTab />
            </motion.div>
          )}
        </main>
      </div>

      {/* Product Modal */}
      <AnimatePresence>
        {modalProduct !== null && (
          <ProductModal
            product={modalProduct}
            onSave={(p) => { if (p.id) updateProduct(p); else addProduct(p); }}
            onClose={() => setModalProduct(null)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white p-6 max-w-sm w-full shadow-2xl border border-[#FFD1DC]">
              <Trash2 size={24} className="text-[#FF007F] mb-3" />
              <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#2d1a26] mb-2">Delete Product?</h3>
              <p className="font-['Poppins'] text-sm text-[#7a4060] mb-4">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => { deleteProduct(deleteConfirm); setDeleteConfirm(null); }} className="flex-1 bg-[#FF007F] text-white font-['Poppins'] text-[10px] tracking-widest uppercase py-2.5 hover:bg-[#d4006a] transition-colors">Delete</button>
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 border border-[#FFD1DC] text-[#7a4060] font-['Poppins'] text-[10px] tracking-widest uppercase py-2.5 hover:border-[#FF6ECF] transition-colors">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
