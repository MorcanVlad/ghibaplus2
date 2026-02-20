"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase"; 
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, collection, query, getDocs, arrayUnion, arrayRemove, orderBy } from "firebase/firestore";
import { CALENDAR_TYPES, SCHOOL_CLASSES, INTEREST_CATEGORIES } from "../lib/constants";

const TRANSLATIONS: any = {
  ro: {
    search: "Caută (ex: locatie: sala 1, autor: mate)...", settings: "⚙️ Setări", logout: "Ieșire", admin: "ADMIN",
    council: "Consiliul Elevilor", official: "Oficial", event: "Eveniment",
    dateTime: "DATA / ORA", location: "LOCAȚIE", seats: "LOCURI OCUPATE", unlimited: "Nelimitat",
    cancelReg: "Anulează", join: "Particip ✅", calendar: "📅 Calendarul Tău",
    noEvents: "Niciun eveniment planificat.", settingsTitle: "Setările Tale",
    settingsDesc: "Personalizează-ți experiența pe GhibaPlus.", classLabel: "Clasa Ta",
    phoneLabel: "Număr de Telefon", tagsLabel: "Interese (Tag-uri)", langLabel: "Limba Interfeței",
    saving: "Se Salvează...", saveBtn: "Salvează Modificările", noPosts: "✨ Nu am găsit anunțuri conform căutării sau filtrului.",
    phoneError: "Numărul de telefon trebuie să aibă exact 10 cifre!", phoneReq: "Trebuie să ai un număr valid (10 cifre) setat în Profil pentru a te înscrie!",
    noSpots: "Ne pare rău, nu mai sunt locuri disponibile!", filterAll: "🏫 Toată Școala", filterClass: "👤 Clasa Mea",
    readMore: "📖 Mărește / Citește Tot", close: "Închide"
  },
  en: {
    search: "Search (ex: locatie: room 1, autor: math)...", settings: "⚙️ Settings", logout: "Logout", admin: "ADMIN",
    council: "Student Council", official: "Official", event: "Event",
    dateTime: "DATE / TIME", location: "LOCATION", seats: "SEATS TAKEN", unlimited: "Unlimited",
    cancelReg: "Cancel", join: "Join ✅", calendar: "📅 Your Calendar",
    noEvents: "No events planned.", settingsTitle: "Your Settings",
    settingsDesc: "Customize your GhibaPlus experience.", classLabel: "Your Class",
    phoneLabel: "Phone Number", tagsLabel: "Interests (Tags)", langLabel: "Interface Language",
    saving: "Saving...", saveBtn: "Save Changes", noPosts: "✨ No announcements found.",
    phoneError: "Phone number must be exactly 10 digits!", phoneReq: "You need a valid phone number to register!",
    noSpots: "Sorry, no spots left!", filterAll: "🏫 All School", filterClass: "👤 My Class",
    readMore: "📖 Expand / Read More", close: "Close"
  },
  fr: {
    search: "Recherche...", settings: "⚙️ Paramètres", logout: "Déconnexion", admin: "ADMIN",
    council: "Conseil", official: "Officiel", event: "Événement", dateTime: "DATE / HEURE", location: "LIEU", seats: "PLACES", unlimited: "Illimité",
    cancelReg: "Annuler", join: "Participer ✅", calendar: "📅 Calendrier", noEvents: "Aucun événement.", settingsTitle: "Paramètres", settingsDesc: "Personnalisez.", classLabel: "Classe", phoneLabel: "Téléphone", tagsLabel: "Tags", langLabel: "Langue", saving: "Enregistrement...", saveBtn: "Enregistrer", noPosts: "✨ Aucune annonce.", phoneError: "10 chiffres obligatoires!", phoneReq: "Numéro requis!", noSpots: "Complet!", filterAll: "🏫 École", filterClass: "👤 Ma Classe", readMore: "📖 Agrandir", close: "Fermer"
  },
  de: {
    search: "Suche...", settings: "⚙️ Einstellungen", logout: "Abmelden", admin: "ADMIN",
    council: "Schülerrat", official: "Offiziell", event: "Ereignis", dateTime: "DATUM / ZEIT", location: "ORT", seats: "PLÄTZE", unlimited: "Unbegrenzt",
    cancelReg: "Stornieren", join: "Teilnehmen ✅", calendar: "📅 Kalender", noEvents: "Keine Ereignisse.", settingsTitle: "Einstellungen", settingsDesc: "Anpassen.", classLabel: "Klasse", phoneLabel: "Telefon", tagsLabel: "Tags", langLabel: "Sprache", saving: "Speichern...", saveBtn: "Speichern", noPosts: "✨ Keine Ankündigungen.", phoneError: "10 Ziffern!", phoneReq: "Nummer erforderlich!", noSpots: "Voll!", filterAll: "🏫 Schule", filterClass: "👤 Meine Klasse", readMore: "📖 Vergrößern", close: "Schließen"
  },
  es: {
    search: "Buscar...", settings: "⚙️ Ajustes", logout: "Salir", admin: "ADMIN",
    council: "Consejo", official: "Oficial", event: "Evento", dateTime: "FECHA", location: "UBICACIÓN", seats: "LUGARES", unlimited: "Ilimitado",
    cancelReg: "Cancelar", join: "Participar ✅", calendar: "📅 Calendario", noEvents: "Sin eventos.", settingsTitle: "Ajustes", settingsDesc: "Personaliza.", classLabel: "Clase", phoneLabel: "Teléfono", tagsLabel: "Etiquetas", langLabel: "Idioma", saving: "Guardando...", saveBtn: "Guardar", noPosts: "✨ No hay anuncios.", phoneError: "¡10 dígitos!", phoneReq: "¡Número requerido!", noSpots: "¡Lleno!", filterAll: "🏫 Escuela", filterClass: "👤 Mi Clase", readMore: "📖 Expandir", close: "Cerrar"
  }
};

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "class">("all");
  
  const [showSettings, setShowSettings] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editClass, setEditClass] = useState("");
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [editLang, setEditLang] = useState("ro");
  const [isSaving, setIsSaving] = useState(false);
  
  const [darkMode, setDarkMode] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any>(null); // Pentru Full Screen Modal

  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("ghiba_theme") === "light") setDarkMode(false);
    auth.onAuthStateChanged(async (u) => {
        if (!u) return router.push("/");
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
            const userData = { id: u.uid, ...snap.data() };
            setUser(userData);
            setEditPhone(userData.phone || "");
            setEditClass(userData.class || "");
            setEditInterests(userData.interests || []);
            setEditLang(userData.language || "ro");
            loadData(); 
        }
    });
  }, [router]);

  const loadData = async () => {
        const newsSnap = await getDocs(query(collection(db, "news"), orderBy("postedAt", "desc")));
        const actSnap = await getDocs(query(collection(db, "activities"), orderBy("postedAt", "desc")));
        let allItems: any[] = [...newsSnap.docs.map(d => ({id: d.id, collectionType: 'news', ...d.data()})), ...actSnap.docs.map(d => ({id: d.id, collectionType: 'activities', ...d.data()}))];
        allItems.sort((a: any, b: any) => new Date(b.postedAt || b.date || 0).getTime() - new Date(a.postedAt || a.date || 0).getTime());
        setFeed(allItems);
        
        const calData = actSnap.docs.map(d => ({ id: d.id, title: d.data().title, start: d.data().date, type: 'activity', targetClasses: d.data().targetClasses })).filter(ev => ev.start);
        setCalendarEvents(calData);
  };

  const t = TRANSLATIONS[editLang] || TRANSLATIONS["ro"];

  const toggleTheme = () => {
      const newTheme = !darkMode;
      setDarkMode(newTheme);
      localStorage.setItem("ghiba_theme", newTheme ? "dark" : "light");
  };

  const handleSaveSettings = async () => {
      if (editPhone && editPhone.length !== 10) return alert(t.phoneError);
      setIsSaving(true);
      const ref = doc(db, "users", user.id);
      await updateDoc(ref, { phone: editPhone, class: editClass, interests: editInterests, language: editLang });
      setUser({ ...user, phone: editPhone, class: editClass, interests: editInterests, language: editLang });
      setShowSettings(false);
      setIsSaving(false);
      loadData();
  };

  const handleLike = async (item: any) => {
      const isLiked = item.likes?.includes(user.id);
      const ref = doc(db, item.collectionType, item.id);
      await updateDoc(ref, { likes: isLiked ? arrayRemove(user.id) : arrayUnion(user.id) });
      setFeed(feed.map(f => f.id === item.id ? { ...f, likes: isLiked ? f.likes.filter((i:any) => i !== user.id) : [...(f.likes||[]), user.id] } : f));
      if(selectedPost && selectedPost.id === item.id) {
          setSelectedPost({ ...selectedPost, likes: isLiked ? selectedPost.likes.filter((i:any) => i !== user.id) : [...(selectedPost.likes||[]), user.id] });
      }
  };

  const handleRegister = async (item: any) => {
      if (!user.phone || user.phone.length !== 10) { alert(t.phoneReq); setShowSettings(true); return; }
      const isRegistered = item.attendees?.some((a: any) => a.id === user.id);
      let newAttendees = item.attendees || [];
      if (isRegistered) { newAttendees = newAttendees.filter((a: any) => a.id !== user.id); } 
      else {
          if (item.maxSpots && newAttendees.length >= item.maxSpots) return alert(t.noSpots);
          newAttendees.push({ id: user.id, name: user.name, phone: user.phone, class: user.class });
      }
      const ref = doc(db, item.collectionType, item.id);
      await updateDoc(ref, { attendees: newAttendees });
      setFeed(feed.map(f => f.id === item.id ? { ...f, attendees: newAttendees } : f));
      if(selectedPost && selectedPost.id === item.id) { setSelectedPost({ ...selectedPost, attendees: newAttendees }); }
  };

  if (!user) return <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950' : 'bg-slate-100'}`}><div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;

  const filteredFeed = feed.filter(item => {
      const sq = searchQuery.toLowerCase().trim();
      let matchesSearch = true;
      if (sq.startsWith("locatie:")) matchesSearch = item.location?.toLowerCase().includes(sq.replace("locatie:", "").trim());
      else if (sq.startsWith("autor:")) matchesSearch = (item.authorName || item.organizers || t.council).toLowerCase().includes(sq.replace("autor:", "").trim());
      else if (sq.startsWith("data:")) matchesSearch = (item.date ? new Date(item.date).toLocaleDateString('ro-RO') : "").includes(sq.replace("data:", "").trim());
      else if (sq !== "") matchesSearch = item.content?.toLowerCase().includes(sq) || item.title?.toLowerCase().includes(sq) || item.location?.toLowerCase().includes(sq);

      let matchesClass = filterMode === "all" ? (!item.targetClasses || item.targetClasses.includes("Toată Școala") || item.targetClasses.includes(user.class)) : (item.targetClasses && item.targetClasses.includes(user.class));
      return matchesSearch && matchesClass;
  });

  const filteredCalendar = calendarEvents.filter(ev => filterMode === "class" ? (ev.targetClasses && ev.targetClasses.includes(user.class)) : (!ev.targetClasses || ev.targetClasses.includes("Toată Școala") || ev.targetClasses.includes(user.class)));

  // Culori Tematice Interactiv
  const bgMain = darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900";
  const navGlass = darkMode ? "bg-slate-950/80 border-white/10" : "bg-white/80 border-slate-200 shadow-sm";
  const cardBg = darkMode ? "bg-slate-900/80 border-white/10" : "bg-white/90 border-slate-200 shadow-xl";
  const inputBg = darkMode ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-500";
  const textMuted = darkMode ? "text-gray-400" : "text-gray-600";
  const blob1 = darkMode ? "bg-red-900/30" : "bg-red-300/40";
  const blob2 = darkMode ? "bg-blue-900/30" : "bg-blue-300/40";

  return (
    <div className={`relative min-h-screen font-sans transition-colors duration-500 selection:bg-red-500/30 ${bgMain}`}>
        
        {/* Background Interactiv */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            <div className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] mix-blend-multiply animate-pulse duration-[10000ms] ${blob1}`}></div>
            <div className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] mix-blend-multiply animate-pulse duration-[8000ms] ${blob2}`}></div>
        </div>

        {/* NAVBAR */}
        <nav className={`fixed top-0 w-full z-40 px-4 py-3 backdrop-blur-2xl border-b transition-colors duration-500 ${navGlass}`}>
            <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <img src="/favicon.ico" alt="Logo" className="w-10 h-10 rounded-xl shadow-lg border border-red-500/20" />
                    <h1 className="text-2xl font-black tracking-tight hidden sm:block">Ghiba<span className="text-red-500">+</span></h1>
                </div>
                
                <input placeholder={t.search} className={`hidden sm:block flex-1 max-w-md rounded-full px-6 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 transition-all ${inputBg}`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>

                <div className="flex gap-3 items-center">
                    <button onClick={toggleTheme} className="text-xl hover:scale-110 transition-transform">{darkMode ? '☀️' : '🌙'}</button>
                    {user.role === 'admin' && <button onClick={() => router.push('/admin')} className="bg-red-600/20 text-red-500 px-4 py-2 rounded-xl text-xs font-black border border-red-500/30 hover:bg-red-600 hover:text-white transition hidden md:block">{t.admin}</button>}
                    <button onClick={() => setShowSettings(true)} className={`hover:bg-black/10 dark:hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${textMuted}`}>{t.settings}</button>
                    <button onClick={() => auth.signOut()} className={`text-xs font-bold hover:text-red-500 px-2 transition-colors ${textMuted}`}>{t.logout}</button>
                </div>
            </div>
        </nav>

        <main className="max-w-6xl mx-auto p-4 mt-24 grid lg:grid-cols-3 gap-8 relative z-10">
            
            {/* FEED */}
            <div className="lg:col-span-2 space-y-6">
                 
                 <div className={`flex p-1.5 rounded-2xl border backdrop-blur-xl w-fit mb-6 shadow-xl ${cardBg}`}>
                    <button onClick={() => setFilterMode("all")} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${filterMode === "all" ? "bg-red-600 text-white shadow-lg" : `${textMuted} hover:bg-black/5 dark:hover:bg-white/5`}`}>{t.filterAll}</button>
                    <button onClick={() => setFilterMode("class")} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${filterMode === "class" ? "bg-red-600 text-white shadow-lg" : `${textMuted} hover:bg-black/5 dark:hover:bg-white/5`}`}>{t.filterClass}</button>
                 </div>

                 {filteredFeed.length === 0 && <div className={`p-10 rounded-[2rem] text-center font-medium backdrop-blur-xl ${cardBg} ${textMuted}`}>{t.noPosts}</div>}
                 
                 {filteredFeed.map(item => (
                    <div key={item.id} className={`rounded-[2rem] overflow-hidden transition-all duration-300 hover:-translate-y-1 border backdrop-blur-xl ${cardBg}`}>
                        
                        <div className="p-6 pb-4 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                {/* DATA URIAȘĂ pentru Evenimente, Logo pentru Anunțuri */}
                                {item.type === 'activity' && item.date ? (
                                    <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg flex flex-col items-center justify-center text-white leading-none border border-red-400/50">
                                        <span className="text-2xl font-black">{new Date(item.date).getDate()}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest">{new Date(item.date).toLocaleString(editLang, {month: 'short'})}</span>
                                    </div>
                                ) : (
                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg flex items-center justify-center border border-blue-400/50">
                                        <img src="/favicon.ico" className="w-8 h-8 rounded-lg filter brightness-0 invert" />
                                    </div>
                                )}

                                <div>
                                    <div className={`font-bold flex items-center gap-2 text-[15px] ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {item.authorName || item.organizers || t.council} 
                                        <span className="bg-red-500/10 text-red-500 text-[9px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest border border-red-500/20">
                                            {item.type === 'activity' ? t.event : t.official}
                                        </span>
                                    </div>
                                    <div className={`text-xs font-medium ${textMuted}`}>{new Date(item.postedAt || item.date).toLocaleString('ro-RO', {day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'})}</div>
                                </div>
                            </div>
                        </div>

                        {item.imageUrl && <div className="h-80 w-full bg-cover bg-center border-y border-black/5 dark:border-white/5" style={{backgroundImage: `url(${item.imageUrl})`}}></div>}
                        
                        <div className="p-6 pt-4">
                            {item.title && <h3 className="text-2xl font-black mb-3">{item.title}</h3>}
                            <p className={`text-[15px] mb-4 whitespace-pre-wrap leading-relaxed line-clamp-3 ${textMuted}`}>{item.content}</p>
                            
                            <button onClick={() => setSelectedPost(item)} className="text-red-500 font-bold text-sm hover:underline mb-6 block">{t.readMore}</button>
                            
                            {item.type === 'activity' && (
                                <div className={`mb-6 grid grid-cols-2 gap-3 text-sm p-5 rounded-2xl border relative overflow-hidden ${darkMode ? 'bg-black/40 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                                    {item.date && <div><span className={`font-black text-[10px] tracking-wider block mb-1 ${textMuted}`}>{t.dateTime}</span><span className="font-bold text-blue-500">{new Date(item.date).toLocaleString('ro-RO')}</span></div>}
                                    {item.location && <div><span className={`font-black text-[10px] tracking-wider block mb-1 ${textMuted}`}>{t.location}</span><span className="font-bold">{item.location}</span></div>}
                                    
                                    <div className={`col-span-2 mt-2 pt-4 border-t flex justify-between items-center ${darkMode ? 'border-white/5' : 'border-slate-300'}`}>
                                        <div>
                                            <span className={`font-black text-[10px] tracking-wider block mb-1 ${textMuted}`}>{t.seats}</span>
                                            <span className="font-bold">{item.attendees?.length || 0} / {item.maxSpots || t.unlimited}</span>
                                        </div>
                                        <button onClick={() => handleRegister(item)} className={`px-6 py-2 rounded-xl font-black text-xs transition-all shadow-lg ${item.attendees?.some((a:any) => a.id === user.id) ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white" : "bg-green-600 text-white hover:bg-green-500"}`}>
                                            {item.attendees?.some((a:any) => a.id === user.id) ? t.cancelReg : t.join}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="pt-5 border-t border-black/5 dark:border-white/5 flex gap-4">
                                <button onClick={() => handleLike(item)} className={`font-bold transition text-sm flex items-center gap-2 px-6 py-2.5 rounded-xl border ${item.likes?.includes(user.id) ? "bg-red-500/10 text-red-500 border-red-500/20" : `bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/10 ${textMuted}`}`}>
                                    <span className={item.likes?.includes(user.id) ? "animate-bounce" : ""}>{item.likes?.includes(user.id) ? "❤️" : "🤍"}</span> {item.likes?.length || 0}
                                </button>
                            </div>
                        </div>
                    </div>
                 ))}
            </div>

            {/* SIDEBAR CALENDAR */}
            <div className={`p-6 rounded-[2rem] sticky top-28 border backdrop-blur-xl h-fit shadow-xl ${cardBg}`}>
                <h3 className="font-black text-xl mb-6 flex items-center gap-3">{t.calendar}</h3>
                <div className="space-y-3">
                    {filteredCalendar.length === 0 && <p className={`text-sm italic font-medium ${textMuted}`}>{t.noEvents}</p>}
                    {filteredCalendar.map(ev => {
                         const color = CALENDAR_TYPES[ev.type as keyof typeof CALENDAR_TYPES]?.color || 'bg-blue-500';
                         return (
                            <div key={ev.id} className={`p-4 rounded-[1.5rem] border transition-colors relative overflow-hidden group ${darkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}>
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${color}`}></div>
                                <div className="font-bold text-[14px] ml-2 mb-1 line-clamp-1">{ev.title}</div>
                                <div className={`text-[11px] ml-2 font-mono inline-block px-2 py-1 rounded-md ${darkMode ? 'bg-black/40 text-gray-400' : 'bg-white text-gray-600 shadow-sm'}`}>{new Date(ev.start).toLocaleString('ro-RO', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})}</div>
                            </div>
                         )
                    })}
                </div>
            </div>
        </main>

        {/* MODAL FULL SCREEN PENTRU POSTARE */}
        {selectedPost && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto custom-scrollbar">
                <div className={`w-full max-w-3xl rounded-[2.5rem] shadow-2xl relative overflow-hidden border my-auto ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                    <button onClick={() => setSelectedPost(null)} className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 font-black transition backdrop-blur-md border border-white/20">✕</button>
                    
                    {selectedPost.imageUrl && <div className="w-full h-64 sm:h-96 bg-cover bg-center" style={{backgroundImage: `url(${selectedPost.imageUrl})`}}></div>}
                    
                    <div className="p-8 sm:p-12">
                        <div className={`font-bold text-sm mb-4 flex items-center gap-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                            {selectedPost.authorName || selectedPost.organizers || t.council}
                        </div>
                        <h2 className={`text-3xl sm:text-4xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedPost.title}</h2>
                        
                        <p className={`text-lg leading-relaxed whitespace-pre-wrap ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>{selectedPost.content}</p>
                        
                        {selectedPost.type === 'activity' && (
                                <div className={`mt-8 grid grid-cols-2 gap-3 text-base p-6 rounded-2xl border ${darkMode ? 'bg-black/40 border-white/5' : 'bg-slate-100 border-slate-200 text-slate-900'}`}>
                                    {selectedPost.date && <div><span className={`font-black text-xs tracking-wider block mb-1 ${textMuted}`}>{t.dateTime}</span><span className="font-bold text-blue-500">{new Date(selectedPost.date).toLocaleString('ro-RO')}</span></div>}
                                    {selectedPost.location && <div><span className={`font-black text-xs tracking-wider block mb-1 ${textMuted}`}>{t.location}</span><span className="font-bold">{selectedPost.location}</span></div>}
                                    
                                    <div className={`col-span-2 mt-4 pt-6 border-t flex justify-between items-center ${darkMode ? 'border-white/5' : 'border-slate-300'}`}>
                                        <div>
                                            <span className={`font-black text-xs tracking-wider block mb-1 ${textMuted}`}>{t.seats}</span>
                                            <span className="font-bold text-lg">{selectedPost.attendees?.length || 0} / {selectedPost.maxSpots || t.unlimited}</span>
                                        </div>
                                        <button onClick={() => handleRegister(selectedPost)} className={`px-8 py-3 rounded-xl font-black text-sm transition-all shadow-lg ${selectedPost.attendees?.some((a:any) => a.id === user.id) ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white" : "bg-green-600 text-white hover:bg-green-500"}`}>
                                            {selectedPost.attendees?.some((a:any) => a.id === user.id) ? t.cancelReg : t.join}
                                        </button>
                                    </div>
                                </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-black/10 dark:border-white/10 flex justify-between items-center">
                             <button onClick={() => handleLike(selectedPost)} className={`font-bold transition text-lg flex items-center gap-2 px-6 py-3 rounded-xl border ${selectedPost.likes?.includes(user.id) ? "bg-red-500/10 text-red-500 border-red-500/20" : `bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/10 ${textMuted}`}`}>
                                    <span className={selectedPost.likes?.includes(user.id) ? "animate-bounce" : ""}>{selectedPost.likes?.includes(user.id) ? "❤️" : "🤍"}</span> {selectedPost.likes?.length || 0}
                            </button>
                            <button onClick={() => setSelectedPost(null)} className={`font-bold px-6 py-3 rounded-xl transition ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}>{t.close}</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* SETTINGS MODAL */}
        {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                <div className={`border p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative overflow-hidden ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                    <button onClick={() => setShowSettings(false)} className={`absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center font-bold transition ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}>✕</button>
                    
                    <h2 className={`text-2xl font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{t.settingsTitle}</h2>
                    <p className={`text-xs mb-6 font-medium ${textMuted}`}>{t.settingsDesc}</p>
                    
                    <div className="space-y-5">
                        <div>
                            <label className={`text-xs font-black tracking-widest uppercase block mb-2 ${textMuted}`}>{t.langLabel}</label>
                            <select value={editLang} onChange={e => setEditLang(e.target.value)} className={`w-full p-4 rounded-2xl outline-none focus:border-red-500 appearance-none border ${inputBg}`}>
                                <option value="ro">🇷🇴 Română</option>
                                <option value="en">🇬🇧 English</option>
                                <option value="fr">🇫🇷 Français</option>
                                <option value="de">🇩🇪 Deutsch</option>
                                <option value="es">🇪🇸 Español</option>
                            </select>
                        </div>

                        <div>
                            <label className={`text-xs font-black tracking-widest uppercase block mb-2 ${textMuted}`}>{t.classLabel}</label>
                            <select value={editClass} onChange={e => setEditClass(e.target.value)} className={`w-full p-4 rounded-2xl outline-none focus:border-red-500 appearance-none border ${inputBg}`}>
                                {SCHOOL_CLASSES.map(c => <option key={c} value={c} className="text-black bg-white">{c}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label className={`text-xs font-black tracking-widest uppercase block mb-2 ${textMuted}`}>{t.phoneLabel}</label>
                            <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} className={`w-full p-4 rounded-2xl outline-none focus:border-red-500 border ${inputBg}`} />
                        </div>

                        <button onClick={handleSaveSettings} disabled={isSaving} className={`w-full py-4 rounded-2xl font-black text-lg mt-4 transition-colors shadow-xl ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                            {isSaving ? t.saving : t.saveBtn}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}