/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  Employee, AttendanceLog, Payslip, HrUser, FinanceRecord, 
  RecycleBinItem, DocumentFile, PayslipFormat, EmployeeHelpQuery 
} from '../types';
import { 
  ShieldCheck, Phone, Key, Lock, CheckCircle2, UserPlus, Users, 
  FileCheck, Calendar, DollarSign, Download, Plus, Trash2, Edit2, 
  MapPin, Eye, Camera, ShieldAlert, Award, FileText, ClipboardList, 
  TrendingUp, Settings, Trash, CheckCircle, Upload, HelpCircle
} from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import DocumentViewer from './DocumentViewer';
import { auth, db } from '../lib/firebase';
import { formatIndiaPhoneNumber, normalizeIndiaPhoneForFirebase, sanitizeIndiaMobileDigits } from '../lib/phoneHelper';
import { collection, addDoc, doc, updateDoc, onSnapshot, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

interface HrPortalProps {
  employees: Employee[];
  attendanceLogs: AttendanceLog[];
  payslips: Payslip[];
  payslipFormat: PayslipFormat;
  employeeQueries?: EmployeeHelpQuery[];
  onUpdateEmployeeQueries?: (newQueries: EmployeeHelpQuery[]) => void;
  onUpdatePayslipFormat: (format: PayslipFormat) => void;
  onUpdateEmployees: (newEmployees: Employee[]) => void;
  onUpdateAttendanceLogs: (newLogs: AttendanceLog[]) => void;
  onUpdatePayslips: (newPayslips: Payslip[]) => void;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  confirmDialog: (title: string, msg: string, onConfirm: () => void, confirmText?: string, isDanger?: boolean) => void;
  onSelectEmployee: (emp: Employee) => void; 
  isDirectorLoggedIn: boolean;
  setIsDirectorLoggedIn: (val: boolean) => void;
}

export default function HrPortal({
  employees,
  attendanceLogs,
  payslips,
  payslipFormat,
  employeeQueries = [],
  onUpdatePayslipFormat,
  onUpdateEmployees,
  onUpdateAttendanceLogs,
  onUpdatePayslips,
  toast,
  confirmDialog,
  onSelectEmployee,
  isDirectorLoggedIn,
  setIsDirectorLoggedIn
}: HrPortalProps) {
  
  const [gatewayMode, setGatewayMode] = useState<'employee' | 'hr' | 'director'>('employee');

  // --- HR Auth States ---
  const [hrUser, setHrUser] = useState<HrUser | null>(() => {
    const saved = localStorage.getItem('mspl_hr_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isHrLoggedIn, setIsHrLoggedIn] = useState(() => {
    return localStorage.getItem('mspl_hr_logged_in') === 'true';
  });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpStatus, setOtpStatus] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaRenderedRef = useRef(false);

  // --- Employee/Director States ---
  const [empSelectedId, setEmpSelectedId] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [directorPasscode, setDirectorPasscode] = useState('');
  const [registeredHrsList, setRegisteredHrsList] = useState<HrUser[]>([]);
  const [recycleBin, setRecycleBin] = useState<RecycleBinItem[]>([]);
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);

  // --- Tab States ---
  const [activeTab, setActiveTab] = useState<'employees' | 'verification' | 'attendance' | 'payroll' | 'helpdesk'>('employees');
  const [activeMDTab, setActiveMDTab] = useState<'overview' | 'attendance_edit' | 'hr_approval' | 'finances' | 'recycle_bin'>('overview');

  // --- Form States ---
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; type: string; data: string } | null>(null);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPass, setNewPass] = useState('');
  const [replyTexts, setReplyTexts] = useState<{[queryId: string]: string}>({});

  // Finance States
  const [showAddFinance, setShowAddFinance] = useState(false);
  const [finType, setFinType] = useState<'income' | 'debit' | 'investment' | 'expense'>('income');
  const [finTitle, setFinTitle] = useState('');
  const [finAmount, setFinAmount] = useState<number>(0);

  // --- Sync Effects ---
  useEffect(() => {
    const unsubHr = onSnapshot(collection(db, "hr_users"), (snap) => {
      setRegisteredHrsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as HrUser[]);
    });
    const unsubBin = onSnapshot(collection(db, "recycle_bin"), (snap) => {
      setRecycleBin(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RecycleBinItem[]);
    });
    const unsubFin = onSnapshot(collection(db, "finance_records"), (snap) => {
      setFinanceRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FinanceRecord[]);
    });
    return () => { unsubHr(); unsubBin(); unsubFin(); };
  }, []);

  // --- OTP Logic ---
  useEffect(() => {
    if (!(auth as any)?.app || !recaptchaContainerRef.current) return;
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, { size: 'invisible' });
    }
  }, []);

  const handleSendRealOtp = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // 1. First, check if the length is correct
    if (phoneInput.length !== 10) {
      toast('Enter a valid 10-digit mobile number.', 'error');
      return;
    }

    // 2. Format the number with +91 AFTER the check
    const phoneNumber = phoneInput.startsWith('+91') ? phoneInput : `+91${phoneInput}`;

    try {
      setIsSendingOtp(true);
      setOtpStatus('Initializing secure Firebase handshake...');
      
      // 3. Use the formatted 'phoneNumber' for the Firebase call
      const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifierRef.current!);
      
      setConfirmationResult(result);
      setOtpStatus(`OTP sent to ${phoneNumber}.`);
      toast('OTP Sent Successfully.', 'success');
    } catch (err: any) {
      setOtpStatus(`Error: ${err.message}`);
      toast('Failed to send OTP.', 'error');
    } finally {
      setIsSendingOtp(false);
    }
  }; // This closes handleSendRealOtp cleanly

  // --- Auth Handlers ---
  const handleEmployeeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = employees.find(emp => emp.id === empSelectedId);
    if (found && found.password === empPassword) {
      onSelectEmployee(found);
      toast(`Welcome ${found.name}`, 'success');
    } else {
      toast('Invalid Credentials', 'error');
    }
  };
  const handleLoginHr = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsVerifyingOtp(true);
      await confirmationResult.confirm(otpInput);
      const normalizedPhone = sanitizeIndiaMobileDigits(phoneInput);
      const foundHr = registeredHrsList.find(hr => hr.phoneNumber === normalizedPhone);
      
      if (foundHr && foundHr.password === passwordInput && foundHr.verified) {
        setHrUser(foundHr);
        setIsHrLoggedIn(true);
        localStorage.setItem('mspl_hr_logged_in', 'true');
        localStorage.setItem('mspl_hr_user', JSON.stringify(foundHr));
        toast('HR Portal Access Granted', 'success');
      } else {
        toast('HR Access Pending Approval or Invalid Pass', 'warning');
      }
    } catch (err) {
      toast('OTP Verification Failed', 'error');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleDirectorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (directorPasscode === 'MD-DIRECTOR-2026') {
      setIsDirectorLoggedIn(true);
      toast('Director Console Unlocked', 'success');
    } else {
      toast('Invalid Master Passcode', 'error');
    }
  };

  const handleLogoutHr = () => {
    setIsHrLoggedIn(false);
    localStorage.removeItem('mspl_hr_logged_in');
    setHrUser(null);
  };

  // --- HR Actions ---
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = sanitizeIndiaMobileDigits(newPhone);
    const newEmp: Employee = {
      id: newId.toUpperCase(),
      name: newName,
      phoneNumber: cleanPhone,
      password: newPass,
      status: 'approved',
      registeredAt: new Date().toLocaleDateString(),
      leaveBalance: { casual: 8, sick: 10, annual: 15 }
    };
    await setDoc(doc(db, "employees", newEmp.id), newEmp);
    toast('Staff Profile Created', 'success');
    setShowAddEmployee(false);
  };

  return (
    <div className="space-y-8 select-none">
      {/* 1. GATEWAY SELECTOR */}
      {!isHrLoggedIn && !isDirectorLoggedIn && (
        <div className="max-w-xl mx-auto py-8 text-center space-y-6">
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            {['employee', 'hr', 'director'].map(mode => (
              <button 
                key={mode} 
                onClick={() => setGatewayMode(mode as any)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${gatewayMode === mode ? 'bg-white shadow-sm' : 'text-slate-400'}`}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Login Forms based on gatewayMode */}
          {gatewayMode === 'employee' && (
            <form onSubmit={handleEmployeeLogin} className="p-8 bg-white dark:bg-slate-900 rounded-3xl border shadow-xl space-y-4 text-left">
              <h3 className="text-lg font-black uppercase">Staff Gateway</h3>
              <select 
                required 
                value={empSelectedId} 
                onChange={e => setEmpSelectedId(e.target.value)}
                className="w-full bg-slate-50 border p-3 rounded-xl font-bold"
              >
                <option value="">-- Select Identity --</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
              <input 
                type="password" 
                placeholder="Access Passcode" 
                value={empPassword} 
                onChange={e => setEmpPassword(e.target.value)} 
                className="w-full bg-slate-50 border p-3 rounded-xl"
              />
              <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Sign In</button>
            </form>
          )}

          {gatewayMode === 'hr' && (
            <form onSubmit={handleLoginHr} className="p-8 bg-white dark:bg-slate-900 rounded-3xl border shadow-xl space-y-4 text-left">
              <h3 className="text-lg font-black uppercase">HR Administrator OTP Login</h3>
              <div className="flex gap-2">
                <input 
                  type="tel" 
                  placeholder="10-digit mobile" 
                  value={phoneInput} 
                  onChange={e => setPhoneInput(sanitizeIndiaMobileDigits(e.target.value))}
                  className="flex-1 bg-slate-50 border p-3 rounded-xl"
                />
                <button type="button" onClick={handleSendRealOtp} className="px-4 bg-slate-200 rounded-xl text-xs font-bold">Send OTP</button>
              </div>
              <input 
                type="text" 
                placeholder="6-digit OTP" 
                value={otpInput} 
                onChange={e => setOtpInput(e.target.value)} 
                className="w-full bg-slate-50 border p-3 rounded-xl text-center tracking-widest font-bold"
              />
              <input 
                type="password" 
                placeholder="Private Password" 
                value={passwordInput} 
                onChange={e => setPasswordInput(e.target.value)} 
                className="w-full bg-slate-50 border p-3 rounded-xl"
              />
              <div id="recaptcha-container-hr" ref={recaptchaContainerRef}></div>
              <button disabled={isVerifyingOtp} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Verify & Login</button>
            </form>
          )}
        </div>
      )}

      {/* 2. HR WORKSPACE */}
      {isHrLoggedIn && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-5 rounded-2xl border">
            <h2 className="font-black uppercase">HR Console: Magnifiq Pvt. Ltd.</h2>
            <button onClick={handleLogoutHr} className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg">Logout</button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto">
            {['employees', 'verification', 'attendance', 'payroll'].map(t => (
              <button 
                key={t} 
                onClick={() => setActiveTab(t as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize ${activeTab === t ? 'bg-indigo-600 text-white' : 'bg-white border'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'employees' && (
            <div className="bg-white border rounded-2xl p-5">
               <button onClick={() => setShowAddEmployee(true)} className="mb-4 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs">+ Add Employee</button>
               {showAddEmployee && (
                 <form onSubmit={handleSaveEmployee} className="grid grid-cols-2 gap-4 border-b pb-4 mb-4">
                    <input placeholder="ID (MSPL-001)" value={newId} onChange={e => setNewId(e.target.value)} className="border p-2 rounded-lg" />
                    <input placeholder="Full Name" value={newName} onChange={e => setNewName(e.target.value)} className="border p-2 rounded-lg" />
                    <input placeholder="Phone" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="border p-2 rounded-lg" />
                    <input type="password" placeholder="Pass" value={newPass} onChange={e => setNewPass(e.target.value)} className="border p-2 rounded-lg" />
                    <button type="submit" className="col-span-2 bg-emerald-600 text-white py-2 rounded-xl">Save to Cloud</button>
                 </form>
               )}
               <table className="w-full text-left text-xs">
                 <thead className="bg-slate-50 uppercase font-bold text-slate-500">
                   <tr><th className="p-3">ID</th><th className="p-3">Name</th><th className="p-3">Status</th></tr>
                 </thead>
                 <tbody>
                   {employees.map(e => (
                     <tr key={e.id} className="border-b">
                       <td className="p-3 font-mono">{e.id}</td>
                       <td className="p-3 font-bold">{e.name}</td>
                       <td className="p-3"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">{e.status}</span></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          )}
        </div>
      )}

      {/* 3. DIRECTOR OVERRIDE */}
      {isDirectorLoggedIn && (activeMDTab === 'recycle_bin' && (
        <div className="p-5 bg-white border rounded-2xl space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-500">Cloud Destruction Vault</h3>
          {recycleBin.length === 0 ? (
            <p className="text-xs text-slate-400">Bin is empty.</p>
          ) : (
            <div className="divide-y border rounded-xl overflow-hidden">
              {recycleBin.map(item => (
                <div key={item.id} className="p-3 flex justify-between items-center text-xs">
                  <span>{item.title}</span>
                  <button onClick={async () => await deleteDoc(doc(db, "recycle_bin", item.id))} className="text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}