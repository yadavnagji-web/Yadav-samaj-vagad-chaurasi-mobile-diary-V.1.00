import React from 'react';

const Guide: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
      <div className="bg-white p-8 rounded-[40px] shadow-lg border-2 border-alice">
        <h2 className="text-2xl font-black text-brandDark mb-6 uppercase tracking-widest text-center">उपयोग मार्गदर्शिका</h2>
        
        <div className="space-y-6">
          <Section 
            num="1" 
            title="होम पेज" 
            desc="यहाँ आप पूरे चौरासी क्षेत्र के यादव समाज के सदस्यों को देख सकते हैं। गाँव के आधार पर या नाम/मोबाइल से खोजें।" 
          />
          <Section 
            num="2" 
            title="नया पंजीकरण" 
            desc="यदि आप समाज के सदस्य हैं और आपकी जानकारी दर्ज नहीं है, तो 'नया' बटन दबाएं। WhatsApp OTP द्वारा स्वयं को प्रमाणित करें।" 
          />
          <Section 
            num="3" 
            title="जानकारी सुधारें" 
            desc="अपनी दर्ज जानकारी बदलने के लिए 'सुधार' बटन दबाएं। यह केवल उसी पंजीकृत मोबाइल नंबर से संभव है।" 
          />
          <Section 
            num="4" 
            title="सुरक्षा एवं गोपनीयता" 
            desc="जानकारी हटाने या बदलने के लिए मोबाइल वेरिफिकेशन अनिवार्य है। यह आपकी गोपनीयता सुनिश्चित करता है।" 
          />
        </div>
      </div>

      <div className="bg-brand rounded-[40px] p-8 text-white shadow-xl shadow-brand/20">
        <h3 className="text-lg font-black mb-3 uppercase tracking-widest">तकनीकी सहयोग</h3>
        <p className="text-xs font-bold opacity-80 mb-6 leading-relaxed">यदि आपको ऐप उपयोग करने में कोई समस्या आ रही है या सुझाव देना चाहते हैं, तो कृपया संपर्क करें:</p>
        <div className="flex items-center gap-4 bg-white/10 p-4 rounded-3xl border border-white/20">
          <div className="bg-white text-brand p-4 rounded-2xl shadow-inner">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
          </div>
          <div>
            <p className="font-black text-sm">नगजी यादव, साकोदरा</p>
            <p className="text-[10px] font-bold opacity-70">9982151938</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Section = ({ num, title, desc }: any) => (
  <div className="flex gap-5">
    <div className="bg-alice text-brandDark w-10 h-10 rounded-2xl flex items-center justify-center font-black flex-shrink-0 shadow-inner">{num}</div>
    <div className="pt-1">
      <h4 className="font-black text-navy text-sm mb-1 uppercase tracking-tighter">{title}</h4>
      <p className="text-[11px] text-slate-500 font-bold leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default Guide;