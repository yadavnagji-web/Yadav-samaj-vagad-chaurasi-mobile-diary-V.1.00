
import React, { useState, useEffect } from 'react';
import { UserView, Village, Member, Bulletin } from './types';
import { getItems, getConfig, setConfig } from './services/firebase';
import { getDailyQuoteFromAI } from './services/aiService';
import { 
  VILLAGES_DB_PATH, 
  MEMBERS_DB_PATH, 
  BULLETIN_DB_PATH, 
  DAILY_CONTENT_PATH,
  APP_NAME 
} from './constants';

import Home from './pages/Home';
import Registration from './pages/Registration';
import Admin from './pages/Admin';
import Guide from './pages/Guide';

const App: React.FC = () => {
  const [view, setView] = useState<UserView>(UserView.HOME);
  const [villages, setVillages] = useState<Village[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [dailyQuote, setDailyQuote] = useState<string>("लोड हो रहा है...");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [urlVillageId, setUrlVillageId] = useState<string | null>(null);

  const initData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const vId = params.get('v');
      if (vId) setUrlVillageId(vId);

      const [vData, mData, bData, dData] = await Promise.all([
        getItems<Village>(VILLAGES_DB_PATH),
        getItems<Member>(MEMBERS_DB_PATH),
        getItems<Bulletin>(BULLETIN_DB_PATH),
        getConfig(DAILY_CONTENT_PATH)
      ]);
      
      setVillages(vData.sort((a, b) => a.name.localeCompare(b.name)));
      setMembers(mData);
      
      const activeBulletin = bData.filter(b => b.active).sort((a,b) => b.createdAt - a.createdAt)[0];
      setBulletin(activeBulletin || null);

      // Handle Daily Quote (Vichar)
      const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Kolkata'}).format(new Date());
      if (dData && dData.date === today && dData.quote) {
        setDailyQuote(dData.quote);
      } else {
        try {
          const newQuote = await getDailyQuoteFromAI();
          setDailyQuote(newQuote);
          await setConfig(DAILY_CONTENT_PATH, {
            ...dData,
            date: today,
            quote: newQuote
          });
        } catch (err) {
          setDailyQuote("शिक्षित बनो, संगठित रहो, संघर्ष करो। — डॉ. बी.आर. अंबेडकर");
        }
      }
    } catch (e) {
      console.error("Init Error", e);
    }
  };

  useEffect(() => {
    initData();
  }, []);

  const refreshMembersOnly = async () => {
    const mData = await getItems<Member>(MEMBERS_DB_PATH);
    setMembers(mData);
  };

  const refreshBulletin = async () => {
    const bData = await getItems<Bulletin>(BULLETIN_DB_PATH);
    const activeBulletin = bData.filter(b => b.active).sort((a,b) => b.createdAt - a.createdAt)[0];
    setBulletin(activeBulletin || null);
  };

  const handleDownloadPDF = () => {
    alert("PDF डायरी जनरेट हो रही है... कृपया प्रतीक्षा करें।");
  };

  const handleShowQR = () => {
    alert("ऐप का QR कोड स्कैन करें और दूसरों के साथ साझा करें।");
  };

  const NavItem = ({ label, icon, onClick, active, color = "text-navy" }: any) => (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all active:scale-95 ${active ? 'bg-brand text-white shadow-xl shadow-brand/20' : color + ' hover:bg-alice'}`}>
      <span className="text-xl">{icon}</span>
      <span className="font-black text-sm">{label}</span>
    </button>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-linen relative flex flex-col shadow-2xl overflow-hidden font-['Noto_Sans_Devanagari']">
      
      {isDrawerOpen && (
        <div className="fixed inset-0 bg-brand/10 backdrop-blur-[2px] z-[100]" onClick={() => setIsDrawerOpen(false)} />
      )}
      
      <div className={`fixed top-0 left-0 bottom-0 w-80 bg-white z-[101] transition-transform duration-300 transform shadow-2xl flex flex-col ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 bg-brand text-white shadow-lg flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black mb-1">{APP_NAME}</h2>
            <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Digital Diary v2.2</p>
          </div>
          <button onClick={() => setIsDrawerOpen(false)} className="text-white text-2xl font-black p-2">✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 no-scrollbar pb-10">
          <NavItem label="होम स्क्रीन" icon="🏠" active={view === UserView.HOME} onClick={() => { setView(UserView.HOME); setIsDrawerOpen(false); }} />
          <NavItem label="नया पंजीकरण" icon="📝" active={view === UserView.REGISTER} onClick={() => { setView(UserView.REGISTER); setIsDrawerOpen(false); }} />
          <NavItem label="मोबाइल सुधारें" icon="🔄" active={view === UserView.UPDATE} onClick={() => { setView(UserView.UPDATE); setIsDrawerOpen(false); }} />
          <NavItem label="नाम हटाएँ" icon="🗑️" active={view === UserView.DELETE} onClick={() => { setView(UserView.DELETE); setIsDrawerOpen(false); }} />
          
          <div className="my-4 border-t border-linen pt-4">
             <p className="text-[10px] font-black text-slate-400 px-4 mb-2 uppercase tracking-widest">संसाधन</p>
             <NavItem label="PDF डायरी डाउनलोड" icon="📄" onClick={() => { handleDownloadPDF(); setIsDrawerOpen(false); }} />
             <NavItem label="ऐप QR कोड" icon="📱" onClick={() => { handleShowQR(); setIsDrawerOpen(false); }} />
             <NavItem label="उपयोग मार्गदर्शिका" icon="📖" active={view === UserView.GUIDE} onClick={() => { setView(UserView.GUIDE); setIsDrawerOpen(false); }} />
          </div>

          <div className="mt-auto pt-4">
             <NavItem label="एडमिन पैनल" icon="⚙️" active={view === UserView.ADMIN} onClick={() => { setView(UserView.ADMIN); setIsDrawerOpen(false); }} color="text-brand/60" />
          </div>
        </div>
      </div>

      <header className="bg-white px-5 py-5 flex items-center justify-between shadow-sm sticky top-0 z-50 border-b border-linen">
        <button onClick={() => setIsDrawerOpen(true)} className="p-2 text-brand hover:bg-alice rounded-2xl transition-all">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7"/></svg>
        </button>
        <h1 className="text-lg font-black text-brand tracking-tight">{APP_NAME}</h1>
        <div className="w-12"></div> 
      </header>

      <main className="flex-1 p-5 overflow-y-auto no-scrollbar pb-32">
        {view === UserView.HOME && (
          <Home 
            villages={villages} 
            members={members} 
            bulletin={bulletin} 
            initialVillageId={urlVillageId} 
            quote={dailyQuote}
          />
        )}
        {view === UserView.REGISTER && <Registration type="REGISTER" villages={villages} members={members} onComplete={async () => { await refreshMembersOnly(); setView(UserView.HOME); }} />}
        {view === UserView.UPDATE && <Registration type="UPDATE" villages={villages} members={members} onComplete={async () => { await refreshMembersOnly(); setView(UserView.HOME); }} />}
        {view === UserView.DELETE && <Registration type="DELETE" villages={villages} members={members} onComplete={() => setView(UserView.HOME)} />}
        {view === UserView.ADMIN && <Admin villages={villages} members={members} refreshMembers={refreshMembersOnly} refreshVillages={initData} refreshBulletin={refreshBulletin} onExit={() => setView(UserView.HOME)} />}
        {view === UserView.GUIDE && <Guide />}
      </main>

      <nav className="bg-white border-t border-linen px-3 py-4 flex justify-around items-center rounded-t-[44px] shadow-lg fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50">
        <NavTextBtn active={view === UserView.HOME} label="होम" onClick={() => setView(UserView.HOME)} />
        <NavTextBtn active={view === UserView.REGISTER} label="नया" onClick={() => setView(UserView.REGISTER)} />
        <NavTextBtn active={view === UserView.UPDATE} label="सुधार" onClick={() => setView(UserView.UPDATE)} />
        <NavTextBtn active={view === UserView.DELETE} label="हटाएं" onClick={() => setView(UserView.DELETE)} />
      </nav>
    </div>
  );
};

const NavTextBtn = ({ active, label, onClick }: any) => (
  <button onClick={onClick} className={`flex-1 py-3 px-2 mx-1 rounded-2xl font-black text-[11px] transition-all ${active ? 'bg-brand text-white shadow-xl' : 'text-slate-400 bg-linen/30'}`}>{label}</button>
);

export default App;
