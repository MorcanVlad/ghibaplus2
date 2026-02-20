"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection, addDoc, setDoc, getDocs, query, orderBy, deleteDoc } from "firebase/firestore";
import { INTEREST_CATEGORIES, SCHOOL_CLASSES } from "../lib/constants";

export default function AdminPanel() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("posts");
  
  const [posts, setPosts] = useState<any[]>([]);
  const [usersDb, setUsersDb] = useState<any[]>([]);
  const [whitelistDb, setWhitelistDb] = useState<any[]>([]);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [organizers, setOrganizers] = useState("");
  const [spots, setSpots] = useState(30);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  
  const [userSearch, setUserSearch] = useState("");
  const [whitelistSearch, setWhitelistSearch] = useState("");
  const [emailList, setEmailList] = useState("");
  
  // State pentru a vedea inscrisii
  const [viewAttendeesModal, setViewAttendeesModal] = useState<any>(null);

  const router = useRouter();

  useEffect(() => {
    auth.onAuthStateChanged(async (u) => {
      if (!u) return router.push("/");
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists() && snap.data().role === 'admin') {
          setUser(snap.data()); fetchAll();
      } else router.push("/dashboard");
    });
  }, [router]);

  const fetchAll = async () => {
      const nSnap = await getDocs(query(collection(db, "news"), orderBy("postedAt", "desc")));
      const aSnap = await getDocs(query(collection(db, "activities"), orderBy("postedAt", "desc")));
      
      let allItems: any[] = [
          ...nSnap.docs.map(d => ({id: d.id, col: 'news', ...d.data()})), 
          ...aSnap.docs.map(d => ({id: d.id, col: 'activities', ...d.data()}))
      ];
      allItems.sort((a: any, b: any) => new Date(b.postedAt || b.date || 0).getTime() - new Date(a.postedAt || a.date || 0).getTime());
      setPosts(allItems);
      
      const uSnap = await getDocs(collection(db, "users"));
      setUsersDb(uSnap.docs.map(d => ({id: d.id, ...d.data()})));

      const wSnap = await getDocs(collection(db, "whitelist"));
      setWhitelistDb(wSnap.docs.map(d => ({id: d.id, ...d.data()})));
  };

  const handleAddWhitelist = async () => {
    const rawEmails = emailList.split('\n').map(e => e.trim().toLowerCase()).filter(e => e);
    let count = 0;
    for (let email of rawEmails) {
      if (!email.includes('@')) email = `${email}@ghibabirta.ro`;
      await setDoc(doc(db, "whitelist", email), { allowed: true, addedAt: new Date().toISOString() });
      count++;
    }
    alert(`✅ ${count} conturi au fost adăugate în Whitelist!`); 
    setEmailList(""); fetchAll();
  };

  const handleDelete = async (id: string, collectionName: string) => {
      if(!confirm("Ștergi definitiv acest element?")) return;
      await deleteDoc(doc(db, collectionName, id));
      fetchAll();
  };

  const handleSavePost = async (e: React.FormEvent) => {
      e.preventDefault();
      await addDoc(collection(db, "news"), { type: "official_news", title, content, imageUrl, tags: selectedTags, targetClasses: selectedClasses.length === 0 ? ["Toată Școala"] : selectedClasses, postedAt: new Date().toISOString(), likes: [] });
      alert("✅ Postare Publicată!"); setTitle(""); setContent(""); setImageUrl(""); setSelectedTags([]); setSelectedClasses([]); fetchAll();
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
      e.preventDefault();
      await addDoc(collection(db, "activities"), { type: "activity", title, content, imageUrl, date, location, organizers, maxSpots: spots, tags: selectedTags, targetClasses: selectedClasses.length === 0 ? ["Toată Școala"] : selectedClasses, postedAt: new Date().toISOString(), likes: [], attendees: [] });
      alert("✅ Activitate Creată!"); setTitle(""); setContent(""); setImageUrl(""); setDate(""); setLocation(""); setOrganizers(""); setSelectedTags([]); setSelectedClasses([]); fetchAll();
  };

  // Functia de export CSV a participantilor
  const downloadAttendeesCSV = (activity: any) => {
      if (!activity.attendees || activity.attendees.length === 0) return alert("Nu există înscriși!");
      const header = "Nume Elev,Clasa,Numar Telefon\n";
      const rows = activity.attendees.map((a:any) => `${a.name},${a.class},${a.phone}`).join("\n");
      const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Inscrisi_${activity.title.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const toggleArray = (val: string, arr: string[], setArr: any) => arr.includes(val) ? setArr(arr.filter(i => i !== val)) : setArr([...arr, val]);
  const inputClass = `w-full p-4 rounded-2xl border bg-black/40 border-white/10 outline-none focus:border-red-500 text-white placeholder-gray-500`;
  const cardClass = "bg-slate-900/80 border border-white/10 p-8 rounded-[2rem] shadow-2xl backdrop-blur-xl";

  if(!user) return <div className="min-h-screen bg-slate-950"></div>;

  return (
    <div className={`min-h-screen p-6 font-sans bg-slate-950 text-white selection:bg-red-500/30 relative`}>
      
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[150px]"></div>
          <div className="absolute bottom-[20%] left-[-10%] w-[50%] h-[50%] bg-red-900/10 rounded-full blur-[150px]"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        <div className={`flex justify-between items-center mb-8 ${cardClass}`}>
            <div className="flex items-center gap-4">
                <img src="/favicon.ico" className="w-14 h-14 rounded-[1.2rem] shadow-lg shadow-red-500/20 border border-white/10" />
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white">Console. Admin</h1>
                    <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mt-1 bg-red-500/10 inline-block px-3 py-1 rounded-md border border-red-500/20">Control Center</p>
                </div>
            </div>
            <button onClick={() => router.push('/dashboard')} className="bg-white text-black px-6 py-3 rounded-2xl font-black hover:bg-gray-200 transition shadow-xl">Înapoi la Site</button>
        </div>

        <div className="flex gap-3 mb-8 overflow-x-auto bg-slate-900/60 p-3 rounded-2xl border border-white/10 backdrop-blur-md custom-scrollbar">
            {[ {id: 'posts', label: '📢 Știri'}, {id: 'activities', label: '⚽ Evenimente'}, {id: 'gestiune', label: '🗑️ Moderare / Bază Date'}, {id: 'users', label: '👥 Utilizatori'}, {id: 'whitelist', label: '📧 Whitelist'}].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 py-3 px-5 rounded-xl font-bold whitespace-nowrap transition-all ${activeTab === t.id ? "bg-red-600 text-white shadow-lg shadow-red-600/20 border border-red-500" : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"}`}>{t.label}</button>
            ))}
        </div>

        {activeTab === "posts" && (
            <form onSubmit={handleSavePost} className={cardClass}>
                <h2 className="text-2xl font-black mb-6">📢 Postează un Anunț Oficial</h2>
                <input placeholder="Titlu Postare" className={inputClass} value={title} onChange={e => setTitle(e.target.value)} required />
                <textarea placeholder="Conținutul anunțului..." className={`${inputClass} h-32 resize-none mt-4`} value={content} onChange={e => setContent(e.target.value)} required />
                <input placeholder="Link Imagine Copertă (Opțional)" className={`${inputClass} mt-4`} value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                <button className="w-full bg-white text-black py-4 rounded-2xl font-black text-lg hover:bg-gray-200 transition shadow-xl mt-6">Publică Anunțul</button>
            </form>
        )}

        {activeTab === "activities" && (
            <form onSubmit={handleSaveActivity} className={cardClass}>
                <h2 className="text-2xl font-black mb-6 text-green-400">⚽ Postează un Eveniment</h2>
                <input placeholder="Nume Eveniment" className={inputClass} value={title} onChange={e => setTitle(e.target.value)} required />
                <textarea placeholder="Detalii, cerințe, reguli..." className={`${inputClass} h-24 resize-none mt-4`} value={content} onChange={e => setContent(e.target.value)} />
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div><label className="text-[10px] font-black tracking-widest text-gray-500 uppercase block mb-2">DATA & ORA</label><input type="datetime-local" className={inputClass} value={date} onChange={e => setDate(e.target.value)} required /></div>
                    <div><label className="text-[10px] font-black tracking-widest text-gray-500 uppercase block mb-2">LOCURI</label><input type="number" className={inputClass} value={spots} onChange={e => setSpots(Number(e.target.value))} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <input placeholder="Locație" className={inputClass} value={location} onChange={e => setLocation(e.target.value)} required />
                    <input placeholder="Organizator (ex: C.S.E.)" className={inputClass} value={organizers} onChange={e => setOrganizers(e.target.value)} required />
                </div>
                <button className="w-full bg-green-500 text-black py-4 rounded-2xl font-black text-lg hover:bg-green-400 transition shadow-xl shadow-green-500/20 mt-6">Creează Activitatea</button>
            </form>
        )}

        {/* GESTIUNE / EXPORT PARTICIPANTI */}
        {activeTab === "gestiune" && (
            <div className={cardClass}>
                <h2 className="text-2xl font-black mb-6">🗑️ Moderează Postările & Bază Date</h2>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {posts.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-5 bg-black/40 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                            <div>
                                <div className="font-bold mb-1 flex items-center gap-2 text-white">
                                    <span className={p.type === 'activity' ? "bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-[10px] uppercase font-black" : "bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] uppercase font-black"}>
                                        {p.type === 'activity' ? 'Eveniment' : 'Oficial'}
                                    </span>
                                    {p.title}
                                </div>
                                <div className="text-xs text-gray-400 line-clamp-1">{p.content}</div>
                            </div>
                            
                            <div className="flex gap-2">
                                {/* Buton pentru Lista Inscriși */}
                                {p.type === 'activity' && (
                                    <button onClick={() => setViewAttendeesModal(p)} className="bg-blue-500/10 text-blue-400 px-4 py-2.5 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition border border-transparent">
                                        Vezi Înscriși ({p.attendees?.length || 0})
                                    </button>
                                )}
                                <button onClick={() => handleDelete(p.id, p.col)} className="bg-red-500/10 text-red-500 px-4 py-2.5 rounded-xl font-bold hover:bg-red-600 hover:text-white transition border border-transparent">Șterge</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Modal pentru vizualizarea Participantilor */}
        {viewAttendeesModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                <div className="bg-slate-900 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative overflow-hidden">
                    <button onClick={() => setViewAttendeesModal(null)} className="absolute top-6 right-6 w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 font-bold transition">✕</button>
                    
                    <h2 className="text-2xl font-black mb-1 text-white">Lista Participanți</h2>
                    <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-6">{viewAttendeesModal.title}</p>
                    
                    <div className="max-h-[50vh] overflow-y-auto mb-6 pr-2 space-y-2 custom-scrollbar">
                        {(!viewAttendeesModal.attendees || viewAttendeesModal.attendees.length === 0) ? (
                            <p className="text-gray-500 text-sm italic">Nu s-a înscris niciun elev încă.</p>
                        ) : (
                            viewAttendeesModal.attendees.map((a:any, index:number) => (
                                <div key={a.id} className="flex justify-between items-center p-4 bg-black/40 rounded-xl border border-white/5">
                                    <div className="font-bold text-sm text-white">{index + 1}. {a.name} <span className="bg-white/10 text-gray-300 px-2 py-0.5 ml-2 rounded text-[10px]">{a.class}</span></div>
                                    <div className="text-sm font-mono text-gray-400">{a.phone}</div>
                                </div>
                            ))
                        )}
                    </div>

                    <button onClick={() => downloadAttendeesCSV(viewAttendeesModal)} disabled={!viewAttendeesModal.attendees || viewAttendeesModal.attendees.length === 0} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-500 transition shadow-xl disabled:opacity-50">
                        Descarcă Baza de Date (CSV)
                    </button>
                </div>
            </div>
        )}

        {activeTab === "users" && (
            <div className={cardClass}>
                <h2 className="text-2xl font-black mb-2">👥 Bază Date Elevi</h2>
                <input placeholder="Caută elev (nume / email)..." className={inputClass} value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                <div className="mt-6 space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {usersDb.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                        <div key={u.id} className="flex justify-between items-center p-5 bg-black/40 rounded-2xl border border-white/5">
                            <div>
                                <div className="font-bold mb-1 text-white">{u.name} <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-md text-gray-300 ml-2 font-black">{u.class}</span></div>
                                <div className="text-xs text-gray-500 font-mono">{u.email}</div>
                            </div>
                            <button onClick={() => handleDelete(u.id, "users")} className="text-gray-400 px-4 py-2 rounded-xl font-bold hover:bg-red-600 hover:text-white transition text-xs">Șterge Date</button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === "whitelist" && (
            <div className="grid md:grid-cols-2 gap-8">
                <div className={cardClass}>
                    <h2 className="text-xl font-black mb-2">Adaugă Elevi Noi</h2>
                    <textarea value={emailList} onChange={e => setEmailList(e.target.value)} className={`${inputClass} h-48 resize-none font-mono text-sm leading-relaxed`} placeholder="popescu.ion&#10;ionescu.maria"/>
                    <button onClick={handleAddWhitelist} className="w-full bg-white text-black py-4 rounded-2xl font-black hover:bg-gray-200 transition shadow-xl mt-6">Validează Lista</button>
                </div>
                <div className={cardClass}>
                    <h2 className="text-xl font-black mb-6">Conturi Aprobate</h2>
                    <input placeholder="Caută în whitelist..." className={inputClass} value={whitelistSearch} onChange={e => setWhitelistSearch(e.target.value)} />
                    <div className="mt-6 space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {whitelistDb.filter(w => w.id.includes(whitelistSearch.toLowerCase())).map(w => (
                            <div key={w.id} className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-white/5">
                                <span className="text-sm font-mono text-gray-300">{w.id}</span>
                                <button onClick={() => handleDelete(w.id, "whitelist")} className="text-red-500 text-xs font-bold px-4 py-2 bg-red-500/10 rounded-lg hover:bg-red-600 hover:text-white transition">Revocă Acces</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}