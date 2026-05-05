import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import React, { useState, useEffect, useRef } from "react"
import { ShoppingCart, LogIn, LogOut, Menu, Star, MapPin, Phone, MessageCircle, Utensils, StarHalf, Plus, Minus, Settings, Clock } from "lucide-react"
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, getDocFromServer, serverTimestamp } from "firebase/firestore";
import firebaseConfig from '../firebase-applet-config.json';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom"

import { DEFAULT_DATA } from "./data"

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

// --- Error Handler ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const AuthContext = React.createContext<{user: User | null, isAdmin: boolean}>({user: null, isAdmin: false});

export function useAuth() {
  return React.useContext(AuthContext);
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        if (u.email === 'zainmushtaq5439@gmail.com') {
          setIsAdmin(true);
        } else {
          try {
            const roleDoc = await getDocFromServer(doc(db, 'userRoles', u.uid));
            if (roleDoc.exists() && roleDoc.data().role === 'admin') {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          } catch(e) {
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{user, isAdmin}}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}

function AuthDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 6) return "Password must be at least 6 characters long.";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least one number.";
    if (!/[^\w\s]|_/.test(pwd)) return "Password must contain at least one special character.";
    return null;
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!isLogin) {
      const pwdError = validatePassword(password);
      if (pwdError) {
        setError(pwdError);
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onOpenChange(false);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError("Invalid email or password.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Email already in use. Try logging in.");
      } else {
        setError(err.message || "An error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleAuth = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Google sign-in failed.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isLogin ? 'Welcome Back To Dasi Sweets' : 'Create an Account'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleEmailAuth} className="space-y-4 py-4">
          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="hello@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {!isLogin && (
              <p className="text-xs text-neutral-500">
                Minimum 6 characters, including a number, special character, uppercase and lowercase letter.
              </p>
            )}
          </div>
          <Button type="submit" className="w-full bg-[#E85D04] hover:bg-[#D00000] text-white" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
          </Button>
        </form>
        
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-popover px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={handleGoogleAuth}>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
            <path d="M1 1h22v22H1z" fill="none" />
          </svg>
          Google
        </Button>

        <div className="mt-4 text-center text-sm">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="font-semibold text-orange-600 hover:underline">
            {isLogin ? "Sign up" : "Login"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('dasi_sweets_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleCartUpdate = () => {
      try {
        const saved = localStorage.getItem('dasi_sweets_cart');
        if (saved) setCartItems(JSON.parse(saved));
      } catch(e){}
    };
    
    window.addEventListener('dasi_sweets_cartUpdate', handleCartUpdate);
    return () => window.removeEventListener('dasi_sweets_cartUpdate', handleCartUpdate);
  }, []);

  useEffect(() => {
    const saveCart = setTimeout(() => {
        localStorage.setItem('dasi_sweets_cart', JSON.stringify(cartItems));
    }, 100);
    return () => clearTimeout(saveCart);
  }, [cartItems]);

  const login = () => {
    setShowAuthDialog(true);
  }

  const logout = () => signOut(auth);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans flex flex-col selection:bg-orange-500 selection:text-white">
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-[#E85D04] text-white font-black text-xl w-8 h-8 flex items-center justify-center rounded-lg group-hover:bg-[#D00000] transition-colors">
              DS
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900 group-hover:text-[#E85D04] transition-colors">Dasi Sweets</span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <Dialog>
              <DialogTrigger className="hidden md:flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-[#E85D04] transition-colors">
                 <span>About Dasi Sweets</span>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-serif text-[#370617]">About Dasi Sweets & Bakers</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-zinc-600 mt-2 leading-relaxed">
                  <p>
                    Dasi Sweets & Bakers brings you a perfect blend of high quality traditional sweets, fresh bakery items, and custom celebration cakes.
                  </p>
                  <p>
                    From our signature sweets to custom cakes for your celebrations, we aim to provide an unforgettable experience of taste and quality.
                  </p>
                  <p>
                    <strong>Location:</strong> MM Plaza, Shujabad Road, Adda Basti Lar, Multan.
                  </p>
                  <p>
                    <strong>Contact:</strong> 0309-7862821
                  </p>
                </div>
              </DialogContent>
            </Dialog>

            <Sheet>
              {!isAdmin && (
                <SheetTrigger className={buttonVariants({ variant: "ghost", className: "relative p-2 text-zinc-600 hover:text-orange-600 hover:bg-orange-50 transition-colors rounded-full" })}>
                    <ShoppingCart className="w-5 h-5" />
                    {cartItems.length > 0 && (
                      <Badge className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-orange-600 text-white border-none h-5 w-5 p-0 flex items-center justify-center text-[10px]">{cartItems.reduce((a,c)=>a+c.quantity,0)}</Badge>
                    )}
                </SheetTrigger>
              )}
              <SheetContent className="w-full sm:max-w-md bg-white border-zinc-200">
                <CartView cartItems={cartItems} setCartItems={setCartItems} user={user} isAdmin={isAdmin} />
              </SheetContent>
            </Sheet>

            {user ? (
              <div className="flex items-center gap-2">
                {!isAdmin && (
                  <Dialog>
                    <DialogTrigger render={<Button variant="outline" size="sm" className="hidden sm:flex border-neutral-200 text-neutral-600 hover:bg-neutral-50" />}>
                      <ShoppingCart className="w-4 h-4 mr-1.5"/> My Orders
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>My Orders</DialogTitle>
                      </DialogHeader>
                      <UserOrders user={user} />
                    </DialogContent>
                  </Dialog>
                )}
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm" className="hidden sm:flex border-orange-200 text-orange-600 hover:bg-orange-50"><Settings className="w-4 h-4 mr-1.5"/> Admin</Button>
                  </Link>
                )}
                <Button variant="ghost" size="icon" onClick={logout} className="text-zinc-500 hover:bg-zinc-100 rounded-full" title="Logout">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={login} size="sm" className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-5 shadow-sm shadow-orange-600/20 transition-all font-medium">Login</Button>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-grow">
        {children}
      </main>
      
      <footer className="bg-zinc-950 text-zinc-400 py-16 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-6 opacity-90 hover:opacity-100 transition-opacity">
              <div className="bg-[#E85D04] text-white p-1 rounded-md w-8 h-8 flex items-center justify-center font-bold text-lg">
                DS
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">Dasi Sweets & Bakers</span>
            </Link>
            <p className="leading-relaxed mb-6 font-light">Your trusted destination for the finest quality traditional sweets, fresh bakery items, and custom celebration cakes.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold tracking-wider uppercase text-zinc-500 mb-6 font-mono">Location & Hours</h4>
            <div className="space-y-4">
              <p className="flex items-start gap-3 hover:text-white transition-colors">
                <MapPin className="w-5 h-5 shrink-0 mt-0.5 text-[#E85D04]" /> 
                <a href="https://maps.app.goo.gl/oe3eKQUwapHgYd1w7" target="_blank" rel="noreferrer">MM Plaza, Shujabad Road, Adda Basti Lar, Multan</a>
              </p>
              <p className="flex items-center gap-3 hover:text-white transition-colors"><Clock className="w-5 h-5 text-[#E85D04]" /> Open Daily: 8:00 AM - 11:00 PM</p>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold tracking-wider uppercase text-zinc-500 mb-6 font-mono">Contact</h4>
            <p className="flex items-center gap-3 hover:text-white transition-colors mb-4">
              <Phone className="w-5 h-5 text-[#E85D04]" /> <a href="tel:03097862821">0309-7862821</a>
            </p>
            <p className="flex items-center gap-3 hover:text-white transition-colors mb-4">
              <MessageCircle className="w-5 h-5 text-[#E85D04]" /> <a href="https://wa.me/923097862821" target="_blank" rel="noreferrer">0309-7862821 (WhatsApp)</a>
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-12 pt-8 border-t border-zinc-900 text-center text-sm font-light">
          <p>© 2026 Dasi Sweets & Bakers. All rights reserved.</p>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      {!isAdmin && (
      <a 
        href="https://wa.me/923097862821" 
        target="_blank" 
        rel="noreferrer" 
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-[0_8px_30px_rgba(37,211,102,0.4)] hover:scale-110 transition-transform flex items-center justify-center group"
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.964 9.964 0 001.333 4.976L2 22l5.17-1.353a9.94 9.94 0 004.842 1.253h.004c5.505 0 9.988-4.478 9.989-9.984 0-2.669-1.037-5.176-2.922-7.062A9.935 9.935 0 0012.012 2zm5.498 14.288c-.244.693-1.42 1.341-1.956 1.4-1.396.155-3.093-.538-5.328-2.617-2.64-2.464-3.528-5.59-3.766-6.027-.238-.437-.023-.9.183-1.12.383-.418.846-.499 1.1-.499.187 0 .376-.008.528.349.208.486.684 1.668.746 1.792.06.126.113.315-.03.546-.143.232-.239.333-.42.546-.169.201-.365.419-.153.782.212.363.955 1.576 2.052 2.553 1.411 1.255 2.553 1.636 2.91 1.8.358.163.59.135.807-.11.26-.296.883-1.114 1.127-1.493.243-.38.486-.337.896-.183.411.155 2.593 1.222 3.037 1.442.444.22.738.337.848.523.111.186.111 1.054-.133 1.747z" />
        </svg>
        <span className="absolute right-full mr-4 bg-zinc-900 text-white text-sm font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
          Order on WhatsApp
        </span>
      </a>
      )}
    </div>
  )
}

function CartView({ cartItems, setCartItems, user, isAdmin }: any) {
  const [checkingOut, setCheckingOut] = useState(false);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [instruction, setInstruction] = useState("");
  
  useEffect(() => {
    if (user && !fullName) {
      setFullName(user.displayName || user.email || "");
    }
  }, [user]);

  const updateQuantity = (idx: number, delta: number) => {
    const newCart = [...cartItems];
    newCart[idx].quantity += delta;
    if (newCart[idx].quantity <= 0) {
      newCart.splice(idx, 1);
    }
    setCartItems(newCart);
  }

  const total = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

  const placeOrder = async (method: 'app' | 'whatsapp') => {
    if (!fullName || !address || !phone) return alert("Fill in required delivery details: Name, Phone, Address");
    
    // Save to Firestore if user logged in
    if (user) {
      try {
        const orderRef = collection(db, 'orders');
        await addDoc(orderRef, {
          userId: user.uid,
          userName: fullName,
          phoneNumber: phone,
          address: address,
          specialInstruction: instruction,
          items: cartItems.map((i:any)=>({productId: i.id, name: i.name, price: i.price, quantity: i.quantity})),
          total: total,
          status: 'new',
          createdAt: new Date().toISOString()
        }).then(() => {
          setCartItems([]);
          setCheckingOut(false);
          alert("Order placed successfully! Check your orders on the dashboard.");
        }).catch(e => {
          handleFirestoreError(e, OperationType.CREATE, 'orders');
        });
      } catch(e: any) {
        console.error("Failed to save order to db", e);
        alert("Failed to place order: " + e.message);
      }
    } else if (method === 'app') {
       return alert("Please login first to place an order via App directly, or continue via WhatsApp.");
    }

    if (method === 'whatsapp') {
      const itemsList = cartItems.map((i:any)=> `${i.quantity}x ${i.name}`).join('%0A');
      const waMsg = `Hello Dasi Sweets & Bakers!%0AI want to place an order.%0A%0A*Items:*%0A${itemsList}%0A%0A*Total:* Rs ${total}%0A*Name:* ${fullName}%0A*Address:* ${address}%0A*Phone:* ${phone}%0A*Special Instructions:* ${instruction || 'None'}%0A%0APlease confirm my order.`;
      window.open(`https://wa.me/923097862821?text=${waMsg}`, '_blank');
    } else {
      alert("Order placed successfully! We will contact you shortly.");
    }
    
    setCartItems([]);
    setCheckingOut(false);
  }

  return (
    <div className="flex flex-col h-full">
      <SheetHeader>
        <SheetTitle className="font-serif italic text-[#D00000] text-2xl">Your Cart</SheetTitle>
      </SheetHeader>
      
      <div className="flex-1 overflow-auto mt-6">
        {cartItems.length === 0 ? (
          <p className="text-center text-neutral-500 mt-10">Your cart is empty.</p>
        ) : (
          <div className="space-y-4">
            {cartItems.map((item:any, i:number) => (
              <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-[#F48C06]/20">
                <div>
                  <h4 className="font-bold text-[#370617]">{item.name}</h4>
                  <p className="text-sm font-semibold text-[#D00000]">Rs {item.price}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-[#F48C06] text-[#F48C06]" onClick={()=>updateQuantity(i, -1)}><Minus className="w-3 h-3"/></Button>
                  <span className="font-bold w-4 text-center">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-[#F48C06] text-[#F48C06]" onClick={()=>updateQuantity(i, 1)}><Plus className="w-3 h-3"/></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="border-t border-[#F48C06]/20 pt-4 mt-4">
          {total >= 2500 ? (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-xl mb-4 text-sm font-semibold flex items-start gap-2">
              <Star className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p>Congratulations! 🎉</p>
                <p className="font-normal text-xs mt-1">You are eligible to win multi-lac prizes in our special Eid Ul Azha offer!</p>
              </div>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 text-orange-700 p-3 rounded-xl mb-4 text-sm font-medium flex items-start gap-2">
              <Star className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p>Eid Ul Azha Special Offer! 🎁</p>
                <p className="font-normal text-xs mt-1">Add items worth Rs {2500 - total} more to be eligible to win multi-lac prizes and gifts!</p>
              </div>
            </div>
          )}

          <div className="flex justify-between text-lg font-bold text-[#370617] mb-4">
            <span>Total</span>
            <span>Rs {total}</span>
          </div>
          
          {isAdmin ? (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-center text-orange-700 text-sm font-medium">
              Administrator accounts cannot place orders.
            </div>
          ) : checkingOut ? (
            <div className="space-y-3 pb-4">
               <div>
                 <Label>Full name *</Label>
                 <Input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="John Doe" />
               </div>
               <div>
                 <Label>Phone number *</Label>
                 <Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="03XXXXXXXXX" />
               </div>
               <div>
                 <Label>Full delivery address *</Label>
                 <Input value={address} onChange={e=>setAddress(e.target.value)} placeholder="House, Street, Area" />
               </div>
               <div>
                 <Label>Special instruction</Label>
                 <Textarea value={instruction} onChange={e=>setInstruction(e.target.value)} placeholder="e.g. Less spicy, extra sauce" rows={2} />
               </div>
               <div className="flex flex-col gap-2 pt-2">
                 <Button className="w-full bg-[#E85D04] hover:bg-[#D00000] text-white" onClick={()=>placeOrder('app')}>Place Order (via App)</Button>
                 <Button className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white" onClick={()=>placeOrder('whatsapp')}>Order via WhatsApp</Button>
               </div>
               <Button variant="ghost" className="w-full mt-1" onClick={()=>setCheckingOut(false)}>Cancel</Button>
            </div>
          ) : (
            <Button className="w-full bg-[#E85D04] hover:bg-[#D00000] text-white py-6 text-lg font-bold" onClick={()=> setCheckingOut(true)}>
              Checkout
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCat, setActiveCat] = useState("All");

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({id: d.id, ...d.data()}));
      setProducts(items);
    }, (err)=> {
      handleFirestoreError(err, OperationType.LIST, 'products');
    });
    return unsub;
  }, []);

  const displayProducts = products.length > 0 ? products : DEFAULT_DATA;
  const filtered = activeCat === "All" ? displayProducts : displayProducts.filter(p => p.category === activeCat);

  useEffect(() => {
    const cats = Array.from(new Set(displayProducts.map((i:any)=>i.category)));
    setCategories(["All", ...cats]);
  }, [displayProducts]);

  return (
    <div className="bg-zinc-50">
      {/* Eid Offer Announcement Bar */}
      <div className="bg-[#D00000] text-white text-center py-2 px-4 shadow-md sticky top-0 z-30">
        <p className="text-sm font-semibold animate-pulse">
          🌙 EID UL AZHA SPECIAL: Buy items worth Rs 2500 or more and get a chance to win multi-lac prizes and gifts! 🎁
        </p>
      </div>

      {/* Hero */}
      <section className="relative w-full h-[85vh] flex flex-col justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/60 z-10" />
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=60')" }} 
        />
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 lg:px-8 w-full">
          <div className="max-w-3xl">
            <Badge className="bg-[#F48C06]/20 text-[#F48C06] hover:bg-[#F48C06]/30 border-[#F48C06]/50 mb-6 font-mono tracking-widest uppercase">Taste the Tradition</Badge>
            <h1 className="text-5xl md:text-8xl font-black text-white mb-6 tracking-tighter leading-[0.95]">
              Dasi <span className="text-[#F48C06]">Sweets.</span>
            </h1>
            <p className="text-xl md:text-2xl text-zinc-300 font-light mb-10 max-w-xl leading-relaxed">
              Celebrate this Eid Ul Azha with our premium Sweets, Pastries, Nimko, Cosmetics, and Drinks. Spend Rs 2500 and win big!
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-[#E85D04] hover:bg-[#D00000] text-white rounded-full px-8 h-14 text-lg font-medium shadow-[0_0_40px_rgba(234,88,12,0.4)] transition-all hover:scale-105" onClick={()=>{
                 document.getElementById('menu')?.scrollIntoView({behavior:'smooth'})
              }}>
                Explore Menu
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 text-white bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-full px-8 h-14 text-lg font-medium" onClick={()=>{
                 document.getElementById('gallery')?.scrollIntoView({behavior:'smooth'})
              }}>
                Our Restuarant
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Menu / App */}
      <section id="menu" className="max-w-7xl mx-auto px-4 lg:px-8 py-24">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 tracking-tight mb-4">Our Menu</h2>
          <div className="w-20 h-1.5 bg-orange-500 rounded-full" />
        </div>

        <ScrollArea className="w-full whitespace-nowrap pb-6 mb-8">
          <div className="flex gap-3">
            {categories.map(c => (
              <Button key={c} variant={activeCat === c ? "default" : "outline"} onClick={()=>setActiveCat(c)} 
                      className={`rounded-full px-6 h-12 text-sm font-medium transition-all duration-300 ${activeCat === c ? 'bg-zinc-900 text-white shadow-xl scale-105' : 'bg-white text-zinc-600 border-zinc-200 hover:border-orange-500 hover:text-orange-600'}`}>
                {c}
              </Button>
            ))}
          </div>
        </ScrollArea>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filtered.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-400">
               <Utensils className="w-16 h-16 mb-4 opacity-50" />
               <p className="text-lg">No items on the menu yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* End of Menu Section */}
    </div>
  )
}

function ProductCard({ product }: { product: any }) {
  const [showReviews, setShowReviews] = useState(false);
  const [showDeal, setShowDeal] = useState(false);
  const { isAdmin } = useAuth();
  const isDeal = product.category === 'Deals' || product.name.toLowerCase().includes('deal');

  const handleAddToCart = () => {
     const saved = localStorage.getItem('dasi_sweets_cart');
     let cart = saved ? JSON.parse(saved) : [];
     const ex = cart.find((i:any)=>i.id === product.id);
     if(ex) { ex.quantity += 1; } else { cart.push({...product, quantity: 1}); }
     localStorage.setItem('dasi_sweets_cart', JSON.stringify(cart));
     window.dispatchEvent(new Event('dasi_sweets_cartUpdate'));
     if (showDeal) setShowDeal(false);
  }

  return (
    <>
      <Card className="rounded-2xl overflow-hidden border-none shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(208,0,0,0.15)] transition-all bg-white group flex flex-col">
        <div className="h-48 overflow-hidden bg-neutral-100 relative">
          {product.imageUrl ? (
            <img src={product.imageUrl} loading="lazy" decoding="async" alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-300"><Utensils className="w-12 h-12" /></div>
          )}
          <Badge className="absolute top-3 left-3 bg-[#E85D04] text-white border-none shadow-md">{product.category}</Badge>
        </div>
        <CardContent className="p-5 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-xl text-[#370617] line-clamp-1">{product.name}</h3>
          </div>
          <p className="text-sm text-neutral-500 line-clamp-2 mb-3 flex-grow">{product.description || 'Delicious freshly prepared.'}</p>
          
          <div className="flex justify-between items-center mb-4">
            <span className="font-black text-2xl text-[#D00000]">Rs {product.price}</span>
            <div className="flex items-center gap-1 cursor-pointer hover:bg-neutral-100 p-1 rounded transition-colors" onClick={()=>setShowReviews(true)}>
              <Star className={`w-4 h-4 ${product.averageRating > 0 ? 'fill-[#FFAA00] text-[#FFAA00]' : 'text-neutral-300'}`} />
              <span className="text-sm font-bold text-neutral-700">{product.averageRating ? product.averageRating.toFixed(1) : 'New'}</span>
            </div>
          </div>
          
          {isDeal ? (
            <Button className="w-full bg-[#370617] hover:bg-[#1a030a] text-white rounded-xl py-6 font-bold text-md transition-colors" onClick={()=>setShowDeal(true)}>
              View Deal Details
            </Button>
          ) : (
            <Button className="w-full bg-[#E85D04] hover:bg-[#9D0208] disabled:bg-neutral-300 disabled:opacity-50 text-white rounded-xl py-6 font-bold text-md transition-colors" disabled={isAdmin} onClick={handleAddToCart}>
              {isAdmin ? "Admins Cannot Add" : "Add to Cart"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Reviews Dialog */}
      <Dialog open={showReviews} onOpenChange={setShowReviews}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col bg-[#FFFBF5]">
          <DialogHeader>
            <DialogTitle className="font-serif italic text-2xl text-[#370617]">{product.name} Reviews</DialogTitle>
          </DialogHeader>
          <ReviewsList productId={product.id} />
        </DialogContent>
      </Dialog>
      
      {/* Deal Details Dialog */}
      <Dialog open={showDeal} onOpenChange={setShowDeal}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-[#370617]">{product.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            {product.imageUrl && (
              <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover rounded-xl" />
            )}
            <div>
              <h4 className="font-bold text-lg mb-2">Deal Includes:</h4>
              <p className="text-zinc-600 leading-relaxed text-base pt-1 pb-2 border-l-2 border-orange-500 pl-4 bg-orange-50/50 rounded-r-md">
                {product.description}
              </p>
            </div>
            <div className="flex items-center justify-between py-4 border-t border-zinc-100">
               <span className="text-3xl font-black text-[#D00000]">Rs {product.price}</span>
            </div>
            <Button className="w-full bg-[#E85D04] hover:bg-[#9D0208] disabled:bg-neutral-300 disabled:opacity-50 text-white rounded-xl py-6 font-bold text-lg transition-colors" disabled={isAdmin} onClick={handleAddToCart}>
               {isAdmin ? "Admins Cannot Add" : "Add Deal to Cart"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ReviewsList({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const user = auth.currentUser;

  useEffect(() => {
    const q = query(collection(db, `products/${productId}/reviews`), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setReviews(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }, err => handleFirestoreError(err, OperationType.LIST, `products/${productId}/reviews`));
    return unsub;
  }, [productId]);

  const submitReview = async () => {
    if (!user) return alert("Log in to review");
    if (!text) return;
    try {
      await addDoc(collection(db, `products/${productId}/reviews`), {
        productId,
        userId: user.uid,
        userName: user.displayName || user.email,
        rating,
        text,
        createdAt: new Date().toISOString()
      }).catch(e => handleFirestoreError(e, OperationType.CREATE, `products/${productId}/reviews`));
      
      // Update product average rating (Client side calculation for simplicity here, real app uses Cloud Function or transaction)
      const newAvg = ((reviews.reduce((a,c)=>a+c.rating,0) + rating) / (reviews.length + 1));
      await updateDoc(doc(db, 'products', productId), {
        averageRating: newAvg
      }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `products/${productId}`));

      setText("");
      setRating(5);
    } catch(e: any) { alert(e.message); }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <ScrollArea className="flex-1 pr-4 mb-4">
        {reviews.length === 0 && <p className="text-neutral-500 text-center my-4">No reviews yet.</p>}
        {reviews.map(r => (
          <div key={r.id} className="border-b border-orange-100 py-3 last:border-0">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-sm text-[#370617]">{r.userName}</span>
              <div className="flex">
                {[...Array(5)].map((_,i) => <Star key={i} className={`w-3 h-3 ${i<r.rating ? 'fill-[#FFAA00] text-[#FFAA00]':'text-neutral-200'}`} />)}
              </div>
            </div>
            <p className="text-sm text-neutral-600">{r.text}</p>
          </div>
        ))}
      </ScrollArea>
      
      {user ? (
        <div className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm shrink-0">
          <div className="flex items-center gap-1 xl:mb-2">
            {[1,2,3,4,5].map(v => (
              <Star key={v} className={`w-5 h-5 cursor-pointer ${v<=rating ? 'fill-[#FFAA00] text-[#FFAA00]':'text-neutral-300'}`} onClick={()=>setRating(v)}/>
            ))}
          </div>
          <Textarea className="w-full text-sm mb-2 resize-none" placeholder="Write a review..." value={text} onChange={e=>setText(e.target.value)} rows={2} />
          <Button size="sm" className="w-full bg-[#E85D04] hover:bg-[#D00000] text-white" onClick={submitReview}>Submit</Button>
        </div>
      ) : (
        <p className="text-xs text-center p-2 text-neutral-500 bg-orange-50 rounded shrink-0">Login to leave a review</p>
      )}
    </div>
  )
}

function AdminPanel() {
  const [activeTab, setActiveTab] = useState("products");
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        if (u.email === 'zainmushtaq5439@gmail.com') setIsAdmin(true);
        else {
          try {
            const roleDoc = await getDocFromServer(doc(db, 'userRoles', u.uid));
            setIsAdmin(roleDoc.exists() && roleDoc.data().role === 'admin');
          } catch(e) { setIsAdmin(false); }
        }
      } else {
        setIsAdmin(false);
      }
    });
  }, []);

  if (isAdmin === null) return <div className="p-8 text-center text-zinc-500">Verifying access...</div>;
  if (!isAdmin) return <div className="p-8 text-center text-red-600 font-bold text-xl mt-12 bg-red-50 max-w-md mx-auto rounded-xl">Access Denied.<br/><span className="text-sm font-normal text-red-500">You must be an administrator to view this page.</span></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-orange-600" />
        <h1 className="text-3xl font-black font-serif italic text-[#370617]">Admin Dashboard</h1>
      </div>

      <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-8 flex gap-4 text-sm text-zinc-800">
         <Settings className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
         <div>
           <p className="font-semibold text-orange-800">Admin Security & Access Info:</p>
           <p className="text-orange-700 mt-1">This admin panel rests on Firebase Authentication. Your Google account email is verified as an administrator.</p>
           <p className="text-orange-700 mt-1">To give admin access to someone else, add their Google Account email to the <code className="bg-orange-200/50 text-orange-900 px-1.5 py-0.5 rounded font-mono font-bold">userRoles</code> collection in Firestore under their User UID with <code className="bg-orange-200/50 text-orange-900 px-1.5 py-0.5 rounded font-mono font-bold">role: 'admin'</code>.</p>
           <p className="text-orange-700 mt-1">The link to this panel is simply <code className="bg-orange-200/50 text-orange-900 px-1.5 py-0.5 rounded font-mono font-bold">/admin</code>, but it drops any unauthorized visitors automatically by hiding the Admin button and protecting requests using Firebase Security Rules.</p>
         </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-white border border-neutral-200 shadow-sm p-1">
          <TabsTrigger value="products" className="data-[state=active]:bg-[#9D0208] data-[state=active]:text-white">Manage Products</TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-[#9D0208] data-[state=active]:text-white">Manage Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="products"><AdminProducts /></TabsContent>
        <TabsContent value="orders"><AdminOrders /></TabsContent>
      </Tabs>
    </div>
  )
}

function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({ id: '', name: '', desc: '', price: '', cat: '', img: '' });

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsub = onSnapshot(q, snap => setProducts(snap.docs.map(d => ({id: d.id, ...d.data()}))), e => handleFirestoreError(e, OperationType.LIST, 'products'));
    return unsub;
  }, []);

  const saveProduct = async () => {
    try {
      const data = {
        name: form.name,
        description: form.desc,
        price: Number(form.price),
        category: form.cat,
        imageUrl: form.img,
        averageRating: 0 // Will keep existing on update if we used a more complex merge, but good enough for demo
      };
      
      if (form.id) {
        const pRef = doc(db, 'products', form.id);
        const existing = products.find(p=>p.id === form.id);
        await updateDoc(pRef, { ...data, averageRating: existing?.averageRating || 0 })
          .catch(e => handleFirestoreError(e, OperationType.UPDATE, `products/${form.id}`));
      } else {
        await addDoc(collection(db, 'products'), data)
          .catch(e => handleFirestoreError(e, OperationType.CREATE, `products`));
      }
      setForm({ id: '', name: '', desc: '', price: '', cat: '', img: '' });
    } catch(e:any) { alert(e.message); }
  }

  const seedData = async () => {
    try {
      // Clear existing first
      if (confirm('This will delete all current products and seed default Dasi Sweets. Continue?')) {
        for (const p of products) {
            await deleteDoc(doc(db, 'products', p.id)).catch(e => console.error(e));
        }
        // Remove id before adding to Firestore so it auto-generates
        const dataToSeed = DEFAULT_DATA.map(({ id, ...rest }) => rest);
        for (const item of dataToSeed) {
          await addDoc(collection(db, 'products'), item);
        }
        alert("Dasi Sweets data seeded!");
      }
    } catch (e: any) {
      alert("Error seeding: " + e.message);
    }
  }

  const deleteProd = async (id: string) => {
    if(confirm("Delete this product?")) {
      await deleteDoc(doc(db, 'products', id)).catch(e => handleFirestoreError(e, OperationType.DELETE, `products/${id}`));
    }
  }

  const editProd = (p: any) => {
    setForm({ id: p.id, name: p.name, desc: p.description, price: p.price, cat: p.category, img: p.imageUrl });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <Card className="col-span-1 border-none shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-2xl h-fit">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold text-lg mb-2 text-zinc-900">{form.id ? 'Edit Product' : 'Add New Product'}</h3>
          <Input placeholder="Product Name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
          <Input type="number" placeholder="Price (Rs)" value={form.price} onChange={e=>setForm({...form, price: e.target.value})} />
          <Input placeholder="Category (e.g. Burger, Pizza, Desi)" value={form.cat} onChange={e=>setForm({...form, cat: e.target.value})} />
          <Textarea placeholder="Description" value={form.desc} onChange={e=>setForm({...form, desc: e.target.value})} />
          <div className="space-y-2">
            <Label className="text-xs text-neutral-500 font-semibold uppercase">Product Image</Label>
            <Input placeholder="Or paste an Image URL" value={form.img} onChange={e=>setForm({...form, img: e.target.value})} />
            <div 
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault(); e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const file = e.dataTransfer.files[0];
                  if (!file.type.startsWith('image/')) return alert("Must be an image.");
                  if (file.size > 200 * 1024) return alert("File too large. Max 200KB for Base64 storage in Firestore.");
                  const reader = new FileReader();
                  reader.onload = (loadEvt) => {
                    const result = loadEvt.target?.result as string;
                    setForm({ ...form, img: result });
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="border-2 border-dashed border-neutral-300 rounded-lg p-4 text-center text-sm text-neutral-500 hover:bg-neutral-50 hover:border-orange-300 transition-colors cursor-pointer"
              onClick={() => {
                const f = document.createElement('input');
                f.type = 'file';
                f.accept = 'image/*';
                f.onchange = (e: any) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  if (file.size > 200 * 1024) return alert("File too large. Max 200KB for Base64 storage in Firestore.");
                  const reader = new FileReader();
                  reader.onload = (loadEvt) => {
                    const result = loadEvt.target?.result as string;
                    setForm({ ...form, img: result });
                  };
                  reader.readAsDataURL(file);
                };
                f.click();
              }}
            >
              {form.img && form.img.startsWith('data:image') ? 'Base64 image loaded. Click or drag to replace.' : 'Drag & drop image here or click to browse (Max 200KB)'}
            </div>
            {form.img && <img src={form.img} className="w-full h-32 object-cover rounded-md border border-neutral-200" alt="Preview"/>}
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white" onClick={saveProduct}>Save</Button>
            {form.id && <Button variant="outline" onClick={()=>setForm({ id: '', name: '', desc: '', price: '', cat: '', img: '' })}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      <div className="col-span-1 md:col-span-2 space-y-3">
        <div className="flex justify-between items-center bg-orange-50 p-4 rounded-xl border border-orange-200">
          <p className="text-zinc-600">You can seed the menu with the default Dasi Sweets items.</p>
          <Button onClick={seedData} variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-100 flex-shrink-0 ml-4">Seed Dasi Sweets Data</Button>
        </div>
        {products.map(p => (
          <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-zinc-100 flex justify-between items-center">
            <div className="flex items-center gap-4">
              {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-12 h-12 rounded object-cover" /> : <div className="w-12 h-12 bg-zinc-100 rounded" />}
              <div>
                <h4 className="font-bold text-zinc-900">{p.name}</h4>
                <p className="text-sm text-orange-600 font-semibold">Rs {p.price} | {p.category}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={()=>editProd(p)}>Edit</Button>
              <Button size="sm" variant="destructive" className="bg-red-600" onClick={()=>deleteProd(p.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UserOrders({ user }: { user: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({id: d.id, ...d.data()})));
      setLoading(false);
      setError(null);
    }, e => {
      setLoading(false);
      try { handleFirestoreError(e, OperationType.LIST, 'orders'); }
      catch(err: any) { setError(err.message); }
    });
    return unsub;
  }, [user]);

  return (
    <div className="space-y-4 mt-4">
      {loading && <p className="text-zinc-500 text-sm">Loading your orders...</p>}
      {error && <div className="text-red-500 bg-red-50 p-3 rounded text-sm">{error}</div>}
      {!loading && !error && orders.length === 0 && <p className="text-zinc-500">You haven't placed any orders yet.</p>}
      {orders.map(o => (
        <Card key={o.id} className="shadow-sm border border-neutral-100">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs text-neutral-500">{new Date(o.createdAt).toLocaleString()}</p>
                <div className="font-semibold text-lg">Order #{o.id.slice(-6).toUpperCase()}</div>
              </div>
              <Badge variant={o.status === 'new' ? 'default' : o.status === 'completed' ? 'secondary' : 'outline'} 
                     className={o.status === 'new' ? 'bg-blue-500' : o.status === 'completed' ? 'bg-green-500 text-white' : ''}>
                {o.status.toUpperCase()}
              </Badge>
            </div>
            <div className="text-sm text-neutral-600 my-2">
              {o.items.map((i:any) => `${i.quantity}x ${i.name}`).join(', ')}
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t">
              <span className="font-semibold">Total: Rs {o.total}</span>
              {o.status === 'new' && (
                <Button size="sm" variant="destructive" onClick={async () => {
                  if(confirm('Cancel this order?')) {
                    await updateDoc(doc(db, 'orders', o.id), { status: 'cancelled' }).catch(e => {
                      try { handleFirestoreError(e, OperationType.UPDATE, `orders/${o.id}`); }
                      catch(err: any) { alert("Failed: " + err.message); }
                    });
                  }
                }}>Cancel</Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({id: d.id, ...d.data()})));
      setError(null);
      setLoading(false);
    }, e => {
      setLoading(false);
      try {
        handleFirestoreError(e, OperationType.LIST, 'orders');
      } catch(err: any) {
        setError(err.message);
      }
    });
    return unsub;
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'orders', id), { status }).catch(e => {
      try { handleFirestoreError(e, OperationType.UPDATE, `orders/${id}`); }
      catch(err: any) { alert("Failed to update status: " + err.message); }
    });
  }

  return (
    <div className="space-y-4">
      {loading && <p className="text-neutral-500">Loading orders...</p>}
      {error && <div className="text-red-500 bg-red-50 p-4 rounded-md text-sm whitespace-pre-wrap">{error}</div>}
      {!loading && !error && orders.length === 0 && <p className="text-neutral-500">No orders yet.</p>}
      {orders.map(o => (
        <Card key={o.id} className="border-none shadow-sm rounded-xl mb-4 bg-white">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-4 border-b pb-4">
              <div>
                <h3 className="font-bold text-[#370617] text-lg">Order #{o.id.slice(0,6).toUpperCase()}</h3>
                <p className="text-sm text-neutral-500">{new Date(o.createdAt).toLocaleString()}</p>
                <p className="font-semibold text-[#D00000] mt-1">Status: <span className="uppercase">{o.status}</span></p>
              </div>
              <div className="text-right">
                <p className="font-bold text-xl">Rs {o.total}</p>
                <select 
                  className="mt-2 text-sm border bg-neutral-50 rounded p-1" 
                  value={o.status || 'new'} 
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                >
                  <option value="new">New</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2 text-sm text-neutral-400 uppercase tracking-wider">Customer Details</h4>
                <p className="font-medium">{o.userName}</p>
                <p className="text-sm flex items-center gap-1 mt-1"><Phone className="w-3 h-3"/> {o.phoneNumber}</p>
                <p className="text-sm flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> {o.address}</p>
                {o.specialInstruction && <p className="text-sm mt-3 bg-orange-50 text-orange-800 p-2 rounded-lg border border-orange-200"><strong>Note:</strong> {o.specialInstruction}</p>}
              </div>
              <div>
                 <h4 className="font-semibold mb-2 text-sm text-neutral-400 uppercase tracking-wider">Items</h4>
                 <ul className="space-y-1">
                   {o.items.map((i:any, idx:number) => (
                     <li key={idx} className="text-sm flex justify-between">
                       <span>{i.quantity}x {i.name}</span>
                       <span className="text-neutral-500">Rs {i.price * i.quantity}</span>
                     </li>
                   ))}
                 </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

