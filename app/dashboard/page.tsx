"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase"; 
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, collection, query, getDocs, arrayUnion, arrayRemove, orderBy } from "firebase/firestore";
import Link from "next/link";
import { CALENDAR_TYPES } from "../lib/constants";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("ghiba_theme") === "light") setDarkMode(false);

    auth.onAuthStateChanged(async (u) => {
        if (!u) return router.push("/");
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
            setUser({ id: u.uid, ...snap.data() });
        }
        
        // Căutăm DOAR postările oficiale și activitățile
        const newsSnap = await getDocs(query(collection(db, "news"), orderBy("postedAt", "desc")));
        const actSnap = await getDocs(query(collection(db, "activities"), orderBy("postedAt", "desc")));
        
        let allItems: any[] = [
            ...newsSnap.docs.map(d => ({id: d.id, collectionType: 'news', ...d.data()})), 
            ...actSnap.docs.map(d => ({id: d.id, collectionType: 'activities', ...d.data()}))
        ];
        
        // Sortare sigură
        allItems.sort((a: any, b: any) => {
            const timeA = new Date(a.postedAt || a.date || 0).getTime();
            const timeB = new Date(b.postedAt || b.date || 0).getTime();
            return timeB - timeA;
        });
        
        setFeed(allItems);

        const calSnap = await getDocs(query(collection(db, "calendar_events"), orderBy("start", "asc")));
        setCalendarEvents(calSnap.docs.map(d => ({id: d.id, ...d.data()})));
    });
  }, [router]);

  const toggleTheme = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    localStorage.setItem("ghiba_theme", newVal ? "dark" : "light");
  };

  const handleLike = async (item: any) => {
      const isLiked = item.likes?.includes(user.id);
      const ref = doc(db, item.collectionType, item.id);
      await updateDoc(ref, { likes: isLiked ? arrayRemove(user.id) : arrayUnion(user.id) });
      setFeed(feed.map(f => f.id === item.id ? { ...f, likes: isLiked ? f.likes.filter((i:any) => i !== user.id) : [...(f.likes||[]), user.id] } : f));
  };

  if (!user) return <div className="min-h-screen bg-[#09090b] flex items-center justify-center"><div className="animate-spin w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full"></div></div>;

  const bgClass = darkMode ? "bg-[#09090b] text-white" : "bg-slate-50 text-gray-900";
  const glassNav = darkMode ? "bg-[#09090b]/80 border-white/5 backdrop-blur-xl" : "bg-white/90 border-gray-200 shadow-sm backdrop-blur-xl";
  const cardClass = darkMode ? "bg-[#18181b]/80 border border-white/5 hover:border-white/10" : "bg-white border border-gray-100 shadow-lg hover:shadow-xl";

  return (
    <div className={`relative min-h-screen font-sans transition-colors duration-500 ${bgClass}`}>
        
        {/* NAVBAR */}
        <nav className={`fixed top-0 w-full z-40 border-b px-4 py-3 ${glassNav}`}>
            <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
                <div className="flex items-center gap-3 group">
                    <img src="/favicon.ico" alt="Logo" className="w-10 h-10 rounded-[10px] shadow-md group-hover:scale-110 transition-transform" />
                    <h1 className={`text-2xl font-black tracking-tight hidden sm:block ${darkMode ? "text-white" : "text-gray-900"}`}>Ghiba<span className="text-red-500">+</span></h1>
                </div>
                
                <input placeholder="Caută în anunțuri..." className={`hidden sm:block flex-1 max-w-sm border rounded-full px-5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 transition-all ${darkMode ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-gray-100 border-gray-200 text-gray-900"}`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>

                <div className="flex gap-4 items-center">
                    <button onClick={toggleTheme} className="text-xl hover:scale-110 transition-transform"> {darkMode ? "☀️" : "🌙"}</button>
                    {user.role === 'admin' && <button onClick={() => router.push('/admin')} className="bg-red-600 px-4 py-2 rounded-xl text-xs text-white font-bold hover:bg-red-500 transition shadow-lg shadow-red-500/20">ADMIN PANEL</button>}
                    <button onClick={() => auth.signOut()} className="text-xs font-bold text-gray-500 hover:text-red-500 bg-black/5 dark:bg-white/5 px-3 py-2 rounded-lg transition-colors">Ieșire</button>
                </div>
            </div>
        </nav>

        <main className="max-w-6xl mx-auto p-4 mt-24 grid lg:grid-cols-3 gap-8 relative z-10">
            
            {/* ZONA DE FEED (DOAR CITIRE) */}
            <div className="lg:col-span-2 space-y-6">
                 {feed.length === 0 && <div className={`p-8 rounded-[2rem] text-center text-gray-500 ${cardClass}`}>Nu există anunțuri oficiale momentan.</div>}
                 
                 {feed.filter(i => i.content?.toLowerCase().includes(searchQuery.toLowerCase()) || i.title?.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                    <div key={item.id} className={`rounded-[2rem] overflow-hidden transition-all duration-300 hover:-translate-y-1 ${cardClass}`}>
                        
                        <div className="p-6 pb-3 flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <img src="/favicon.ico" className="w-12 h-12 rounded-xl shadow-md" alt="Ghiba Logo" />
                                <div>
                                    <div className="font-bold text-red-500 flex items-center gap-2 text-[15px]">
                                        Consiliul Elevilor 
                                        <span className="bg-red-500/10 text-red-500 text-[10px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">
                                            {item.type === 'activity' ? 'Eveniment' : 'Oficial'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500">{new Date(item.postedAt || item.date).toLocaleString('ro-RO')}</div>
                                </div>
                            </div>
                        </div>

                        {item.imageUrl && <div className="mt-2 h-72 w-full bg-cover bg-center border-y border-white/5" style={{backgroundImage: `url(${item.imageUrl})`}}></div>}
                        
                        <div className="p-6 pt-3">
                            {item.title && <h3 className="text-2xl font-black mb-2">{item.title}</h3>}
                            <p className={`text-[15px] mb-6 whitespace-pre-wrap leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.content}</p>
                            
                            {/* Detalii extra pentru evenimente */}
                            {item.type === 'activity' && (
                                <div className="mb-6 grid grid-cols-2 gap-2 text-sm bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/5">
                                    {item.date && <div><span className="text-gray-500 font-bold text-xs block mb-1">DATA</span>{new Date(item.date).toLocaleString('ro-RO')}</div>}
                                    {item.location && <div><span className="text-gray-500 font-bold text-xs block mb-1">LOCAȚIE</span>{item.location}</div>}
                                </div>
                            )}

                            <div className="flex gap-2 mb-4 flex-wrap">
                                {item.tags?.map((t:string) => <span key={t} className="bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-[10px] font-bold px-3 py-1.5 rounded-lg">#{t}</span>)}
                            </div>

                            <div className={`pt-4 border-t flex gap-4 ${darkMode ? 'border-white/5' : 'border-gray-100'}`}>
                                <button onClick={() => handleLike(item)} className={`font-bold transition text-sm flex items-center gap-2 px-5 py-2.5 rounded-xl ${darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} ${item.likes?.includes(user.id) ? "text-red-500" : "text-gray-500"}`}>
                                    <span className={item.likes?.includes(user.id) ? "animate-bounce" : ""}>{item.likes?.includes(user.id) ? "❤️" : "🤍"}</span> {item.likes?.length || 0}
                                </button>
                            </div>
                        </div>
                    </div>
                 ))}
            </div>

            {/* SIDEBAR CALENDAR */}
            <div className={`p-6 rounded-[2rem] sticky top-28 ${cardClass}`}>
                <h3 className="font-black text-xl mb-6 flex items-center gap-3"><span className="text-2xl">📅</span> Calendar Școlar</h3>
                <div className="space-y-3">
                    {calendarEvents.length === 0 && <p className="text-sm text-gray-500 italic">Niciun eveniment viitor.</p>}
                    {calendarEvents.filter(ev => !ev.targetClass || ev.targetClass.includes("Toată Școala") || ev.targetClass.includes(user.class)).map(ev => {
                         const color = CALENDAR_TYPES[ev.type as keyof typeof CALENDAR_TYPES]?.color || 'bg-gray-500';
                         return (
                            <div key={ev.id} className={`p-4 rounded-[1.5rem] border relative overflow-hidden transition-colors ${darkMode ? 'border-white/5 bg-black/20 hover:bg-white/5' : 'border-gray-100 bg-gray-50 hover:bg-white'}`}>
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${color}`}></div>
                                <div className="font-bold text-[14px] ml-2 mb-1">{ev.title}</div>
                                <div className="text-[11px] text-gray-500 ml-2 font-mono bg-black/5 dark:bg-white/5 inline-block px-2 py-1 rounded-md">{new Date(ev.start).toLocaleDateString('ro-RO')}</div>
                            </div>
                         )
                    })}
                </div>
            </div>
        </main>
    </div>
  );
}