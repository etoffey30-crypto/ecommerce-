import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, ShoppingBag, User, Menu, X, Heart,
  Star, Instagram, Facebook, Twitter, Mail, Phone, MapPin,
  ArrowRight, Minus, Plus, Trash2, ChevronDown, ChevronRight, Home,
  ReceiptText, Clock, PackageCheck, Truck, CheckCircle2
} from "lucide-react";
import { useApp, Product, ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, Order } from "../context/AppContext";
import AuthModal from "../components/AuthModal";

// ─── Types & Constants ─────────────────────────────────────────────────────────
// CategoryFilter is now dynamic — "all" is reserved, everything else is a category name
type CategoryFilter = string; // "all" | any category name from settings.categories

function scrollToGrid() {
  requestAnimationFrame(() => {
    const el = document.getElementById("product-grid");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// ─── Breadcrumb ────────────────────────────────────────────────────────────────
function Breadcrumb({ activeFilter, onNavigate }: { activeFilter: CategoryFilter; onNavigate: (f: CategoryFilter) => void }) {
  if (activeFilter === "all") return null;
  return (
    <motion.nav
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      className="flex items-center gap-1.5 font-['Poppins'] text-[11px] text-[#7a4060] mb-6"
      aria-label="Breadcrumb"
    >
      <button onClick={() => onNavigate("all")} className="flex items-center gap-1 hover:text-[#FF007F] transition-colors">
        <Home size={11} /> Home
      </button>
      <ChevronRight size={10} className="text-[#FFD1DC]" />
      <span className="text-[#7a4060]/60">Collections</span>
      <ChevronRight size={10} className="text-[#FFD1DC]" />
      <span className="text-[#FF007F] font-semibold">{activeFilter}</span>
    </motion.nav>
  );
}

// ─── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onSearch, activeFilter, onFilterChange, onAccountOpen }: {
  onSearch: (q: string) => void;
  activeFilter: CategoryFilter;
  onFilterChange: (f: CategoryFilter) => void;
  onAccountOpen: () => void;
}) {
  const { cart, user, logout, setAuthOpen, setCartOpen, settings } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  function handleNavClick(link: string) {
    setMenuOpen(false);
    if (link === "Home") {
      onFilterChange("all");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (link === "Shop") {
      onFilterChange("all");
      scrollToGrid();
      return;
    }
    // Match nav link to a category by name (case-insensitive)
    const matched = settings.categories.find(
      (c) => c.name.toLowerCase() === link.toLowerCase()
    );
    if (matched) {
      onFilterChange(matched.name);
      scrollToGrid();
    } else {
      // fallback — treat as "all"
      onFilterChange("all");
      scrollToGrid();
    }
  }

  return (
    <>
      <div className="bg-[#FF007F] text-white text-center py-2 text-[11px] tracking-widest uppercase font-['Poppins']">
        {settings.announcement}
      </div>
      <nav className="sticky top-0 z-40 bg-white border-b border-[#FFD1DC] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 md:h-20">
            <button className="md:hidden p-2 text-[#FF007F]" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <a href="/" className="flex items-center">
              <motion.img src={settings.logoImage} alt="Atelier Angélique" className="h-12 md:h-14 w-auto object-contain"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} />
            </a>
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              {settings.navLinks.map((link) => {
                const matched = settings.categories.find(c => c.name.toLowerCase() === link.toLowerCase());
                const isActive = matched ? matched.name === activeFilter : false;
                return (
                  <button key={link} onClick={() => handleNavClick(link)}
                    className={`font-['Poppins'] text-xs tracking-widest uppercase transition-all duration-200 pb-0.5 border-b-2
                      ${isActive
                        ? "text-[#FF007F] border-[#FF007F] font-semibold"
                        : "text-[#2d1a26]/70 border-transparent hover:text-[#FF007F] hover:border-[#FF6ECF]"}`}>
                    {link}
                  </button>
                );
              })}
            </div>
            {/* Icons */}
            <div className="flex items-center gap-2 md:gap-3">
              <button className="p-1.5 text-[#2d1a26]/70 hover:text-[#FF007F] transition-colors" onClick={() => setSearchOpen(!searchOpen)}>
                <Search size={19} />
              </button>
              {user ? (
                <div className="relative group">
                  <button className="p-1.5 flex items-center gap-1 text-[#2d1a26]/70 hover:text-[#FF007F] transition-colors">
                    <User size={19} /><ChevronDown size={12} className="hidden md:block" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#FFD1DC] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 rounded-sm overflow-hidden z-50">
                    <p className="px-4 py-2 font-['Poppins'] text-[10px] text-[#7a4060] tracking-wide uppercase border-b border-[#FFD1DC]">{user.name}</p>
                    {user.role === "admin" && (
                      <a href={`${import.meta.env.BASE_URL}admin`} className="block px-4 py-2.5 font-['Poppins'] text-xs text-[#2d1a26] hover:bg-[#fff0f5] hover:text-[#FF007F] transition-colors">✦ Admin Panel</a>
                    )}
                    <button onClick={onAccountOpen} className="w-full text-left px-4 py-2.5 font-['Poppins'] text-xs text-[#2d1a26] hover:bg-[#fff0f5] hover:text-[#FF007F] transition-colors">Purchases & Tracking</button>
                    <button onClick={logout} className="w-full text-left px-4 py-2.5 font-['Poppins'] text-xs text-[#2d1a26] hover:bg-[#fff0f5] hover:text-[#FF007F] transition-colors">Sign Out</button>
                  </div>
                </div>
              ) : (
                <button className="p-1.5 text-[#2d1a26]/70 hover:text-[#FF007F] transition-colors" onClick={() => setAuthOpen(true)}>
                  <User size={19} />
                </button>
              )}
              <button className="p-1.5 text-[#2d1a26]/70 hover:text-[#FF007F] transition-colors relative" onClick={() => setCartOpen(true)}>
                <ShoppingBag size={19} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#FF007F] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{cartCount}</span>
                )}
              </button>
            </div>
          </div>
          {/* Search slide */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-[#FFD1DC]">
                <div className="py-3 flex items-center gap-3">
                  <Search size={16} className="text-[#FF6ECF]" />
                  <input autoFocus type="text" value={searchQ}
                    onChange={(e) => { setSearchQ(e.target.value); onSearch(e.target.value); }}
                    placeholder="Search handmade pieces..."
                    className="flex-1 bg-transparent outline-none font-['Poppins'] text-sm text-[#2d1a26] placeholder-[#FF6ECF]/60" />
                  {searchQ && <button onClick={() => { setSearchQ(""); onSearch(""); }}><X size={15} className="text-[#FF6ECF]" /></button>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="md:hidden bg-white border-t border-[#FFD1DC] px-4 pb-4">
              {settings.navLinks.map((link) => {
                const matched = settings.categories.find(c => c.name.toLowerCase() === link.toLowerCase());
                const isActive = matched ? matched.name === activeFilter : false;
                return (
                  <button key={link} onClick={() => handleNavClick(link)}
                    className={`w-full text-left block py-3 font-['Poppins'] text-xs tracking-widest uppercase border-b border-[#FFD1DC]/50 transition-colors
                      ${isActive ? "text-[#FF007F] font-semibold" : "text-[#2d1a26]/70 hover:text-[#FF007F]"}`}>
                    {link}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────────
function HeroBanner({ onShopClick }: { onShopClick: () => void }) {
  const { settings } = useApp();
  const lines = settings.heroTitle.split("\n");
  return (
    <section className="relative h-[85vh] min-h-[520px] overflow-hidden bg-[#2d1a26]">
      <img src={settings.heroImage} alt="Hero" className="absolute inset-0 w-full h-full object-cover opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#2d1a26]/80 via-[#2d1a26]/30 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
        <img src={settings.logoImage} alt="" className="w-64 md:w-80 object-contain" />
      </div>
      <div className="relative h-full max-w-7xl mx-auto px-6 flex flex-col justify-center">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.2 }}>
          <p className="font-['Poppins'] text-[#FF6ECF] text-[10px] tracking-[0.4em] uppercase mb-4">Fait Main · Fait Avec Amour</p>
          <h1 className="font-['Playfair_Display'] text-white text-5xl md:text-7xl font-bold leading-tight mb-6 max-w-xl">
            {lines.map((line, i) => (
              <span key={i} className={i === 1 ? "block italic font-normal text-[#FF6ECF]" : "block"}>{line}</span>
            ))}
          </h1>
          <p className="font-['Poppins'] text-white/65 text-sm md:text-base mb-8 max-w-md leading-relaxed">{settings.heroSubtitle}</p>
          <div className="flex flex-wrap gap-4">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
              onClick={onShopClick}
              className="bg-[#FF007F] hover:bg-[#d4006a] text-white font-['Poppins'] text-xs tracking-widest uppercase px-8 py-3.5 transition-colors duration-200 flex items-center gap-2">
              {settings.heroCta} <ArrowRight size={14} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}
              className="border border-[#FF6ECF]/60 text-white hover:bg-[#FF007F]/10 font-['Poppins'] text-xs tracking-widest uppercase px-8 py-3.5 transition-colors duration-200">
              Our Story
            </motion.button>
          </div>
        </motion.div>
      </div>
      <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
        <div className="w-px h-8 bg-white" />
        <ChevronDown size={13} className="text-white" />
      </motion.div>
    </section>
  );
}

// ─── Categories ────────────────────────────────────────────────────────────────
function CategorySection({ activeFilter, onFilterChange }: {
  activeFilter: CategoryFilter;
  onFilterChange: (f: CategoryFilter) => void;
}) {
  const { settings } = useApp();

  function handleCardClick(catName: string) {
    onFilterChange(catName);
    scrollToGrid();
  }

  return (
    <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-12">
        <p className="font-['Poppins'] text-[#FF007F] text-[10px] tracking-[0.4em] uppercase mb-3">Browse by</p>
        <h2 className="font-['Playfair_Display'] text-[#2d1a26] text-3xl md:text-4xl font-bold">Collections</h2>
      </motion.div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {settings.categories.map((cat, i) => {
          const isActive = cat.name === activeFilter;
          return (
            <motion.div key={cat.id}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
              onClick={() => handleCardClick(cat.name)}
              className="group relative overflow-hidden cursor-pointer select-none"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <div className="aspect-[3/4] overflow-hidden">
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              </div>
              {isActive && <div className="absolute inset-0 ring-2 ring-inset ring-[#FF007F] pointer-events-none z-10" />}
              <div className={`absolute inset-0 transition-opacity duration-300 ${isActive ? "bg-gradient-to-t from-[#FF007F]/60 via-[#2d1a26]/20 to-transparent" : "bg-gradient-to-t from-[#2d1a26]/75 via-[#2d1a26]/20 to-transparent"}`} />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-10">
                <h3 className="font-['Playfair_Display'] text-base md:text-lg font-semibold">{cat.name}</h3>
                <p className="font-['Poppins'] text-[10px] text-white/60 mt-0.5">{cat.desc}</p>
                <div className={`flex items-center gap-1 mt-2 text-[#FF6ECF] text-[10px] font-['Poppins'] tracking-wide transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                  {isActive ? "Browsing ✓" : "Shop Now"} <ChevronRight size={11} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Product Card ───────────────────────────────────────────────────────────────
function ProductCard({ product, onAddToCart, onPurchase }: { product: Product; onAddToCart: () => void; onPurchase: () => void }) {
  const { formatMoney } = useApp();
  const [liked, setLiked] = useState(false);
  const [added, setAdded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const intervalRef = useState<ReturnType<typeof setInterval> | null>(null);

  const images = product.images?.length ? product.images : (product.image ? [product.image] : []);
  const hasMultiple = images.length > 1;

  const handleMouseEnter = () => {
    setHovered(true);
    if (!hasMultiple) return;
    let i = 1;
    const id = setInterval(() => {
      setActiveImg(i % images.length);
      i++;
    }, 1800);
    (intervalRef as any)[0] = id;
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setActiveImg(0);
    if ((intervalRef as any)[0]) { clearInterval((intervalRef as any)[0]); (intervalRef as any)[0] = null; }
  };

  const handleAdd = () => { onAddToCart(); setAdded(true); setTimeout(() => setAdded(false), 1500); };
  const handlePurchase = () => {
    onPurchase();
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };
  const badgeColors: Record<string, string> = {
    Sale: "bg-[#FF007F] text-white", Hot: "bg-[#2d1a26] text-white", New: "bg-[#FF6ECF] text-white",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}
      className="group bg-white"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative overflow-hidden aspect-[3/4] bg-[#FFD1DC]/30">
        {/* Image stack — animate between them */}
        {images.map((src, i) => (
          <motion.img
            key={i}
            src={src}
            alt={`${product.name} ${i + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
            animate={{ opacity: activeImg === i ? 1 : 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        ))}
        {images.length === 0 && (
          <div className="absolute inset-0 bg-[#FFD1DC]/30 flex items-center justify-center">
            <span className="font-['Poppins'] text-[10px] text-[#7a4060]">No image</span>
          </div>
        )}

        {/* Dot indicators */}
        {hasMultiple && (
          <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {images.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${activeImg === i ? "bg-white scale-125" : "bg-white/50"}`} />
            ))}
          </div>
        )}

        {product.badge && (
          <span className={`absolute top-3 left-3 text-[9px] font-['Poppins'] font-bold tracking-widest uppercase px-2 py-0.5 z-10 ${badgeColors[product.badge] ?? "bg-[#FF6ECF] text-white"}`}>
            {product.badge}
          </span>
        )}
        <button onClick={() => setLiked(!liked)} className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <Heart size={13} className={liked ? "fill-[#FF007F] text-[#FF007F]" : "text-[#2d1a26]"} />
        </button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleAdd}
          className={`absolute bottom-0 left-0 right-0 py-3 text-[10px] font-['Poppins'] tracking-widest uppercase font-semibold translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10 ${added ? "bg-[#2d1a26] text-[#FF6ECF]" : "bg-[#FF007F] text-white"}`}>
          {added ? "Added ✓" : "Add to Bag"}
        </motion.button>
      </div>
      <div className="pt-3 pb-4 px-1">
        <p className="font-['Poppins'] text-[9px] text-[#FF007F] tracking-widest uppercase mb-1">{product.category}</p>
        <h3 className="font-['Playfair_Display'] text-[#2d1a26] font-medium text-sm leading-snug">{product.name}</h3>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-['Poppins'] text-[#2d1a26] font-semibold text-sm">{formatMoney(product.price)}</span>
          {product.originalPrice && <span className="font-['Poppins'] text-[#7a4060]/60 text-xs line-through">{formatMoney(product.originalPrice)}</span>}
        </div>
        <div className="flex items-center gap-0.5 mt-1.5">
          {[...Array(5)].map((_, i) => <Star key={i} size={10} className="fill-[#FF6ECF] text-[#FF6ECF]" />)}
          <span className="font-['Poppins'] text-[9px] text-[#7a4060]/60 ml-1">(12)</span>
        </div>
        <button
          onClick={handlePurchase}
          className="mt-3 w-full border border-[#FF007F] bg-white hover:bg-[#FF007F] text-[#FF007F] hover:text-white font-['Poppins'] text-[10px] tracking-widest uppercase py-2.5 transition-colors duration-200"
        >
          Purchase Now
        </button>
      </div>
    </motion.div>
  );
}

// ─── Product Grid ───────────────────────────────────────────────────────────────
function ProductGrid({ searchQ, activeFilter, onFilterChange }: {
  searchQ: string;
  activeFilter: CategoryFilter;
  onFilterChange: (f: CategoryFilter) => void;
}) {
  const { products, addToCart, user, setAuthOpen, settings, purchaseProduct, formatMoney } = useApp();
  const [pendingPurchase, setPendingPurchase] = useState<Product | null>(null);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState("");

  const filtered = useMemo(() => {
    let result = [...products];
    if (activeFilter !== "all") {
      result = result.filter(p => p.category === activeFilter);
    }
    if (searchQ) result = result.filter(p =>
      p.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQ.toLowerCase())
    );
    return result;
  }, [products, activeFilter, searchQ]);

  const handleAdd = (product: Product) => {
    if (!user) { setAuthOpen(true); return; }
    addToCart(product);
  };

  const handlePurchase = (product: Product) => {
    if (!user) { setAuthOpen(true); return; }
    setDeliveryLocation("");
    setPendingPurchase(product);
  };

  const confirmPurchase = () => {
    if (!pendingPurchase || !deliveryLocation.trim()) return;
    purchaseProduct(pendingPurchase, deliveryLocation.trim());
    setPurchaseComplete(true);
    setTimeout(() => {
      setPurchaseComplete(false);
      setPendingPurchase(null);
    }, 1800);
  };

  // Build filter tabs dynamically from settings.categories
  const filterTabs: CategoryFilter[] = ["all", ...settings.categories.map(c => c.name)];

  return (
    <section id="product-grid" className="py-16 md:py-20 bg-[#fff9fb] scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <AnimatePresence>
          {activeFilter !== "all" && (
            <Breadcrumb activeFilter={activeFilter} onNavigate={onFilterChange} />
          )}
        </AnimatePresence>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10 gap-4">
          <div>
            <p className="font-['Poppins'] text-[#FF007F] text-[10px] tracking-[0.4em] uppercase mb-2">Handmade for You</p>
            <h2 className="font-['Playfair_Display'] text-[#2d1a26] text-3xl md:text-4xl font-bold">
              {activeFilter === "all" ? "Our Pieces" : activeFilter}
            </h2>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {filterTabs.map((c) => (
              <button key={c} onClick={() => onFilterChange(c)}
                className={`font-['Poppins'] text-[10px] tracking-widest uppercase px-4 py-2 border transition-all duration-200 ${activeFilter === c ? "bg-[#FF007F] text-white border-[#FF007F]" : "bg-transparent text-[#7a4060] border-[#FFD1DC] hover:border-[#FF6ECF] hover:text-[#FF007F]"}`}>
                {c === "all" ? "All" : c}
              </button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-['Poppins'] text-sm text-[#7a4060]">No pieces found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={() => handleAdd(p)}
                onPurchase={() => handlePurchase(p)}
              />
            ))}
          </div>
        )}
      </div>
      <AnimatePresence>
        {pendingPurchase && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              className="bg-white border border-[#FFD1DC] shadow-2xl max-w-sm w-full p-6">
              {purchaseComplete ? (
                <div className="text-center py-3">
                  <CheckCircle2 size={34} className="mx-auto text-green-600 mb-3" />
                  <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#2d1a26] mb-2">Payment Confirmed</h3>
                  <p className="font-['Poppins'] text-xs text-[#7a4060]">Your order was sent to the admin panel.</p>
                </div>
              ) : (
                <>
                  <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#2d1a26] mb-2">Confirm Purchase?</h3>
                  <p className="font-['Poppins'] text-sm text-[#7a4060] mb-4">
                    Buy <span className="text-[#2d1a26] font-semibold">{pendingPurchase.name}</span> for <span className="text-[#FF007F] font-semibold">{formatMoney(pendingPurchase.price)}</span>?
                  </p>
                  <label className="block font-['Poppins'] text-[10px] text-[#7a4060] tracking-widest uppercase mb-1.5">Delivery Location</label>
                  <textarea
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    rows={3}
                    placeholder="Type your exact delivery address, city, and landmark..."
                    className="w-full border border-[#FFD1DC] focus:border-[#FF007F] bg-[#fff9fb] px-3 py-2.5 font-['Poppins'] text-sm text-[#2d1a26] outline-none resize-none mb-4"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setPendingPurchase(null)}
                      className="flex-1 border border-[#FFD1DC] text-[#7a4060] font-['Poppins'] text-[10px] tracking-widest uppercase py-3 hover:border-[#FF6ECF] transition-colors">
                      No
                    </button>
                    <button onClick={confirmPurchase} disabled={!deliveryLocation.trim()}
                      className="flex-1 bg-[#FF007F] hover:bg-[#d4006a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-['Poppins'] text-[10px] tracking-widest uppercase py-3 transition-colors">
                      Yes, Pay
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── Promo Banner ───────────────────────────────────────────────────────────────
function PromoBanner({ onSaleClick }: { onSaleClick: () => void }) {
  const { settings } = useApp();
  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-[#2d1a26]">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #FF007F 0%, transparent 60%), radial-gradient(circle at 70% 50%, #FF6ECF 0%, transparent 60%)" }} />
      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <img src={settings.logoImage} alt="Atelier Angélique" className="h-16 mx-auto mb-6 opacity-90 object-contain" />
          <p className="font-['Poppins'] text-[#FF6ECF] text-[10px] tracking-[0.4em] uppercase mb-4">{settings.promoLabel}</p>
          <h2 className="font-['Playfair_Display'] text-white text-4xl md:text-5xl font-bold mb-4">
            Up to <span className="text-[#FF6ECF]">{settings.promoHighlight}</span><br />{settings.promoTitle}
          </h2>
          <p className="font-['Poppins'] text-white/50 text-sm mb-8">{settings.promoSubtitle}</p>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={onSaleClick}
            className="inline-flex items-center gap-2 bg-[#FF007F] hover:bg-[#d4006a] text-white font-['Poppins'] text-xs tracking-widest uppercase px-8 py-3.5 transition-colors duration-200">
            {settings.promoCta} <ArrowRight size={14} />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Newsletter ─────────────────────────────────────────────────────────────────
function Newsletter() {
  const { settings } = useApp();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  return (
    <section className="py-16 md:py-20 bg-[#FFD1DC]/30">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <img src={settings.logoImage} alt="" className="h-10 mx-auto mb-4 object-contain opacity-60" />
          <h2 className="font-['Playfair_Display'] text-[#2d1a26] text-2xl md:text-3xl font-bold mb-3">Join the Atelier</h2>
          <p className="font-['Poppins'] text-[#7a4060] text-sm mb-6">Subscribe for new arrivals, exclusive offers & behind-the-scenes of each creation.</p>
          {submitted ? (
            <p className="font-['Poppins'] text-[#FF007F] font-medium">Thank you — see you soon! 💗</p>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (email) setSubmitted(true); }} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Your email address"
                className="flex-1 bg-white border border-[#FFD1DC] focus:border-[#FF007F] px-4 py-3 font-['Poppins'] text-sm outline-none transition-colors" />
              <button type="submit" className="bg-[#FF007F] hover:bg-[#d4006a] text-white font-['Poppins'] text-[10px] tracking-widest uppercase px-6 py-3 transition-colors duration-200">Subscribe</button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────────
function Footer() {
  const { settings } = useApp();
  return (
    <footer className="bg-[#2d1a26] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          <div className="col-span-2 md:col-span-1">
            <img src={settings.logoImage} alt="Atelier Angélique" className="h-14 object-contain mb-4" style={{ filter: "brightness(0) invert(1)" }} />
            <p className="font-['Poppins'] text-white/40 text-xs leading-relaxed mb-5">{settings.footerTagline}</p>
            <div className="flex gap-3">
              {[Instagram, Facebook, Twitter].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 border border-white/15 flex items-center justify-center hover:border-[#FF6ECF] hover:text-[#FF6ECF] transition-colors">
                  <Icon size={13} />
                </a>
              ))}
            </div>
          </div>
          {[
            { title: "Shop", links: settings.navLinks },
            { title: "Help", links: ["FAQ", "Shipping", "Returns", "Size Guide", "Track Order"] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-['Poppins'] text-[10px] tracking-widest uppercase font-semibold mb-4 text-white/50">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}><a href="#" className="font-['Poppins'] text-[11px] text-white/35 hover:text-[#FF6ECF] transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h4 className="font-['Poppins'] text-[10px] tracking-widest uppercase font-semibold mb-4 text-white/50">Contact</h4>
            <ul className="space-y-3">
              {[
                { Icon: Phone, text: settings.footerPhone },
                { Icon: Mail, text: settings.footerEmail },
                { Icon: MapPin, text: settings.footerAddress },
              ].map(({ Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5">
                  <Icon size={12} className="text-[#FF6ECF] mt-0.5 flex-shrink-0" />
                  <span className="font-['Poppins'] text-[11px] text-white/35">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/8 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-['Poppins'] text-[10px] text-white/25">{settings.footerCopyright}</p>
          <div className="flex gap-4">
            {["Privacy Policy", "Terms", "Cookies"].map((l) => (
              <a key={l} href="#" className="font-['Poppins'] text-[10px] text-white/25 hover:text-white/50 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Cart Drawer ────────────────────────────────────────────────────────────────
function PurchaseHistoryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, orders, formatMoney } = useApp();
  const userOrders = useMemo(
    () => orders.filter((order) => order.userId === user?.id).sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()),
    [orders, user?.id]
  );

  const statusIcon = (order: Order) => {
    if (order.status === "delivered") return <CheckCircle2 size={16} className="text-green-600" />;
    if (order.status === "shipped") return <Truck size={16} className="text-[#FF007F]" />;
    if (order.status === "packed") return <PackageCheck size={16} className="text-[#FF007F]" />;
    return <Clock size={16} className="text-[#FF6ECF]" />;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl bg-white z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#FFD1DC]">
              <div>
                <h2 className="font-['Playfair_Display'] text-lg font-semibold text-[#2d1a26]">Purchases & Tracking</h2>
                <p className="font-['Poppins'] text-[10px] text-[#7a4060] uppercase tracking-widest">{user?.name}</p>
              </div>
              <button onClick={onClose} className="p-1 text-[#7a4060] hover:text-[#FF007F] transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {userOrders.length === 0 ? (
                <div className="text-center py-16">
                  <ReceiptText size={42} className="mx-auto text-[#FFD1DC] mb-3" />
                  <p className="font-['Poppins'] text-sm text-[#7a4060]">No purchases yet.</p>
                </div>
              ) : userOrders.map((order) => {
                const history = order.trackingHistory?.length ? order.trackingHistory : [{
                  status: order.status,
                  label: ORDER_STATUS_LABELS[order.status],
                  note: "Tracking details will update as the admin moves your order forward.",
                  at: order.placedAt,
                }];
                const activeIndex = order.status === "cancelled" ? -1 : ORDER_STATUS_FLOW.indexOf(order.status);
                return (
                  <div key={order.id} className="border border-[#FFD1DC] bg-[#fff9fb]">
                    <div className="p-4 border-b border-[#FFD1DC] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white border border-[#FFD1DC] flex items-center justify-center">
                          {statusIcon(order)}
                        </div>
                        <div>
                          <p className="font-['Poppins'] text-xs font-semibold text-[#2d1a26] uppercase tracking-widest">{ORDER_STATUS_LABELS[order.status]}</p>
                          <p className="font-['Poppins'] text-[10px] text-[#7a4060]">{order.id} - {new Date(order.placedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                        </div>
                      </div>
                      <span className="font-['Poppins'] text-sm font-semibold text-[#FF007F]">{formatMoney(order.total)}</span>
                    </div>

                    <div className="p-4 space-y-4">
                      <div className="bg-white border border-[#FFD1DC] p-3">
                        <p className="font-['Poppins'] text-[9px] text-[#7a4060] tracking-widest uppercase mb-1">Delivery Location</p>
                        <p className="font-['Poppins'] text-xs text-[#2d1a26]">{order.deliveryLocation}</p>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {ORDER_STATUS_FLOW.map((step, i) => (
                          <div key={step} className="min-w-0">
                            <div className={`h-1.5 mb-1 ${i <= activeIndex ? "bg-[#FF007F]" : "bg-[#FFD1DC]"}`} />
                            <p className={`font-['Poppins'] text-[8px] uppercase tracking-wide leading-tight ${i <= activeIndex ? "text-[#2d1a26]" : "text-[#7a4060]/50"}`}>
                              {ORDER_STATUS_LABELS[step]}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        {history.slice().reverse().map((event, i) => (
                          <div key={`${event.status}-${event.at}-${i}`} className="flex gap-3">
                            <div className="mt-1 w-2 h-2 rounded-full bg-[#FF007F] flex-shrink-0" />
                            <div>
                              <p className="font-['Poppins'] text-xs text-[#2d1a26] font-medium">{event.label}</p>
                              <p className="font-['Poppins'] text-[10px] text-[#7a4060]">{event.note}</p>
                              <p className="font-['Poppins'] text-[9px] text-[#7a4060]/60 mt-0.5">{new Date(event.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-[#FFD1DC] pt-3 space-y-1">
                        {order.items.map((item) => (
                          <div key={item.productId} className="flex justify-between gap-3 font-['Poppins'] text-xs">
                            <span className="text-[#7a4060] truncate">{item.qty}x {item.productName}</span>
                            <span className="text-[#2d1a26] font-semibold">{formatMoney(item.price * item.qty)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CartDrawer() {
  const { cart, cartOpen, setCartOpen, cartTotal, removeFromCart, updateQty, user, setAuthOpen, placeOrder, formatMoney } = useApp();
  const [ordered, setOrdered] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState("");

  const handleCheckout = () => {
    if (!user) { setCartOpen(false); setAuthOpen(true); return; }
    setDeliveryLocation("");
    setConfirmOpen(true);
  };

  const confirmCheckout = () => {
    if (!deliveryLocation.trim()) return;
    placeOrder(deliveryLocation.trim());
    setConfirmOpen(false);
    setOrdered(true);
    setTimeout(() => { setOrdered(false); setCartOpen(false); }, 2000);
  };
  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-50" onClick={() => setCartOpen(false)} />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#FFD1DC]">
              <h2 className="font-['Playfair_Display'] text-lg font-semibold text-[#2d1a26]">Your Bag ({cart.reduce((s, i) => s + i.quantity, 0)})</h2>
              <button onClick={() => setCartOpen(false)} className="p-1 text-[#7a4060] hover:text-[#FF007F] transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingBag size={40} className="mx-auto text-[#FFD1DC] mb-3" />
                  <p className="font-['Poppins'] text-sm text-[#7a4060]">Your bag is empty</p>
                </div>
              ) : cart.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <img src={item.image} alt={item.name} className="w-20 h-24 object-cover bg-[#FFD1DC]/20 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-['Poppins'] text-[9px] text-[#FF007F] tracking-widest uppercase">{item.category}</p>
                    <h4 className="font-['Playfair_Display'] text-sm font-medium text-[#2d1a26] leading-snug truncate">{item.name}</h4>
                    <p className="font-['Poppins'] text-sm font-semibold text-[#2d1a26] mt-1">{formatMoney(item.price)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-[#FFD1DC]">
                        <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center hover:bg-[#fff0f5] transition-colors"><Minus size={11} /></button>
                        <span className="font-['Poppins'] text-xs w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center hover:bg-[#fff0f5] transition-colors"><Plus size={11} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-[#7a4060] hover:text-[#FF007F] transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="border-t border-[#FFD1DC] px-5 py-4 space-y-3">
                <div className="flex justify-between">
                  <span className="font-['Poppins'] text-sm text-[#7a4060]">Subtotal</span>
                  <span className="font-['Poppins'] text-sm font-semibold text-[#2d1a26]">{formatMoney(cartTotal)}</span>
                </div>
                <p className="font-['Poppins'] text-[10px] text-[#7a4060]">Shipping calculated at checkout</p>
                <button onClick={handleCheckout}
                  className={`w-full text-white font-['Poppins'] text-xs tracking-widest uppercase py-3.5 transition-colors duration-200 flex items-center justify-center gap-2 ${ordered ? "bg-green-600" : "bg-[#FF007F] hover:bg-[#d4006a]"}`}>
                  {ordered ? "✓ Order Placed!" : user ? "Checkout" : "Sign In to Checkout"}
                </button>
              </div>
            )}
          </motion.div>
          <AnimatePresence>
            {confirmOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/55 z-[60] flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
                  className="bg-white border border-[#FFD1DC] shadow-2xl max-w-sm w-full p-6">
                  <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#2d1a26] mb-2">Confirm Purchase?</h3>
                  <p className="font-['Poppins'] text-sm text-[#7a4060] mb-4">
                    Pay {formatMoney(cartTotal)} for {cart.reduce((s, i) => s + i.quantity, 0)} item{cart.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}? This will send the order to admin.
                  </p>
                  <label className="block font-['Poppins'] text-[10px] text-[#7a4060] tracking-widest uppercase mb-1.5">Delivery Location</label>
                  <textarea
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    rows={3}
                    placeholder="Type your exact delivery address, city, and landmark..."
                    className="w-full border border-[#FFD1DC] focus:border-[#FF007F] bg-[#fff9fb] px-3 py-2.5 font-['Poppins'] text-sm text-[#2d1a26] outline-none resize-none mb-4"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setConfirmOpen(false)}
                      className="flex-1 border border-[#FFD1DC] text-[#7a4060] font-['Poppins'] text-[10px] tracking-widest uppercase py-3 hover:border-[#FF6ECF] transition-colors">
                      No
                    </button>
                    <button onClick={confirmCheckout} disabled={!deliveryLocation.trim()}
                      className="flex-1 bg-[#FF007F] hover:bg-[#d4006a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-['Poppins'] text-[10px] tracking-widest uppercase py-3 transition-colors">
                      Yes, Pay
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function StorePage() {
  const [searchQ, setSearchQ] = useState("");
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [accountOpen, setAccountOpen] = useState(false);
  const { authOpen, setAuthOpen } = useApp();

  function handleFilterChange(filter: CategoryFilter) {
    setActiveFilter(filter);
  }

  function handleShopClick() {
    setActiveFilter("all");
    scrollToGrid();
  }

  function handleSaleClick() {
    setActiveFilter("sale");
    scrollToGrid();
  }

  return (
    <div className="min-h-screen bg-[#fff9fb]">
      <Navbar onSearch={setSearchQ} activeFilter={activeFilter} onFilterChange={handleFilterChange} onAccountOpen={() => setAccountOpen(true)} />
      <HeroBanner onShopClick={handleShopClick} />
      <CategorySection activeFilter={activeFilter} onFilterChange={handleFilterChange} />
      <ProductGrid searchQ={searchQ} activeFilter={activeFilter} onFilterChange={handleFilterChange} />
      <PromoBanner onSaleClick={handleSaleClick} />
      <Newsletter />
      <Footer />
      <PurchaseHistoryPanel open={accountOpen} onClose={() => setAccountOpen(false)} />
      <CartDrawer />
      <AnimatePresence>
        {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
