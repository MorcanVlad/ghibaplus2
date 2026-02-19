"use client";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function Profile() {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      // Citire corecta din baza de date
      const pSnap = await getDoc(doc(db, "users", id as string));
      if (pSnap.exists()) {
          const d = pSnap.data();
          setProfile({ followers: [], following: [], bio: "Fără descriere", ...d });
      }

      // Incarcare postari
      const postsQ = query(collection(db, "news"), where("authorId", "==", id));
      const postsSnap = await getDocs(postsQ);
      let posts = postsSnap.docs.map(d => ({id: d.id, ...d.data()}));
      posts.sort((a:any, b:any) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
      setUserPosts(posts);

      auth.onAuthStateChanged(async (u) => {
        if (u) {
          const mSnap = await getDoc(doc(db, "users", u.uid));
          const md = mSnap.data() as any;
          setMe({ id: u.uid, followers: [], following: [], ...md });
        }
      });
    };
    fetchProfile();
  }, [id]);

  const handleFollow = async () => {
    const isFollowing = me.following?.includes(id);
    const myRef = doc(db, "users", me.id);
    const targetRef = doc(db, "users", id as string);

    await updateDoc(myRef, { following: isFollowing ? arrayRemove(id) : arrayUnion(id) });
    await updateDoc(targetRef, { followers: isFollowing ? arrayRemove(me.id) : arrayUnion(me.id) });
    
    setMe({ ...me, following: isFollowing ? me.following.filter((i:any) => i !== id) : [...(me.following||[]), id] });
    setProfile({ ...profile, followers: isFollowing ? profile.followers.filter((i:any) => i !== me.id) : [...(profile.followers||[]), me.id] });
  };

  if (!profile || !me) return <div className="h-screen bg-[#09090b] flex items-center justify-center"><div className="animate-spin w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full"></div></div>;

  const isFriend = me.following?.includes(id) && profile.following?.includes(me.id);
  const isMyProfile = me.id === id;

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-6 pt-24 font-sans relative">
      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-red-900/20 to-transparent pointer-events-none"></div>

      <nav className="fixed top-0 w-full p-4 flex items-center z-50 bg-[#09090b]/80 backdrop-blur-xl left-0 border-b border-white/5">
        <div className="max-w-4xl mx-auto w-full flex justify-between items-center">
            <img src="/favicon.ico" className="w-10 h-10 rounded-xl" />
            <button onClick={() => router.push('/dashboard')} className="bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-full text-sm font-bold transition">Înapoi la Feed</button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto">
          {/* BANNER PROFIL */}
          <div className="w-full bg-[#18181b]/80 border border-white/10 rounded-[3rem] p-8 text-center relative shadow-2xl backdrop-blur-xl mb-10 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-red-600/30 to-orange-500/20 opacity-80"></div>
            
            <img src={profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.name}`} className="w-32 h-32 rounded-[2rem] mx-auto relative z-10 border-4 border-[#18181b] mb-5 bg-white shadow-2xl" alt="Avatar"/>
            
            <h1 className="text-3xl font-black mb-1">{profile.name}</h1>
            <p className="text-red-500 font-bold text-xs uppercase mb-6 tracking-widest bg-red-500/10 inline-block px-4 py-1.5 rounded-full border border-red-500/20">Clasa {profile.class}</p>
            
            <p className="text-gray-300 italic text-sm mb-8 px-4 leading-relaxed max-w-md mx-auto">"{profile.bio}"</p>
            
            <div className="flex justify-around border-y border-white/5 py-5 mb-6 bg-black/40 rounded-[2rem] mx-4 shadow-inner">
              <div><p className="font-black text-2xl">{profile.followers?.length || 0}</p><p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Followers</p></div>
              <div className="w-px bg-white/10"></div>
              <div><p className="font-black text-2xl">{profile.following?.length || 0}</p><p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Following</p></div>
            </div>

            {isFriend && <div className="mb-6 bg-green-500/10 text-green-400 text-xs py-3 rounded-full font-black border border-green-500/20 inline-block px-8 mx-auto shadow-lg shadow-green-500/10">✨ Prieteni Reciproc</div>}

            {!isMyProfile && (
              <button onClick={handleFollow} className={`w-full max-w-xs mx-auto block py-4 rounded-2xl font-bold transition-all shadow-xl ${me.following?.includes(id) ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-red-600 text-white hover:bg-red-500 hover:scale-105'}`}>
                {me.following?.includes(id) ? 'Urmărești ✓' : 'Urmărește Profilul'}
              </button>
            )}
          </div>

          <h2 className="text-2xl font-black mb-6 px-4 flex items-center gap-3">
              <span className="bg-red-500/20 text-red-500 w-8 h-8 rounded-full flex items-center justify-center text-sm">✍️</span> 
              Postările lui {profile.name.split(' ')[0]}
          </h2>
          
          <div className="space-y-4">
              {userPosts.length === 0 ? <p className="text-gray-500 italic px-4 bg-white/5 p-6 rounded-[2rem] text-center border border-white/5">Acest utilizator nu a postat nimic încă.</p> : userPosts.map(post => (
                  <div key={post.id} className="bg-[#18181b]/80 border border-white/5 rounded-[2rem] p-6 shadow-xl hover:-translate-y-1 transition-transform">
                      <div className="flex justify-between items-start mb-4">
                          <div className="text-xs text-gray-500 font-mono bg-white/5 px-3 py-1 rounded-full">{new Date(post.postedAt).toLocaleString('ro-RO')}</div>
                      </div>
                      <p className="text-gray-200 text-[15px] leading-relaxed mb-4">{post.content}</p>
                      <div className="flex gap-2">
                          {post.tags?.map((t:string) => <span key={t} className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-3 py-1.5 rounded-lg">#{t}</span>)}
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
}