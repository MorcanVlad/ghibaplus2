"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection, addDoc, setDoc, getDocs, query, orderBy, deleteDoc, updateDoc } from "firebase/firestore";
import { SCHOOL_CLASSES } from "../lib/constants";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("gestiune");
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [whitelistDb, setWhitelistDb] = useState<any[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [selectedClassNotif, setSelectedClassNotif] = useState("Toată Școala");

  const [eventType, setEventType] = useState("activity"); // 'activity', 'holiday', 'exam'
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hasTime, setHasTime] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [evLoc, setEvLoc] = useState("");
  const [spots, setSpots] = useState(30);

  const [emailList, setEmailList] = useState("");
  const [whitelistSearch, setWhitelistSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [viewAttendeesModal, setViewAttendeesModal] = useState<any>(null);
  const [editingPost, setEditingPost] = useState<any>(null);

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

    const nSnap = await getDocs(collection(db, "news"));
    const aSnap = await getDocs(collection(db, "calendar_events"));
    
    const allItems = [
        ...nSnap.docs.map(d=>({id:d.id, col:'news', ...d.data()})), 
        ...aSnap.docs.map(d=>({id:d.id, col:'calendar_events', ...d.data()}))
    ];
    
    allItems.sort((a:any, b:any) => new Date(b.postedAt || b.date || 0).getTime() - new Date(a.postedAt || a.date || 0).getTime());
    setPosts(allItems);
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
    const finalDateISO = startDate ? (hasTime && startTime ? `${startDate}T${startTime}` : `${startDate}T00:00:00`) : new Date().toISOString();
    const finalEndDateISO = endDate ? (hasTime && endTime ? `${endDate}T${endTime}` : `${endDate}T00:00:00`) : finalDateISO;

    const eventData: any = { 
        type: eventType, title, content, imageUrl, 
        date: finalDateISO, endDate: finalEndDateISO, hasTime, startTime, endTime,
        targetClasses: selectedClasses.length === 0 ? ["Toată Școala"] : selectedClasses, 
        postedAt: new Date().toISOString(), likes: []
    };

    if (eventType === 'activity') {
        eventData.location = evLoc;
        eventData.organizers = authorName || "Consiliul Elevilor";
        eventData.maxSpots = spots;
        eventData.attendees = [];
    }

    await addDoc(collection(db, "calendar_events"), eventData);
    alert("✅ Salvat cu succes în Calendar!"); 
    setTitle(""); setContent(""); setImageUrl(""); setAuthorName(""); 
    setStartDate(""); setEndDate(""); setHasTime(false); setStartTime(""); setEndTime("");
    setEvLoc(""); setSelectedClasses([]); setEventType("activity"); fetchData();
  };

  const handleUpdateEditingPost = async () => {
      try {
          const ref = doc(db, editingPost.col, editingPost.id);
          const dataToUpdate = {
              title: editingPost.title,
              content: editingPost.content,
          };
          if (editingPost.col === 'calendar_events' && editingPost.type === 'activity') {
              (dataToUpdate as any).location = editingPost.location;
              (dataToUpdate as any).maxSpots = editingPost.maxSpots;
          }
          await updateDoc(ref, dataToUpdate);
          alert("✅ Postare actualizată!");
          setEditingPost(null);
          fetchData();
      } catch (err) {
          console.error(err);
          alert("Eroare la actualizare.");
      }
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

  const downloadAttendeesCSV = (activity: any) => {
      if (!activity.attendees || activity.attendees.length === 0) return alert("Nu există înscriși!");
      const header = "Nume Elev,Clasa,Numar Telefon\n";
      const rows = activity.attendees.map((a:any) => `${a.name},${a.class},${a.phone}`).join("\n");
      const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `Inscrisi_${activity.title.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
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
          {[{id:'gestiune', icon:'🗑️', lbl:'Gestiune'}, {id:'users', icon:'👥', lbl:'Elevi'}, {id:'news', icon:'📢', lbl:'Postează'}, {id:'events', icon:'📅', lbl:'Eveniment'}, {id:'notif', icon:'🔔', lbl:'Notificări'}, {id:'whitelist', icon:'📧', lbl:'Aprobă'}].map(t => (
            <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`flex-shrink-0 px-4 sm:flex-1 py-3 sm:py-4 rounded-2xl font-black text-xs sm:text-sm transition-all ${activeTab === t.id ? 'bg-red-600 text-white shadow-lg' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-60'}`}>
              {t.icon} <span className="hidden sm:inline">{t.lbl}</span>
            </button>
          ))}
        </div>

        {activeTab === "gestiune" && (
            <div className={`p-6 sm:p-8 rounded-[2.5rem] border backdrop-blur-xl ${cardBg}`}>
                <h2 className="text-2xl font-black mb-6">🗑️ Moderează Postările</h2>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {posts.map(p => (
                        <div key={p.id} className={`flex justify-between items-center p-5 rounded-2xl border transition-colors ${darkMode ? 'bg-black/40 border-white/5 hover:border-white/10' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                            <div>
                                <div className="font-bold mb-1 flex items-center gap-2">
                                    <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${
                                        p.type === 'holiday' ? 'bg-yellow-500/20 text-yellow-600' : 
                                        p.type === 'exam' ? 'bg-purple-500/20 text-purple-500' : 
                                        (p.type === 'activity' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500')
                                    }`}> 
                                        {p.type === 'holiday' ? 'Vacanță' : p.type === 'exam' ? 'Examen' : (p.type === 'activity' ? 'Eveniment' : 'Anunț')} 
                                    </span>
                                    {p.title} <span className={`text-xs font-normal opacity-60`}>{p.authorName || p.organizers ? `(${p.authorName || p.organizers})` : ''}</span>
                                </div>
                                <div className={`text-xs line-clamp-1 opacity-60`}>{p.content}</div>
                            </div>
                            <div className="flex gap-2 flex-wrap justify-end">
                                {p.type === 'activity' && (
                                    <button onClick={() => setViewAttendeesModal(p)} className="bg-blue-500/10 text-blue-500 px-4 py-2.5 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition">
                                        👥 ({p.attendees?.length || 0})
                                    </button>
                                )}
                                <button onClick={() => setEditingPost(p)} className="bg-yellow-500/10 text-yellow-600 px-4 py-2.5 rounded-xl font-bold hover:bg-yellow-500 hover:text-white transition">Editează</button>
                                <button onClick={() => handleDelete(p.id, p.col)} className="bg-red-500/10 text-red-500 px-4 py-2.5 rounded-xl font-bold hover:bg-red-600 hover:text-white transition">Șterge</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {editingPost && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                <div className={`border p-8 rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 text-slate-900'}`}>
                    <button onClick={() => setEditingPost(null)} className={`absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center font-bold transition ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}>✕</button>
                    
                    <h2 className="text-2xl font-black mb-6">✏️ Editează Postarea</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase opacity-50 block mb-2">Titlu</label>
                            <input className={`w-full p-4 rounded-2xl outline-none border ${inputBg}`} value={editingPost.title} onChange={e=>setEditingPost({...editingPost, title: e.target.value})} />
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-black uppercase opacity-50 block mb-2">Conținut</label>
                            <textarea className={`w-full p-4 rounded-2xl outline-none border h-32 resize-none ${inputBg}`} value={editingPost.content} onChange={e=>setEditingPost({...editingPost, content: e.target.value})} />
                        </div>

                        {editingPost.col === 'calendar_events' && editingPost.type === 'activity' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase opacity-50 block mb-2">Locație (dacă e cazul)</label>
                                    <input className={`w-full p-4 rounded-2xl outline-none border ${inputBg}`} value={editingPost.location || ""} onChange={e=>setEditingPost({...editingPost, location: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase opacity-50 block mb-2">Locuri</label>
                                    <input type="number" className={`w-full p-4 rounded-2xl outline-none border ${inputBg}`} value={editingPost.maxSpots || 0} onChange={e=>setEditingPost({...editingPost, maxSpots: Number(e.target.value)})} />
                                </div>
                            </div>
                        )}

                        <button onClick={handleUpdateEditingPost} className="w-full py-4 mt-4 bg-yellow-500 text-white rounded-2xl font-black text-lg hover:bg-yellow-400 transition shadow-lg shadow-yellow-500/20">
                            Salvează Modificările
                        </button>
                    </div>
                </div>
            </div>
        )}

        {viewAttendeesModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                <div className={`border p-8 rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative overflow-hidden ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 text-slate-900'}`}>
                    <button onClick={() => setViewAttendeesModal(null)} className={`absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center font-bold transition ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'}`}>✕</button>
                    <h2 className="text-2xl font-black mb-1">Lista Participanți</h2>
                    <p className="text-xs text-green-500 font-bold uppercase tracking-wider mb-6">{viewAttendeesModal.title}</p>
                    
                    <div className="max-h-[50vh] overflow-y-auto mb-6 pr-2 space-y-2 custom-scrollbar">
                        {(!viewAttendeesModal.attendees || viewAttendeesModal.attendees.length === 0) ? (
                            <p className="text-sm italic opacity-60">Nu s-a înscris niciun elev încă.</p>
                        ) : (
                            viewAttendeesModal.attendees.map((a:any, index:number) => (
                                <div key={a.id} className={`flex justify-between items-center p-4 rounded-xl border ${darkMode ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="font-bold text-sm">{index + 1}. {a.name} <span className={`px-2 py-0.5 ml-2 rounded text-[10px] ${darkMode ? 'bg-white/10 text-gray-300' : 'bg-slate-200 text-slate-700'}`}>{a.class}</span></div>
                                    <div className="text-sm font-mono opacity-60">{a.phone}</div>
                                </div>
                            ))
                        )}
                    </div>
                    <button onClick={() => downloadAttendeesCSV(viewAttendeesModal)} disabled={!viewAttendeesModal.attendees || viewAttendeesModal.attendees.length === 0} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-blue-500 transition shadow-xl disabled:opacity-50">
                        Descarcă Lista (CSV)
                    </button>
                </div>
            </div>
        )}

        {activeTab === "users" && (
          <div className={`p-6 sm:p-8 rounded-[2.5rem] border backdrop-blur-xl ${cardBg}`}>
            <h2 className="text-2xl font-black mb-4">👥 Gestiune Elevi</h2>
            <input placeholder="Caută elev după nume sau email..." className={`w-full p-4 mb-6 rounded-2xl outline-none border focus:border-red-500 transition-colors ${inputBg}`} value={userSearch} onChange={e => setUserSearch(e.target.value)} />

            <div className="grid gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {users.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
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
              {users.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())).length === 0 && (
                  <p className="text-center opacity-50 italic mt-4">Niciun elev găsit.</p>
              )}
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
                <h2 className="text-2xl font-black mb-6 text-green-500">📅 Calendar & Evenimente</h2>
                
                <div className="mb-6">
                    <label className="text-[10px] font-black tracking-widest uppercase opacity-50 block mb-2">Tip Înregistrare</label>
                    <select value={eventType} onChange={e=>setEventType(e.target.value)} className={`w-full p-4 rounded-2xl outline-none font-bold border cursor-pointer ${inputBg}`}>
                        <option value="activity" className="text-black bg-white">🎟️ Eveniment cu Înscriere / Participare</option>
                        <option value="holiday" className="text-black bg-white">🌴 Vacanță / Zi Liberă (Doar informativ)</option>
                        <option value="exam" className="text-black bg-white">📝 Examen / Testare (Doar informativ)</option>
                    </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <input placeholder={eventType === 'holiday' ? "Titlu Vacanță (ex: Vacanța de Primăvară)" : (eventType === 'exam' ? "Nume Examen (ex: Simulări Mate)" : "Titlu Eveniment")} className={`w-full p-4 rounded-2xl outline-none border ${inputBg}`} value={title} onChange={e=>setTitle(e.target.value)} required />
                    {eventType === 'activity' && <input placeholder="Organizator (ex: C.S.E.)" className={`w-full p-4 rounded-2xl outline-none border ${inputBg}`} value={authorName} onChange={e=>setAuthorName(e.target.value)} />}
                </div>
                
                <textarea placeholder="Detalii suplimentare..." className={`w-full p-4 rounded-2xl outline-none border h-24 resize-none mb-4 ${inputBg}`} value={content} onChange={e=>setContent(e.target.value)} required />
                
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-[10px] font-black uppercase opacity-50 block mb-2">Din data</label>
                        <input type="date" className={`w-full p-4 rounded-2xl outline-none border ${inputBg}`} value={startDate} onChange={e=>setStartDate(e.target.value)} required />
                    </div>
                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-[10px] font-black uppercase opacity-50 block">Până în</label>
                            <button type="button" onClick={() => setEndDate(startDate)} className="text-[10px] bg-green-500/20 text-green-500 px-3 py-1 rounded-lg font-bold hover:bg-green-500 hover:text-white transition">Același ca Start</button>
                        </div>
                        <input type="date" className={`w-full p-4 rounded-2xl outline-none border ${inputBg}`} value={endDate} onChange={e=>setEndDate(e.target.value)} required />
                    </div>
                </div>

                <div className={`mb-4 p-5 rounded-2xl border transition-all ${darkMode ? 'bg-black/30 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={hasTime} onChange={e=>setHasTime(e.target.checked)} className="w-5 h-5 accent-green-500 cursor-pointer rounded" />
                        <span className="font-bold text-sm">⏰ Adaugă Oră (Opțional)</span>
                    </label>
                    {hasTime && (
                        <div className="grid grid-cols-2 gap-4 mt-4 animate-fade-in">
                            <div><label className="text-[10px] font-black uppercase opacity-50 block mb-2">Ora Începerii</label><input type="time" className={`w-full p-3 rounded-xl outline-none border ${inputBg}`} value={startTime} onChange={e=>setStartTime(e.target.value)} required /></div>
                            <div><label className="text-[10px] font-black uppercase opacity-50 block mb-2">Ora Finalizării</label><input type="time" className={`w-full p-3 rounded-xl outline-none border ${inputBg}`} value={endTime} onChange={e=>setEndTime(e.target.value)} /></div>
                        </div>
                    )}
                </div>

                {eventType === 'activity' && (
                    <div className="grid sm:grid-cols-2 gap-4 mb-6 animate-fade-in">
                        <div><label className="text-[10px] font-black uppercase opacity-50 block mb-2">LOCAȚIE</label><input placeholder="Ex: Sala Festivă" className={`w-full p-4 rounded-2xl outline-none border ${inputBg}`} value={evLoc} onChange={e=>setEvLoc(e.target.value)} required /></div>
                        <div><label className="text-[10px] font-black uppercase opacity-50 block mb-2">LOCURI</label><input type="number" className={`w-full p-4 rounded-2xl outline-none border ${inputBg}`} value={spots} onChange={e=>setSpots(Number(e.target.value))} required /></div>
                    </div>
                )}
                
                <p className="text-[10px] font-black tracking-widest text-green-500 uppercase mb-3">Afișează Doar Pentru</p>
                <div className="flex flex-wrap gap-2 mb-6">{SCHOOL_CLASSES.map(c => <button key={c} type="button" onClick={() => toggleClass(c)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedClasses.includes(c) ? 'bg-green-600 border-green-500 text-white' : `${darkMode?'bg-white/5 border-white/10 text-gray-400':'bg-slate-100 border-slate-200 text-slate-600'}`}`}>{c}</button>)}</div>
                
                <button className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-lg hover:bg-green-500 transition shadow-lg shadow-green-500/20">
                    {eventType === 'holiday' ? 'Salvează Vacanța' : (eventType === 'exam' ? 'Salvează Examenul' : 'Creează Eveniment')}
                </button>
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
                    {posts.filter(p=>p.col === 'calendar_events' && p.type === 'activity').map(p => (
                        <div key={p.id} className={`p-5 rounded-2xl border flex flex-col justify-between items-start gap-4 ${darkMode ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                            <div><h3 className="font-black text-base">{p.title}</h3><p className="text-xs opacity-60 mt-1 font-bold">Înscriși: {p.attendees?.length || 0}</p></div>
                            <button onClick={() => handleNotifyAttendees(p)} disabled={!p.attendees || p.attendees.length === 0} className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-black text-xs hover:bg-blue-500 transition disabled:opacity-30 disabled:cursor-not-allowed">Trimite Mesaj</button>
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
                        <label className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold cursor-pointer transition shadow-lg flex items-center gap-2">📁 .txt / .csv <input type="file" accept=".txt,.csv" onChange={handleFileUpload} className="hidden" /></label>
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