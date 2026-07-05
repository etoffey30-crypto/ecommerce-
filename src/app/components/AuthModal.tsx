import { useState } from "react";
import { motion } from "motion/react";
import { X, Eye, EyeOff, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { login, register, settings } = useApp();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const err = mode === "login"
        ? await login(email, password)
        : await register(name, email, password, phone);
      if (err) setError(err); else onClose();
    } finally { setLoading(false); }
  };

  const inputCls = "w-full border border-[#FFD1DC] focus:border-[#FF007F] bg-[#fff9fb] px-4 py-2.5 font-['Poppins'] text-sm text-[#2d1a26] outline-none transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#2d1a26]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 24 }}
        transition={{ type: "spring", damping: 26, stiffness: 340 }}
        className="bg-white w-full max-w-md overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-[#2d1a26] to-[#FF007F]/80 py-8 px-6 text-center">
          <img src={settings.logoImage} alt="Atelier Angélique" className="h-16 mx-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-6 md:p-8">
          {/* Tabs */}
          <div className="flex border-b border-[#FFD1DC] mb-6">
            {(["login", "signup"] as const).map((tab) => (
              <button key={tab} onClick={() => { setMode(tab); setError(""); }}
                className={`flex-1 pb-3 font-['Poppins'] text-xs tracking-widest uppercase transition-all duration-200 ${mode === tab ? "border-b-2 border-[#FF007F] text-[#FF007F] font-semibold" : "text-[#7a4060]"}`}>
                {tab === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="block font-['Poppins'] text-[10px] text-[#7a4060] tracking-widest uppercase mb-1.5">Full Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Jane Doe" className={inputCls} />
                </div>
                <div>
                  <label className="block font-['Poppins'] text-[10px] text-[#7a4060] tracking-widest uppercase mb-1.5">Phone Number</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className={inputCls} />
                </div>
              </>
            )}
            <div>
              <label className="block font-['Poppins'] text-[10px] text-[#7a4060] tracking-widest uppercase mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className={inputCls} />
            </div>
            <div>
              <label className="block font-['Poppins'] text-[10px] text-[#7a4060] tracking-widest uppercase mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" className={inputCls + " pr-10"} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FF6ECF] hover:text-[#FF007F] transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[#FF007F] font-['Poppins'] text-xs">
                {error}
              </motion.p>
            )}

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="w-full bg-[#FF007F] hover:bg-[#d4006a] disabled:opacity-60 text-white font-['Poppins'] text-[10px] tracking-widest uppercase py-3.5 flex items-center justify-center gap-2 transition-colors duration-200 mt-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {mode === "login" ? "Sign In" : "Create Account"}
            </motion.button>
          </form>

          <p className="text-center font-['Poppins'] text-xs text-[#7a4060] mt-4">
            {mode === "login" ? "New here? " : "Already have an account? "}
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} className="text-[#FF007F] hover:underline font-medium">
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
