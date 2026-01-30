import React, { useState, useEffect } from 'react';
import { Village, Member } from '../types';
import { findMemberByMobile, addItem, updateItem, removeItem } from '../services/firebase';
import { generateOTP, sendWhatsAppOTP } from '../services/otpService';
import { MEMBERS_DB_PATH, OTP_EXPIRY_SEC } from '../constants';

interface RegistrationProps {
  type: 'REGISTER' | 'UPDATE' | 'DELETE';
  villages: Village[];
  members: Member[];
  onComplete: () => void;
}

const Registration: React.FC<RegistrationProps> = ({ type, villages, members, onComplete }) => {
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState(''); 
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [timer, setTimer] = useState(0);
  const [existingMember, setExistingMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Registration Form States
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [villageId, setVillageId] = useState('');

  // Deletion Request States
  const [delName, setDelName] = useState('');
  const [delFather, setDelFather] = useState('');
  const [delVillageId, setDelVillageId] = useState('');
  const [delMobile, setDelMobile] = useState('');

  // Update specific states
  const [selVillageId, setSelVillageId] = useState('');
  const [filteredMems, setFilteredMems] = useState<Member[]>([]);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (selVillageId) {
      setFilteredMems(members.filter(m => m.villageId === selVillageId).sort((a,b) => a.name.localeCompare(b.name)));
    } else {
      setFilteredMems([]);
    }
  }, [selVillageId, members]);

  const isHindiStrict = (text: string) => {
    if (!text) return true;
    const hasEnglish = /[a-zA-Z]/.test(text);
    const isDevanagari = /^[\u0900-\u097F\s.]+$/.test(text);
    return !hasEnglish && isDevanagari;
  };

  const startRegistrationOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length !== 10) {
      setError('कृपया सही 10 अंकों का मोबाइल नंबर डालें');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const member = await findMemberByMobile(mobile);
      if (member) {
        setError('यह नंबर पहले से पंजीकृत है।');
        setLoading(false);
        return;
      }

      const newOtp = generateOTP();
      const sent = await sendWhatsAppOTP(mobile, newOtp);
      if (sent) {
        setGeneratedOtp(newOtp);
        setStep(2);
        setTimer(OTP_EXPIRY_SEC);
      } else {
        setError('OTP भेजने में समस्या हुई।');
      }
    } catch (err) {
      setError('सर्वर एरर।');
    } finally {
      setLoading(false);
    }
  };

  const startUpdateOTPFlow = (member: Member) => {
    setExistingMember(member);
    setStep(1.5); 
  };

  const handleNewMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length !== 10) {
      setError('कृपया सही 10 अंकों का मोबाइल नंबर डालें');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const alreadyExists = await findMemberByMobile(mobile);
      if (alreadyExists) {
        setError('यह नया नंबर पहले से किसी और के पास पंजीकृत है।');
        setLoading(false);
        return;
      }

      const newOtp = generateOTP();
      const sent = await sendWhatsAppOTP(mobile, newOtp);
      if (sent) {
        setGeneratedOtp(newOtp);
        setStep(2);
        setTimer(OTP_EXPIRY_SEC);
      } else {
        setError('OTP भेजने में समस्या हुई।');
      }
    } catch (err) {
      setError('सर्वर एरर।');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (otp === generatedOtp) {
      if (type === 'UPDATE' && existingMember) {
        setLoading(true);
        try {
          await updateItem(MEMBERS_DB_PATH, existingMember.id, { 
            mobile: mobile,
            updatedAt: Date.now()
          });
          alert('मोबाइल नंबर सफलतापूर्वक अपडेट हो गया है।');
          onComplete();
        } catch (err) {
          setError('अपडेट करने में त्रुटि हुई।');
        } finally {
          setLoading(false);
        }
      } else {
        setStep(3);
      }
    } else {
      setError('गलत OTP।');
    }
  };

  const handleRegisterFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !fatherName || !villageId) {
      setError('सभी जानकारी आवश्यक है।');
      return;
    }

    if (!isHindiStrict(name) || !isHindiStrict(fatherName)) {
      setError('नाम केवल हिंदी में लिखें।');
      return;
    }

    setLoading(true);
    const villageName = villages.find(v => v.id === villageId)?.name || '';
    
    const memberData = {
      name: name.trim(),
      fatherName: fatherName.trim(),
      mobile,
      villageId,
      villageName,
      updatedAt: Date.now()
    };

    try {
      await addItem(MEMBERS_DB_PATH, memberData);
      alert('सफलतापूर्वक पंजीकृत।');
      onComplete();
    } catch (err) {
      setError('त्रुटि।');
    } finally {
      setLoading(false);
    }
  };

  // 1. DELETE UI (Admin Contact Only)
  if (type === 'DELETE') {
    const selVillageName = villages.find(v => v.id === delVillageId)?.name || '';
    const waMessage = `नमस्ते एडमिन, मैं समाज की डायरी से अपनी जानकारी हटाना चाहता हूँ।\n\nनाम: ${delName}\nपिता/पति: ${delFather}\nगाँव: ${selVillageName}\nहटाया जाने वाला मोबाइल: ${delMobile}`;
    const waUrl = `https://wa.me/919982151938?text=${encodeURIComponent(waMessage)}`;

    return (
      <div className="bg-white p-8 rounded-[40px] shadow-2xl border-2 border-linen text-center space-y-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-rose rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner border-4 border-white">🗑️</div>
        <h2 className="text-xl font-black text-navy uppercase tracking-widest">जानकारी हटाना</h2>
        <div className="bg-alice/40 p-6 rounded-3xl border border-alice text-sm font-bold text-navy leading-relaxed">
          सुरक्षा कारणों से यूजर द्वारा स्वयं जानकारी हटाना बंद कर दिया गया है। 
          <br/><br/>
          यदि आप अपनी जानकारी हटाना चाहते हैं, तो कृपया नीचे अपना विवरण भरें और एडमिन को व्हाट्सएप करें:
        </div>

        <div className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">पूरा नाम</label>
            <input 
              type="text" 
              value={delName} 
              onChange={e => setDelName(e.target.value)} 
              className="w-full bg-linen/20 p-4 rounded-2xl border-2 border-linen font-black text-sm outline-none focus:border-brand/20 transition-all text-navy" 
              placeholder="आपका नाम लिखें"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">पिता / पति का नाम</label>
            <input 
              type="text" 
              value={delFather} 
              onChange={e => setDelFather(e.target.value)} 
              className="w-full bg-linen/20 p-4 rounded-2xl border-2 border-linen font-black text-sm outline-none focus:border-brand/20 transition-all text-navy" 
              placeholder="पिता/पति का नाम लिखें"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">हटाया जाने वाला मोबाइल नंबर</label>
            <input 
              type="tel" 
              maxLength={10}
              value={delMobile} 
              onChange={e => setDelMobile(e.target.value.replace(/\D/g, ''))} 
              className="w-full bg-linen/20 p-4 rounded-2xl border-2 border-linen font-black text-sm outline-none focus:border-brand/20 transition-all text-navy" 
              placeholder="00000 00000"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">गाँव चुनें</label>
            <select 
              value={delVillageId} 
              onChange={e => setDelVillageId(e.target.value)} 
              className="w-full bg-linen/20 p-4 rounded-2xl border-2 border-linen font-black text-sm outline-none focus:border-brand/20 transition-all text-navy appearance-none" 
            >
              <option value="">-- गाँव का चयन करें --</option>
              {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        </div>

        <a 
          href={waUrl} 
          target="_blank"
          className={`block w-full bg-[#25D366] text-white p-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all ${(!delName || !delFather || !delVillageId || !delMobile) ? 'opacity-50 pointer-events-none' : 'hover:bg-[#1ebd5e]'}`}
        >
          एडमिन को WhatsApp भेजें
        </a>
        {(!delName || !delFather || !delVillageId || !delMobile) && (
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">ऊपर दी गई सभी जानकारी भरना अनिवार्य है</p>
        )}
      </div>
    );
  }

  // 2. UPDATE Flow UI
  if (type === 'UPDATE') {
    return (
      <div className="bg-white p-8 rounded-[40px] shadow-2xl border-2 border-linen space-y-6">
        <h2 className="text-xl font-black text-brandDark text-center uppercase tracking-widest">नंबर अपडेट करें</h2>
        
        {error && <div className="bg-rose/40 text-red-600 p-4 rounded-2xl text-[10px] font-black border border-rose text-center">⚠️ {error}</div>}

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">गाँव का चयन करें</label>
              <select 
                value={selVillageId} 
                onChange={(e) => setSelVillageId(e.target.value)}
                className="w-full bg-alice/10 border-2 border-alice rounded-2xl p-4 text-navy font-black outline-none appearance-none"
              >
                <option value="">-- गाँव चुनें --</option>
                {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>

            {selVillageId && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">अपना नाम चुनें</label>
                <div className="max-h-64 overflow-y-auto no-scrollbar space-y-2 border-t border-linen pt-2">
                  {filteredMems.length > 0 ? filteredMems.map(m => (
                    <button 
                      key={m.id} 
                      onClick={() => startUpdateOTPFlow(m)}
                      className="w-full bg-alice/5 p-4 rounded-2xl border border-alice hover:bg-brand hover:text-white text-left transition-all active:scale-95"
                    >
                      <p className="font-black text-sm">{m.name}</p>
                      <p className="text-[10px] opacity-60 font-bold">पिता: {m.fatherName} | {m.mobile.replace(/.(?=.{4})/g, '*')}</p>
                    </button>
                  )) : (
                    <p className="text-center text-[10px] text-slate-400 font-black py-4 italic">इस गाँव में कोई सदस्य नहीं मिला</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1.5 && (
          <form onSubmit={handleNewMobileSubmit} className="space-y-6 animate-in slide-in-from-right">
             <div className="bg-alice/20 p-4 rounded-2xl border border-alice mb-4">
                <p className="text-[9px] font-black text-brand uppercase tracking-widest">चयनित सदस्य:</p>
                <p className="text-sm font-black text-navy">{existingMember?.name} (पिता: {existingMember?.fatherName})</p>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">नया मोबाइल नंबर दर्ज करें</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-brandDark font-black text-lg">+91</span>
                  <input 
                    type="tel" maxLength={10} required value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-alice/20 border-2 border-alice rounded-[28px] p-5 pl-16 text-navy font-black text-xl tracking-widest"
                    placeholder="00000 00000"
                  />
                </div>
             </div>
             <button type="submit" disabled={loading} className="w-full bg-brand text-white p-5 rounded-[28px] font-black shadow-xl tracking-widest uppercase text-sm active:scale-95">
                {loading ? 'प्रतीक्षा करें...' : 'OTP प्राप्त करें'}
             </button>
             <button type="button" onClick={() => setStep(1)} className="w-full text-slate-400 font-black text-[10px] uppercase">वापस सदस्य चुनें</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleOtpVerify} className="space-y-8 animate-in zoom-in">
            <div className="text-center space-y-2 bg-alice/20 p-4 rounded-3xl border border-alice">
              <p className="text-[10px] font-black text-navy italic">OTP नए नंबर पर भेजा गया है: +91 {mobile}</p>
              {timer > 0 && <p className="text-[10px] font-black text-brandDark">समय शेष: {timer}s</p>}
            </div>
            <input 
              type="tel" maxLength={6} required autoFocus value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-alice/30 border-4 border-brand/20 rounded-[32px] p-6 text-center text-4xl font-black tracking-[0.4em] text-brandDark outline-none focus:border-brand transition-colors"
              placeholder="000000"
            />
            <button type="submit" disabled={loading} className="w-full bg-brand text-white p-5 rounded-[28px] font-black shadow-xl tracking-widest uppercase text-sm">
              {loading ? 'वेरिफाई हो रहा है...' : 'नंबर अपडेट करें'}
            </button>
          </form>
        )}
      </div>
    );
  }

  // 3. REGISTER Flow UI (Default)
  return (
    <div className="bg-white p-8 rounded-[40px] shadow-2xl border-2 border-linen">
      <h2 className="text-xl font-black text-brandDark mb-8 text-center uppercase tracking-widest">नया पंजीकरण</h2>
      
      {error && <div className="bg-rose/40 text-red-600 p-4 rounded-2xl text-[10px] mb-6 font-black border border-rose text-center">⚠️ {error}</div>}

      {step === 1 && (
        <form onSubmit={startRegistrationOTP} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">सत्यापन हेतु मोबाइल नंबर</label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-brandDark font-black text-lg">+91</span>
              <input 
                type="tel" maxLength={10} required value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-alice/20 border-2 border-alice rounded-[28px] p-5 pl-16 text-navy font-black text-xl tracking-widest placeholder-slate-200"
                placeholder="00000 00000"
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-brand text-white p-5 rounded-[28px] font-black shadow-xl tracking-widest uppercase text-sm">
            {loading ? 'प्रतीक्षा करें...' : 'OTP कोड प्राप्त करें'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleOtpVerify} className="space-y-8">
          <div className="text-center space-y-2 bg-alice/20 p-4 rounded-3xl border border-alice">
            <p className="text-xs font-black text-navy italic">+91 {mobile}</p>
            {timer > 0 && <p className="text-[10px] font-black text-brandDark">समय शेष: {timer}s</p>}
          </div>
          <input 
            type="tel" maxLength={6} required autoFocus value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-alice/30 border-4 border-brand/20 rounded-[32px] p-6 text-center text-4xl font-black tracking-[0.4em] text-brandDark outline-none"
            placeholder="000000"
          />
          <button type="submit" className="w-full bg-brand text-white p-5 rounded-[28px] font-black shadow-xl tracking-widest uppercase text-sm">
            कोड सत्यापित करें
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleRegisterFinalSubmit} className="space-y-6 animate-in slide-in-from-bottom">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">पूरा नाम (हिंदी में)</label>
              <input type="text" required value={name} onChange={(e) => isHindiStrict(e.target.value) && setName(e.target.value)} className="w-full bg-linen/20 border-2 border-linen rounded-2xl p-4 text-navy font-black outline-none" placeholder="उदा. रमेश यादव" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">पिता/पति का नाम (हिंदी में)</label>
              <input type="text" required value={fatherName} onChange={(e) => isHindiStrict(e.target.value) && setFatherName(e.target.value)} className="w-full bg-linen/20 border-2 border-linen rounded-2xl p-4 text-navy font-black outline-none" placeholder="उदा. लालजी यादव" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">गाँव का चयन करें</label>
              <select required value={villageId} onChange={(e) => setVillageId(e.target.value)} className="w-full bg-linen/20 border-2 border-linen rounded-2xl p-4 text-navy font-black outline-none appearance-none">
                <option value="">-- गाँव चुनें --</option>
                {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-brand text-white p-5 rounded-[28px] font-black shadow-xl tracking-widest uppercase text-sm">
            {loading ? 'सुरक्षित हो रहा है...' : 'जानकारी सुरक्षित करें'}
          </button>
        </form>
      )}
    </div>
  );
};

export default Registration;