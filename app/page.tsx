"use client";
import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./lib/firebase"; 
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { SCHOOL_CLASSES } from "./lib/constants";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [studentClass, setStudentClass] = useState("");
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("ghiba_theme") === "light") setDarkMode(false);
  }, []);

  const toggleTheme = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    localStorage.setItem("ghiba_theme", newVal ? "dark" : "light");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const formattedEmail = email.toLowerCase().trim();
    if (!formattedEmail.endsWith("@ghibabirta.ro")) return setError("Te rugăm să folosești emailul școlii (@ghibabirta.ro)."); 

    try {
      if (isRegistering) {
        if (!studentClass) return setError("Te rugăm să îți alegi clasa!"); 
        if (!acceptedTerms) return setError("Trebuie să accepți Termenii și Condițiile."); 
        if (password !== confirmPassword) return setError("Parolele nu coincid!"); 
        if (phone.length < 10) return setError("Număr de telefon invalid!"); 

        const whitelistSnap = await getDoc(doc(db, "whitelist", formattedEmail));
        if (!whitelistSnap.exists()) return setError("⛔ Emailul tău nu este aprobat încă. Vorbește cu un profesor/admin."); 

        // 1. Creăm Auth
        const result = await createUserWithEmailAndPassword(auth, formattedEmail, password);
        let displayName = formattedEmail.split("@")[0].split(".").map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(" ");
        
        // 2. Creăm BAZA DE DATE stabilă
        const userRef = doc(db, "users", result.user.uid);
        await setDoc(userRef, { 
          uid: result.user.uid,
          email: result.user.email, 
          name: displayName, 
          phone: phone, 
          class: studentClass, 
          role: "student", 
          interests: [], 
          bio: "Salut! Sunt nou pe GhibaPlus.",
          followers: [],
          following: [],
          showPhoneInSettings: false,
          onboardingCompleted: true,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`,
          termsAcceptedAt: new Date().toISOString()
        });
      } else {
        await signInWithEmailAndPassword(auth, formattedEmail, password);
      }
      router.push("/dashboard");
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') setError("Parolă sau email incorect.");
      else if (err.code === 'auth/weak-password') setError("Parola e prea scurtă (minim 6 caractere).");
      else if (err.code === 'auth/email-already-in-use') setError("Acest cont există deja. Dacă ai fost șters de admin, roagă-l să îți șteargă și Authentication-ul din Firebase.");
      else setError(err.message);
    }
  };

  const bgClass = darkMode ? "bg-[#09090b]" : "bg-slate-100";
  const glassClass = darkMode ? "bg-[#18181b]/80 border-white/5" : "bg-white/80 border-gray-200 shadow-2xl";
  const inputClass = `w-full p-4 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium backdrop-blur-sm ${darkMode ? "bg-white/5 border border-white/10 text-white placeholder-gray-500 hover:bg-white/10" : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 hover:bg-gray-100"}`;

  return (
    <div className={`relative min-h-screen flex items-center justify-center overflow-hidden font-sans transition-colors duration-500 ${bgClass}`}>
      {/* Animated Glowing Orbs Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[10000ms]"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[8000ms]"></div>
      </div>

      <button onClick={toggleTheme} className={`absolute top-6 right-6 p-4 rounded-2xl text-xl z-20 backdrop-blur-md transition-all hover:scale-110 shadow-lg ${darkMode ? "bg-white/10 text-white border border-white/10" : "bg-white text-black border border-gray-200"}`}>
        {darkMode ? "☀️" : "🌙"}
      </button>

      <div className={`p-10 rounded-[2.5rem] max-w-md w-full z-10 mx-4 relative backdrop-blur-2xl border shadow-2xl ${glassClass}`}>
        <div className="flex flex-col items-center mb-8">
          <img src="/favicon.ico" alt="Ghiba+ Logo" className="w-20 h-20 rounded-[1.5rem] mb-5 shadow-2xl shadow-red-500/30 transform hover:scale-110 transition-transform duration-500" />
          <h1 className={`text-4xl font-black tracking-tight ${darkMode ? "text-white" : "text-gray-900"}`}>Ghiba<span className="text-red-500">+</span></h1>
          <p className={`${darkMode ? "text-gray-400" : "text-gray-500"} mt-2 font-bold text-xs tracking-[0.2em] uppercase bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full`}>Rețeaua Elevilor</p>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder="Nume.Prenume@ghibabirta.ro" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} required />
            
            {isRegistering && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                    <input type="tel" placeholder="Telefon" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} required />
                    <select value={studentClass} onChange={e => setStudentClass(e.target.value)} className={`${inputClass} appearance-none`} required>
                        <option value="" className="text-black bg-white">Clasa</option>
                        {SCHOOL_CLASSES.map(c => <option key={c} value={c} className="text-black bg-white">{c}</option>)}
                    </select>
                </div>
            )}
            
            <input type="password" placeholder="Parolă" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} required />
            
            {isRegistering && (
                <div className="animate-fade-in space-y-4">
                    <input type="password" placeholder="Confirmă Parola" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} required />
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                        <input type="checkbox" id="terms" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-1 w-5 h-5 accent-red-600 cursor-pointer rounded-md" />
                        <label htmlFor="terms" className={`text-xs leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Accept <button type="button" onClick={() => setShowTerms(true)} className="text-red-500 font-bold hover:underline">Termenii și Condițiile</button> comunității.
                        </label>
                    </div>
                </div>
            )}
            
            <button className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-red-600/20 transition-all transform hover:scale-[1.03] active:scale-95 mt-4 text-lg">
              {isRegistering ? "Creare Cont" : "Autentificare"}
            </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-500/20 pt-6">
            <button onClick={() => {setError(""); setIsRegistering(!isRegistering)}} className={`${darkMode ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-black"} text-sm font-bold transition-colors`}>
                {isRegistering ? "Ai deja cont? Autentifică-te." : "Nou aici? Creează un cont."}
            </button>
        </div>
        {error && <div className="mt-4 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 text-sm font-bold text-center animate-pulse">{error}</div>}
      </div>

      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className={`w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl border ${darkMode ? "bg-[#18181b] border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
                <h2 className="text-3xl font-black mb-6 flex items-center gap-3"><img src="/favicon.ico" className="w-8 h-8 rounded-lg"/> T&C GhibaPlus</h2>
                <div className="overflow-y-auto max-h-[60vh] text-sm opacity-80 space-y-4 pr-2 font-medium">
                    <p>1. <strong>Neoficial:</strong> Datele sunt informative. Verifică mereu anunțurile de la profesori.</p>
                    <p>2. <strong>Conduită:</strong> Fii respectuos. Spamul și jignirile atrag interdicția contului.</p>
                    <p>3. <strong>Date:</strong> Telefonul și clasa sunt necesare pentru a te înscrie la evenimente oficiale din școală.</p>
                </div>
                <button onClick={() => setShowTerms(false)} className="mt-8 bg-red-600 text-white w-full py-4 rounded-2xl font-bold text-lg hover:bg-red-500 transition-colors shadow-lg shadow-red-600/20">Am Înțeles</button>
            </div>
        </div>
      )}
    </div>
  );
}