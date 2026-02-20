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
  const [authorName, setAuthorName] = useState(""); 
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [organizers, setOrganizers] = useState(""); 
  const [spots, setSpots] = useState(30);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  
  const [userSearch, setUserSearch] = useState("");
  const [whitelistSearch, setWhitelistSearch] = useState("");
  const [emailList, setEmailList] = useState("");
  
  const [viewAttendeesModal, setViewAttendeesModal] = useState<any>(null);
  const [darkMode, setDarkMode] = useState(true);

  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("ghiba_theme") === "light") setDarkMode(false);
    auth.onAuthStateChanged(async (u) => {
      if (!u) return router.push("/");
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists() && snap.data().role === 'admin') {
          setUser(snap.data()); fetchAll();
      } else router.push("/dashboard");
    });
  }, [router]);

  const toggleTheme = () => {
      const newTheme = !darkMode;
      setDarkMode(newTheme);
      localStorage.setItem("ghiba_theme", newTheme ? "dark" : "light");
  };

  const fetchAll = async () => {
      const nSnap = await getDocs(query(collection(db, "news"), orderBy("postedAt", "desc")));
      const aSnap = await getDocs(query(collection(db, "activities"), orderBy("postedAt", "desc")));
      let allItems: any[] = [...nSnap.docs.map(d => ({id: d.id, col: 'news', ...d.data()})), ...aSnap.docs.map(d => ({id: d.id, col: 'activities', ...d.data()}))];
      allItems.sort((a: any, b: any) => new Date(b.postedAt || b.date || 0).getTime() - new Date(a.postedAt || a.date || 0).getTime());
      setPosts(allItems);
      
      const uSnap = await getDocs(collection(db, "users"));
      setUsersDb(uSnap.docs.map(d => ({id: d.id, ...d.data()})));

      const wSnap = await getDocs(collection(db, "whitelist"));
      setWhitelistDb(wSnap.docs.map(d => ({id: d.id, ...d.data()})));
  };

  const handleAddWhitelist = async () => {
    const rawEmails = emailList.split(/[\n,]+/).map(e => e.trim().toLowerCase()).filter(e => e);
    let count = 0;
    for (let email of rawEmails) {
      if (!email.includes('@')) email = `${email}@ghibabirta.ro`;
      await setDoc(doc(db, "whitelist", email), { allowed: true, addedAt: new Date().toISOString() });
      count++;
    }
    alert(`✅ ${count} conturi adăugate/actualizate în Whitelist!`); 
    setEmailList(""); fetchAll();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => { setEmailList(prev => prev ? prev + '\n' + (event.target?.result as string) : (event.target?.result as string)); };
    reader.readAsText(file);
    e.target.value = ""; 
  };

  const handleDelete = async (id: string, collectionName: string) => {
      if(!confirm("Ștergi definitiv acest element?")) return;
      await deleteDoc(doc(db, collectionName, id));
      fetchAll();
  };

  const handleSavePost = async (e: React.FormEvent) => {
      e.preventDefault();
      await addDoc(collection(db, "news"), { type: "official_news", title, content, imageUrl, authorName: authorName || "Consiliul Elevilor", tags: selectedTags, targetClasses: selectedClasses.length === 0 ? ["Toată Școala"] : selectedClasses, postedAt: new Date().toISOString(), likes: [] });
      alert("✅ Postare Publicată!"); setTitle(""); setContent(""); setImageUrl(""); setAuthorName(""); setSelectedTags([]); setSelectedClasses([]); fetchAll();
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
      e.preventDefault();
      await addDoc(collection(db, "activities"), { type: "activity", title, content, imageUrl, date, location, organizers: organizers || "Consiliul Elevilor", maxSpots: spots, tags: selectedTags, targetClasses: selectedClasses.length === 0 ? ["Toată Școala"] : selectedClasses, postedAt: new Date().toISOString(), likes: [], attendees: [] });
      alert("✅ Activitate Creată!"); setTitle(""); setContent(""); setImageUrl(""); setDate(""); setLocation(""); setOrganizers(""); setSelectedTags([]); setSelectedClasses([]); fetchAll();
  };

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
  
  // Culori Tematice Admin
  const bgMain = darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900";
  const cardBg = darkMode ? "bg-slate-900/80 border-white/10" : "bg-white/90 border-slate-200 shadow-xl";
  const inputBg = darkMode ? "bg-black/40 border-white/10 text-white placeholder-gray-500" : "bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-500";
  const textMuted = darkMode ? "text-gray-400" : "text-gray-600";
  const blob1 = darkMode ? "bg-blue-900/30" : "bg-blue-300/40";
  const blob2 = darkMode ? "bg-red-900/30" : "bg-red-300/40";
  const inputClass = `w-full p-4 rounded-2xl border outline-none focus:border-red-500 transition-colors ${inputBg}`;

  if(!user) return <div className={`min-h-screen ${bgMain}`}></div>;

  return (
    <div className={`min-h-screen p-6 font-sans transition-colors duration-500 selection:bg-red-500/30 relative ${bgMain}`}>
      
      {/* Background Interactiv */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className={`absolute top-[-20%] right-[10%] w-[40%] h-[40%] rounded-full blur-[150px] mix-blend-multiply animate-pulse duration-[10000ms] ${blob1}`}></div>
          <div className={`absolute bottom-[20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[150px] mix-blend-multiply animate-pulse duration-[8000ms] ${blob2}`}></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        <div className={`flex justify-between items-center mb-8 p-6 rounded-[2rem] backdrop-blur-xl border shadow-xl ${cardBg}`}>
            <div className="flex items-center gap-4">
                <img src="/favicon.ico" className="w-14 h-14 rounded-[1.2rem] shadow-lg shadow-red-500/20 border border-red-500/20" />
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Console. Admin</h1>
                    <span className="text-[10px] text-red-500 font-black uppercase tracking-widest mt-1 bg-red-500/10 inline-block px-3 py-1 rounded-md border border-red-500/20">Control Center</span>
                </div>
            </div>
            <div className="flex gap-4 items-center">
                <button onClick={toggleTheme} className="text-xl hover:scale-110 transition-transform">{darkMode ? '☀️' : '🌙'}</button>
                <button onClick={() => router.push('/dashboard')} className={`px-6 py-3 rounded-2xl font-black transition shadow-xl ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>Înapoi la Site</button>
            </div>
        </div>

        <div className={`flex gap-3 mb-8 overflow-x-auto p-3 rounded-2xl border backdrop-blur-md custom-scrollbar ${cardBg}`}>
            {[ {id: 'posts', label: '📢 Știri'}, {id: 'activities', label: '⚽ Evenimente'}, {id: 'gestiune', label: '🗑️ Gestiune'}, {id: 'users', label: '👥 Utilizatori'}, {id: 'whitelist', label: '📧 Whitelist'}].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 py-3 px-5 rounded-xl font-bold whitespace-nowrap transition-all ${activeTab === t.id ? "bg-red-600 text-white shadow-lg border border-red-500" : `hover:bg-black/5 dark:hover:bg-white/5 border border-transparent ${textMuted}`}`}>{t.label}</button>
            ))}
        </div>

        {activeTab === "posts" && (
            <form onSubmit={handleSavePost} className={`p-8 rounded-[2rem] backdrop-blur-xl border ${cardBg}`}>
                <h2 className="text-2xl font-black mb-6">📢 Postează un Anunț</h2>
                <div className="grid grid-cols-2 gap-4">
                    <input placeholder="Titlu Postare" className={inputClass} value={title} onChange={e => setTitle(e.target.value)} required />
                    <input placeholder="Autor (ex: Director, Catedra Mate)" className={inputClass} value={authorName} onChange={e => setAuthorName(e.target.value)} />
                </div>
                <textarea placeholder="Conținutul anunțului..." className={`${inputClass} h-32 resize-none mt-4`} value={content} onChange={e => setContent(e.target.value)} required />
                <input placeholder="Link Imagine Copertă (Opțional)" className={`${inputClass} mt-4`} value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                
                <div className="mt-6 mb-4"><p className="text-[10px] font-black tracking-widest text-red-500 uppercase mb-3">Afișează Doar Pentru (Lasă gol pt toată școala)</p>
                    <div className="flex flex-wrap gap-2">{SCHOOL_CLASSES.map(c => <button key={c} type="button" onClick={() => toggleArray(c, selectedClasses, setSelectedClasses)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedClasses.includes(c) ? 'bg-red-600 border-red-500 text-white shadow-lg' : `${darkMode ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}`}>{c}</button>)}</div>
                </div>

                <button className={`w-full py-4 rounded-2xl font-black text-lg transition mt-6 ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>Publică Anunțul</button>
            </form>
        )}

        {activeTab === "activities" && (
            <form onSubmit={handleSaveActivity} className={`p-8 rounded-[2rem] backdrop-blur-xl border ${cardBg}`}>
                <h2 className="text-2xl font-black mb-6 text-green-500">⚽ Postează un Eveniment</h2>
                <div className="grid grid-cols-2 gap-4">
                    <input placeholder="Nume Eveniment" className={inputClass} value={title} onChange={e => setTitle(e.target.value)} required />
                    <input placeholder="Organizator" className={inputClass} value={organizers} onChange={e => setOrganizers(e.target.value)} required />
                </div>
                <textarea placeholder="Detalii, cerințe..." className={`${inputClass} h-24 resize-none mt-4`} value={content} onChange={e => setContent(e.target.value)} />
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                    {/* INPUT DATA NATIV - Apare calendarul cand dai click */}
                    <div><label className={`text-[10px] font-black tracking-widest uppercase block mb-2 ${textMuted}`}>DATA & ORA</label><input type="datetime-local" className={inputClass} value={date} onChange={e => setDate(e.target.value)} required /></div>
                    <div><label className={`text-[10px] font-black tracking-widest uppercase block mb-2 ${textMuted}`}>LOCURI</label><input type="number" className={inputClass} value={spots} onChange={e => setSpots(Number(e.target.value))} required /></div>
                </div>
                
                <input placeholder="Locație" className={`${inputClass} mt-4`} value={location} onChange={e => setLocation(e.target.value)} required />
                
                <div className="mt-6 mb-4"><p className="text-[10px] font-black tracking-widest text-green-500 uppercase mb-3">Afișează Doar Pentru</p>
                    <div className="flex flex-wrap gap-2">{SCHOOL_CLASSES.map(c => <button key={c} type="button" onClick={() => toggleArray(c, selectedClasses, setSelectedClasses)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedClasses.includes(c) ? 'bg-green-600 border-green-500 text-white shadow-lg' : `${darkMode ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-slate-100 border-slate-200 text-slate-600'}`}`}>{c}</button>)}</div>
                </div>

                <button className="w-full bg-green-500 text-white py-4 rounded-2xl font-black text-lg hover:bg-green-600 transition mt-6">Creează Activitatea</button>
            </form>
        )}

        {activeTab === "gestiune" && (
            <div className={`p-8 rounded-[2rem] backdrop-blur-xl border ${cardBg}`}>
                <h2 className="text-2xl font-black mb-6">🗑️ Moderează Postările</h2>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {posts.map(p => (
                        <div key={p.id} className={`flex justify-between items-center p-5 rounded-2xl border transition-colors ${darkMode ? 'bg-black/40 border-white/5 hover:border-white/10' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                            <div>
                                <div className="font-bold mb-1 flex items-center gap-2">
                                    <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${p.type === 'activity' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}> {p.type === 'activity' ? 'Eveniment' : 'Anunț'} </span>
                                    {p.title} <span className={`text-xs font-normal ${textMuted}`}>({p.authorName || p.organizers})</span>
                                </div>
                                <div className={`text-xs line-clamp-1 ${textMuted}`}>{p.content}</div>
                            </div>
                            
                            <div className="flex gap-2">
                                {/* BUTON VEZI INSCRISI */}
                                {p.type === 'activity' && (
                                    <button onClick={() => setViewAttendeesModal(p)} className="bg-blue-500/10 text-blue-500 px-4 py-2.5 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition">
                                        Vezi Înscriși ({p.attendees?.length || 0})
                                    </button>
                                )}
                                <button onClick={() => handleDelete(p.id, p.col)} className="bg-red-500/10 text-red-500 px-4 py-2.5 rounded-xl font-bold hover:bg-red-600 hover:text-white transition">Șterge</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* MODAL VEZI INSCRISI DIRECT AICI */}
        {viewAttendeesModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                <div className={`border p-8 rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative overflow-hidden ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                    <button onClick={() => setViewAttendeesModal(null)} className={`absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center font-bold transition ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}>✕</button>
                    
                    <h2 className="text-2xl font-black mb-1">Lista Participanți</h2>
                    <p className="text-xs text-green-500 font-bold uppercase tracking-wider mb-6">{viewAttendeesModal.title}</p>
                    
                    <div className="max-h-[50vh] overflow-y-auto mb-6 pr-2 space-y-2 custom-scrollbar">
                        {(!viewAttendeesModal.attendees || viewAttendeesModal.attendees.length === 0) ? (
                            <p className={`text-sm italic ${textMuted}`}>Nu s-a înscris niciun elev încă.</p>
                        ) : (
                            viewAttendeesModal.attendees.map((a:any, index:number) => (
                                <div key={a.id} className={`flex justify-between items-center p-4 rounded-xl border ${darkMode ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="font-bold text-sm">{index + 1}. {a.name} <span className={`px-2 py-0.5 ml-2 rounded text-[10px] ${darkMode ? 'bg-white/10 text-gray-300' : 'bg-slate-200 text-slate-700'}`}>{a.class}</span></div>
                                    <div className={`text-sm font-mono ${textMuted}`}>{a.phone}</div>
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

        {/* TAB BAZA DATE CONTURI (STERGERE ELEVI) */}
        {activeTab === "users" && (
            <div className={`p-8 rounded-[2rem] backdrop-blur-xl border ${cardBg}`}>
                <h2 className="text-2xl font-black mb-2">👥 Bază Date Elevi</h2>
                <input placeholder="Caută elev (nume / email)..." className={inputClass} value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                <div className="mt-6 space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {usersDb.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                        <div key={u.id} className={`flex justify-between items-center p-5 rounded-2xl border ${darkMode ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                            <div>
                                <div className="font-bold mb-1">{u.name} <span className={`text-[10px] px-2 py-0.5 rounded-md ml-2 font-black ${darkMode ? 'bg-white/10 text-gray-300' : 'bg-slate-200 text-slate-700'}`}>{u.class}</span></div>
                                <div className={`text-xs font-mono ${textMuted}`}>{u.email}</div>
                            </div>
                            <button onClick={() => handleDelete(u.id, "users")} className="bg-red-500/10 text-red-500 px-4 py-2 rounded-xl font-bold hover:bg-red-600 hover:text-white transition text-xs">Șterge Cont</button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === "whitelist" && (
            <div className="grid md:grid-cols-2 gap-8">
                <div className={`p-8 rounded-[2rem] backdrop-blur-xl border ${cardBg}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-black">Adaugă Elevi Noi</h2>
                        <label className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition shadow-lg flex items-center gap-2">
                            📁 Încarcă .txt / .csv
                            <input type="file" accept=".txt,.csv" onChange={handleFileUpload} className="hidden" />
                        </label>
                    </div>
                    <textarea value={emailList} onChange={e => setEmailList(e.target.value)} className={`${inputClass} h-48 resize-none font-mono text-sm leading-relaxed`} placeholder="popescu.ion&#10;ionescu.maria"/>
                    <button onClick={handleAddWhitelist} className={`w-full py-4 rounded-2xl font-black transition mt-6 ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>Validează Lista</button>
                </div>
                <div className={`p-8 rounded-[2rem] backdrop-blur-xl border ${cardBg}`}>
                    <h2 className="text-xl font-black mb-6">Conturi Aprobate</h2>
                    <input placeholder="Caută în whitelist..." className={inputClass} value={whitelistSearch} onChange={e => setWhitelistSearch(e.target.value)} />
                    <div className="mt-6 space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {whitelistDb.filter(w => w.id.includes(whitelistSearch.toLowerCase())).map(w => (
                            <div key={w.id} className={`flex justify-between items-center p-4 rounded-2xl border ${darkMode ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                <span className={`text-sm font-mono ${textMuted}`}>{w.id}</span>
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