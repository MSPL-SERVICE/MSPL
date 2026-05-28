/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';
import { sanitizeIndiaMobileDigits } from '../lib/phoneHelper';

export default function HrPortal({ employees, toast, isHrLoggedIn, setIsHrLoggedIn, isDirectorLoggedIn, setIsDirectorLoggedIn }: any) {
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpStatus, setOtpStatus] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Initialize reCAPTCHA correctly on mount
  useEffect(() => {
    if (!auth) return;
    
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { 
        size: 'invisible' 
      });
    }
    
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  const handleSendRealOtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    const cleanDigits = phoneInput.replace(/[^0-9]/g, ''); 
    const last10Digits = cleanDigits.slice(-10); 

    if (last10Digits.length !== 10) {
      toast('Enter a valid 10-digit mobile number.', 'error');
      return;
    }

    const phoneNumber = `+91${last10Digits}`;
    try {
      setIsSendingOtp(true);
      setOtpStatus('Connecting to Firebase...');
      
      // Ensure verifier is active
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
      }

      const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifierRef.current);
      setConfirmationResult(result);
      setOtpStatus(`OTP sent to ${phoneNumber}.`);
      toast('OTP Sent Successfully.', 'success');
    } catch (err: any) {
      console.error("FIREBASE ERROR DETAIL:", err);
      setOtpStatus(`Error: ${err.message}`);
      toast(`Code: ${err.code || 'UNKNOWN_ERROR'}`, 'error');
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <div className="space-y-8 p-6">
      <form className="p-8 bg-white rounded-3xl border shadow-xl space-y-4 text-left">
        <h3 className="text-lg font-black uppercase">HR Administrator Login</h3>
        <div className="flex gap-2">
          <input 
            type="tel" 
            placeholder="10-digit mobile" 
            value={phoneInput} 
            onChange={(e) => setPhoneInput(sanitizeIndiaMobileDigits(e.target.value))}
            className="flex-1 bg-slate-50 border p-3 rounded-xl"
          />
          <button 
            type="button" 
            onClick={handleSendRealOtp} 
            disabled={isSendingOtp}
            className="px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSendingOtp ? 'Sending...' : 'Send OTP'}
          </button>
        </div>

        {/* This ID is explicitly required by Firebase RecaptchaVerifier */}
        <div id="recaptcha-container"></div>

        <input
          type="text"
          placeholder="6-digit OTP" 
          value={otpInput} 
          onChange={(e) => setOtpInput(e.target.value)} 
          className="w-full bg-slate-50 border p-3 rounded-xl text-center font-bold"
        />
        <input 
          type="password" 
          placeholder="Private Password" 
          value={passwordInput} 
          onChange={(e) => setPasswordInput(e.target.value)} 
          className="w-full bg-slate-50 border p-3 rounded-xl"
        />
      </form>
      {otpStatus && <p className="text-xs text-slate-400 text-center">{otpStatus}</p>}
    </div>
  );
}