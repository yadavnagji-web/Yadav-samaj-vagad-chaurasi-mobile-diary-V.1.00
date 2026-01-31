
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
        setError('यह मोबाइल नंबर पहले से पंजीकृत है। कृपया "मोबाइल सुधारें" विकल्प का उपयोग करें।');
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
        setError('OTP भेजने में समस्या हुई। कृपया दोबारा प्रयास करें।');
      }
    } catch (err) {
      setError('नेटवर्क या सर्वर एरर।');
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
      setError('गलत OTP। कृपया दोबारा जाँचें।');
    }
  };

  const handleRegisterFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Trim only at the time of final submission to avoid IME issues during typing
    const finalName = name.trim();
    const finalFatherName = fatherName.trim();

    if (!finalName || !finalFatherName || !villageId) {
      setError('सभी जानकारी (नाम, पिता/पति और गाँव) भरना आवश्यक है।');
      return;
    }

    setLoading(true);
    const villageName = villages.find(v => v.id === villageId)?.name || '';
    
    const memberData = {
      name: finalName,
      fatherName: finalFatherName,
      mobile: mobile,
      villageId: villageId,
      villageName: villageName,
      updatedAt: Date.now()
    };

    try {
      const result = await addItem(MEMBERS_DB_PATH, memberData);
      if (result) {
        alert('बधाई हो! आपका पंजीकरण सफलतापूर्वक हो गया है।');
        onComplete();
      } else {
        throw new Error("Failed to get response name");
      }
    } catch (err) {
      setError('डाटा सुरक्षित करने में तकनीकी समस्या हुई। कृपया बाद में प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  if (type === 'DELETE') {
    const selVillageName = villages.find(v => v.id === delVillageId)?.name || '';
    const waMessage = `नमस्ते एडमिन, मैं समाज की डायरी से अपनी जानकारी हटाना चाहता हूँ।\n\nनाम: ${delName}\nपिता/पति: ${delFather}\nगाँव: ${selVillageName}\nहटाया जाने वाला मोबाइल: ${delMobile}`;
    const waUrl = `https://wa.me/919982151938?text=${encodeURIComponent(waMessage)}`;

    return (
      <div className="bg-white p-8 rounded-[40px] shadow-2xl border-2 border-linen text-center space-y-6 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-rose rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner border-4 border-white">🗑️</div>
        <h2 className="text-xl font-black text-navy uppercase tracking-widest">जानकारी हटाना</h2>
        <div className="bg-alice/40 p-6 rounded-3xl border border-alice text-sm font-bold text-navy leading-relaxed text-left">
          यदि आप अपनी जानकारी हटाना चाहते हैं, तो कृपया नीचे दिए गए फॉर्म में अपना विवरण भरें और WhatsApp बटन पर क्लिक करें।
        </div>

        <div className="space-y-4 text-left">
          <input type="text" spellCheck={false} autoComplete="off" autoCorrect="off" value={delName} onChange={e => setDelName(e.target.value)} className="w-full bg-linen/20 p-4 rounded-2xl border-2 border-linen font-black text-sm outline-none text-navy" placeholder="आपका पूरा नाम" />
          <input type="text" spellCheck={false} autoComplete="off" autoCorrect="off" value={delFather} onChange={e => setDelFather(e.target.value)} className="w-full bg-linen/20 p-4 rounded-2xl border-2 border-linen font-black text-sm outline-none text-navy" placeholder="पिता/पति का नाम" />
          <input type="tel" maxLength={10} value={delMobile} onChange={e => setDelMobile(e.target.value.replace(/\D/g, ''))} className="w-full bg-linen/20 p-4 rounded-2xl border-2 border-linen font-black text-sm outline-none text-navy" placeholder="मोबाइल नंबर" />
          <select value={delVillageId} onChange={e => setDelVillageId(e.target.value)} className="w-full bg-linen/20 p-4 rounded-2xl border-2 border-linen font-black text-sm outline-none text-navy appearance-none">
            <option value="">-- गाँव चुनें --</option>
            {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        <a href={waUrl} target="_blank" className={`block w-full bg-[#25D366] text-white p-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all ${(!delName || !delFather || !delVillageId || !delMobile) ? 'opacity-50 pointer-events-none' : ''}`}>एडमिन को WhatsApp भेजें</a>
      </div>
    );
  }

  if (type === 'UPDATE') {
    return (
      <div className="bg-white p-8 rounded-[40px] shadow-2xl border-2 border-linen space-y-6">
        <h2 className="text-xl font-black text-brandDark text-center uppercase tracking-widest">नंबर अपडेट करें</h2>
        {error && <div className="bg-rose/40 text-red-600 p-4 rounded-2xl text-[10px] font-black border border-rose text-center">⚠️ {error}</div>}

        {step === 1 && (
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 ml-3 uppercase tracking-widest">पहले अपना गाँव चुनें</label>
            <select value={selVillageId} onChange={(e) => setSelVillageId(e.target.value)} className="w-full bg-alice/10 border-2 border-alice rounded-2xl p-4 text-navy font-black outline-none appearance-none">
              <option value="">-- गाँव चुनें --</option>
              {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            {selVillageId && (
              <div className="max-h-64 overflow-y-auto no-scrollbar space-y-2 border-t border-linen pt-2 mt-2">
                <p className="text-[9px] font-black text-slate-400 mb-2 uppercase text-center">अपना नाम चुनें:</p>
                {filteredMems.map(m => (
                  <button key={m.id} onClick={() => startUpdateOTPFlow(m)} className="w-full bg-white p-4 rounded-2xl border border-alice hover:bg-brand hover:text-white text-left transition-all active:scale-95 group shadow-sm">
                    <p className="font-black text-sm text-navy group-hover:text-white">{m.name}</p>
                    <p className="text-[10px] opacity-60 font-bold group-hover:text-white/80">पिता/पति: {m.fatherName}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 1.5 && (
          <form onSubmit={handleNewMobileSubmit} className="space-y-6">
             <div className="bg-alice/20 p-4 rounded-2xl border border-alice text-center">
                <p className="text-sm font-black text-navy">{existingMember?.name}</p>
                <p className="text-[10px] text-slate-500 font-bold">पिता/पति: {existingMember?.fatherName}</p>
             </div>
             <p className="text-[10px] font-black text-brandDark uppercase text-center">नया मोबाइल नंबर दर्ज करें:</p>
             <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-brandDark font-black text-lg">+91</span>
                <input type="tel" maxLength={10} required value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} className="w-full bg-alice/20 border-2 border-alice rounded-[28px] p-5 pl-16 text-navy font-black text-xl tracking-widest outline-none" placeholder="00000 00000" />
             </div>
             <button type="submit" disabled={loading} className="w-full bg-brand text-white p-5 rounded-[28px] font-black shadow-xl tracking-widest uppercase text-sm active:scale-95 transition-all">{loading ? 'OTP भेज रहे हैं...' : 'OTP प्राप्त करें'}</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleOtpVerify} className="space-y-8">
            <p className="text-[10px] font-black text-slate-400 uppercase text-center">WhatsApp पर भेजा गया 6-अंकों का कोड:</p>
            <input type="tel" maxLength={6} required autoFocus value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="w-full bg-alice/30 border-4 border-brand/20 rounded-[32px] p-6 text-center text-4xl font-black tracking-[0.4em] text-brandDark outline-none" placeholder="000000" />
            <div className="text-center text-[10px] font-bold text-slate-400">समय शेष: {Math.floor(timer/60)}:{(timer%60).toString().padStart(2, '0')}</div>
            <button type="submit" disabled={loading} className="w-full bg-brand text-white p-5 rounded-[28px] font-black shadow-xl tracking-widest uppercase text-sm active:scale-95">{loading ? 'चेक कर रहे हैं...' : 'नंबर अपडेट करें'}</button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-[40px] shadow-2xl border-2 border-linen">
      <h2 className="text-xl font-black text-brandDark mb-8 text-center uppercase tracking-widest">नया पंजीकरण</h2>
      {error && <div className="bg-rose/40 text-red-600 p-4 rounded-2xl text-[10px] mb-6 font-black border border-rose text-center">⚠️ {error}</div>}

      {step === 1 && (
        <form onSubmit={startRegistrationOTP} className="space-y-6">
          <p className="text-[11px] font-black text-slate-400 uppercase text-center leading-relaxed">अपना 10-अंकों का मोबाइल नंबर दर्ज करें जिस पर आप WhatsApp OTP प्राप्त कर सकें।</p>
          <div className="relative">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-brandDark font-black text-lg">+91</span>
            <input type="tel" maxLength={10} required value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))} className="w-full bg-alice/20 border-2 border-alice rounded-[28px] p-5 pl-16 text-navy font-black text-xl tracking-widest outline-none" placeholder="00000 00000" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-brand text-white p-5 rounded-[28px] font-black shadow-xl tracking-widest uppercase text-sm active:scale-95">{loading ? 'OTP भेज रहे हैं...' : 'OTP प्राप्त करें'}</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleOtpVerify} className="space-y-8">
          <p className="text-[10px] font-black text-slate-400 uppercase text-center">WhatsApp पर भेजा गया 6-अंकों का कोड:</p>
          <input type="tel" maxLength={6} required autoFocus value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} className="w-full bg-alice/30 border-4 border-brand/20 rounded-[32px] p-6 text-center text-4xl font-black tracking-[0.4em] text-brandDark outline-none" placeholder="000000" />
          <div className="text-center text-[10px] font-bold text-slate-400">समय शेष: {Math.floor(timer/60)}:{(timer%60).toString().padStart(2, '0')}</div>
          <button type="submit" className="w-full bg-brand text-white p-5 rounded-[28px] font-black shadow-xl tracking-widest uppercase text-sm active:scale-95">कोड सत्यापित करें</button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleRegisterFinalSubmit} className="space-y-6 animate-in slide-in-from-bottom">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 ml-3 uppercase tracking-widest">आपका पूरा नाम (हिंदी)</label>
            <input 
              type="text" 
              spellCheck={false} 
              autoComplete="off" 
              autoCorrect="off"
              required 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full bg-linen/20 border-2 border-linen rounded-2xl p-4 text-navy font-black outline-none" 
              placeholder="उदाहरण: राजेश यादव" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 ml-3 uppercase tracking-widest">पिता/पति का नाम (हिंदी)</label>
            <input 
              type="text" 
              spellCheck={false} 
              autoComplete="off" 
              autoCorrect="off"
              required 
              value={fatherName} 
              onChange={(e) => setFatherName(e.target.value)} 
              className="w-full bg-linen/20 border-2 border-linen rounded-2xl p-4 text-navy font-black outline-none" 
              placeholder="पिता या पति का नाम लिखें" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 ml-3 uppercase tracking-widest">अपना गाँव चुनें</label>
            <select required value={villageId} onChange={(e) => setVillageId(e.target.value)} className="w-full bg-linen/20 border-2 border-linen rounded-2xl p-4 text-navy font-black outline-none appearance-none">
              <option value="">-- गाँव चुनें --</option>
              {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-brand text-white p-5 rounded-[28px] font-black shadow-xl tracking-widest uppercase text-sm active:scale-95 transition-all">{loading ? 'सुरक्षित हो रहा है...' : 'जानकारी सुरक्षित करें'}</button>
        </form>
      )}
    </div>
  );
};

export default Registration;
