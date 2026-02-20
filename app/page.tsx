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
  
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const formattedEmail = email.toLowerCase().trim();
    if (!formattedEmail.endsWith("@ghibabirta.ro")) return setError("Folosește emailul școlii (@ghibabirta.ro)."); 

    try {
      if (isRegistering) {
        if (!studentClass) return setError("Alege-ți clasa!"); 
        if (!acceptedTerms) return setError("Trebuie să accepți Termenii și Condițiile."); 
        if (password !== confirmPassword) return setError("Parolele nu coincid!"); 
        // Verificarea strictă de 10 cifre
        if (phone.length !== 10) return setError("Numărul de telefon trebuie să aibă exact 10 cifre!"); 

        const whitelistSnap = await getDoc(doc(db, "whitelist", formattedEmail));
        if (!whitelistSnap.exists()) return setError("⛔ Cont neaprobat. Contactează Consiliul Elevilor."); 

        const result = await createUserWithEmailAndPassword(auth, formattedEmail, password);
        let displayName = formattedEmail.split("@")[0].split(".").map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(" ");
        
        await setDoc(doc(db, "users", result.user.uid), { 
          uid: result.user.uid,
          email: result.user.email, 
          name: displayName, 
          phone: phone, 
          class: studentClass, 
          role: "student",
          interests: [],
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`,
          termsAcceptedAt: new Date().toISOString()
        });
      } else {
        await signInWithEmailAndPassword(auth, formattedEmail, password);
      }
      router.push("/dashboard");
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') setError("Parolă sau email incorect.");
      else if (err.code === 'auth/email-already-in-use') setError("Acest cont a fost deja creat.");
      else setError(err.message);
    }
  };

  const inputClass = "w-full p-4 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium backdrop-blur-md bg-white/5 border border-white/10 text-white placeholder-gray-500 hover:bg-white/10";

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden font-sans bg-slate-950 selection:bg-red-500/30">
      
      {/* BACKGROUND */}
      <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[10000ms]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[8000ms]"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <div className="p-10 rounded-[2.5rem] max-w-md w-full z-10 mx-4 relative backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-slate-900/60">
        <div className="flex flex-col items-center mb-8">
          <img src="/favicon.ico" alt="Ghiba+ Logo" className="w-20 h-20 rounded-[1.5rem] mb-5 shadow-2xl shadow-red-500/40 transform hover:scale-110 transition-transform duration-500 border border-white/10" />
          <h1 className="text-4xl font-black tracking-tight text-white">Ghiba<span className="text-red-500">+</span></h1>
          <p className="text-gray-400 mt-2 font-bold text-xs tracking-[0.2em] uppercase bg-white/5 px-4 py-1.5 rounded-full border border-white/5">Portalul Elevilor</p>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder="Nume.Prenume@ghibabirta.ro" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} required />
            
            {isRegistering && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                    {/* INPUT TELEFON MODIFICAT: Permite doar cifre și max 10 */}
                    <input type="tel" placeholder="Telefon (07XX...)" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} className={inputClass} required />
                    
                    <select value={studentClass} onChange={e => setStudentClass(e.target.value)} className={`${inputClass} appearance-none text-gray-300`} required>
                        <option value="" className="text-black bg-white">Clasa</option>
                        {SCHOOL_CLASSES.map(c => <option key={c} value={c} className="text-black bg-white">{c}</option>)}
                    </select>
                </div>
            )}
            
            <input type="password" placeholder="Parolă" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} required />
            
            {isRegistering && (
                <div className="animate-fade-in space-y-4">
                    <input type="password" placeholder="Confirmă Parola" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} required />
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                        <input type="checkbox" id="terms" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-1 w-5 h-5 accent-red-600 cursor-pointer rounded-md" />
                        <label htmlFor="terms" className="text-xs leading-relaxed text-gray-300">
                            Accept <button type="button" onClick={() => setShowTerms(true)} className="text-red-400 font-bold hover:text-red-300 underline underline-offset-2">Termenii și Condițiile</button> de utilizare.
                        </label>
                    </div>
                </div>
            )}
            
            <button className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all transform hover:scale-[1.02] active:scale-95 mt-4 text-lg border border-red-400/20">
              {isRegistering ? "Creează Contul" : "Intră în Cont"}
            </button>
        </form>

        <div className="mt-8 text-center border-t border-white/10 pt-6">
            <button onClick={() => {setError(""); setIsRegistering(!isRegistering)}} className="text-gray-400 hover:text-white text-sm font-bold transition-colors">
                {isRegistering ? "Ai deja cont? Autentifică-te." : "Nou aici? Solicită un cont."}
            </button>
        </div>
        {error && <div className="mt-4 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-sm font-bold text-center animate-pulse">{error}</div>}
      </div>

      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl border bg-slate-900 border-white/10 text-white relative overflow-hidden">
                <button onClick={() => setShowTerms(false)} className="absolute top-6 right-6 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 font-bold transition">✕</button>
                <h2 className="text-3xl font-black mb-6 flex items-center gap-3"><span className="text-red-500">📄</span> Termeni și Condiții</h2>
                <div className="overflow-y-auto max-h-[60vh] text-[13px] text-gray-300 space-y-5 pr-4 custom-scrollbar">
                    <p><strong>1. Platformă Neoficială și Informare:</strong> GhibaPlus este o inițiativă independentă a elevilor și NU înlocuiește canalele oficiale de comunicare ale conducerii școlii. Verifică întotdeauna informațiile critice (teze, examene) cu profesorii tăi.</p>
                    <p><strong>2. Colectarea și Utilizarea Datelor:</strong> Datele tale (Nume, Email, Clasă, Telefon) sunt stocate securizat pe serverele Google (Firebase). Telefonul și clasa ta sunt folosite strict pentru organizarea internă (ex: liste de prezență la evenimentele la care te înscrii).</p>
                    <p><strong>3. Reguli de Conduită:</strong> GhibaPlus promovează respectul reciproc. Orice formă de bullying, limbaj vulgar, spam sau postare de conținut irelevant / inadecvat va duce la <strong>suspendarea definitivă</strong> a contului tău.</p>
                    <p><strong>4. Moderare și Administrare:</strong> Consiliul Elevilor și administratorii platformei își rezervă dreptul de a șterge orice postare care încalcă regulamentul și de a revoca accesul utilizatorilor problematici, fără o avertizare prealabilă.</p>
                    <p><strong>5. Securitate:</strong> Ești responsabil pentru păstrarea confidențialității parolei tale. Nu oferi contul tău altor persoane.</p>
                </div>
                <button onClick={() => setShowTerms(false)} className="mt-8 bg-white text-black w-full py-4 rounded-xl font-black text-lg hover:bg-gray-200 transition-colors shadow-xl">Am înțeles și Accept</button>
            </div>
        </div>
      )}
    </div>
  );
}