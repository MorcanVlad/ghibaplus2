"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection, addDoc, setDoc, getDocs, query, orderBy, deleteDoc } from "firebase/firestore";
import { INTEREST_CATEGORIES, SCHOOL_CLASSES, CALENDAR_TYPES } from "../lib/constants";

export default function AdminPanel() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("posts");
  
  // Data States
  const [posts, setPosts] = useState<any[]>([]);
  const [usersDb, setUsersDb] = useState<any[]>([]);
  const [whitelistDb, setWhitelistDb] = useState<any[]>([]);
  
  // Formulare
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [organizers, setOrganizers] = useState("");
  const [spots, setSpots] = useState(30);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  
  // Search States
  const [userSearch, setUserSearch] = useState("");
  const [whitelistSearch, setWhitelistSearch] = useState("");
  const [emailList, setEmailList] = useState("");
  
  const router = useRouter();

  useEffect(() => {
    auth.onAuthStateChanged(async (u) => {
      if (!u) return router.push("/");
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists() && snap.data().role === 'admin') {
          setUser(snap.data()); fetchAll();
      } else router.push("/dashboard");
    });
  }, []);

  const fetchAll = async () => {
      const nSnap = await getDocs(query(collection(db, "news"), orderBy("postedAt", "desc")));
      const aSnap = await getDocs(query(collection(db, "activities"), orderBy("postedAt", "desc")));
      setPosts([...nSnap.docs.map(d => ({id: d.id, col: 'news', ...d.data()})), ...aSnap.docs.map(d => ({id: d.id, col: 'activities', ...d.data()}))]);
      
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
      if(!confirm("Ștergi definitiv acest element din baza de date?")) return;
      await deleteDoc(doc(db, collectionName, id));
      fetchAll();
  };

  const handleSavePost = async (e: React.FormEvent) => {
      e.preventDefault();
      await addDoc(collection(db, "news"), { type: "official_news", title, content, imageUrl, tags: selectedTags, targetClasses: selectedClasses, postedAt: new Date().toISOString(), likes: [] });
      alert("✅ Postare Publicată!"); setTitle(""); setContent(""); setImageUrl(""); setSelectedTags([]); setSelectedClasses([]); fetchAll();
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
      e.preventDefault();
      await addDoc(collection(db, "activities"), { type: "activity", title, content, imageUrl, date, location, organizers, maxSpots: spots, tags: selectedTags, targetClasses: selectedClasses, postedAt: new Date().toISOString(), registeredStudents: [], likes: [] });
      alert("✅ Activitate Creată!"); setTitle(""); setContent(""); setImageUrl(""); setDate(""); setLocation(""); setOrganizers(""); setSelectedTags([]); setSelectedClasses([]); fetchAll();
  };

  const toggleArray = (val: string, arr: string[], setArr: any) => arr.includes(val) ? setArr(arr.filter(i => i !== val)) : setArr([...arr, val]);
  const inputClass = `w-full p-4 rounded-2xl border bg-[#09090b] border-white/10 outline-none focus:border-red-500 text-white`;

  return (
    <div className={`min-h-screen p-6 font-sans bg-[#09090b] text-white`}>
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8 bg-[#18181b] p-6 rounded-[2rem] border border-white/5 shadow-2xl">
            <div className="flex items-center gap-4">
                <img src="/favicon.ico" className="w-14 h-14 rounded-[1rem] shadow-lg shadow-red-500/20" />
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Console. Admin</h1>
                    <p className="text-xs text-red-500 font-bold uppercase tracking-widest mt-1">GhibaPlus Central</p>
                </div>
            </div>
            <button onClick={() => router.push('/dashboard')} className="bg-white/5 px-6 py-3 rounded-2xl font-bold hover:bg-white/10 transition border border-white/5">Exit Console</button>
        </div>

        {/* TABS */}
        <div className="flex gap-2 mb-8 overflow-x-auto bg-[#18181b] p-2 rounded-2xl border border-white/5">
            {[ {id: 'posts', label: '📢 Știri'}, {id: 'activities', label: '⚽ Evenimente'}, {id: 'gestiune', label: '🗑️ Gestiune Postări'}, {id: 'users', label: '👥 Bază Elevi'}, {id: 'whitelist', label: '📧 Aprobare Conturi'}].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 py-3 px-4 rounded-xl font-bold whitespace-nowrap transition-all ${activeTab === t.id ? "bg-red-600 text-white shadow-lg shadow-red-500/20" : "text-gray-500 hover:text-white hover:bg-white/5"}`}>{t.label}</button>
            ))}
        </div>

        {/* CREATE POST */}
        {activeTab === "posts" && (
            <form onSubmit={handleSavePost} className="bg-[#18181b] border border-white/5 p-8 rounded-[2rem] shadow-2xl">
                <h2 className="text-2xl font-black mb-6">Postează un Anunț Oficial</h2>
                <input placeholder="Titlu Postare" className={inputClass} value={title} onChange={e => setTitle(e.target.value)} required />
                <textarea placeholder="Conținutul anunțului..." className={`${inputClass} h-32 resize-none`} value={content} onChange={e => setContent(e.target.value)} required />
                <input placeholder="Link Imagine (Opțional)" className={inputClass} value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-500/20 mt-4">Publică Știrea</button>
            </form>
        )}

        {/* CREATE ACTIVITY */}
        {activeTab === "activities" && (
            <form onSubmit={handleSaveActivity} className="bg-[#18181b] border border-white/5 p-8 rounded-[2rem] shadow-2xl">
                <h2 className="text-2xl font-black mb-6 text-green-500">Postează o Activitate cu Înscriere</h2>
                <input placeholder="Nume Eveniment" className={inputClass} value={title} onChange={e => setTitle(e.target.value)} required />
                <textarea placeholder="Detalii, cerințe..." className={`${inputClass} h-24 resize-none`} value={content} onChange={e => setContent(e.target.value)} />
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div><label className="text-xs font-bold mb-2 block text-gray-500">DATA & ORA</label><input type="datetime-local" className={inputClass} value={date} onChange={e => setDate(e.target.value)} required /></div>
                    <div><label className="text-xs font-bold mb-2 block text-gray-500">LOCURI</label><input type="number" className={inputClass} value={spots} onChange={e => setSpots(Number(e.target.value))} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <input placeholder="Locație" className={inputClass} value={location} onChange={e => setLocation(e.target.value)} required />
                    <input placeholder="Organizator" className={inputClass} value={organizers} onChange={e => setOrganizers(e.target.value)} required />
                </div>
                <button className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-500 transition shadow-lg shadow-green-500/20">Creează Activitatea</button>
            </form>
        )}

        {/* GESTIUNE */}
        {activeTab === "gestiune" && (
            <div className="bg-[#18181b] border border-white/5 p-8 rounded-[2rem] shadow-2xl">
                <h2 className="text-2xl font-black mb-6">🗑️ Gestionează Postările</h2>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {posts.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-5 bg-[#09090b] rounded-2xl border border-white/5">
                            <div>
                                <div className="font-bold mb-1">{p.type === 'user_post' ? '👤 Elev: ' : '📢 Oficial: '} {p.title || p.authorName}</div>
                                <div className="text-xs text-gray-500 line-clamp-1">{p.content}</div>
                            </div>
                            <button onClick={() => handleDelete(p.id, p.col)} className="bg-red-500/10 text-red-500 px-5 py-2.5 rounded-xl font-bold hover:bg-red-500 hover:text-white transition">Șterge</button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* USERS DB */}
        {activeTab === "users" && (
            <div className="bg-[#18181b] border border-white/5 p-8 rounded-[2rem] shadow-2xl">
                <h2 className="text-2xl font-black mb-2">👥 Bază Date Elevi</h2>
                
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-6 flex gap-3 items-start">
                    <span className="text-red-500 text-xl">⚠️</span>
                    <p className="text-xs text-red-400 font-medium leading-relaxed">
                        <strong>ATENȚIE:</strong> Dacă ștergi un cont de aici, îi vei șterge doar profilul de pe GhibaPlus. Contul lui securizat de Google rămâne înregistrat! <br/> 
                        Dacă elevul dorește să își refacă contul (deoarece i-a dat eroare "Email deja folosit"), trebuie să intri în secțiunea <strong>Authentication</strong> din Consola Firebase și să îi ștergi emailul și de acolo.
                    </p>
                </div>

                <input placeholder="Caută elev (nume sau email)..." className={inputClass} value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                
                <div className="mt-6 space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {usersDb.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                        <div key={u.id} className="flex justify-between items-center p-5 bg-[#09090b] rounded-2xl border border-white/5">
                            <div>
                                <div className="font-bold mb-1">{u.name} <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-300 ml-2">{u.class}</span></div>
                                <div className="text-xs text-gray-500 font-mono">{u.email}</div>
                            </div>
                            <button onClick={() => handleDelete(u.id, "users")} className="bg-red-500/10 text-red-500 px-5 py-2.5 rounded-xl font-bold hover:bg-red-500 hover:text-white transition">Șterge Profil</button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* WHITELIST */}
        {activeTab === "whitelist" && (
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-[#18181b] border border-white/5 p-8 rounded-[2rem] shadow-2xl">
                    <h2 className="text-xl font-black mb-2">Aprobă Elevi Noi</h2>
                    <p className="text-xs text-gray-400 mb-4">Adaugă doar numele (ex: <strong>popescu.ion</strong>). Extensia @ghibabirta.ro se pune automat.</p>
                    <textarea value={emailList} onChange={e => setEmailList(e.target.value)} className={`${inputClass} h-48 resize-none font-mono text-sm leading-relaxed`} placeholder="popescu.ion&#10;ionescu.maria"/>
                    <button onClick={handleAddWhitelist} className="w-full bg-blue-600 py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-500 transition">Validează Lista</button>
                </div>

                <div className="bg-[#18181b] border border-white/5 p-8 rounded-[2rem] shadow-2xl">
                    <h2 className="text-xl font-black mb-4">Bază Emailuri Aprobate</h2>
                    <input placeholder="Caută..." className={inputClass} value={whitelistSearch} onChange={e => setWhitelistSearch(e.target.value)} />
                    
                    <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {whitelistDb.filter(w => w.id.includes(whitelistSearch.toLowerCase())).map(w => (
                            <div key={w.id} className="flex justify-between items-center p-4 bg-[#09090b] rounded-2xl border border-white/5">
                                <span className="text-sm font-mono text-gray-300">{w.id}</span>
                                <button onClick={() => handleDelete(w.id, "whitelist")} className="text-red-500 text-xs font-bold px-4 py-2 bg-red-500/10 rounded-lg hover:bg-red-500 hover:text-white transition">Șterge</button>
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