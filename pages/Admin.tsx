
import React, { useState, useEffect } from 'react';
import { Village, Member, Bulletin } from '../types';
import { ADMIN_EMAIL, ADMIN_PASS, VILLAGES_DB_PATH, MEMBERS_DB_PATH, BULLETIN_DB_PATH, CONFIG_DB_PATH, DAILY_CONTENT_PATH } from '../constants';
import { addItem, removeItem, getItems, setConfig } from '../services/firebase';
import { getDailyQuoteFromAI, getHindiPanchangFromAI } from '../services/aiService';

interface AdminProps {
  villages: Village[];
  members: Member[];
  refreshMembers: () => void;
  refreshVillages: () => void;
  refreshBulletin: () => void;
  onExit: () => void;
}

const Admin: React.FC<AdminProps> = ({ villages, members, refreshMembers, refreshVillages, refreshBulletin, onExit }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [activeTab, setActiveTab] = useState<'VILLAGES' | 'MEMBERS' | 'BULLETIN' | 'API' | 'BULK'>('VILLAGES');
  
  const [newVillage, setNewVillage] = useState('');
  const [bulletinText, setBulletinText] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  const [admMemName, setAdmMemName] = useState('');
  const [admMemFather, setAdmMemFather] = useState('');
  const [admMemMobile, setAdmMemMobile] = useState('');
  const [admMemVillage, setAdmMemVillage] = useState('');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (session === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
      setIsLoggedIn(true);
      localStorage.setItem('admin_session', 'true');
    } else {
      alert('गलत क्रेडेंशियल्स');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('admin_session');
    setEmail('');
    setPass('');
  };

  const handleAddVillage = async () => {
    if (!newVillage) return;
    setLoading(true);
    await addItem(VILLAGES_DB_PATH, { name: newVillage });
    setNewVillage('');
    refreshVillages();
    setLoading(false);
  };

  const handleSyncDailyContent = async () => {
    setSyncLoading(true);
    try {
      const todayIST = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Kolkata'}).format(new Date());
      const newQuote = await getDailyQuoteFromAI();
      const pResult = await getHindiPanchangFromAI();
      
      await setConfig(DAILY_CONTENT_PATH, {
        date: todayIST,
        quote: newQuote,
        panchang: pResult.text,
        sources: pResult.sources || []
      });
      
      // Fix: Used double quotes for the outer string to allow single quotes inside for 'Live'
      alert("डेटा सफलतापूर्वक 'Live' सर्च करके अपडेट कर दिया गया है!");
      window.location.reload(); 
    } catch (e) {
      alert('सिंक करने में त्रुटि: ' + (e as Error).message);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleAdminAddMember = async () => {
    if (!admMemName || !admMemMobile || !admMemVillage) {
      alert('कृपया नाम, मोबाइल और गाँव भरें');
      return;
    }
    setLoading(true);
    const vName = villages.find(v => v.id === admMemVillage)?.name || '';
    const memberData = {
      name: admMemName.trim(),
      fatherName: admMemFather.trim(),
      mobile: admMemMobile.trim(),
      villageId: admMemVillage,
      villageName: vName,
      updatedAt: Date.now()
    };
    try {
      await addItem(MEMBERS_DB_PATH, memberData);
      alert('सदस्य सफलतापूर्वक जोड़ा गया');
      setAdmMemName('');
      setAdmMemFather('');
      setAdmMemMobile('');
      setAdmMemVillage('');
      refreshMembers();
    } catch (err) {
      alert('त्रुटि हुई');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) {
      alert("कृपया एक CSV फ़ाइल चुनें");
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      let successCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [name, father, mobile, vName] = line.split(',').map(s => s.trim());
        if (!name || !mobile) continue;

        const village = villages.find(v => v.name.toLowerCase() === vName?.toLowerCase());
        if (!village) continue;

        const memberData = {
          name,
          fatherName: father || "",
          mobile,
          villageId: village.id,
          villageName: village.name,
          updatedAt: Date.now()
        };

        try {
          await addItem(MEMBERS_DB_PATH, memberData);
          successCount++;
        } catch (err) {
          console.error("Bulk Item Error", err);
        }
      }

      alert(`${successCount} सदस्य सफलतापूर्वक अपलोड किए गए!`);
      refreshMembers();
      setLoading(false);
      setSelectedFile(null);
    };
    reader.readAsText(selectedFile);
  };

  const handleUpdateBulletin = async (active: boolean) => {
    setLoading(true);
    try {
      await addItem(BULLETIN_DB_PATH, { content: bulletinText, active, createdAt: Date.now() });
      alert(active ? 'सूचना लाइव हुई' : 'सूचना सुरक्षित हुई');
      refreshBulletin();
    } catch (err) {
      alert('सूचना अपडेट करने में त्रुटि');
    } finally {
      setLoading(false);
    }
  };

  const handleClearBulletin = async () => {
    setLoading(true);
    try {
      const bulletins = await getItems<any>(BULLETIN_DB_PATH);
      for (const b of bulletins) {
        await removeItem(BULLETIN_DB_PATH, b.id);
      }
      setBulletinText('');
      alert('सभी सूचनाएं हटा दी गई');
      refreshBulletin();
    } catch (err) {
      alert('सूचना हटाने में त्रुटि');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (members.length === 0) {
      alert("डेटा उपलब्ध नहीं है");
      return;
    }
    const excelHeader = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          table { border-collapse: collapse; }
          th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #000000; padding: 8px; font-family: 'Noto Sans Devanagari', sans-serif; }
          td { border: 1px solid #000000; padding: 8px; text-align: left; font-family: 'Noto Sans Devanagari', sans-serif; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              <th>नाम</th>
              <th>पिता/पति का नाम</th>
              <th>मोबाइल</th>
              <th>गाँव का नाम</th>
            </tr>
          </thead>
          <tbody>
    `;
    const excelFooter = `</tbody></table></body></html>`;
    const rows = members.map(m => `
      <tr>
        <td>${m.name}</td>
        <td>${m.fatherName}</td>
        <td>${m.mobile}</td>
        <td>${m.villageName}</td>
      </tr>
    `).join('');
    const fullContent = excelHeader + rows + excelFooter;
    const blob = new Blob([fullContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Member_List.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isLoggedIn) {
    return (
      <div className="bg-white p-8 rounded-[40px] shadow-2xl border-2 border-linen space-y-6">
        <h2 className="text-xl font-black text-brandDark text-center uppercase tracking-widest">एडमिन लॉगिन</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="ईमेल" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-linen/20 border-2 border-linen rounded-2xl p-4 text-navy font-black outline-none" required />
          <input type="password" placeholder="पासवर्ड" value={pass} onChange={e => setPass(e.target.value)} className="w-full bg-linen/20 border-2 border-linen rounded-2xl p-4 text-navy font-black outline-none" required />
          <button type="submit" className="w-full bg-brand text-white p-5 rounded-3xl font-black shadow-xl tracking-widest uppercase text-sm">प्रवेश करें</button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom duration-500 pb-10">
      <div className="bg-white p-4 rounded-3xl shadow-md border border-alice flex justify-between items-center">
        <h3 className="font-black text-navy text-[10px] uppercase tracking-widest">कंट्रोल पैनल</h3>
        <div className="flex gap-1">
          <button onClick={handleLogout} className="text-[9px] bg-rose text-navy px-3 py-1.5 rounded-xl font-black uppercase">लॉगआउट</button>
          <button onClick={onExit} className="text-[9px] bg-linen text-navy px-3 py-1.5 rounded-xl font-black uppercase">बंद करें</button>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-1 no-scrollbar py-1">
        <TabBtn active={activeTab === 'VILLAGES'} onClick={() => setActiveTab('VILLAGES')} label="गाँव" />
        <TabBtn active={activeTab === 'MEMBERS'} onClick={() => setActiveTab('MEMBERS')} label="सदस्य" />
        <TabBtn active={activeTab === 'BULLETIN'} onClick={() => setActiveTab('BULLETIN')} label="सूचना" />
        <TabBtn active={activeTab === 'API'} onClick={() => setActiveTab('API')} label="AI सिंक" />
        <TabBtn active={activeTab === 'BULK'} onClick={() => setActiveTab('BULK')} label="बैकअप" />
      </div>

      <div className="bg-white p-5 rounded-[36px] shadow-lg border-2 border-linen min-h-[300px]">
        {activeTab === 'VILLAGES' && (
          <div className="space-y-4">
             <div className="flex gap-2">
                <input type="text" value={newVillage} onChange={e => setNewVillage(e.target.value)} placeholder="नया गाँव" className="flex-1 bg-linen/20 p-3 rounded-2xl border border-linen outline-none text-navy font-black text-xs" />
                <button onClick={handleAddVillage} className="bg-brand text-white px-5 rounded-2xl font-black text-lg shadow-md active:scale-90">+</button>
             </div>
             <div className="max-h-60 overflow-y-auto no-scrollbar space-y-1.5">
                {villages.map(v => (
                  <div key={v.id} className="flex justify-between items-center bg-alice/10 p-3 rounded-xl border border-alice/50">
                    <span className="text-[11px] font-black text-navy">{v.name}</span>
                    <button onClick={() => { if(window.confirm('गाँव हटाएं?')) removeItem(VILLAGES_DB_PATH, v.id).then(refreshVillages); }} className="text-rose text-xs p-1">🗑️</button>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'MEMBERS' && (
          <div className="space-y-4">
             <div className="p-4 bg-alice/10 rounded-3xl border border-alice space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-brand">नया सदस्य जोड़ें</h4>
                <div className="grid grid-cols-2 gap-2">
                   <input type="text" placeholder="नाम" value={admMemName} onChange={e => setAdmMemName(e.target.value)} className="bg-white p-2.5 rounded-xl border border-linen text-[11px] font-black" />
                   <input type="text" placeholder="पिता/पति" value={admMemFather} onChange={e => setAdmMemFather(e.target.value)} className="bg-white p-2.5 rounded-xl border border-linen text-[11px] font-black" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <input type="tel" placeholder="मोबाइल" value={admMemMobile} onChange={e => setAdmMemMobile(e.target.value)} className="bg-white p-2.5 rounded-xl border border-linen text-[11px] font-black" />
                   <select value={admMemVillage} onChange={e => setAdmMemVillage(e.target.value)} className="bg-white p-2.5 rounded-xl border border-linen text-[11px] font-black">
                      <option value="">गाँव चुनें</option>
                      {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                   </select>
                </div>
                <button onClick={handleAdminAddMember} className="w-full bg-brand text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95">सुरक्षित करें</button>
             </div>
             <div className="flex justify-between items-center border-b border-linen pt-2 pb-1">
                <span className="text-[9px] font-black text-slate-400">कुल सदस्य: {members.length}</span>
                <button onClick={downloadExcel} className="text-[9px] bg-brand text-white px-3 py-1.5 rounded-lg font-black uppercase">Excel</button>
             </div>
             <div className="max-h-80 overflow-y-auto divide-y divide-linen/50 no-scrollbar">
                {members.map(m => (
                   <div key={m.id} className="py-2.5 flex justify-between items-center">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black text-navy truncate">{m.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{m.mobile} | {m.villageName}</p>
                      </div>
                      <button onClick={() => { if(window.confirm('सदस्य हटाएं?')) removeItem(MEMBERS_DB_PATH, m.id).then(refreshMembers); }} className="bg-rose/20 text-rose w-7 h-7 flex items-center justify-center rounded-lg font-black text-xs">✕</button>
                   </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'API' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="bg-alice/10 p-5 rounded-3xl border border-alice text-center">
                <h4 className="text-[11px] font-black uppercase text-brand mb-3">Google Gemini 3 AI सिंक</h4>
                <p className="text-[10px] text-navy font-bold leading-relaxed mb-6">
                  ऐप अब Google Search Grounding का उपयोग करता है। 'Live Sync' बटन दबाने पर AI इंटरनेट पर असली हिंदू पंचांग खोजकर उसे अपडेट करेगा।
                </p>
                <button onClick={handleSyncDailyContent} disabled={syncLoading} className="w-full bg-brand text-white py-5 rounded-2xl font-black text-[11px] uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3">
                  {syncLoading ? <span className="animate-spin text-xl">🔄</span> : <span>🌐 Live Sync पंचांग</span>}
                </button>
             </div>
             <div className="p-4 bg-linen/20 rounded-2xl border border-linen">
                <p className="text-[9px] font-bold text-slate-500 italic">
                  * नोट: अब आपको मैन्युअल API Key डालने की जरूरत नहीं है, यह ऑटोमैटिक काम करेगा।
                </p>
             </div>
          </div>
        )}

        {activeTab === 'BULLETIN' && (
          <div className="space-y-4">
             <textarea value={bulletinText} onChange={e => setBulletinText(e.target.value)} placeholder="सूचना यहाँ लिखें..." className="w-full bg-linen/20 p-4 rounded-2xl border border-linen h-32 outline-none text-navy font-black text-xs" />
             <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleUpdateBulletin(true)} className="bg-brand text-white p-3.5 rounded-2xl font-black text-[10px] uppercase shadow-md">लाइव करें</button>
                <button onClick={handleClearBulletin} className="bg-rose text-navy p-3.5 rounded-2xl font-black text-[10px] uppercase shadow-md">साफ़ करें</button>
             </div>
          </div>
        )}

        {activeTab === 'BULK' && (
          <div className="space-y-6">
            <div className="p-4 bg-alice/10 rounded-3xl border border-alice space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-brand">बल्क सदस्य अपलोड (CSV)</h4>
              <p className="text-[9px] text-slate-400 font-bold uppercase mb-2">फॉरमेट: नाम, पिता, मोबाइल, गाँव का नाम</p>
              <input 
                type="file" 
                accept=".csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-[10px] file:bg-brand file:text-white file:border-0 file:rounded-xl file:px-4 file:py-2 file:mr-4"
              />
              <button 
                onClick={handleBulkUpload} 
                disabled={loading || !selectedFile}
                className="w-full bg-brand text-white p-3.5 rounded-2xl font-black text-[10px] uppercase shadow-md disabled:opacity-50"
              >
                {loading ? 'अपलोड हो रहा है...' : 'डेटा अपलोड करें'}
              </button>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-brand px-1">डेटा बैकअप</h4>
              <button onClick={downloadExcel} className="w-full bg-linen text-navy p-3.5 rounded-2xl border-2 border-brand/10 font-black text-[10px] uppercase shadow-md">Excel बैकअप डाउनलोड करें</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TabBtn = ({ active, onClick, label }: any) => (
  <button onClick={onClick} className={`flex-1 px-2 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-tighter transition-all whitespace-nowrap active:scale-90 ${active ? 'bg-brand text-white shadow-md' : 'bg-linen/40 text-slate-400 border border-linen'}`}>{label}</button>
);

export default Admin;
