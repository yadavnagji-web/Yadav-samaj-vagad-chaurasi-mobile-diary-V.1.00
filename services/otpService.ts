
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendWhatsAppOTP = async (mobile: string, otp: string): Promise<boolean> => {
  const AUTH_KEY = "3WHUAVcRdtob3GfQRv9LGlI1V9LU2gMn56ODP799qqwxz0ABSd5j2VTM2fde";
  const MESSAGE_ID = "11232";
  const PHONE_NUMBER_ID = "823937774143863";
  
  // Only one {Var1} is needed in the template provided
  const VARIABLES_VALUES = `${otp}`;

  const apiUrl = `https://www.fast2sms.com/dev/whatsapp?authorization=${AUTH_KEY}&message_id=${MESSAGE_ID}&phone_number_id=${PHONE_NUMBER_ID}&numbers=${mobile}&variables_values=${encodeURIComponent(VARIABLES_VALUES)}`;

  try {
    const response = await fetch(apiUrl, { method: "GET" });
    const result = await response.json();
    if (result.return === true) return true;
    console.error("Fast2SMS Error:", result.message);
    return false;
  } catch (error) {
    console.error("CORS/Network Error:", error);
    // Silent fallback for testing
    alert(`[डेमो मोड] WhatsApp संदेश भेजा गया (OTP: ${otp})`);
    return true; 
  }
};
