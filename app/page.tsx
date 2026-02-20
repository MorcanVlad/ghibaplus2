"use client";
import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./lib/firebase"; 
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { SCHOOL_CLASSES } from "./lib/constants";

// --- DICȚIONAR PENTRU PAGINA DE LOGIN ---
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
    tTitle: "📄 Termeni și Condiții", tBtn: "Am înțeles și Accept",
    t1: "1. Platformă Neoficială: GhibaPlus este independentă și nu înlocuiește canalele oficiale ale școlii.",
    t2: "2. Date: Datele sunt stocate securizat. Telefonul/clasa sunt strict pentru organizare internă.",
    t3: "3. Conduită: Orice formă de bullying sau spam va duce la suspendarea contului tău.",
    t4: "4. Moderare: Administratorii pot revoca accesul utilizatorilor problematici fără avertizare.",
    t5: "5. Securitate: Ești responsabil pentru păstrarea confidențialității parolei."
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
    tTitle: "📄 Terms and Conditions", tBtn: "I understand and Accept",
    t1: "1. Unofficial Platform: GhibaPlus is independent and does not replace official school channels.",
    t2: "2. Data: Data is stored securely. Phone/class are strictly for internal organization.",
    t3: "3. Conduct: Any form of bullying or spam will result in account suspension.",
    t4: "4. Moderation: Administrators can revoke access for problematic users without warning.",
    t5: "5. Security: You are responsible for keeping your password confidential."
  },
  fr: {
    portal: "Portail Étudiant", emailPlace: "Nom.Prenom@ghibabirta.ro", phonePlace: "Téléphone (07XX...)",
    classPlace: "Classe", passPlace: "Mot de passe", confirmPlace: "Confirmer le mot de passe",
    accept1: "J'accepte les ", termsBtn: "Conditions d'utilisation", accept2: ".",
    btnRegister: "Créer un Compte", btnLogin: "Se Connecter",
    switchLogin: "Déjà un compte ? Connectez-vous.", switchRegister: "Nouveau ? Demandez un compte.",
    errEmail: "Utilisez l'email de l'école (@ghibabirta.ro).", errClass: "Choisissez votre classe !",
    errTerms: "Vous devez accepter les conditions.", errPassMatch: "Les mots de passe ne correspondent pas !",
    errPhone: "Le numéro doit comporter exactement 10 chiffres !",
    errWhitelist: "⛔ Compte non approuvé. Contactez le Conseil.",
    errCreds: "Email ou mot de passe incorrect.", errInUse: "Ce compte existe déjà.",
    tTitle: "📄 Conditions d'utilisation", tBtn: "Je comprends et j'accepte",
    t1: "1. Plateforme Non Officielle : GhibaPlus est indépendant et ne remplace pas les canaux officiels.",
    t2: "2. Données : Stockées de manière sécurisée. Téléphone/classe utilisés pour l'organisation interne.",
    t3: "3. Conduite : Tout harcèlement ou spam entraînera la suspension du compte.",
    t4: "4. Modération : Les administrateurs peuvent révoquer l'accès sans avertissement.",
    t5: "5. Sécurité : Vous êtes responsable de la confidentialité de votre mot de passe."
  },
  de: {
    portal: "Schülerportal", emailPlace: "Name.Vorname@ghibabirta.ro", phonePlace: "Telefon (07XX...)",
    classPlace: "Klasse", passPlace: "Passwort", confirmPlace: "Passwort bestätigen",
    accept1: "Ich akzeptiere die ", termsBtn: "Nutzungsbedingungen", accept2: ".",
    btnRegister: "Konto erstellen", btnLogin: "Anmelden",
    switchLogin: "Hast du schon ein Konto? Anmelden.", switchRegister: "Neu hier? Konto anfordern.",
    errEmail: "Verwende deine Schul-E-Mail (@ghibabirta.ro).", errClass: "Wähle deine Klasse!",
    errTerms: "Du musst die Nutzungsbedingungen akzeptieren.", errPassMatch: "Passwörter stimmen nicht überein!",
    errPhone: "Die Telefonnummer muss genau 10 Ziffern lang sein!",
    errWhitelist: "⛔ Konto nicht genehmigt. Kontaktiere den Schülerrat.",
    errCreds: "Falsche E-Mail oder Passwort.", errInUse: "Dieses Konto existiert bereits.",
    tTitle: "📄 Nutzungsbedingungen", tBtn: "Ich verstehe und akzeptiere",
    t1: "1. Inoffizielle Plattform: GhibaPlus ist unabhängig.",
    t2: "2. Daten: Sicher gespeichert. Nur für interne Organisation.",
    t3: "3. Verhalten: Mobbing oder Spam führt zur Sperrung.",
    t4: "4. Moderation: Administratoren können den Zugriff widerrufen.",
    t5: "5. Sicherheit: Du bist für dein Passwort verantwortlich."
  },
  es: {
    portal: "Portal Estudiantil", emailPlace: "Nombre.Apellido@ghibabirta.ro", phonePlace: "Teléfono (07XX...)",
    classPlace: "Clase", passPlace: "Contraseña", confirmPlace: "Confirmar Contraseña",
    accept1: "Acepto los ", termsBtn: "Términos y Condiciones", accept2: ".",
    btnRegister: "Crear Cuenta", btnLogin: "Iniciar Sesión",
    switchLogin: "¿Ya tienes cuenta? Inicia sesión.", switchRegister: "¿Nuevo aquí? Solicita una cuenta.",
    errEmail: "Usa tu correo escolar (@ghibabirta.ro).", errClass: "¡Elige tu clase!",
    errTerms: "Debes aceptar los Términos y Condiciones.", errPassMatch: "¡Las contraseñas no coinciden!",
    errPhone: "¡El número debe tener exactamente 10 dígitos!",
    errWhitelist: "⛔ Cuenta no aprobada. Contacta al Consejo Estudiantil.",
    errCreds: "Correo o contraseña incorrectos.", errInUse: "Esta cuenta ya existe.",
    tTitle: "📄 Términos y Condiciones", tBtn: "Entiendo y Acepto",
    t1: "1. Plataforma No Oficial: GhibaPlus es independiente.",
    t2: "2. Datos: Almacenados de forma segura.",
    t3: "3. Conducta: El acoso o spam resultará en suspensión.",
    t4: "4. Moderación: Los administradores pueden revocar el acceso.",
    t5: "5. Seguridad: Eres responsable de tu contraseña."
  }
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [studentClass, setStudentClass] = useState("");
  
  const [currentLang, setCurrentLang] = useState("ro"); // Limba curentă pe ecran
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState("");
  
  const router = useRouter();
  const t = TRANSLATIONS[currentLang]; // Preluăm traducerile

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
        
        // Salvăm și LIMBA în baza de date la creare!
        await setDoc(doc(db, "users", result.user.uid), { 
          uid: result.user.uid,
          email: result.user.email, 
          name: displayName, 
          phone: phone, 
          class: studentClass, 
          role: "student",
          interests: [],
          language: currentLang, // Limba aleasă acum
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`,
          termsAcceptedAt: new Date().toISOString()
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

  const inputClass = "w-full p-4 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium backdrop-blur-md bg-white/5 border border-white/10 text-white placeholder-gray-500 hover:bg-white/10";

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden font-sans bg-slate-950 selection:bg-red-500/30">
      
      {/* BACKGROUND */}
      <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[10000ms]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[8000ms]"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* SELECTOR DE LIMBĂ */}
      <div className="absolute top-6 right-6 z-20">
          <select value={currentLang} onChange={(e) => setCurrentLang(e.target.value)} className="bg-slate-900/80 text-white border border-white/10 rounded-xl px-4 py-2 font-bold outline-none cursor-pointer backdrop-blur-md shadow-lg hover:border-white/30 transition-colors">
              <option value="ro">🇷🇴 RO</option>
              <option value="en">🇬🇧 EN</option>
              <option value="fr">🇫🇷 FR</option>
              <option value="de">🇩🇪 DE</option>
              <option value="es">🇪🇸 ES</option>
          </select>
      </div>

      <div className="p-10 rounded-[2.5rem] max-w-md w-full z-10 mx-4 relative backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-slate-900/60">
        <div className="flex flex-col items-center mb-8">
          <img src="/favicon.ico" alt="Logo" className="w-20 h-20 rounded-[1.5rem] mb-5 shadow-2xl shadow-red-500/40 transform hover:scale-110 transition-transform duration-500 border border-white/10" />
          <h1 className="text-4xl font-black tracking-tight text-white">Ghiba<span className="text-red-500">+</span></h1>
          <p className="text-gray-400 mt-2 font-bold text-xs tracking-[0.2em] uppercase bg-white/5 px-4 py-1.5 rounded-full border border-white/5">{t.portal}</p>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder={t.emailPlace} value={email} onChange={e => setEmail(e.target.value)} className={inputClass} required />
            
            {isRegistering && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                    <input type="tel" placeholder={t.phonePlace} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} className={inputClass} required />
                    <select value={studentClass} onChange={e => setStudentClass(e.target.value)} className={`${inputClass} appearance-none text-gray-300`} required>
                        <option value="" className="text-black bg-white">{t.classPlace}</option>
                        {SCHOOL_CLASSES.map(c => <option key={c} value={c} className="text-black bg-white">{c}</option>)}
                    </select>
                </div>
            )}
            
            <input type="password" placeholder={t.passPlace} value={password} onChange={e => setPassword(e.target.value)} className={inputClass} required />
            
            {isRegistering && (
                <div className="animate-fade-in space-y-4">
                    <input type="password" placeholder={t.confirmPlace} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} required />
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                        <input type="checkbox" id="terms" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-1 w-5 h-5 accent-red-600 cursor-pointer rounded-md shrink-0" />
                        <label htmlFor="terms" className="text-xs leading-relaxed text-gray-300">
                            {t.accept1} <button type="button" onClick={() => setShowTerms(true)} className="text-red-400 font-bold hover:text-red-300 underline underline-offset-2">{t.termsBtn}</button>{t.accept2}
                        </label>
                    </div>
                </div>
            )}
            
            <button className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all transform hover:scale-[1.02] active:scale-95 mt-4 text-lg border border-red-400/20">
              {isRegistering ? t.btnRegister : t.btnLogin}
            </button>
        </form>

        <div className="mt-8 text-center border-t border-white/10 pt-6">
            <button onClick={() => {setError(""); setIsRegistering(!isRegistering)}} className="text-gray-400 hover:text-white text-sm font-bold transition-colors">
                {isRegistering ? t.switchLogin : t.switchRegister}
            </button>
        </div>
        {error && <div className="mt-4 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-sm font-bold text-center animate-pulse">{error}</div>}
      </div>

      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl border bg-slate-900 border-white/10 text-white relative overflow-hidden">
                <button onClick={() => setShowTerms(false)} className="absolute top-6 right-6 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 font-bold transition">✕</button>
                <h2 className="text-2xl sm:text-3xl font-black mb-6 flex items-center gap-3"><span className="text-red-500">📄</span> {t.tTitle.replace('📄 ', '')}</h2>
                <div className="overflow-y-auto max-h-[60vh] text-[13px] text-gray-300 space-y-5 pr-4 custom-scrollbar">
                    <p><strong>{t.t1.split(':')[0]}:</strong> {t.t1.split(':')[1]}</p>
                    <p><strong>{t.t2.split(':')[0]}:</strong> {t.t2.split(':')[1]}</p>
                    <p><strong>{t.t3.split(':')[0]}:</strong> {t.t3.split(':')[1]}</p>
                    <p><strong>{t.t4.split(':')[0]}:</strong> {t.t4.split(':')[1]}</p>
                    <p><strong>{t.t5.split(':')[0]}:</strong> {t.t5.split(':')[1]}</p>
                </div>
                <button onClick={() => setShowTerms(false)} className="mt-8 bg-white text-black w-full py-4 rounded-xl font-black text-lg hover:bg-gray-200 transition-colors shadow-xl">{t.tBtn}</button>
            </div>
        </div>
      )}
    </div>
  );
}