import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, MapPin, CreditCard, Truck, CheckCircle, ArrowLeft, Package } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu and Kashmir","Ladakh",
  "Chandigarh","Puducherry","Andaman and Nicobar Islands","Lakshadweep",
  "Dadra and Nagar Haveli and Daman and Diu",
];

export default function BookCheckout({ onOpenAuth }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const nav = useNavigate();
  const book = location.state?.book;

  const [step, setStep] = useState(1); // 1=cart, 2=address, 3=payment, 4=success
  const [payMode, setPayMode] = useState("prepaid");
  const [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);

  const SHIPPING = 60;
  const COD_EXTRA = 40;
  const bookPrice = book ? parseInt(book.price?.replace(/[^\d]/g, "") || "249") : 249;
  const totalPrepaid = bookPrice + SHIPPING;
  const totalCOD = bookPrice + SHIPPING + COD_EXTRA;
  const total = payMode === "cod" ? totalCOD : totalPrepaid;
  const discount = couponResult?.valid ? couponResult.discount : 0;
  const finalTotal = payMode === "cod" ? (totalPrepaid - discount) + COD_EXTRA : totalPrepaid - discount;

  const [form, setForm] = useState({
    name: "", phone: "",
    line1: "", line2: "", city: "", state: "Uttar Pradesh", pincode: "",
  });

  useEffect(() => {
    if (!loading && !user) { onOpenAuth("login"); }
    if (user) setForm(f => ({ ...f, name: user.name || "", phone: user.phone || "" }));
  }, [user, loading, onOpenAuth]);

  useEffect(() => {
    if (!book) nav("/");
  }, [book, nav]);

  if (!book) return null;
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const applyCoupon = async () => {
    if (!couponCode.trim()) { toast.error("Enter a coupon code"); return; }
    setCouponBusy(true);
    try {
      const { data } = await api.post("/coupons/validate-book", { code: couponCode.trim(), amount: totalPrepaid });
      setCouponResult(data);
      if (data.valid) { toast.success(data.message); } else { toast.error(data.message); }
    } catch { toast.error("Could not validate coupon"); }
    finally { setCouponBusy(false); }
  };

  const validateAddress = () => {
    if (!form.name.trim()) return "Please enter your full name";
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 10) return "Please enter a valid 10-digit phone number";
    if (!form.line1.trim()) return "Please enter your address";
    if (!form.city.trim()) return "Please enter your city";
    if (!form.state) return "Please select your state";
    if (!form.pincode.trim() || form.pincode.replace(/\D/g, "").length !== 6) return "Please enter a valid 6-digit pincode";
    return null;
  };

  const handlePlaceOrder = async () => {
    const err = validateAddress();
    if (err) { toast.error(err); return; }
    if (!user) { onOpenAuth("login"); return; }
    setBusy(true);
    try {
      const payload = {
        book_slug: book.slug,
        book_title: book.title,
        quantity: 1,
        amount: total,
        payment_mode: payMode,
        coupon_code: couponResult?.valid ? couponCode.trim().toUpperCase() : null,
        discount: discount,
        name: form.name,
        phone: form.phone,
        address: { line1: form.line1, line2: form.line2, city: form.city, state: form.state, pincode: form.pincode },
      };

      const { data } = await api.post("/book-orders/checkout", payload);

      if (payMode === "cod") {
        setOrderId(data.order_id);
        setStep(4);
        return;
      }

      // Prepaid — open Razorpay
      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error("Payment gateway failed to load. Please try again."); return; }

      const rzp = new window.Razorpay({
        key: data.razorpay_key,
        amount: data.amount_paise,
        currency: "INR",
        name: "Vishnu Raghav",
        description: `Signed Copy — ${book.title}`,
        order_id: data.razorpay_order_id,
        prefill: data.prefill,
        theme: { color: "#c9a84c" },
        handler: async (response) => {
          try {
            await api.post("/book-orders/verify", {
              order_id: data.order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            setOrderId(data.order_id);
            setStep(4);
          } catch (e) {
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.open();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  // ── Step 4: Success ──
  if (step === 4) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="max-w-md w-full bg-ink-900 border border-brand-gold/20 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="font-serif text-2xl font-black mb-2">Order Placed! 🎉</h2>
          <p className="text-muted-foreground text-sm mb-2">
            {payMode === "cod"
              ? "Your COD order is confirmed. Our delivery partner will collect payment at delivery."
              : "Payment successful! Your signed copy will be dispatched soon."}
          </p>
          <div className="bg-brand-gold/5 border border-brand-gold/15 rounded-xl p-4 my-5 text-left">
            <div className="text-xs text-muted-foreground mb-1">Order Summary</div>
            <div className="font-semibold text-sm">{book.title}</div>
            <div className="text-xs text-brand-gold mt-1">✍️ Personally signed by Vishnu Raghav</div>
            <div className="text-xs text-muted-foreground mt-2">
              {payMode === "cod" ? "Payment: Cash on Delivery" : "Payment: Paid Online"}
            </div>
            <div className="text-xs text-muted-foreground">Amount: ₹{total}</div>
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            You can track your order from your Dashboard → My Book Orders
          </p>
          <div className="flex gap-3">
            <button onClick={() => nav("/dashboard", { state: { tab: "bookorders" } })}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gold-gradient text-ink-950">
              Track Order
            </button>
            <button onClick={() => nav("/")}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-white/10 text-muted-foreground hover:bg-white/5">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-5 lg:px-10 py-10">
      {/* Header */}
      <button onClick={() => nav(-1)} className="flex items-center gap-2 text-muted-foreground text-sm mb-6 hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="font-serif text-2xl font-black mb-1">Buy Signed Copy</h1>
      <p className="text-sm text-muted-foreground mb-8">Get a personally signed copy from Vishnu Raghav, delivered to your door</p>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[{n:1,l:"Cart"},{n:2,l:"Address"},{n:3,l:"Payment"}].map(({n,l}) => (
          <React.Fragment key={n}>
            <div className={`flex items-center gap-1.5 text-xs font-bold ${step >= n ? "text-brand-gold" : "text-muted-foreground"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${step >= n ? "bg-gold-gradient text-ink-950" : "bg-ink-800 border border-white/10"}`}>{n}</div>
              {l}
            </div>
            {n < 3 && <div className={`flex-1 h-px ${step > n ? "bg-brand-gold/40" : "bg-white/10"}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-6">
        {/* Main form */}
        <div className="space-y-5">

          {/* STEP 1: Cart */}
          <div className="bg-ink-900 border border-white/[0.07] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-4 h-4 text-brand-gold" />
              <h2 className="font-bold text-sm">Your Cart</h2>
            </div>
            <div className="flex gap-4 items-start">
              {book.cover_image && (
                <img src={book.cover_image} alt={book.title} className="w-16 h-20 object-cover rounded-lg border border-white/10" />
              )}
              <div className="flex-1">
                <div className="font-serif font-extrabold text-base">{book.title}</div>
                <div className="text-sm text-brand-gold italic mb-1">{book.hindi}</div>
                <div className="text-xs text-green-400 font-semibold mb-2">✍️ Personally signed by author</div>
                <div className="text-xs text-muted-foreground">Qty: 1</div>
              </div>
              <div className="text-sm font-bold text-brand-gold">₹{bookPrice}</div>
            </div>
          </div>

          {/* STEP 2: Address */}
          <div className="bg-ink-900 border border-white/[0.07] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-brand-gold" />
              <h2 className="font-bold text-sm">Delivery Address</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Full Name *</label>
                <input name="name" value={form.name} onChange={handleChange}
                  className="w-full bg-ink-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-gold/50"
                  placeholder="Your full name" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Phone Number *</label>
                <input name="phone" value={form.phone} onChange={handleChange}
                  className="w-full bg-ink-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-gold/50"
                  placeholder="10-digit mobile number" maxLength={10} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Address Line 1 *</label>
                <input name="line1" value={form.line1} onChange={handleChange}
                  className="w-full bg-ink-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-gold/50"
                  placeholder="House/Flat no., Street, Area" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Address Line 2 (Optional)</label>
                <input name="line2" value={form.line2} onChange={handleChange}
                  className="w-full bg-ink-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-gold/50"
                  placeholder="Landmark, Colony" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">City *</label>
                <input name="city" value={form.city} onChange={handleChange}
                  className="w-full bg-ink-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-gold/50"
                  placeholder="Your city" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-semibold block mb-1">Pincode *</label>
                <input name="pincode" value={form.pincode} onChange={handleChange}
                  className="w-full bg-ink-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-gold/50"
                  placeholder="6-digit pincode" maxLength={6} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground font-semibold block mb-1">State *</label>
                <select name="state" value={form.state} onChange={handleChange}
                  className="w-full bg-ink-800 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-gold/50">
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* STEP 3: Payment Mode */}
          <div className="bg-ink-900 border border-white/[0.07] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-brand-gold" />
              <h2 className="font-bold text-sm">Payment Method</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => setPayMode("prepaid")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${payMode === "prepaid" ? "border-brand-gold bg-brand-gold/5" : "border-white/10 hover:border-white/20"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-4 h-4 text-brand-gold" />
                  <span className="font-bold text-sm">Pay Online</span>
                  <span className="ml-auto text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-bold">Recommended</span>
                </div>
                <div className="text-xs text-muted-foreground">UPI, Credit/Debit Card, Net Banking</div>
                <div className="text-sm font-bold text-brand-gold mt-2">₹{totalPrepaid}</div>
              </button>
              <button onClick={() => setPayMode("cod")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${payMode === "cod" ? "border-brand-gold bg-brand-gold/5" : "border-white/10 hover:border-white/20"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-sm">Cash on Delivery</span>
                </div>
                <div className="text-xs text-muted-foreground">Pay when the book arrives</div>
                <div className="text-sm font-bold text-brand-gold mt-2">₹{totalCOD} <span className="text-xs text-muted-foreground font-normal">(+₹{COD_EXTRA} COD fee)</span></div>
              </button>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="bg-ink-900 border border-white/[0.07] rounded-2xl p-5 h-fit sticky top-20">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-brand-gold" /> Order Summary
          </h3>
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Book Price</span>
              <span>₹{bookPrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>₹{SHIPPING}</span>
            </div>
            {payMode === "cod" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">COD Fee</span>
                <span>₹{COD_EXTRA}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-xs text-green-400 font-semibold">
                <span>Coupon Discount</span>
                <span>−₹{discount}</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-brand-gold">₹{finalTotal}</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs font-semibold text-muted-foreground mb-1">Have a coupon?</div>
            <div className="flex gap-2">
              <input value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                placeholder="ENTER CODE"
                className="flex-1 bg-ink-800 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-brand-gold/50" />
              <button onClick={applyCoupon} disabled={couponBusy}
                className="px-3 py-2 rounded-lg text-xs font-bold bg-brand-gold/10 text-brand-gold border border-brand-gold/20 hover:bg-brand-gold/20 disabled:opacity-50">
                {couponBusy ? "..." : "Apply"}
              </button>
            </div>
            {couponResult?.valid && (
              <div className="mt-1.5 text-xs text-green-400 font-semibold">✅ {couponResult.message}</div>
            )}
          </div>
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 mb-4">
            <div className="text-xs text-green-400 font-semibold mb-1">✍️ What you get</div>
            <div className="text-xs text-muted-foreground">Personally signed copy by Vishnu Raghav. Ships within 3-5 working days via Shiprocket.</div>
          </div>

          <button onClick={handlePlaceOrder} disabled={busy}
            className="w-full py-3 rounded-xl font-bold text-sm bg-gold-gradient text-ink-950 hover:opacity-90 transition-opacity disabled:opacity-60">
            {busy ? "Processing..." : payMode === "cod" ? "🚚 Place COD Order" : "💳 Pay & Order"}
          </button>

          <p className="text-[10px] text-muted-foreground text-center mt-3">
            🔒 Secure payment via Razorpay. Your data is safe.
          </p>
        </div>
      </div>
    </div>
  );
}
