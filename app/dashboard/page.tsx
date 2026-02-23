"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase"; 
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, collection, query, getDocs, arrayUnion, arrayRemove, orderBy, onSnapshot, addDoc } from "firebase/firestore";
import { CALENDAR_TYPES, SCHOOL_CLASSES, INTEREST_CATEGORIES } from "../lib/constants";

const TRANSLATIONS: any = {
  ro: {
    search: "Caută...", settings: "⚙️ Setări", logout: "Ieșire", admin: "ADMIN",
    welcomeTitle: "Bine ai venit!", welcomeMsg: "Bine ai venit pe GhibaPlus!",
    joinEvent: "Te-ai înscris la: ", notif: "Notificări", noNotif: "Nicio notificare.",
    dateTime: "DATA/ORA", location: "LOCAȚIE", join: "Particip ✅", cancel: "Anulează",
    readMore: "📖 Detalii", lang: "Limba Interfeței", class: "Clasa Ta (Blocat)",
    phone: "Număr de Telefon", save: "Salvează Setările", 
    council: "Consiliul Elevilor", official: "Oficial", event: "Eveniment",
    seats: "Locuri", noSpots: "Locuri epuizate!"
  },
  en: {
    search: "Search...", settings: "⚙️ Settings", logout: "Logout", admin: "ADMIN",
    welcomeTitle: "Welcome!", welcomeMsg: "Welcome to GhibaPlus!",
    joinEvent: "You joined: ", notif: "Notifications", noNotif: "No notifications.",
    dateTime: "DATE/TIME", location: "LOCATION", join: "Join ✅", cancel: "Cancel",
    readMore: "📖 Details", lang: "Interface Language", class: "Your Class (Locked)",
    phone: "Phone Number", save: "Save Settings",
    council: "Student Council", official: "Official", event: "Event",
    seats: "Seats", noSpots: "No spots left!"
  }
};

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showSettings, setShowSettings] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  
  const [editPhone, setEditPhone] = useState("");
  const [editLang, setEditLang] = useState("ro");
  const [darkMode, setDarkMode] = useState(true);

  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("ghiba_theme") === "light") setDarkMode(false);
    return auth.onAuthStateChanged(async (u) => {
      if (!u) return router.push("/");
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        const userData = { id: u.uid, ...snap.data() };
        setUser(userData);
        setEditPhone(userData.phone || "");
        setEditLang(userData.language || "ro");
        
        const qNotif = query(collection(db, "users", u.uid, "notifications"), orderBy("sentAt", "desc"));
        onSnapshot(qNotif, (s) => setNotifications(s.docs.map(d => ({id: d.id, ...d.data()}))));
        loadFeed();
      }
    });
  }, []);

  const loadFeed = async () => {
    const nSnap = await getDocs(query(collection(db, "news"), orderBy("postedAt", "desc")));
    const aSnap = await getDocs(query(collection(db, "activities"), orderBy("postedAt", "desc")));
    let items = [...nSnap.docs.map(d=>({id:d.id,col:'news',...d.data()})), ...aSnap.docs.map(d=>({id:d.id,col:'activities',...d.data()}))];
    items.sort((a:any, b:any) => new Date(b.postedAt||b.date).getTime() - new Date(a.postedAt||a.date).getTime());
    setFeed(items);
    setCalendarEvents(aSnap.docs.map(d=>({id:d.id, title:d.data().title, start:d.data().date, type:'activity', targetClasses:d.data().targetClasses})).filter(ev=>ev.start));
  };

  const t = TRANSLATIONS[editLang] || TRANSLATIONS["ro"];

  const handleSaveSettings = async () => {
      if (editPhone.length !== 10) return alert("Numărul de telefon trebuie să aibă 10 cifre!");
      await updateDoc(doc(db, "users", user.id), { phone: editPhone, language: editLang });
      setUser({ ...user, phone: editPhone, language: editLang });
      setShowSettings(false);
  };

  const toggleTheme = () => {
    const next = !darkMode; setDarkMode(next);
    localStorage.setItem("ghiba_theme", next ? "dark" : "light");
  };

  // NOU: Deschide notificările și le marchează ca citite
  const openNotifications = async () => {
    setShowNotif(true);
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
        await updateDoc(doc(db, "users", user.id, "notifications", n.id), { read: true });
    }
  };

  const handleRegister = async (item: any) => {
    const isReg = item.attendees?.some((a:any) => a.id === user.id);
    const ref = doc(db, "activities", item.id);
    const newAttendees = isReg ? item.attendees.filter((a:any)=>a.id!==user.id) : [...(item.attendees||[]), {id:user.id, name:user.name, class:user.class, phone:user.phone}];
    if(!isReg && item.maxSpots && newAttendees.length > item.maxSpots) return alert(t.noSpots);
    
    await updateDoc(ref, { attendees: newAttendees });
    if(!isReg) await addDoc(collection(db, "users", user.id, "notifications"), { title: item.title, message: `${t.joinEvent} ${item.title}`, sentAt: new Date().toISOString(), read: false });
    loadFeed();
  };

  const handleLike = async (item: any) => {
    const isLiked = item.likes?.includes(user.id);
    await updateDoc(doc(db, item.col, item.id), { likes: isLiked ? arrayRemove(user.id) : arrayUnion(user.id) });
    loadFeed();
  };

  if (!user) return null;

  const bgMain = darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900";
  const cardBg = darkMode ? "bg-slate-900/60 border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]" : "bg-white border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]";
  const inputBg = darkMode ? "bg-black/50 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900";

  const filteredFeed = feed.filter(item => {
    const sq = searchQuery.toLowerCase();
    const matchesSearch = item.content?.toLowerCase().includes(sq) || item.title?.toLowerCase().includes(sq);
    const matchesClass = !item.targetClasses || item.targetClasses.includes("Toată Școala") || item.targetClasses.includes(user.class);
    return matchesSearch && matchesClass;
  });

  return (
    <div className={`min-h-screen relative transition-colors duration-500 ${bgMain}`}>
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] ${darkMode ? 'bg-red-900/20' : 'bg-red-200/40'}`}></div>
        <div className={`absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full blur-[120px] ${darkMode ? 'bg-blue-900/20' : 'bg-blue-200/40'}`}></div>
      </div>

      <nav className={`fixed top-0 w-full z-40 px-4 py-4 backdrop-blur-2xl border-b flex justify-between items-center transition-all ${darkMode ? 'bg-slate-950/80 border-white/10' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-6xl mx-auto w-full flex justify-between items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black">Ghiba<span className="text-red-500">+</span></h1>
            <input placeholder={t.search} className={`hidden md:block flex-1 max-w-sm mx-4 rounded-full px-6 py-2.5 text-sm font-medium outline-none border transition-all focus:border-red-500 ${inputBg}`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            
            <div className="flex items-center gap-3 sm:gap-5 flex-wrap justify-end">
                <button onClick={toggleTheme} className="text-lg sm:text-xl hover:scale-110 transition-transform">{darkMode ? '☀️' : '🌙'}</button>
                <button onClick={openNotifications} className="relative text-lg sm:text-xl hover:scale-110 transition-transform">
                    🔔 {notifications.some(n=>!n.read) && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-slate-900"></span>}
                </button>
                <button onClick={() => setShowSettings(true)} className="font-bold text-xs sm:text-sm opacity-70 hover:opacity-100">⚙️</button>
                {/* Butonul de ADMIN este mereu vizibil! */}
                {user.role === 'admin' && <button onClick={() => router.push('/admin')} className="bg-red-600 text-white px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black shadow-lg shadow-red-500/20">ADMIN</button>}
                <button onClick={() => auth.signOut()} className="text-[10px] sm:text-xs font-bold opacity-70 hover:text-red-500">Ieșire</button>
            </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 pt-28 grid lg:grid-cols-3 gap-8 relative z-10">
        <div className="lg:col-span-2 space-y-8">
          {filteredFeed.map(item => (
            <div key={item.id} className={`rounded-[2.5rem] overflow-hidden border backdrop-blur-xl transition-all hover:shadow-2xl ${cardBg}`}>
              <div className="p-8">
                <div className="flex gap-5 items-start mb-6">
                  {item.type === 'activity' && item.date ? (
                     <div className="bg-gradient-to-br from-red-500 to-rose-600 text-white px-5 py-3 rounded-2xl flex flex-col items-center shadow-lg border border-red-400/30">
                        <span className="text-2xl font-black leading-none mb-1">{new Date(item.date).getDate()}</span>
                        <span className="text-[10px] font-black uppercase">{new Date(item.date).toLocaleString(editLang, {month:'short'})}</span>
                     </div>
                  ) : (
                     <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-lg flex items-center justify-center border border-blue-400/30 font-black text-2xl">📢</div>
                  )}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black mb-1">{item.title}</h2>
                    <p className="opacity-60 text-xs font-bold uppercase tracking-widest">{item.authorName || item.organizers || t.council}</p>
                  </div>
                </div>
                {item.imageUrl && <div className="h-64 w-full rounded-2xl mb-6 bg-cover bg-center border border-black/10 dark:border-white/10" style={{backgroundImage:`url(${item.imageUrl})`}}></div>}
                
                <p className="line-clamp-3 opacity-80 mb-6 text-sm sm:text-base leading-relaxed">{item.content}</p>
                
                {item.type === 'activity' && (
                    <div className={`mb-6 p-4 sm:p-5 rounded-2xl border grid grid-cols-2 gap-4 ${darkMode ? 'bg-black/30 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                        <div><span className="text-[10px] font-black tracking-widest uppercase opacity-50 block mb-1">{t.dateTime}</span><span className="font-bold text-blue-500 text-xs sm:text-sm">{new Date(item.date).toLocaleString('ro-RO')}</span></div>
                        <div><span className="text-[10px] font-black tracking-widest uppercase opacity-50 block mb-1">{t.location}</span><span className="font-bold text-xs sm:text-sm">{item.location}</span></div>
                    </div>
                )}

                <div className="flex justify-between items-center pt-6 border-t border-black/5 dark:border-white/5">
                  <div className="flex gap-4">
                      <button onClick={() => handleLike(item)} className="font-bold text-sm flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                          <span>{item.likes?.includes(user.id) ? "❤️" : "🤍"}</span> {item.likes?.length || 0}
                      </button>
                      <button onClick={() => setSelectedPost(item)} className="text-red-500 font-bold text-sm hover:underline">{t.readMore}</button>
                  </div>
                  {item.type === 'activity' && (
                    <button onClick={() => handleRegister(item)} className={`px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-md ${item.attendees?.some((a:any)=>a.id===user.id) ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-green-600 text-white hover:bg-green-500 border border-green-500'}`}>
                      {item.attendees?.some((a:any)=>a.id===user.id) ? t.cancel : t.join}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={`p-8 rounded-[2.5rem] sticky top-28 border backdrop-blur-xl h-fit ${cardBg}`}>
            <h3 className="font-black text-xl mb-6">📅 Calendar</h3>
            <div className="space-y-3">
                {calendarEvents.map(ev => (
                    <div key={ev.id} className={`p-4 rounded-2xl border transition-colors relative overflow-hidden ${darkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
                        <div className="font-bold text-sm ml-2 line-clamp-1">{ev.title}</div>
                        <div className="text-[10px] opacity-60 ml-2 mt-1 font-mono">{new Date(ev.start).toLocaleString('ro-RO')}</div>
                    </div>
                ))}
            </div>
        </div>
      </main>

      {/* MODAL SETARI */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`w-full max-w-lg p-10 rounded-[2.5rem] border shadow-2xl relative ${cardBg}`}>
            <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 w-10 h-10 bg-black/10 dark:bg-white/10 rounded-full font-bold">✕</button>
            <h2 className="text-2xl font-black mb-8">{t.settings}</h2>
            
            <div className="space-y-6">
                <div>
                    <label className="text-[10px] font-black tracking-widest uppercase opacity-50 mb-2 block">{t.lang}</label>
                    <select value={editLang} onChange={e => setEditLang(e.target.value)} className={`w-full p-4 rounded-2xl font-bold outline-none border focus:border-red-500 ${inputBg}`}>
                        <option value="ro" className="text-black bg-white">🇷🇴 Română</option>
                        <option value="en" className="text-black bg-white">🇬🇧 English</option>
                        <option value="fr" className="text-black bg-white">🇫🇷 Français</option>
                        <option value="de" className="text-black bg-white">🇩🇪 Deutsch</option>
                        <option value="es" className="text-black bg-white">🇪🇸 Español</option>
                    </select>
                </div>

                <div>
                    <label className="text-[10px] font-black tracking-widest uppercase opacity-50 mb-2 block">{t.class}</label>
                    <input value={user.class} disabled className={`w-full p-4 rounded-2xl font-bold border opacity-50 cursor-not-allowed ${inputBg}`} />
                    <p className="text-[10px] text-red-500 mt-2 font-bold">🔒 Clasa poate fi modificată doar de un Administrator.</p>
                </div>

                <div>
                    <label className="text-[10px] font-black tracking-widest uppercase opacity-50 mb-2 block">{t.phone}</label>
                    <input value={editPhone} onChange={e=>setEditPhone(e.target.value.replace(/\D/g,'').slice(0,10))} className={`w-full p-4 rounded-2xl font-bold outline-none border focus:border-red-500 ${inputBg}`} />
                </div>

                <button onClick={handleSaveSettings} className="w-full py-4 mt-4 bg-red-600 text-white rounded-2xl font-black text-lg hover:bg-red-500 transition-colors shadow-lg shadow-red-500/20">{t.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOTIFICARI */}
      {showNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`w-full max-w-md p-8 rounded-[2.5rem] border shadow-2xl relative ${cardBg}`}>
            <button onClick={() => setShowNotif(false)} className="absolute top-6 right-6 w-10 h-10 bg-black/10 dark:bg-white/10 rounded-full font-bold">✕</button>
            <h2 className="text-2xl font-black mb-6">{t.notif}</h2>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {notifications.length === 0 && <p className="opacity-50 italic text-center py-10">{t.noNotif}</p>}
              {notifications.map(n => (
                <div key={n.id} className={`p-5 rounded-2xl border ${darkMode ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                  <p className="font-black text-sm mb-1">{n.title}</p>
                  <p className="text-sm opacity-80">{n.message}</p>
                  <p className="text-[10px] mt-2 font-mono opacity-40">{new Date(n.sentAt).toLocaleString('ro-RO')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FULL POST MODAL */}
      {selectedPost && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto custom-scrollbar">
            <div className={`w-full max-w-2xl rounded-[2.5rem] overflow-hidden border my-auto relative ${cardBg}`}>
              <button onClick={() => setSelectedPost(null)} className="absolute top-4 right-4 z-10 w-12 h-12 bg-black/50 text-white rounded-full font-black backdrop-blur-md border border-white/20">✕</button>
              {selectedPost.imageUrl && <div className="h-48 sm:h-72 w-full bg-cover bg-center" style={{backgroundImage:`url(${selectedPost.imageUrl})`}}></div>}
              <div className="p-6 sm:p-10">
                <h2 className="text-2xl sm:text-3xl font-black mb-6">{selectedPost.title}</h2>
                <p className="text-base sm:text-lg leading-relaxed opacity-90 whitespace-pre-wrap mb-8">{selectedPost.content}</p>
                {selectedPost.type === 'activity' && (
                  <button onClick={() => handleRegister(selectedPost)} className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl ${selectedPost.attendees?.some((a:any)=>a.id===user.id) ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-600 text-white'}`}>
                    {selectedPost.attendees?.some((a:any)=>a.id===user.id) ? t.cancel : t.join}
                  </button>
                )}
              </div>
            </div>
          </div>
      )}
    </div>
  );
}