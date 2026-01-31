
import React, { useState, useMemo, useEffect } from 'react';
import { Village, Member, Bulletin } from '../types';

interface HomeProps {
  villages: Village[];
  members: Member[];
  bulletin: Bulletin | null;
  initialVillageId?: string | null;
  panchang?: string;
}

const Home: React.FC<HomeProps> = ({ villages, members, bulletin, initialVillageId, panchang }) => {
  const [selectedVillageId, setSelectedVillageId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    if (initialVillageId) {
      setSelectedVillageId(initialVillageId);
    }
  }, [initialVillageId]);

  const selectedVillage = useMemo(() => 
    villages.find(v => v.id === selectedVillageId), 
    [villages, selectedVillageId]
  );

  const filteredMembers = useMemo(() => {
    if (selectedVillageId === 'all' && !searchQuery.trim()) {
      return [];
    }
    let result = members;
    if (selectedVillageId !== 'all' && selectedVillage) {
      const targetName = selectedVillage.name.trim().toLowerCase();
      result = result.filter(m => {
        const idMatch = m.villageId === selectedVillageId;
        const nameMatch = m.villageName?.trim().toLowerCase() === targetName;
        return idMatch || nameMatch;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.mobile.includes(q) || 
        m.villageName?.toLowerCase().includes(q) ||
        m.fatherName?.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [members, selectedVillageId, selectedVillage, searchQuery]);

  const handleShareMember = (member: Member) => {
    const text = `*यादव समाज चौरासी*\nनाम: ${member.name}\nगाँव: ${member.villageName}\nमोबाइल: ${member.mobile}\nपिता/पति: ${member.fatherName}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Robust parser for Panchang strings
  const panchangDetails = useMemo(() => {
    if (!panchang || panchang === "लोड हो रहा है...") return { main: panchang || "लोड हो रहा है...", full: false };
    
    const lines = panchang.split('\n');
    const dateLine = lines.find(l => l.includes('तारीख:'))?.split('तारीख:')[1]?.trim() || "";
    const dayLine = lines.find(l => l.includes('वार:'))?.split('वार:')[1]?.trim() || "";
    const infoLine = lines.find(l => l.includes('पंचांग:'))?.split('पंचांग:')[1]?.trim() || "";
    const naksLine = lines.find(l => l.includes('नक्षत्र:'))?.split('नक्षत्र:')[1]?.trim() || "";
    
    if (dayLine || infoLine) {
      return {
        date: dateLine,
        day: dayLine,
        info: infoLine,
        nakshatra: naksLine,
        full: true
      };
    }
    
    return { main: panchang.split('\n')[0] || panchang, sub: panchang.split('\n')[1] || "", full: false };
  }, [panchang]);

  const isBrowsingList = (selectedVillageId !== 'all' || searchQuery.trim()) && filteredMembers.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {!isBrowsingList && (
        <div className="bg-white border-2 border-brand/10 p-5 rounded-[32px] shadow-lg relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 opacity-[0.05] text-8xl group-hover:scale-110 transition-transform">🕉️</div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex flex-col flex-1">
              <span className="text-[10px] font-black text-brand/40 uppercase tracking-[0.2em] mb-1.5">आज का शुभ पंचांग</span>
              
              {panchangDetails.full ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-brand">{panchangDetails.day}</span>
                    <span className="text-[11px] font-bold text-slate-400 bg-alice px-2 py-0.5 rounded-lg">{panchangDetails.date}</span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[13px] font-black text-navy leading-tight">
                      {panchangDetails.info}
                    </p>
                    {panchangDetails.nakshatra && (
                      <p className="text-[10px] font-bold text-slate-400 italic">नक्षत्र: {panchangDetails.nakshatra}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <span className="text-lg font-black text-brand block">{panchangDetails.main}</span>
                  {panchangDetails.sub && <span className="text-[11px] font-bold text-navy/60">{panchangDetails.sub}</span>}
                </div>
              )}
            </div>
            <div className="w-14 h-14 bg-alice rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-white shrink-0 ml-4">🗓️</div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-400 ml-3 uppercase tracking-widest">गाँव चुनें</label>
          <div className="relative">
            <select 
              value={selectedVillageId} 
              onChange={(e) => setSelectedVillageId(e.target.value)}
              className="w-full bg-white border-2 border-alice rounded-3xl p-5 text-navy font-black focus:ring-4 focus:ring-brand/10 shadow-sm appearance-none outline-none text-left"
            >
              <option value="all">-- गाँव का चयन करें --</option>
              {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-brand text-xs">▼</div>
          </div>
        </div>

        <div className="relative group">
          <input 
            type="text" 
            placeholder="नाम या मोबाइल से खोजें..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border-2 border-linen rounded-3xl p-5 pl-14 text-navy font-black focus:ring-4 focus:ring-brand/10 shadow-sm outline-none placeholder-slate-300 transition-all"
          />
          <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
      </div>

      {!isBrowsingList && bulletin && bulletin.active && bulletin.content && bulletin.content.trim() !== "" && (
        <div className="bg-aero border-2 border-aero/30 p-6 rounded-[36px] shadow-lg shadow-aero/20 mt-4 overflow-hidden relative">
          <div className="flex items-start gap-5 relative z-10">
            <span className="text-3xl animate-bounce">📢</span>
            <div className="flex-1">
              <h4 className="text-[10px] font-black text-navy/40 uppercase tracking-[0.2em] mb-1.5">महत्वपूर्ण सूचना</h4>
              <p className="text-[13px] font-black text-navy leading-relaxed">{bulletin.content}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 pb-20">
        {(selectedVillageId !== 'all' || searchQuery.trim()) ? (
          <>
            <div className="flex justify-between items-center px-4">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">खोज परिणाम: {filteredMembers.length}</h2>
              <span className="text-[9px] bg-brand text-white px-3 py-1 rounded-full font-black uppercase tracking-widest animate-pulse">सक्रिय</span>
            </div>
            
            {filteredMembers.length > 0 ? (
              filteredMembers.map(member => (
                <div key={member.id} className="bg-white p-5 rounded-[36px] shadow-sm border border-alice flex items-center gap-5 hover:shadow-xl hover:border-brand/20 transition-all active:scale-[0.97] group">
                  <div className="w-14 h-14 bg-alice text-brand rounded-[20px] flex items-center justify-center font-black text-xl shrink-0 shadow-inner group-hover:bg-brand group-hover:text-white transition-colors">
                    {member.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-navy text-[15px] truncate mb-0.5">{member.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold">पिता/पति: {member.fatherName}</p>
                    <span className="inline-block mt-1.5 text-[9px] bg-linen text-slate-600 px-3 py-1 rounded-lg font-black uppercase tracking-tighter border border-linenDark/20">{member.villageName}</span>
                  </div>
                  <div className="flex gap-2">
                    <a href={`tel:${member.mobile}`} className="bg-brand text-white w-10 h-10 rounded-2xl shadow-md active:scale-90 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    </a>
                    <button onClick={() => handleShareMember(member)} className="bg-[#25D366] text-white w-10 h-10 rounded-2xl shadow-md active:scale-90 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-16 text-center rounded-[48px] border-4 border-dotted border-alice flex flex-col items-center">
                <span className="text-5xl mb-4 opacity-10">🔎</span>
                <p className="text-slate-400 font-black text-xs uppercase tracking-[0.2em]">कोई परिणाम नहीं मिला</p>
              </div>
            )}
          </>
        ) : (
          <div className="p-10 text-center flex flex-col items-center opacity-40">
            <div className="w-20 h-20 bg-alice/30 rounded-full flex items-center justify-center mb-6 border border-alice shadow-inner">
               <span className="text-4xl grayscale">🏘️</span>
            </div>
            <p className="text-slate-400 font-black text-[11px] uppercase tracking-widest leading-loose">गाँव चुनकर या नाम से<br/><span className="text-brand">सदस्य सूची देखें।</span></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
