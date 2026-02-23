"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection, addDoc, setDoc, getDocs, query, orderBy, deleteDoc, updateDoc } from "firebase/firestore";
import { SCHOOL_CLASSES } from "../lib/constants";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [whitelistDb, setWhitelistDb] = useState<any[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  
  // State-uri Comune
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  
  // State Notificari
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [selectedClassNotif, setSelectedClassNotif] = useState("Toată Școala");

  // State Evenimente
  const [evDate, setEvDate] = useState("");
  const [evLoc, setEvLoc] = useState("");
  const [spots, setSpots] = useState(30);

  // State Whitelist
  const [emailList, setEmailList] = useState("");
  const [whitelistSearch, setWhitelistSearch] = useState("");

  const router = useRouter();

  useEffect(() => {
    if (localStorage.getItem("ghiba_theme") === "light") setDarkMode(false);
    auth.onAuthStateChanged(async (u) => {
      if (!u) return router.push("/");
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists() && snap.data().role === 'admin') fetchData();
      else router.push("/dashboard");
    });
  }, []);

  const fetchData = async () => {
    const uSnap = await getDocs(collection(db, "users"));
    setUsers(uSnap.docs.map(d => ({id:d.id, ...d.data()})));
    
    const wSnap = await getDocs(collection(db, "whitelist"));
    setWhitelistDb(wSnap.docs.map(d => ({id:d.id, ...d.data()})));

    const nSnap = await getDocs(query(collection(db, "news"), orderBy("postedAt", "desc")));
    const aSnap = await getDocs(query(collection(db, "activities"), orderBy("postedAt", "desc")));
    setPosts([...nSnap.docs.map(d=>({id:d.id, col:'news', ...d.data()})), ...aSnap.docs.map(d=>({id:d.id, col:'activities', ...d.data()}))].sort((a:any,b:any) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()));
  };

  const handleDelete = async (id: string, col: string) => {
    if(!confirm("Ești sigur că vrei să ștergi definitiv?")) return;
    await deleteDoc(doc(db, col, id));
    fetchData();
  };

  const handleUpdateUserClass = async (uid: string, newClass: string) => {
    await updateDoc(doc(db, "users", uid), { class: newClass });
    alert("✅ Clasa a fost schimbată!");
    fetchData();
  };

  const handleSendNotif = async () => {
    if(!notifTitle || !notifBody) return alert("Completează titlul și mesajul!");
    const targetUsers = selectedClassNotif === "Toată Școala" ? users : users.filter(u => u.class === selectedClassNotif);
    if(targetUsers.length === 0) return alert("Nu există elevi în această clasă.");
    if(!confirm(`Trimitem notificarea către ${targetUsers.length} elevi?`)) return;

    for (const u of targetUsers) {
      await addDoc(collection(db, "users", u.id, "notifications"), { title: notifTitle, message: notifBody, sentAt: new Date().toISOString(), read: false });
    }
    alert("🚀 Notificări trimise cu succes!");
    setNotifTitle(""); setNotifBody("");
  };

  const handleNotifyAttendees = async (activity: any) => {
      const msg = prompt(`Mesaj pentru ${activity.attendees?.length || 0} înscriși la "${activity.title}":`);
      if(!msg) return;
      for(const attendee of activity.attendees) {
          await addDoc(collection(db, "users", attendee.id, "notifications"), { title: `Atenție: ${activity.title}`, message: msg, sentAt: new Date().toISOString(), read: false });
      }
      alert("✅ Mesaj trimis participanților!");
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, "news"), { type: "official_news", title, content, imageUrl, authorName: authorName || "Consiliul Elevilor", targetClasses: selectedClasses.length === 0 ? ["Toată Școala"] : selectedClasses, postedAt: new Date().toISOString(), likes: [] });
    alert("✅ Postare Publicată!"); setTitle(""); setContent(""); setImageUrl(""); setAuthorName(""); setSelectedClasses([]); fetchData();
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, "activities"), { type: "activity", title, content, imageUrl, date: evDate, location: evLoc, organizers: authorName || "Consiliul Elevilor", maxSpots: spots, targetClasses: selectedClasses.length === 0 ? ["Toată Școala"] : selectedClasses, postedAt: new Date().toISOString(), likes: [], attendees: [] });
    alert("✅ Eveniment Creat!"); setTitle(""); setContent(""); setImageUrl(""); setAuthorName(""); setEvDate(""); setEvLoc(""); setSelectedClasses([]); fetchData();
  };

  const handleAddWhitelist = async () => {
    const rawEmails = emailList.split(/[\n,]+/).map(e => e.trim().toLowerCase()).filter(e => e);
    let count = 0;
    for (let email of rawEmails) {
      if (!email.includes('@')) email = `${email}@ghibabirta.ro`;
      await setDoc(doc(db, "whitelist", email), { allowed: true, addedAt: new Date().toISOString() }); count++;
    }
    alert(`✅ ${count} conturi au fost autorizate!`); setEmailList(""); fetchData();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setEmailList(prev => prev ? prev + '\n' + (event.target?.result as string) : (event.target?.result as string));
    reader.readAsText(file); e.target.value = "";
  };

  const toggleClass = (c: string) => setSelectedClasses(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev, c]);

  const bgMain = darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900";
  const cardBg = darkMode ? "bg-slate-900/80 border-white/10 shadow-2xl" : "bg-white border-slate-200 shadow-xl";
  const inputBg = darkMode ? "bg-black/50 border-white/10 text-white placeholder-gray-500" : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-500";

  return (
    <div className={`min-h-screen relative font-sans transition-colors duration-500 p-4 sm:p-8 ${bgMain}`}>
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-[10%] left-[10%] w-[40%] h-[40%] rounded-full blur-[150px] ${darkMode ? 'bg-blue-900/20' : 'bg-blue-200/40'}`}></div>
        <div className={`absolute bottom-[10%] right-[10%] w-[50%] h-[50%] rounded-full blur-[150px] ${darkMode ? 'bg-red-900/20' : 'bg-red-200/40'}`}></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className={`flex justify-between items-center mb-6 sm:mb-10 p-4 sm:p-6 rounded-[2rem] border backdrop-blur-xl ${cardBg}`}>
          <h1 className="text-xl sm:text-3xl font-black">Admin <span className="text-red-500">Ghiba+</span></h1>
          <button onClick={() => router.push('/dashboard')} className={`px-4 sm:px-6 py-2.5 rounded-xl font-bold transition shadow-md text-xs sm:text-base ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>Înapoi pe Site</button>
        </div>

        <div className={`flex gap-2 sm:gap-4 mb-10 p-2 sm:p-3 rounded-3xl border backdrop-blur-md overflow-x-auto custom-scrollbar ${cardBg}`}>
          {[{id:'users', icon:'👥', lbl:'Elevi'}, {id:'news', icon:'📢', lbl:'Postează'}, {id:'events', icon:'📅', lbl:'Eveniment'}, {id:'notif', icon:'🔔', lbl:'Notificări'}, {id:'whitelist', icon:'📧', lbl:'Aprobă'}].map(t => (
            <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`flex-shrink-0 px-4 sm:flex-1 py-3 sm:py-4 rounded-2xl font-black text-xs sm:text-sm transition-all ${activeTab === t.id ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-60'}`}>
              {t.icon} <span className="hidden sm:inline">{t.lbl}</span>
            </button>
          ))}
        </div>

        {activeTab === "users" && (
          <div className={`p-6 sm:p-8 rounded-[2.5rem] border backdrop-blur-xl ${cardBg}`}>
            <h2 className="text-2xl font-black mb-8">👥 Gestiune Elevi</h2>
            <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {users.map(u => (
                <div key={u.id} className={`p-4 sm:p-6 rounded-2xl border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 ${darkMode ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <div>
                    <p className="font-black text-lg">{u.name}</p>
                    <p className="text-xs opacity-50 font-mono mt-1">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select value={u.class} onChange={(e) => handleUpdateUserClass(u.id, e.target.value)} className={`px-4 py-2.5 rounded-xl font-black text-xs outline-none border cursor-pointer ${inputBg}`}>
                      <option value="" className="text-black bg-white">Alege</option>
                      {SCHOOL_CLASSES.map(c => <option key={c} value={c} className="text-black bg-white">{c}</option>)}
                    </select>
                    <button onClick={() => handleDelete(u.id, 'users')} className="bg-red-500/10 text-red-500 px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-red-500 hover:text-white transition">Șterge</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "news" && (
            <form onSubmit={handleSavePost} className={`p-6 sm:p-8 rounded-[2.5rem] border backdrop-blur-xl ${cardBg}`}>
                <h2 className="text-2xl font-black mb-6">📢 Postează un Anunț</h2>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <input placeholder="Titlu Postare" className={`w-full p-4 rounded-2xl outline-none border ${inputBg}`} value={title} onChange={e=>setTitle(e.target.value)} required />
                    <input placeholder="Autor (ex: Director)" className={`w-full p-4 rounded-2xl outline-none border ${inputBg}`} value={authorName} onChange={e=>setAuthorName(e.target.value)} />
                </div>
                <textarea placeholder="Conținutul anunțului..." className={`w-full p-4 rounded-2xl outline-none border h-32 resize-none mb-4 ${inputBg}`} value={content} onChange={e=>setContent(e.target.value)} required />
                <input placeholder="Link Imagine Copertă (Opțional)" className={`w-full p-4 rounded-2xl outline-none border mb-6 ${inputBg}`} value={imageUrl} onChange={e=>setImageUrl(e.target.value)} />
                
                <p className="text-[10px] font-black tracking-widest text-red-500 uppercase mb-3">Afișează Doar Pentru (Lasă gol pt toată școala)</p>
                <div className="flex flex-wrap gap-2 mb-6">{SCHOOL_CLASSES.map(c => <button key={c} type="button" onClick={() => toggleClass(c)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedClasses.includes(c) ? 'bg-red-600 border-red-500 text-white' : `${darkMode?'bg-white/5 border-white/10 text-gray-400':'bg-slate-100 border-slate-200 text-slate-600'}`}`}>{c}</button>)}</div>

                <button className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-lg hover:bg-red-500 transition">Publică Anunțul</button>
            </form>
        )}

        {activeTab === "events" && (
            <form onSubmit={handleSaveActivity} className={`p-6 sm:p-8 rounded-[2.5rem] border backdrop-blur-xl ${cardBg}`}>
                <h2 className="text-2xl font-black mb-6 text-green-500">📅 Postează Eveniment</h2>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <input placeholder="Titlu Eveniment" className={`w-full p-4 rounded-2xl outline-none border ${inputBg}`} value={title} onChange={e=>setTitle(e.target.value)} required />
                    <input placeholder="Organizator (ex: C.S.E.)" className={`w-full p-4 rounded-2xl outline-none border ${inputBg}`} value={authorName} onChange={e=>setAuthorName(e.target.value)} />
                </div>
                <textarea placeholder="Detalii, cerințe..." className={`w-full p-4 rounded-2xl outline-none border h-24 resize-none mb-4 ${inputBg}`} value={content} onChange={e=>setContent(e.target.value)} required />
                
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div><label className="text-[10px] font-black uppercase opacity-50 block mb-2">DATA & ORA</label><input type="datetime-local" className={`w-full p-4 rounded-2xl outline-none border ${inputBg}`} value={evDate} onChange={e=>setEvDate(e.target.value)} required /></div>
                    <div><label className="text-[10px] font-black uppercase opacity-50 block mb-2">LOCURI</label><input type="number" className={`w-full p-4 rounded-2xl outline-none border ${inputBg}`} value={spots} onChange={e=>setSpots(Number(e.target.value))} required /></div>
                </div>
                <input placeholder="Locație" className={`w-full p-4 rounded-2xl outline-none border mb-6 ${inputBg}`} value={evLoc} onChange={e=>setEvLoc(e.target.value)} required />
                
                <p className="text-[10px] font-black tracking-widest text-green-500 uppercase mb-3">Afișează Doar Pentru</p>
                <div className="flex flex-wrap gap-2 mb-6">{SCHOOL_CLASSES.map(c => <button key={c} type="button" onClick={() => toggleClass(c)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedClasses.includes(c) ? 'bg-green-600 border-green-500 text-white' : `${darkMode?'bg-white/5 border-white/10 text-gray-400':'bg-slate-100 border-slate-200 text-slate-600'}`}`}>{c}</button>)}</div>

                <button className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-lg hover:bg-green-500 transition">Creează Eveniment</button>
            </form>
        )}

        {activeTab === "notif" && (
          <div className="grid lg:grid-cols-2 gap-8">
            <div className={`p-6 sm:p-8 rounded-[2.5rem] border backdrop-blur-xl ${cardBg}`}>
              <h2 className="text-2xl font-black mb-8">📢 Notificare Push</h2>
              <div className="space-y-4">
                <select value={selectedClassNotif} onChange={(e)=>setSelectedClassNotif(e.target.value)} className={`w-full p-4 rounded-2xl font-black outline-none border ${inputBg}`}>
                  <option value="Toată Școala" className="bg-white text-black">Către: Toată Școala</option>
                  {SCHOOL_CLASSES.map(c => <option key={c} value={c} className="bg-white text-black">Clasa: {c}</option>)}
                </select>
                <input placeholder="Titlu scurt" className={`w-full p-4 rounded-2xl font-bold border outline-none ${inputBg}`} value={notifTitle} onChange={e=>setNotifTitle(e.target.value)} />
                <textarea placeholder="Mesajul tău..." className={`w-full p-4 rounded-2xl border outline-none h-32 resize-none ${inputBg}`} value={notifBody} onChange={e=>setNotifBody(e.target.value)} />
                <button onClick={handleSendNotif} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-lg hover:bg-red-500 transition">Trimite</button>
              </div>
            </div>

            <div className={`p-6 sm:p-8 rounded-[2.5rem] border backdrop-blur-xl ${cardBg}`}>
                <h2 className="text-2xl font-black mb-8 text-blue-500">🔔 Anunță Participanții</h2>
                <div className="grid gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {posts.filter(p=>p.col === 'activities').map(p => (
                        <div key={p.id} className={`p-5 rounded-2xl border flex flex-col justify-between items-start gap-4 ${darkMode ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                            <div>
                                <h3 className="font-black text-base">{p.title}</h3>
                                <p className="text-xs opacity-60 mt-1 font-bold">Înscriși: {p.attendees?.length || 0}</p>
                            </div>
                            <button onClick={() => handleNotifyAttendees(p)} disabled={!p.attendees || p.attendees.length === 0} className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-black text-xs hover:bg-blue-500 transition disabled:opacity-30 disabled:cursor-not-allowed">
                                Trimite Mesaj Grupului
                            </button>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {activeTab === "whitelist" && (
            <div className="grid lg:grid-cols-2 gap-8">
                <div className={`p-6 sm:p-8 rounded-[2.5rem] border backdrop-blur-xl ${cardBg}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-black">Adaugă Elevi</h2>
                        <label className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold cursor-pointer transition shadow-lg flex items-center gap-2">
                            📁 Încarcă .txt / .csv <input type="file" accept=".txt,.csv" onChange={handleFileUpload} className="hidden" />
                        </label>
                    </div>
                    <textarea value={emailList} onChange={e => setEmailList(e.target.value)} className={`w-full p-4 rounded-2xl outline-none border h-48 resize-none font-mono text-sm leading-relaxed ${inputBg}`} placeholder="popescu.ion&#10;ionescu.maria"/>
                    <button onClick={handleAddWhitelist} className={`w-full py-4 rounded-2xl font-black transition mt-6 ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>Validează Lista</button>
                </div>
                <div className={`p-6 sm:p-8 rounded-[2.5rem] border backdrop-blur-xl ${cardBg}`}>
                    <h2 className="text-xl font-black mb-6">Conturi Aprobate</h2>
                    <input placeholder="Caută..." className={`w-full p-4 rounded-2xl outline-none border mb-4 ${inputBg}`} value={whitelistSearch} onChange={e => setWhitelistSearch(e.target.value)} />
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {whitelistDb.filter(w => w.id.includes(whitelistSearch.toLowerCase())).map(w => (
                            <div key={w.id} className={`flex justify-between items-center p-4 rounded-2xl border ${darkMode ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                <span className={`text-sm font-mono opacity-80`}>{w.id}</span>
                                <button onClick={() => handleDelete(w.id, "whitelist")} className="text-red-500 text-xs font-bold px-4 py-2 bg-red-500/10 rounded-lg hover:bg-red-600 hover:text-white transition">Revocă</button>
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