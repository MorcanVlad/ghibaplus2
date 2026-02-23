"use client";
import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./lib/firebase"; 
import { doc, setDoc, getDoc, collection, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { SCHOOL_CLASSES } from "./lib/constants";

const TRANSLATIONS: any = {
  ro: {
    portal: "Portalul Elevilor", emailPlace: "Nume.Prenume@ghibabirta.ro", phonePlace: "Telefon (07XX...)",
    classPlace: "Clasa", passPlace: "Parolă", confirmPlace: "Confirmă Parola",
    accept1: "Accept ", termsBtn: "Termenii și Condițiile", accept2: " de utilizare.",
    btnRegister: "Creează Contul", btnLogin: "Intră în Cont",
    switchLogin: "Ai deja cont? Autentifică-te.", switchRegister: "Nou aici? Solicită un cont.",
    errEmail: "Folosește emailul școlii (@ghibabirta.ro).", errClass: "Alege-ți clasa!",
    errTerms: "Trebuie să accepți Termenii și Condițiile.", errPassMatch: "Parolele nu coincid!",
    errPhone: "Numărul de telefon trebuie să aibă exact 10 cifre!",
    errWhitelist: "⛔ Cont neaprobat. Contactează Consiliul Elevilor.",
    errCreds: "Parolă sau email incorect.", errInUse: "Acest cont a fost deja creat.",
    welcomeTitle: "Bine ai venit!", welcomeMsg: "Ne bucurăm să te avem pe GhibaPlus. Aici vei găsi toate noutățile și evenimentele școlii!",
    classWarning: "⚠️ Atenție: Clasa nu mai poate fi modificată după crearea contului!",
    tTitle: "📄 Termeni și Condiții", tBtn: "Am înțeles și Accept",
    tc1: "1. Originea Platformei: Această aplicație, GhibaPlus, a fost realizată și dezvoltată în cadrul unui proiect de mobilitate Erasmus+ desfășurat în Portugalia. Este o inițiativă independentă creată de elevi, pentru elevi.",
    tc2: "2. Statut Neoficial: GhibaPlus nu reprezintă un canal de comunicare administrativ oficial al instituției de învățământ, ci funcționează ca un instrument suplimentar și modern pentru informarea și organizarea comunității școlare.",
    tc3: "3. Prelucrarea Datelor: Datele cu caracter personal (nume, clasă, număr de telefon, email) sunt colectate strict în scopul funcționării platformei (ex: validarea identității, înscrierea la evenimente). Datele sunt stocate în siguranță și nu vor fi partajate cu terți în scopuri comerciale.",
    tc4: "4. Reguli de Conduită: Utilizatorii se obligă să mențină un comportament civilizat. Orice formă de hărțuire (bullying), limbaj licențios, instigare la ură sau spam va atrage suspendarea sau ștergerea definitivă a contului.",
    tc5: "5. Moderare și Responsabilitate: Administratorii platformei își rezervă dreptul de a revoca accesul utilizatorilor care încalcă prezentul regulament, fără o notificare prealabilă. Utilizatorul poartă responsabilitatea exclusivă pentru păstrarea confidențialității parolei sale.",
    tc6: "Prin continuarea utilizării acestei platforme, confirmi că ai citit, înțeles și acceptat aceste reguli în totalitate."
  },
  en: {
    portal: "Student Portal", emailPlace: "Name.Surname@ghibabirta.ro", phonePlace: "Phone (07XX...)",
    classPlace: "Class", passPlace: "Password", confirmPlace: "Confirm Password",
    accept1: "I accept the ", termsBtn: "Terms and Conditions", accept2: ".",
    btnRegister: "Create Account", btnLogin: "Sign In",
    switchLogin: "Already have an account? Sign in.", switchRegister: "New here? Request an account.",
    errEmail: "Use your school email (@ghibabirta.ro).", errClass: "Choose your class!",
    errTerms: "You must accept the Terms and Conditions.", errPassMatch: "Passwords do not match!",
    errPhone: "Phone number must be exactly 10 digits!",
    errWhitelist: "⛔ Account not approved. Contact the Student Council.",
    errCreds: "Incorrect email or password.", errInUse: "This account already exists.",
    welcomeTitle: "Welcome!", welcomeMsg: "Glad to have you on GhibaPlus. Here you will find all school news and events!",
    classWarning: "⚠️ Warning: Your class cannot be changed after registration!",
    tTitle: "📄 Terms and Conditions", tBtn: "I understand and Accept",
    tc1: "1. Platform Origin: This application, GhibaPlus, was designed and developed during an Erasmus+ mobility project held in Portugal. It is an independent initiative created by students, for students.",
    tc2: "2. Unofficial Status: GhibaPlus is not an official administrative communication channel of the educational institution, but serves as an additional, modern tool for informing and organizing the school community.",
    tc3: "3. Data Processing: Personal data (name, class, phone number, email) are collected strictly for the platform's operation (e.g., identity validation, event registration). Data is stored securely and will not be shared with third parties for commercial purposes.",
    tc4: "4. Code of Conduct: Users must maintain civilized behavior. Any form of harassment (bullying), foul language, hate speech, or spam will result in the suspension or permanent deletion of the account.",
    tc5: "5. Moderation and Responsibility: Platform administrators reserve the right to revoke access for users who violate these rules, without prior notice. The user is solely responsible for keeping their password confidential.",
    tc6: "By continuing to use this platform, you confirm that you have read, understood, and fully accepted these rules."
  }
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [studentClass, setStudentClass] = useState("");
  
  const [currentLang, setCurrentLang] = useState("ro"); 
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");
  
  const router = useRouter();
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS["ro"];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const formattedEmail = email.toLowerCase().trim();
    if (!formattedEmail.endsWith("@ghibabirta.ro")) return setError(t.errEmail); 

    try {
      if (isRegistering) {
        if (!studentClass) return setError(t.errClass); 
        if (!acceptedTerms) return setError(t.errTerms); 
        if (password !== confirmPassword) return setError(t.errPassMatch); 
        if (phone.length !== 10) return setError(t.errPhone); 

        const whitelistSnap = await getDoc(doc(db, "whitelist", formattedEmail));
        if (!whitelistSnap.exists()) return setError(t.errWhitelist); 

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
          language: currentLang,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`,
          termsAcceptedAt: new Date().toISOString()
        });

        await addDoc(collection(db, "users", result.user.uid, "notifications"), {
          title: t.welcomeTitle,
          message: t.welcomeMsg,
          sentAt: new Date().toISOString(),
          read: false
        });

      } else {
        await signInWithEmailAndPassword(auth, formattedEmail, password);
      }
      router.push("/dashboard");
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') setError(t.errCreds);
      else if (err.code === 'auth/email-already-in-use') setError(t.errInUse);
      else setError(err.message);
    }
  };

  const inputClass = "w-full p-4 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 transition-all font-bold backdrop-blur-md bg-white/10 border border-white/20 text-white placeholder-gray-300 hover:bg-white/20 shadow-inner";

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden font-sans bg-slate-950 selection:bg-red-500/30">
      
      <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[10000ms]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[8000ms]"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <div className="absolute top-6 right-6 z-20">
          <select value={currentLang} onChange={(e) => setCurrentLang(e.target.value)} className="bg-slate-900/80 text-white border border-white/20 rounded-xl px-4 py-2 font-bold outline-none cursor-pointer backdrop-blur-xl shadow-lg hover:border-white/40 transition-colors">
              <option value="ro" className="text-black bg-white">🇷🇴 RO</option>
              <option value="en" className="text-black bg-white">🇬🇧 EN</option>
          </select>
      </div>

      <div className="p-10 rounded-[2.5rem] max-w-md w-full z-10 mx-4 relative backdrop-blur-2xl border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.6)] bg-slate-900/40 my-8">
        <div className="flex flex-col items-center mb-8">
          <img src="/favicon.ico" alt="Logo" className="w-24 h-24 rounded-[2rem] mb-6 shadow-[0_10px_30px_rgba(239,68,68,0.3)] transform hover:scale-110 transition-transform duration-500 border border-white/20" />
          <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-md">Ghiba<span className="text-red-500">+</span></h1>
          <p className="text-gray-300 mt-2 font-black text-[10px] tracking-[0.2em] uppercase bg-white/10 px-4 py-1.5 rounded-full border border-white/10 shadow-sm">{t.portal}</p>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder={t.emailPlace} value={email} onChange={e => setEmail(e.target.value)} className={inputClass} required />
            
            {isRegistering && (
                <div className="animate-fade-in space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <input type="tel" placeholder={t.phonePlace} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} className={inputClass} required />
                        <div>
                            <select value={studentClass} onChange={e => setStudentClass(e.target.value)} className={`${inputClass} appearance-none`} required>
                                <option value="" className="text-black bg-white">{t.classPlace}</option>
                                {SCHOOL_CLASSES.map(c => <option key={c} value={c} className="text-black bg-white">{c}</option>)}
                            </select>
                        </div>
                    </div>
                    {/* AVERTISMENT SCHIMBARE CLASA */}
                    <p className="text-[10px] text-red-400 font-bold ml-1 tracking-wide">{t.classWarning}</p>
                </div>
            )}
            
            <input type="password" placeholder={t.passPlace} value={password} onChange={e => setPassword(e.target.value)} className={inputClass} required />
            
            {isRegistering && (
                <div className="animate-fade-in space-y-4">
                    <input type="password" placeholder={t.confirmPlace} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} required />
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-black/30 border border-white/10">
                        <input type="checkbox" id="terms" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="w-5 h-5 accent-red-500 cursor-pointer rounded-md shrink-0" />
                        <label htmlFor="terms" className="text-xs leading-relaxed text-gray-300 font-medium">
                            {t.accept1} <button type="button" onClick={() => setShowTerms(true)} className="text-red-400 font-bold hover:text-red-300 underline">{t.termsBtn}</button>{t.accept2}
                        </label>
                    </div>
                </div>
            )}
            
            <button className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl shadow-[0_10px_20px_rgba(220,38,38,0.3)] transition-all transform hover:-translate-y-1 mt-6 text-lg border border-red-500/50">
              {isRegistering ? t.btnRegister : t.btnLogin}
            </button>
        </form>

        <div className="mt-8 text-center pt-6">
            <button onClick={() => {setError(""); setIsRegistering(!isRegistering)}} className="text-gray-400 hover:text-white text-sm font-bold transition-colors">
                {isRegistering ? t.switchLogin : t.switchRegister}
            </button>
        </div>
        {error && <div className="mt-4 bg-red-500/20 border border-red-500/50 p-4 rounded-2xl text-red-200 text-sm font-bold text-center animate-pulse">{error}</div>}
      </div>

      {showTerms && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="w-full max-w-3xl rounded-[2.5rem] p-8 sm:p-12 shadow-2xl border bg-slate-900 border-white/20 text-white relative overflow-hidden">
                <button onClick={() => setShowTerms(false)} className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 font-bold transition">✕</button>
                <h2 className="text-2xl sm:text-3xl font-black mb-8 flex items-center gap-3"><span className="text-red-500">📄</span> Termeni și Condiții</h2>
                <div className="overflow-y-auto max-h-[60vh] text-sm text-gray-300 space-y-6 pr-4 custom-scrollbar font-medium leading-relaxed">
                    <p><strong>{t.tc1.split(':')[0]}:</strong>{t.tc1.split(':')[1]}</p>
                    <p><strong>{t.tc2.split(':')[0]}:</strong>{t.tc2.split(':')[1]}</p>
                    <p><strong>{t.tc3.split(':')[0]}:</strong>{t.tc3.split(':')[1]}</p>
                    <p><strong>{t.tc4.split(':')[0]}:</strong>{t.tc4.split(':')[1]}</p>
                    <p><strong>{t.tc5.split(':')[0]}:</strong>{t.tc5.split(':')[1]}</p>
                    <p className="pt-4 border-t border-white/10 text-center font-bold text-white italic">{t.tc6}</p>
                </div>
                <button onClick={() => {setShowTerms(false); setAcceptedTerms(true);}} className="mt-8 bg-white text-black w-full py-4 rounded-2xl font-black text-lg hover:bg-gray-200 transition-colors shadow-xl">{t.tBtn}</button>
            </div>
        </div>
      )}
    </div>
  );
}