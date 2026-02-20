"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase"; 
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, collection, addDoc, query, getDocs, arrayUnion, arrayRemove, orderBy } from "firebase/firestore";
import Link from "next/link";
import { INTEREST_CATEGORIES, SCHOOL_CLASSES, CALENDAR_TYPES } from "../lib/constants";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  
  const [postContent, setPostContent] = useState("");
  const [postTags, setPostTags] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
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
        
        // Load Feed Data
        const newsSnap = await getDocs(query(collection(db, "news"), orderBy("postedAt", "desc")));
        const actSnap = await getDocs(query(collection(db, "activities"), orderBy("postedAt", "desc")));
        
        // Adăugăm ": any[]" pentru a forța TypeScript să ignore verificarea strictă
        let allItems: any[] = [
            ...newsSnap.docs.map(d => ({id: d.id, collectionType: 'news', ...d.data()})), 
            ...actSnap.docs.map(d => ({id: d.id, collectionType: 'activities', ...d.data()}))
        ];
        
        // Acum sortarea va funcționa fără ca Vercel să mai dea crash
        allItems.sort((a, b) => {
            const dateA = a.postedAt || a.date || 0;
            const dateB = b.postedAt || b.date || 0;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        
        setFeed(allItems);}, []);

  const toggleTheme = () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    localStorage.setItem("ghiba_theme", newVal ? "dark" : "light");
  };

  const handleCreatePost = async () => {
      if(!postContent.trim() || !user) return;
      setIsPosting(true);
      const newPost = {
          type: "user_post",
          content: postContent,
          tags: postTags,
          authorId: user.id,
          authorName: user.name,
          authorAvatar: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`,
          postedAt: new Date().toISOString(),
          likes: [], reposts: []
      };
      const docRef = await addDoc(collection(db, "news"), newPost);
      setFeed([{id: docRef.id, collectionType: 'news', ...newPost}, ...feed]);
      setPostContent(""); setPostTags([]); setIsPosting(false);
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
        {/* Navbar */}
        <nav className={`fixed top-0 w-full z-40 border-b px-4 py-3 ${glassNav}`}>
            <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
                <Link href="/dashboard" className="flex items-center gap-3 group">
                    <img src="/favicon.ico" alt="Logo" className="w-10 h-10 rounded-[10px] shadow-md group-hover:scale-110 transition-transform" />
                    <h1 className={`text-2xl font-black tracking-tight hidden sm:block ${darkMode ? "text-white" : "text-gray-900"}`}>Ghiba<span className="text-red-500">+</span></h1>
                </Link>
                
                <input placeholder="Caută..." className={`hidden sm:block flex-1 max-w-sm border rounded-full px-5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 transition-all ${darkMode ? "bg-white/5 border-white/10 text-white placeholder-gray-500" : "bg-gray-100 border-gray-200 text-gray-900"}`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>

                <div className="flex gap-4 items-center">
                    <Link href={`/profile/${user.id}`} className="text-sm font-bold hover:text-red-500 transition hidden sm:block">Profil Meu</Link>
                    <button onClick={toggleTheme} className="text-xl hover:scale-110 transition-transform"> {darkMode ? "☀️" : "🌙"}</button>
                    {user.role === 'admin' && <button onClick={() => router.push('/admin')} className="bg-red-600 px-4 py-2 rounded-xl text-xs text-white font-bold hover:bg-red-500 transition shadow-lg shadow-red-500/20">ADMIN</button>}
                    <button onClick={() => auth.signOut()} className="text-xs font-bold text-gray-500 hover:text-red-500 bg-black/5 dark:bg-white/5 px-3 py-2 rounded-lg">Ieșire</button>
                </div>
            </div>
        </nav>

        <main className="max-w-6xl mx-auto p-4 mt-24 grid lg:grid-cols-3 gap-8 relative z-10">
            {/* Feed Principal */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* Zona de Postare */}
                <div className={`p-6 rounded-[2rem] transition-all ${cardClass}`}>
                    <div className="flex gap-4 items-start mb-4">
                        <Link href={`/profile/${user.id}`}><img src={user.avatarUrl} className="w-12 h-12 rounded-full border-2 border-transparent hover:border-red-500 transition-colors" /></Link>
                        <textarea value={postContent} onChange={e => setPostContent(e.target.value)} placeholder={`Ce se întâmplă azi, ${user.name.split(' ')[0]}?`} className={`w-full h-24 p-4 rounded-[1.5rem] resize-none outline-none text-[15px] font-medium transition-colors ${darkMode ? "bg-black/30 text-white placeholder-gray-500 focus:bg-white/5" : "bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-gray-100"}`}/>
                    </div>
                    <div className="flex justify-between items-center pl-16">
                        <div className="flex gap-2 flex-wrap">
                            {['Discuție', 'Întrebare', 'Anunț'].map(t => (
                                <button key={t} onClick={() => setPostTags(postTags.includes(t) ? postTags.filter(x=>x!==t) : [...postTags, t])} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${postTags.includes(t) ? 'bg-red-600 text-white' : 'bg-black/5 dark:bg-white/5 text-gray-500 hover:bg-black/10 dark:hover:bg-white/10'}`}>{t}</button>
                            ))}
                        </div>
                        <button onClick={handleCreatePost} disabled={isPosting || !postContent} className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-8 py-2.5 rounded-full font-bold shadow-lg shadow-red-500/20 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all">Postează</button>
                    </div>
                </div>

                {/* Lista Postari */}
                 {feed.filter(i => i.content?.toLowerCase().includes(searchQuery.toLowerCase()) || i.title?.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                    <div key={item.id} className={`rounded-[2rem] overflow-hidden transition-all duration-300 hover:-translate-y-1 ${cardClass}`}>
                        
                        <div className="p-6 pb-3 flex justify-between items-start">
                            {item.type === 'user_post' ? (
                                <Link href={`/profile/${item.authorId}`} className="flex items-center gap-3 group">
                                    <img src={item.authorAvatar} className="w-12 h-12 rounded-full border border-white/10 group-hover:border-red-500 transition-colors" />
                                    <div>
                                        <div className="font-bold flex items-center gap-2 text-[15px]">{item.authorName} <span className="bg-blue-500/10 text-blue-500 text-[10px] px-2 py-0.5 rounded-md uppercase font-bold">Elev</span></div>
                                        <div className="text-xs text-gray-500">{new Date(item.postedAt).toLocaleString('ro-RO')}</div>
                                    </div>
                                </Link>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <img src="/favicon.ico" className="w-12 h-12 rounded-xl shadow-md" />
                                    <div>
                                        <div className="font-bold text-red-500 flex items-center gap-2 text-[15px]">Consiliul Elevilor <span className="bg-red-500/10 text-red-500 text-[10px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">Oficial</span></div>
                                        <div className="text-xs text-gray-500">{new Date(item.postedAt || item.date).toLocaleString('ro-RO')}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {item.imageUrl && <div className="mt-2 h-72 w-full bg-cover bg-center border-y border-white/5" style={{backgroundImage: `url(${item.imageUrl})`}}></div>}
                        
                        <div className="p-6 pt-3">
                            {item.title && <h3 className="text-2xl font-black mb-2">{item.title}</h3>}
                            <p className={`text-[15px] mb-6 whitespace-pre-wrap leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.content}</p>
                            
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

            {/* Sidebar Calendar */}
            <div className={`p-6 rounded-[2rem] sticky top-28 ${cardClass}`}>
                <h3 className="font-black text-xl mb-6 flex items-center gap-3"><span className="text-2xl">📅</span> Calendar Școlar</h3>
                <div className="space-y-3">
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