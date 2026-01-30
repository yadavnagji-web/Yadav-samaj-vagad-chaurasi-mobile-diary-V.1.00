
import React, { useState, useEffect } from 'react';
import { UserView, Village, Member, Bulletin } from './types';
import { getItems } from './services/firebase';
import { getDailyQuote, getHindiPanchang } from './services/aiService';
import { VILLAGES_DB_PATH, MEMBERS_DB_PATH, BULLETIN_DB_PATH, APP_NAME } from './constants';

import Home from './pages/Home';
import Registration from './pages/Registration';
import Admin from './pages/Admin';
import Guide from './pages/Guide';

const App: React.FC = () => {
  const [view, setView] = useState<UserView>(UserView.HOME);
  const [villages, setVillages] = useState<Village[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [quote, setQuote] = useState("");
  const [panchang, setPanchang] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isQrTabOpen, setIsQrTabOpen] = useState(false);
  const [urlVillageId, setUrlVillageId] = useState<string | null>(null);

  const initData = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const vId = params.get('v');
      if (vId) setUrlVillageId(vId);

      const [vData, mData, bData] = await Promise.all([
        getItems<Village>(VILLAGES_DB_PATH),
        getItems<Member>(MEMBERS_DB_PATH),
        getItems<Bulletin>(BULLETIN_DB_PATH)
      ]);
      
      setVillages(vData.sort((a, b) => a.name.localeCompare(b.name)));
      setMembers(mData);
      
      const activeBulletin = bData.filter(b => b.active).sort((a,b) => b.createdAt - a.createdAt)[0];
      setBulletin(activeBulletin || null);

      const [dailyQuote, panchangInfo] = await Promise.all([
        getDailyQuote(),
        getHindiPanchang()
      ]);
      setQuote(dailyQuote);
      setPanchang(panchangInfo);
    } catch (e) {
      console.error("Init Error", e);
    } finally {
      setLoading(false);
    }
  };

  const refreshMembersOnly = async () => {
    const mData = await getItems<Member>(MEMBERS_DB_PATH);
    setMembers(mData);
  };

  const refreshBulletin = async () => {
    const bData = await getItems<Bulletin>(BULLETIN_DB_PATH);
    const activeBulletin = bData.filter(b => b.active).sort((a,b) => b.createdAt - a.createdAt)[0];
    setBulletin(activeBulletin || null);
  };

  useEffect(() => {
    initData();
  }, []);

  const handleShareApp = () => {
    const shareText = `*${APP_NAME}*\nसमाज के सभी सदस्यों की जानकारी के लिए डिजिटल मोबाइल डायरी ऐप। यहाँ क्लिक करें:\n${window.location.origin}`;
    if (navigator.share) {
      navigator.share({
        title: APP_NAME,
        text: shareText,
        url: window.location.origin,
      }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  const downloadVillageQR = (v: Village) => {
    const link = `${window.location.origin}?v=${v.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(link)}`;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>${v.name} QR Code</title></head>
          <body style="text-align:center; font-family:sans-serif; padding:40px; background-color:#fff5e6; color:#1e293b;">
            <h1 style="color:#1e3a8a; font-weight:900;">${APP_NAME}</h1>
            <h2 style="font-weight:700;">गाँव: ${v.name}</h2>
            <div style="background:white; padding:30px; display:inline-block; border-radius:40px; box-shadow:0 15px 40px rgba(0,0,0,0.1); margin:20px 0;">
              <img src="${qrUrl}" style="width:350px; height:350px;" />
            </div>
            <p style="font-size:18px; font-weight:bold;">इस QR कोड को स्कैन करके सीधे गाँव की सूची देखें।</p>
            <script>window.onload = function() { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const NavItem = ({ label, icon, onClick, active }: any) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all active:scale-95 ${
        active 
          ? 'bg-brand text-white shadow-xl shadow-brand/20' 
          : 'text-navy hover:bg-alice'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="font-black text-sm">{label}</span>
    </button>
  );

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-linen">
        <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
        <h2 className="mt-6 text-xl font-black text-brand tracking-widest uppercase">प्रतीक्षा करें...</h2>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-linen relative flex flex-col shadow-2xl overflow-hidden font-['Noto_Sans_Devanagari']">
      
      {/* Side Drawer */}
      <div className={`fixed inset-0 bg-navy/40 z-[100] transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={() => setIsDrawerOpen(false)} />
      <div className={`fixed top-0 left-0 bottom-0 w-80 bg-white z-[101] transition-transform duration-300 transform shadow-2xl flex flex-col ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 bg-brand text-white shadow-lg">
          <h2 className="text-xl font-black tracking-tight leading-none mb-1">{APP_NAME}</h2>
          <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">समाज सेवा हेतु डिजिटल माध्यम</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          <NavItem label="मुख्य पृष्ठ" icon="🏠" active={view === UserView.HOME} onClick={() => { setView(UserView.HOME); setIsDrawerOpen(false); }} />
          <NavItem label="नया पंजीकरण" icon="📝" active={view === UserView.REGISTER} onClick={() => { setView(UserView.REGISTER); setIsDrawerOpen(false); }} />
          <NavItem label="जानकारी सुधारें" icon="🔄" active={view === UserView.UPDATE} onClick={() => { setView(UserView.UPDATE); setIsDrawerOpen(false); }} />
          <NavItem label="जानकारी हटाएँ" icon="🗑️" active={view === UserView.DELETE} onClick={() => { setView(UserView.DELETE); setIsDrawerOpen(false); }} />
          <NavItem label="उपयोग मार्गदर्शिका" icon="📖" active={view === UserView.GUIDE} onClick={() => { setView(UserView.GUIDE); setIsDrawerOpen(false); }} />
          <NavItem label="एडमिन पैनल" icon="⚙️" active={view === UserView.ADMIN} onClick={() => { setView(UserView.ADMIN); setIsDrawerOpen(false); }} />
          
          <div className="pt-4 mt-4 space-y-2">
            <button onClick={handleShareApp} className="w-full flex items-center gap-4 p-4 rounded-3xl bg-alice text-brand font-black text-sm shadow-sm active:scale-95 transition-all">
              <span className="text-xl">🚀</span>
              <span>ऐप शेयर करें</span>
            </button>
            <button onClick={() => setIsQrTabOpen(!isQrTabOpen)} className={`w-full flex items-center justify-between p-5 rounded-3xl font-black text-xs transition-all ${isQrTabOpen ? 'bg-alice text-brand shadow-inner' : 'bg-linen text-slate-500'}`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">🖼️</span>
                <span>QR कोड प्राप्त करें</span>
              </div>
              <span className="text-[10px]">{isQrTabOpen ? '▲' : '▼'}</span>
            </button>
            {isQrTabOpen && (
              <div className="mt-2 space-y-4 px-1 max-h-80 overflow-y-auto no-scrollbar bg-alice/10 rounded-3xl p-4 border border-alice">
                <div className="bg-white p-3 rounded-2xl shadow-sm flex flex-col items-center gap-2 border border-brand/10">
                  <p className="text-[9px] font-black text-brand uppercase">मुख्य ऐप QR</p>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin)}`} alt="App QR" className="w-32 h-32" />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1">गाँव के अनुसार QR</p>
                  {villages.map(v => (
                    <button key={v.id} onClick={() => downloadVillageQR(v)} className="w-full text-left p-3 hover:bg-alice rounded-2xl text-[10px] font-black text-navy flex justify-between items-center transition-all active:scale-95 border border-transparent hover:border-brand/20 bg-white">
                      <span>{v.name}</span>
                      <span className="text-[9px] bg-brand text-white px-3 py-1 rounded-full uppercase">डाउनलोड</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 mt-auto border-t border-linen bg-linen/10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">तकनीकी सहायता</p>
          <p className="text-xs font-black text-navy">नगजी यादव, साकोदरा</p>
          <a href="tel:9982151938" className="text-brand text-xs font-black">📞 9982151938</a>
        </div>
      </div>

      <header className="bg-white px-5 py-5 flex items-center justify-between shadow-sm sticky top-0 z-50 border-b border-linen">
        <button onClick={() => setIsDrawerOpen(true)} className="p-2 text-brand hover:bg-alice rounded-2xl transition-all active:scale-75">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7"/></svg>
        </button>
        <h1 className="text-lg font-black text-brand tracking-tight">{APP_NAME}</h1>
        <div className="w-12"></div> 
      </header>

      <main className="flex-1 p-5 overflow-y-auto no-scrollbar pb-32">
        {view === UserView.HOME && <Home villages={villages} members={members} bulletin={bulletin} quote={quote} panchang={panchang} initialVillageId={urlVillageId} />}
        {view === UserView.REGISTER && <Registration type="REGISTER" villages={villages} members={members} onComplete={async () => { await refreshMembersOnly(); setView(UserView.HOME); }} />}
        {view === UserView.UPDATE && <Registration type="UPDATE" villages={villages} members={members} onComplete={async () => { await refreshMembersOnly(); setView(UserView.HOME); }} />}
        {view === UserView.DELETE && <Registration type="DELETE" villages={villages} members={members} onComplete={() => setView(UserView.HOME)} />}
        {view === UserView.ADMIN && (
          <Admin 
            villages={villages} 
            members={members} 
            refreshMembers={refreshMembersOnly} 
            refreshVillages={initData} 
            refreshBulletin={refreshBulletin}
            onExit={() => setView(UserView.HOME)}
          />
        )}
        {view === UserView.GUIDE && <Guide />}
      </main>

      <nav className="bg-white border-t border-linen px-3 py-4 flex justify-around items-center rounded-t-[44px] shadow-[0_-15px_40px_rgba(0,0,0,0.05)] fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50">
        <NavTextBtn active={view === UserView.HOME} label="होम" onClick={() => setView(UserView.HOME)} />
        <NavTextBtn active={view === UserView.REGISTER} label="नया" onClick={() => setView(UserView.REGISTER)} />
        <NavTextBtn active={view === UserView.UPDATE} label="सुधार" onClick={() => setView(UserView.UPDATE)} />
        <NavTextBtn active={view === UserView.DELETE} label="हटाएं" onClick={() => setView(UserView.DELETE)} />
      </nav>
    </div>
  );
};

const NavTextBtn = ({ active, label, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={`flex-1 py-3 px-2 mx-1 rounded-2xl font-black text-[11px] transition-all duration-300 active:scale-90 ${
      active 
        ? 'bg-brand text-white shadow-xl shadow-brand/30 scale-105' 
        : 'text-slate-400 bg-linen/30'
    }`}
  >
    {label}
  </button>
);

export default App;
