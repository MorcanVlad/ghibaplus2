"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase"; 
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, collection, query, getDocs, arrayUnion, arrayRemove, orderBy } from "firebase/firestore";
import { CALENDAR_TYPES, SCHOOL_CLASSES, INTEREST_CATEGORIES } from "../lib/constants";

const TRANSLATIONS: any = {
  ro: {
    search: "Caută (ex: locatie: sala 1, autor: director)...", settings: "⚙️ Setări", logout: "Ieșire", admin: "ADMIN",
    council: "Consiliul Elevilor", official: "Oficial", event: "Eveniment",
    dateTime: "DATA / ORA", location: "LOCAȚIE", seats: "LOCURI OCUPATE", unlimited: "Nelimitat",
    cancelReg: "Anulează", join: "Particip ✅", calendar: "📅 Calendarul Tău",
    noEvents: "Niciun eveniment planificat.", settingsTitle: "Setările Tale",
    settingsDesc: "Personalizează-ți experiența pe GhibaPlus.", classLabel: "Clasa Ta",
    phoneLabel: "Număr de Telefon", tagsLabel: "Interese (Tag-uri)", langLabel: "Limba Interfeței",
    saving: "Se Salvează...", saveBtn: "Salvează Modificările", noPosts: "✨ Nu am găsit anunțuri conform căutării sau filtrului.",
    phoneError: "Numărul de telefon trebuie să aibă exact 10 cifre!", phoneReq: "Trebuie să ai un număr valid (10 cifre) setat în Profil pentru a te înscrie!",
    noSpots: "Ne pare rău, nu mai sunt locuri disponibile!", filterAll: "🏫 Toată Școala", filterClass: "👤 Clasa Mea"
  },
  en: {
    search: "Search (ex: locatie: room 1, autor: director)...", settings: "⚙️ Settings", logout: "Logout", admin: "ADMIN",
    council: "Student Council", official: "Official", event: "Event",
    dateTime: "DATE / TIME", location: "LOCATION", seats: "SEATS TAKEN", unlimited: "Unlimited",
    cancelReg: "Cancel", join: "Join ✅", calendar: "📅 Your Calendar",
    noEvents: "No events planned.", settingsTitle: "Your Settings",
    settingsDesc: "Customize your GhibaPlus experience.", classLabel: "Your Class",
    phoneLabel: "Phone Number", tagsLabel: "Interests (Tags)", langLabel: "Interface Language",
    saving: "Saving...", saveBtn: "Save Changes", noPosts: "✨ No announcements found.",
    phoneError: "Phone number must be exactly 10 digits!", phoneReq: "You need a valid phone number (10 digits) to register!",
    noSpots: "Sorry, no spots left!", filterAll: "🏫 All School", filterClass: "👤 My Class"
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

  const router = useRouter();

  useEffect(() => {
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
        
        let allItems: any[] = [
            ...newsSnap.docs.map(d => ({id: d.id, collectionType: 'news', ...d.data()})), 
            ...actSnap.docs.map(d => ({id: d.id, collectionType: 'activities', ...d.data()}))
        ];
        
        allItems.sort((a: any, b: any) => new Date(b.postedAt || b.date || 0).getTime() - new Date(a.postedAt || a.date || 0).getTime());
        setFeed(allItems);

        // Mapăm direct evenimentele (activities) în calendar
        const calData = actSnap.docs.map(d => ({
            id: d.id, 
            title: d.data().title, 
            start: d.data().date, 
            type: 'activity', 
            targetClasses: d.data().targetClasses 
        })).filter(ev => ev.start); // Doar cele care au dată setată
        
        setCalendarEvents(calData);
  };

  const t = TRANSLATIONS[editLang] || TRANSLATIONS["ro"];

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
  };

  const toggleInterest = (tag: string) => setEditInterests(prev => prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag]);

  if (!user) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;

  // LOGICĂ DE CĂUTARE AVANSATĂ & FILTRU CLASĂ
  const filteredFeed = feed.filter(item => {
      const sq = searchQuery.toLowerCase().trim();
      let matchesSearch = true;

      // Smart Search Logic
      if (sq.startsWith("locatie:")) {
          matchesSearch = item.location?.toLowerCase().includes(sq.replace("locatie:", "").trim());
      } else if (sq.startsWith("autor:")) {
          const author = (item.authorName || item.organizers || t.council).toLowerCase();
          matchesSearch = author.includes(sq.replace("autor:", "").trim());
      } else if (sq.startsWith("data:")) {
          const dateStr = item.date ? new Date(item.date).toLocaleDateString('ro-RO') : "";
          matchesSearch = dateStr.includes(sq.replace("data:", "").trim());
      } else if (sq.startsWith("ora:")) {
          const timeStr = item.date ? new Date(item.date).toLocaleTimeString('ro-RO') : "";
          matchesSearch = timeStr.includes(sq.replace("ora:", "").trim());
      } else if (sq !== "") {
          matchesSearch = item.content?.toLowerCase().includes(sq) || item.title?.toLowerCase().includes(sq) || item.location?.toLowerCase().includes(sq);
      }

      // Logică Filtru (Toate vs Clasa Mea)
      let matchesClass = false;
      if (filterMode === "all") {
          matchesClass = !item.targetClasses || item.targetClasses.includes("Toată Școala") || item.targetClasses.includes(user.class);
      } else {
          // Doar pe clasa lui (ignoram "Toată Școala" sau verificam strict daca clasa e bifata)
          matchesClass = item.targetClasses && item.targetClasses.includes(user.class);
      }

      return matchesSearch && matchesClass;
  });

  const filteredCalendar = calendarEvents.filter(ev => {
      if (filterMode === "class") return ev.targetClasses && ev.targetClasses.includes(user.class);
      return !ev.targetClasses || ev.targetClasses.includes("Toată Școala") || ev.targetClasses.includes(user.class);
  });

  return (
    <div className="relative min-h-screen font-sans bg-slate-950 text-white selection:bg-red-500/30">
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-red-900/10 rounded-full blur-[150px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[150px]"></div>
        </div>

        <nav className="fixed top-0 w-full z-40 px-4 py-3 bg-slate-950/80 backdrop-blur-2xl border-b border-white/10">
            <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <img src="/favicon.ico" alt="Logo" className="w-10 h-10 rounded-xl shadow-lg border border-white/10" />
                    <h1 className="text-2xl font-black tracking-tight hidden sm:block">Ghiba<span className="text-red-500">+</span></h1>
                </div>
                
                <input placeholder={t.search} className="hidden sm:block flex-1 max-w-md border border-white/10 rounded-full px-6 py-2.5 text-sm outline-none focus:border-red-500 transition-all bg-white/5 text-white placeholder-gray-500" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>

                <div className="flex gap-3 items-center">
                    {user.role === 'admin' && <button onClick={() => router.push('/admin')} className="bg-red-600/20 text-red-500 px-4 py-2 rounded-xl text-xs font-black border border-red-500/30 hover:bg-red-600 hover:text-white transition">{t.admin}</button>}
                    <button onClick={() => setShowSettings(true)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2">{t.settings}</button>
                    <button onClick={() => auth.signOut()} className="text-xs font-bold text-gray-400 hover:text-red-500 px-2 transition-colors">{t.logout}</button>
                </div>
            </div>
        </nav>

        <main className="max-w-6xl mx-auto p-4 mt-24 grid lg:grid-cols-3 gap-8 relative z-10">
            
            <div className="lg:col-span-2 space-y-6">
                 
                 {/* SWITCH FILTRU CLASĂ */}
                 <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl w-fit mb-6 shadow-xl">
                    <button onClick={() => setFilterMode("all")} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${filterMode === "all" ? "bg-red-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>{t.filterAll}</button>
                    <button onClick={() => setFilterMode("class")} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${filterMode === "class" ? "bg-red-600 text-white shadow-lg" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>{t.filterClass}</button>
                 </div>

                 {filteredFeed.length === 0 && <div className="p-10 rounded-[2rem] text-center text-gray-500 bg-white/5 border border-white/10 backdrop-blur-xl font-medium">{t.noPosts}</div>}
                 
                 {filteredFeed.map(item => (
                    <div key={item.id} className="rounded-[2rem] overflow-hidden transition-all duration-300 hover:-translate-y-1 bg-slate-900/80 border border-white/10 shadow-xl backdrop-blur-xl">
                        
                        <div className="p-6 pb-4 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl p-[1px] shadow-lg">
                                    <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                                        <img src="/favicon.ico" className="w-8 h-8 rounded-lg" />
                                    </div>
                                </div>
                                <div>
                                    <div className="font-bold text-red-400 flex items-center gap-2 text-[15px]">
                                        {/* AICI ESTE AUTORUL DINAMIC */}
                                        {item.authorName || item.organizers || t.council} 
                                        <span className="bg-red-500/20 text-red-400 text-[9px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest border border-red-500/20">
                                            {item.type === 'activity' ? t.event : t.official}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 font-medium">{new Date(item.postedAt || item.date).toLocaleString('ro-RO', {day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'})}</div>
                                </div>
                            </div>
                        </div>

                        {item.imageUrl && <div className="h-80 w-full bg-cover bg-center border-y border-white/5" style={{backgroundImage: `url(${item.imageUrl})`}}></div>}
                        
                        <div className="p-6 pt-4">
                            {item.title && <h3 className="text-2xl font-black mb-3 text-white">{item.title}</h3>}
                            <p className="text-[15px] mb-6 whitespace-pre-wrap leading-relaxed text-gray-300">{item.content}</p>
                            
                            {item.type === 'activity' && (
                                <div className="mb-6 grid grid-cols-2 gap-3 text-sm bg-black/40 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                                    {item.date && <div><span className="text-gray-500 font-black text-[10px] tracking-wider block mb-1">{t.dateTime}</span><span className="font-bold text-blue-400">{new Date(item.date).toLocaleString('ro-RO')}</span></div>}
                                    {item.location && <div><span className="text-gray-500 font-black text-[10px] tracking-wider block mb-1">{t.location}</span><span className="font-bold">{item.location}</span></div>}
                                    
                                    <div className="col-span-2 mt-2 pt-4 border-t border-white/5 flex justify-between items-center">
                                        <div>
                                            <span className="text-gray-500 font-black text-[10px] tracking-wider block mb-1">{t.seats}</span>
                                            <span className="font-bold">{item.attendees?.length || 0} / {item.maxSpots || t.unlimited}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleRegister(item)} 
                                            className={`px-6 py-2 rounded-xl font-black text-xs transition-all shadow-lg ${item.attendees?.some((a:any) => a.id === user.id) ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white" : "bg-green-600 text-white hover:bg-green-500"}`}
                                        >
                                            {item.attendees?.some((a:any) => a.id === user.id) ? t.cancelReg : t.join}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 mb-5 flex-wrap">
                                {item.targetClasses && item.targetClasses.includes(user.class) && !item.targetClasses.includes("Toată Școala") && (
                                    <span className="bg-red-500/20 text-red-400 text-[10px] font-black tracking-wide px-3 py-1.5 rounded-full border border-red-500/30">🎯 Pentru clasa ta</span>
                                )}
                                {item.tags?.map((tag:string) => <span key={tag} className="bg-white/5 text-gray-400 text-[10px] font-black tracking-wide px-3 py-1.5 rounded-full border border-white/10">#{tag}</span>)}
                            </div>

                            <div className="pt-5 border-t border-white/10 flex gap-4">
                                <button onClick={() => handleLike(item)} className={`font-bold transition text-sm flex items-center gap-2 px-6 py-2.5 rounded-xl ${item.likes?.includes(user.id) ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-white/5 hover:bg-white/10 text-gray-400 border border-transparent"}`}>
                                    <span className={item.likes?.includes(user.id) ? "animate-bounce" : ""}>{item.likes?.includes(user.id) ? "❤️" : "🤍"}</span> {item.likes?.length || 0}
                                </button>
                            </div>
                        </div>
                    </div>
                 ))}
            </div>

            <div className="p-6 rounded-[2rem] sticky top-28 bg-slate-900/80 border border-white/10 shadow-xl backdrop-blur-xl h-fit">
                <h3 className="font-black text-xl mb-6 flex items-center gap-3 text-white">{t.calendar}</h3>
                <div className="space-y-3">
                    {filteredCalendar.length === 0 && <p className="text-sm text-gray-500 italic font-medium">{t.noEvents}</p>}
                    {filteredCalendar.map(ev => {
                         const color = CALENDAR_TYPES[ev.type as keyof typeof CALENDAR_TYPES]?.color || 'bg-blue-500';
                         return (
                            <div key={ev.id} className="p-4 rounded-[1.5rem] border border-white/5 bg-white/5 hover:bg-white/10 transition-colors relative overflow-hidden group">
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${color}`}></div>
                                <div className="font-bold text-[14px] ml-2 mb-1 text-gray-200 group-hover:text-white transition-colors line-clamp-1">{ev.title}</div>
                                <div className="text-[11px] text-gray-500 ml-2 font-mono bg-black/40 inline-block px-2 py-1 rounded-md">{new Date(ev.start).toLocaleString('ro-RO', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})}</div>
                            </div>
                         )
                    })}
                </div>
            </div>
        </main>

        {/* Modal Setări Rămâne Identic */}
        {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                <div className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl relative overflow-hidden">
                    <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 font-bold transition text-white">✕</button>
                    <h2 className="text-2xl font-black mb-1 text-white">{t.settingsTitle}</h2>
                    <p className="text-xs text-gray-400 mb-6 font-medium">{t.settingsDesc}</p>
                    <div className="space-y-5">
                        <div>
                            <label className="text-xs font-black tracking-widest text-gray-500 uppercase block mb-2">{t.langLabel}</label>
                            <select value={editLang} onChange={e => setEditLang(e.target.value)} className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 text-white outline-none focus:border-red-500 appearance-none">
                                <option value="ro">🇷🇴 Română</option>
                                <option value="en">🇬🇧 English</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-black tracking-widest text-gray-500 uppercase block mb-2">{t.classLabel}</label>
                            <select value={editClass} onChange={e => setEditClass(e.target.value)} className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 text-white outline-none focus:border-red-500 appearance-none">
                                {SCHOOL_CLASSES.map(c => <option key={c} value={c} className="text-black bg-white">{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-black tracking-widest text-gray-500 uppercase block mb-2">{t.phoneLabel}</label>
                            <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 text-white outline-none focus:border-red-500 placeholder-gray-600" />
                        </div>
                        <button onClick={handleSaveSettings} disabled={isSaving} className="w-full bg-white text-black py-4 rounded-2xl font-black text-lg mt-4 hover:bg-gray-200 transition-colors shadow-xl">
                            {isSaving ? t.saving : t.saveBtn}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}