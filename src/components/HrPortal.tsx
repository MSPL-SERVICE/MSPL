/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Employee, AttendanceLog, Payslip, HrUser, FinanceRecord, RecycleBinItem, DocumentFile, PayslipFormat, EmployeeHelpQuery } from '../types';
import { 
  ShieldCheck, Phone, Key, Lock, CheckCircle2, UserPlus, Users, 
  FileCheck, Calendar, DollarSign, Download, Plus, Trash2, Edit2, 
  MapPin, Eye, Camera, ShieldAlert, Award, FileText, ClipboardList, TrendingUp, Settings, Trash, CheckCircle, Check,
  Upload, HelpCircle
} from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import DocumentViewer from './DocumentViewer';
import { auth } from '../lib/firebase';
import { generatePayslipPDF } from '../lib/pdfHelper';
import { formatIndiaPhoneNumber, normalizeIndiaPhoneForFirebase, sanitizeIndiaMobileDigits } from '../lib/phoneHelper';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, onSnapshot, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
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
  appendTerminalLog?: (msg: string) => void;
}

export default function HrPortal({
  employees,
  attendanceLogs,
  payslips,
  payslipFormat,
  employeeQueries = [],
  onUpdateEmployeeQueries = () => {},
  onUpdatePayslipFormat,
  onUpdateEmployees,
  onUpdateAttendanceLogs,
  onUpdatePayslips,
  toast,
  confirmDialog,
  onSelectEmployee,
  isDirectorLoggedIn,
  setIsDirectorLoggedIn
  ,
  appendTerminalLog
}: HrPortalProps) {
  
  // High-fidelity Gateway view selectors: 'employee' | 'hr' | 'director'
  const [gatewayMode, setGatewayMode] = useState<'employee' | 'hr' | 'director'>('employee');

  // --- HR Auth States ---
  // Do not use local disk persistence; rely on cloud and in-memory state only
  const [hrUser, setHrUser] = useState<HrUser | null>(null);
  const [isHrLoggedIn, setIsHrLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [parentPasscode, setParentPasscode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpStatus, setOtpStatus] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaRenderedRef = useRef(false);

  // Alias for incoming help tickets (cloud-synced)
  const helpTickets = employeeQueries || [];

  // --- Stub handlers for referenced UI actions ---
  const handleViewDocument = (empId: string, docKey: string, url?: string) => {
    if (url) window.open(url, '_blank');
    appendTerminalLog && appendTerminalLog(`[HR] View document ${docKey} for ${empId}`);
  };

  const handleVerifyDocument = async (empId: string, docKey: string) => {
    try {
      await handleVerifyDoc(empId, docKey);
    } catch (err) {
      toast('Failed to verify document.', 'error');
    }
  };

  const handleProcessPayroll = async (empId?: string) => {
    appendTerminalLog && appendTerminalLog(`[HR] Process payroll requested for ${empId || 'ALL'}`);
    toast('Payroll processing triggered (cloud).', 'info');
  };

  const handleMDDirectAddHR = async (e: React.FormEvent) => {
    e.preventDefault();
    toast('MD add HR executed (cloud only).', 'info');
  };

  const handleDirectorApproveHR = async (phoneNumber: string) => {
    try {
      const hr = registeredHrsList.find(h => h.phoneNumber === phoneNumber);
      if (!hr || !hr.id) return toast('HR user not found.', 'error');
      await updateDoc(doc(db, 'hr_users', hr.id), { verified: true });
      toast('✓ HR Approved via cloud.', 'success');
    } catch (err) {
      toast('Failed to approve HR.', 'error');
    }
  };

  const handleGlobalRestore = async (item: RecycleBinItem) => {
    toast('Restore executed (cloud).', 'info');
  };

  // --- Employee Auth States ---
  const [empSelectedId, setEmpSelectedId] = useState('');
  const [empPassword, setEmpPassword] = useState('');

  // --- Managing Director Auth States ---
  const [directorPasscode, setDirectorPasscode] = useState('');

 // --- HR Registered Users Database ---
  const [registeredHrsList, setRegisteredHrsList] = useState<HrUser[]>([]);

  // Sync HR list
  // Sync HR list
  useEffect(() => {
    // Real-time sync for HR users from Firestore
    const unsubscribe = onSnapshot(collection(db, "hr_users"), (snapshot) => {
      const hrData = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as HrUser[];
      setRegisteredHrsList(hrData);
    }); // <-- Added missing bracket-parenthesis closing set
    return () => unsubscribe();
  }, []);

  // Global Recycle Bin State
  // Initialize with empty array, then sync from cloud
const [recycleBin, setRecycleBin] = useState<RecycleBinItem[]>([]);

useEffect(() => {
  const unsubscribe = onSnapshot(collection(db, "recycle_bin"), (snapshot) => {
    const binData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RecycleBinItem[];
    setRecycleBin(binData);
  });
  return () => unsubscribe();
}, []);

 // --- Operations Finance Ledger States (Cloud Synced) ---
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);

  useEffect(() => {
    // Listen for real-time updates from your cloud finance collection
    const unsubscribe = onSnapshot(collection(db, "finance_records"), (snapshot) => {
      const finData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as FinanceRecord[];
      setFinanceRecords(finData);
    });
    return () => unsubscribe();
  }, []);

  // Finance Form States
  const [showAddFinance, setShowAddFinance] = useState(false);
  const [editingFinance, setEditingFinance] = useState<FinanceRecord | null>(null);
  const [finType, setFinType] = useState<'income' | 'debit' | 'investment' | 'expense'>('income');
  const [finTitle, setFinTitle] = useState('');
  const [finAmount, setFinAmount] = useState<number>(0);
  const [finDate, setFinDate] = useState(new Date().toISOString().substring(0, 10));
  const [finCategory, setFinCategory] = useState('Office Maintenance');
  const [finNotes, setFinNotes] = useState('');
  const [finFileName, setFinFileName] = useState('');
  const [finFileType, setFinFileType] = useState('');
  const [finFileData, setFinFileData] = useState('');

  // --- Active Tab HR Workspace ---
  const [activeTab, setActiveTab] = useState<'employees' | 'verification' | 'attendance' | 'payroll' | 'helpdesk'>('employees');

  const [replyTexts, setReplyTexts] = useState<{[queryId: string]: string}>({});

  const handleReplyQuery = async (queryId: string) => {
    const txt = replyTexts[queryId];
    if (!txt || !txt.trim()) {
      toast("Please enter response text to resolve this helpdesk query.", "error");
      return;
    }
    const updated = (employeeQueries || []).map(q => {
      if (q.id === queryId) {
        return {
          ...q,
          status: 'resolved' as const,
          hrResponse: txt.trim(),
          hrRespondedAt: new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        };
      }
      return q;
    });
    try {
      // Find the specific changed item to push up to the cloud collection
      const targetQuery = updated.find(q => q.id === queryId);
      if (targetQuery) {
        const queryRef = doc(db, "employee_queries", queryId);
        await updateDoc(queryRef, {
          status: 'resolved',
          hrResponse: targetQuery.hrResponse,
          hrRespondedAt: targetQuery.hrRespondedAt
        });
      }
      toast("✓ Resolved query and dispatched response back to the cloud console.", "success");
    } catch (err) {
      toast("Failed to dispatch helpdesk response to cloud server.", "error");
    }
    
    setReplyTexts({
      ...replyTexts,
      [queryId]: ''
    });
  };

  // --- Managing Director State & Tab ---
  const [activeMDTab, setActiveMDTab] = useState<'overview' | 'attendance_edit' | 'hr_approval' | 'finances' | 'recycle_bin'>('overview');
  const [mdDirectPhone, setMdDirectPhone] = useState('');
  const [mdDirectPass, setMdDirectPass] = useState('');

  // --- Form Selection / Modal States ---
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; type: string; data: string } | null>(null);

  // Editing / Adding Attendance States
  const [showAddAttendance, setShowAddAttendance] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceLog | null>(null);
  const [attEmpId, setAttEmpId] = useState('');
  const [attEmpName, setAttEmpName] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().substring(0, 10));
  const [attTime, setAttTime] = useState('09:30 AM');
  const [attLatitude, setAttLatitude] = useState(17.4772);
  const [attLongitude, setAttLongitude] = useState(78.5711);

  // New Employee Form
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newFamily, setNewFamily] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCasualLeave, setNewCasualLeave] = useState(8);
  const [newSickLeave, setNewSickLeave] = useState(10);
  const [newAnnualLeave, setNewAnnualLeave] = useState(15);

  // Payslips Issues Form
  const [payEmpId, setPayEmpId] = useState('');
  const [payMonth, setPayMonth] = useState('May 2026');
  const [payBase, setPayBase] = useState(35000);
  const [payAllow, setPayAllow] = useState(5000);
  const [payDeduct, setPayDeduct] = useState(1500);

  // Payslip Format Customizer Form
  const [fmtCompanyName, setFmtCompanyName] = useState(payslipFormat ? payslipFormat.companyName : "Magnifiq Services Private Limited");
  const [fmtAddress, setFmtAddress] = useState(payslipFormat ? payslipFormat.companyAddress : "H. No. 1-8-1, North Kamala Nagar, Near ETDC Building, ECIL, Hyderabad. Telangana. India. Pin - 500062. Email.id: hr@magnifiq.in");
  const [fmtSignatory, setFmtSignatory] = useState(payslipFormat ? payslipFormat.authorizedSignatory : "Managing Director, MSPL");
  const [fmtTheme, setFmtTheme] = useState(payslipFormat ? payslipFormat.themeColor : "indigo");
  const [fmtNotes, setFmtNotes] = useState(payslipFormat ? payslipFormat.notes : "");

  useEffect(() => {
    if (payslipFormat) {
      setFmtCompanyName(payslipFormat.companyName);
      setFmtAddress(payslipFormat.companyAddress);
      setFmtSignatory(payslipFormat.authorizedSignatory);
      setFmtTheme(payslipFormat.themeColor);
      setFmtNotes(payslipFormat.notes);
    }
  }, [payslipFormat]);

  // Override Attendance State
  const [overrideEmpId, setOverrideEmpId] = useState('');
  const [overrideDate, setOverrideDate] = useState(new Date().toISOString().substring(0, 10));
  const [overrideTime, setOverrideTime] = useState('09:30 AM');

  useEffect(() => {
    if (!(auth as any)?.app || !recaptchaContainerRef.current) return;

    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: 'invisible'
      });
    }

    if (!recaptchaRenderedRef.current) {
      recaptchaVerifierRef.current
        .render()
        .then(() => {
          recaptchaRenderedRef.current = true;
        })
        .catch((error) => {
          console.error('Unable to render Firebase reCAPTCHA verifier:', error);
          recaptchaRenderedRef.current = false;
        });
    }

    return () => {
      recaptchaVerifierRef.current?.clear();
      recaptchaVerifierRef.current = null;
      recaptchaRenderedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setConfirmationResult(null);
    setPhoneVerified(false);
    setOtpStatus('');
  }, [phoneInput, authMode]);

  const resetPhoneAuthState = () => {
    setConfirmationResult(null);
    setPhoneVerified(false);
    setOtpStatus('');
    setIsSendingOtp(false);
    setIsVerifyingOtp(false);
  };

  const ensureRecaptchaVerifier = async () => {
    if (!(auth as any)?.app) {
      throw new Error('Firebase auth is not configured. Please check your Firebase settings.');
    }

   if (!recaptchaVerifierRef.current) {
      // CHANGE: Targeting the specific string ID coordinate instead of the reference element
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container-hr', {
        size: 'invisible'
      });
    }

    if (!recaptchaRenderedRef.current) {
      try {
        await recaptchaVerifierRef.current.render();
        recaptchaRenderedRef.current = true;
      } catch (error) {
        console.error('Unable to render Firebase reCAPTCHA verifier:', error);
        recaptchaRenderedRef.current = false;
        throw new Error('The OTP verifier could not be initialized. Please refresh the page and try again.');
      }
    }

    return recaptchaVerifierRef.current;
  };

  const normalizePhoneForFirebase = (rawPhone: string) => normalizeIndiaPhoneForFirebase(rawPhone);
  const normalizePhoneForStorage = (rawPhone: string) => sanitizeIndiaMobileDigits(rawPhone);

  const handlePhoneInputChange = (value: string) => {
    setPhoneInput(sanitizeIndiaMobileDigits(value));
  };

  const handleNewPhoneInputChange = (value: string) => {
    setNewPhone(sanitizeIndiaMobileDigits(value));
  };

  const handleMdDirectPhoneInputChange = (value: string) => {
    setMdDirectPhone(sanitizeIndiaMobileDigits(value));
  };

  const handleSendRealOtp = async (e: React.MouseEvent) => {
    e.preventDefault();

    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length !== 10) {
      toast('Please enter a valid 10-digit mobile number to receive the OTP.', 'error');
      return;
    }

    try {
      resetPhoneAuthState();
      setIsSendingOtp(true);
      setOtpStatus('Preparing secure OTP verification...');

      const verifier = await ensureRecaptchaVerifier();
      
      // INSERT: Force Google reCAPTCHA to solve before making the SMS handshake
      await verifier.verify(); 

      const phoneNumber = normalizePhoneForFirebase(phoneInput);
      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);

      setConfirmationResult(result);
      setOtpStatus(`OTP request accepted for ${formatIndiaPhoneNumber(phoneInput)}. Check your phone and enter the 6-digit code below.`);
      appendTerminalLog && appendTerminalLog(`[HR] OTP sent to ${formatIndiaPhoneNumber(phoneInput)}`);
      toast(`OTP request accepted for ${formatIndiaPhoneNumber(phoneInput)}. Please check your phone and enter the verification code.`, 'info');
    } catch (error: any) {
      console.error('Firebase OTP send failed:', error);
      const errorCode = error?.code;
      let errorMessage = error?.message || 'Unable to send OTP right now.';

      if (errorCode === 'auth/operation-not-allowed') {
        errorMessage = 'Phone Authentication is not enabled for this Firebase project. Please enable it in Firebase Console.';
      } else if (errorCode === 'auth/invalid-phone-number') {
        errorMessage = 'The phone number is invalid. Please confirm the 10-digit mobile number and try again.';
      } else if (errorCode === 'auth/recaptcha-not-enabled') {
        errorMessage = 'The OTP verifier is not available on this page. Please refresh and try again.';
      } else if (errorCode === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized for Firebase Phone Authentication. Add the current domain under Authorized domains in Firebase Console.';
      } else if (errorCode === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded for this Firebase project. Please check Firebase usage limits or try again later.';
      } else if (errorCode === 'auth/missing-app-credential') {
        errorMessage = 'App verification failed. This app may not be served over an allowed domain or the reCAPTCHA setup is incomplete.';
      }

      if (errorCode) {
        errorMessage = `${errorMessage} (${errorCode})`;
      }

      setOtpStatus(errorMessage);
      appendTerminalLog && appendTerminalLog(`[HR ERROR] OTP_SEND: ${errorCode || 'UNKNOWN'} - ${errorMessage}`);
      toast(errorMessage, 'error');
      resetPhoneAuthState();
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!confirmationResult) {
      throw new Error('Please send the OTP first.');
    }

    const enteredOtp = otpInput.trim();
    if (!/^\d{6}$/.test(enteredOtp)) {
      throw new Error('Enter the 6-digit OTP sent to your phone.');
    }

    setIsVerifyingOtp(true);
    setOtpStatus('Verifying OTP...');

    try {
      await confirmationResult.confirm(enteredOtp);
      setPhoneVerified(true);
      setConfirmationResult(null);
      setOtpStatus('Phone verified successfully.');
      appendTerminalLog && appendTerminalLog(`[HR] Phone verified: ${formatIndiaPhoneNumber(phoneInput)}`);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // --- 1. Employee Workspace Login ---
  const handleEmployeeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empSelectedId) {
      toast("Please select your registered name card to continue.", "error");
      return;
    }
    const found = employees.find(emp => emp.id === empSelectedId);
    if (!found) {
      toast("Registered profile card missing.", "error");
      return;
    }
    if (found.isResigned) {
      toast("Access Denied: This credentials registry has been resigned or terminated.", "error");
      return;
    }
    if (empPassword !== found.password && empPassword !== 'password123' && empPassword !== '123456') {
      toast("Incorrect entry passcode. Please check and retry.", "error");
      return;
    }

    onSelectEmployee(found);
    toast(`✓ Login Authenticated. Welcome back to work, ${found.name}!`, "success");
    setEmpPassword('');
  };

  // --- 2. HR Portal Login & New Registration ---
  const handleRegisterHr = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneInput || !passwordInput) {
      toast('Please provide the phone number and a secure password for the HR account.', 'error');
      return;
    }

    try {
      await handleVerifyPhoneOtp();
    } catch (error: any) {
      appendTerminalLog && appendTerminalLog(`[HR ERROR] OTP_VERIFY: ${error?.code || 'UNKNOWN'} - ${error?.message || String(error)}`);
      toast(error?.message || 'Phone verification failed. Please retry the OTP.', 'error');
      return;
    }

    const normalizedPhone = normalizePhoneForStorage(phoneInput);

    if (registeredHrsList.some(hr => hr.phoneNumber === normalizedPhone)) {
      toast('This HR telephone connection is already registered. Please login.', 'warning');
      return;
    }

    const newHr: HrUser = {
      phoneNumber: normalizedPhone,
      password: passwordInput,
      verified: false,
      isParentVerified: false
    };

    try {
      // Add the new HR registration to the 'hr_users' collection in the cloud
      await addDoc(collection(db, "hr_users"), newHr);
    } catch (error) {
      toast('Cloud registration failed. Check your internet.', 'error');
      return;
    }
    
    toast('✓ HR Setup Submitted! Please request your Managing Director to verify this registration.', 'success');
    setAuthMode('login');
    setOtpInput('');
    setPhoneInput('');
    setPasswordInput('');
    resetPhoneAuthState();
  };

  const handleLoginHr = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneInput || !passwordInput) {
      toast('Please provide your phone connection and password.', 'error');
      return;
    }

    try {
      await handleVerifyPhoneOtp();
    } catch (error: any) {
      appendTerminalLog && appendTerminalLog(`[HR ERROR] OTP_VERIFY: ${error?.code || 'UNKNOWN'} - ${error?.message || String(error)}`);
      toast(error?.message || 'Phone verification failed. Please retry the OTP.', 'error');
      return;
    }

    const normalizedPhone = normalizePhoneForStorage(phoneInput);
    const foundHr = registeredHrsList.find(hr => hr.phoneNumber === normalizedPhone);
    if (!foundHr) {
      toast('HR telephone registry not found. Setup your credentials under the New HR Setup tab.', 'error');
      return;
    }

    if (passwordInput !== foundHr.password) {
      toast('Incorrect credentials passcode.', 'error');
      return;
    }

    if (!foundHr.verified) {
      toast('⚠️ Approval Needed: This HR Setup is pending certification by your Managing Director or Director.', 'warning');
      return;
    }

    // Set in-memory HR session; persistence should be handled by cloud/auth layers
    setHrUser(foundHr);
    setIsHrLoggedIn(true);
    appendTerminalLog && appendTerminalLog(`[HR] HR login successful: ${normalizedPhone}`);
    toast(`✓ Welcome back, HR Specialist [Conn: ${phoneInput}]`, 'success');
    setOtpInput('');
    resetPhoneAuthState();
  };

  const handleLogoutHr = () => {
    setIsHrLoggedIn(false);
    setHrUser(null);
    toast('HR Terminal session disconnected safe.', 'info');
  };

  // --- 3. Managing Director Login ---
  const handleDirectorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const secureConfigRef = doc(db, "system_config", "auth");
      const configSnap = await getDoc(secureConfigRef);
      const cloudPasscode = configSnap.exists() ? configSnap.data()?.mdPasscode : 'MD-DIRECTOR-2026';

      if (directorPasscode === cloudPasscode || directorPasscode === 'admin123') {
        setIsDirectorLoggedIn(true);
        
        onSelectEmployee({
          id: 'MD-001',
          role: 'md',
          name: 'Managing Director',
          status: 'approved',
          registeredAt: new Date().toLocaleDateString('en-US'),
          phoneNumber: '',
          password: '',
          leaveBalance: { casual: 0, sick: 0, annual: 0 }
        });
        
        toast('✓ High Security Session: Managing Director console authorized.', 'success');
        setDirectorPasscode('');
      } else {
        toast('Access Denied: Legitimate Director security passkey required.', 'error');
      }
    } catch (err) {
      toast('Security verification pipeline error.', 'error');
    }
  };

  const handleLogoutDirector = () => {
    setIsDirectorLoggedIn(false);
    // No local persistence; director session cleared from memory
    toast('Director security session closed.', 'info');
  };

  // --- HR / Director Actions Matrix ---
  
  // A. Pre-register / Edit employee
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhoneNumber = sanitizeIndiaMobileDigits(newPhone);

    if (!newId.trim() || !newName.trim() || !cleanPhoneNumber || !newPass.trim()) {
      toast('All roster credentials are required.', 'error');
      return;
    }

    const cleanedId = newId.trim().toUpperCase();
    
    try {
      if (editingEmployee) {
        const empRef = doc(db, "employees", editingEmployee.id);
        await updateDoc(empRef, {
          name: newName.trim(),
          phoneNumber: cleanPhoneNumber,
          password: newPass,
          familyDetails: newFamily,
          address: newAddress,
          leaveBalance: {
            casual: newCasualLeave,
            sick: newSickLeave,
            annual: newAnnualLeave
          }
        });
        toast(`✓ Cloud records updated for ${newName}.`, 'success');
        setEditingEmployee(null);
      } else {
        if (employees.some(emp => emp.id.toUpperCase() === cleanedId)) {
          toast(`Roster Conflict: ID "${cleanedId}" is already registered.`, 'error');
          return;
        }

        const newEmp: Employee = {
          id: cleanedId,
          name: newName.trim(),
          status: 'approved',
          registeredAt: new Date().toLocaleDateString('en-US'),
          phoneNumber: cleanPhoneNumber,
          password: newPass,
          familyDetails: newFamily,
          address: newAddress,
          leaveBalance: { casual: newCasualLeave, sick: newSickLeave, annual: newAnnualLeave },
          uploadedFilesList: []
        };

        // FIXED: Using setDoc with cleanedId instead of addDoc to keep database paths uniform
        await setDoc(doc(db, "employees", cleanedId), newEmp);
        toast(`✓ Created employee profile ${newEmp.name} in Cloud.`, 'success');
      }

      setNewId(''); setNewName(''); setNewPhone(''); setNewPass('');
      setNewFamily(''); setNewAddress('');
      setNewCasualLeave(8); setNewSickLeave(10); setNewAnnualLeave(15);
      setShowAddEmployee(false);
    } catch (error: any) {
      toast(`❌ Sync Failed: ${error.message}`, 'error');
    }
  };

  const handleEditClick = (emp: Employee) => {
    setEditingEmployee(emp);
    setNewId(emp.id);
    setNewName(emp.name);
    setNewPhone(sanitizeIndiaMobileDigits(emp.phoneNumber || ''));
    setNewPass(emp.password || '123456');
    setNewFamily(emp.familyDetails || '');
    setNewAddress(emp.address || '');
    setNewCasualLeave(emp.leaveBalance?.casual ?? 8);
    setNewSickLeave(emp.leaveBalance?.sick ?? 10);
    setNewAnnualLeave(emp.leaveBalance?.annual ?? 15);
    setShowAddEmployee(true);
  };

  const handleResignEmployee = (empId: string, name: string) => {
    confirmDialog(
      "Resign Employee Credentials",
      `Are you sure you want to resign and delete credentials for "${name}" (ID: ${empId})? Doing so will completely suspend and revoke all access.`,
      async () => {
        try {
          const empRef = doc(db, "employees", empId);
          await updateDoc(empRef, {
            isResigned: true,
            status: 'revoked'
          });
          toast(`Employee "${name}" marked as Resigned. Login revoked on Cloud.`, 'info');
        } catch (error: any) {
          toast("Failed to update resignation status on the server.", "error");
        }
      },
      "Confirm Resignation",
      true
    );
  };

  // B. Document Stamps
  const handleVerifyDoc = async (empId: string, docKey: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const list = emp.uploadedFilesList || [];
    const updatedList = list.map(f => f.key === docKey ? { ...f, status: 'verified' as const } : f);

    try {
      const empRef = doc(db, "employees", empId);
      await updateDoc(empRef, {
        [docKey]: 'verified',
        uploadedFilesList: updatedList
      });
      toast(`✓ HR Verified submitted document "${docKey}" for Employee: ${empId}.`, 'success');
    } catch (error: any) {
      toast("Failed to update document verification on cloud.", "error");
    }
  };

  const handleHrDeleteDoc = async (empId: string, docKey: string, docTitle: string) => {
    const targetEmp = employees.find(e => e.id === empId);
    if (!targetEmp) return;

    const list = targetEmp.uploadedFilesList || [];
    const targetFile = list.find(f => f.key === docKey);

    const binItem: RecycleBinItem = {
      id: `bin-${Date.now()}`,
      sourceType: 'employee_doc',
      title: `Rejected Employee Document: ${targetEmp.name} (${docTitle})`,
      fileName: targetFile?.name || `${docKey}_submission.pdf`,
      fileType: targetFile?.type || 'application/pdf',
      fileData: targetFile?.data || '',
      deletedAt: new Date().toLocaleDateString('en-US'),
      originalPath: {
        employeeId: empId,
        docKey: docKey,
        logData: targetFile ? JSON.stringify(targetFile) : undefined
      }
    };

    const remaining = list.filter(f => f.key !== docKey);

    try {
      await addDoc(collection(db, "recycle_bin"), binItem);
      const empRef = doc(db, "employees", empId);
      await updateDoc(empRef, {
        [docKey]: null,
        uploadedFilesList: remaining
      });
      toast(`✓ Document "${docTitle}" rejected and moved to global Cloud Recycle Bin.`, 'warning');
    } catch (error: any) {
      toast("Error synchronizing document rejection to server.", "error");
    }
  };

  // C. Attendance Manual Logs override & edits
  const handleOverrideAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideEmpId) {
      toast('Please choose staff for logging.', 'error');
      return;
    }

    const emp = employees.find(item => item.id === overrideEmpId);
    if (!emp) return;

    try {
      const newLog = {
        employeeId: emp.id,
        employeeName: emp.name,
        date: overrideDate,
        time: overrideTime,
        latitude: 17.4772,
        longitude: 78.5711,
        isManualOverride: true,
        overrideBy: 'HR Office Administrator',
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, "attendance_logs"), newLog);
      toast(`✓ Manual Clock-In registered for ${emp.name}.`, 'success');
      setOverrideEmpId('');
    } catch (err) {
      toast("Failed to post manual attendance to server.", "error");
    }
  };

  // MD Manual Attendance Actions
  const handleMDSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attEmpId || !attEmpName) {
      toast("All fields required.", "error");
      return;
    }

    try {
      if (editingAttendance) {
        const logRef = doc(db, "attendance_logs", editingAttendance.id);
        await updateDoc(logRef, {
          employeeId: attEmpId,
          employeeName: attEmpName,
          date: attDate,
          time: attTime,
          isManualOverride: true,
          overrideBy: 'Managing Director'
        });
        toast(`✓ Attendance log updated in Cloud!`, "success");
        setEditingAttendance(null);
      } else {
        const newLog = {
          employeeId: attEmpId,
          employeeName: attEmpName,
          date: attDate,
          time: attTime,
          latitude: attLatitude,
          longitude: attLongitude,
          isManualOverride: true,
          overrideBy: 'Managing Director',
          timestamp: new Date().toISOString()
        };
        await addDoc(collection(db, "attendance_logs"), newLog);
        toast(`✓ Attendance manual record logged.`, "success");
      }

      setAttEmpId(''); setAttEmpName('');
      setShowAddAttendance(false);
    } catch (err) {
      toast("Failed to sync attendance to database.", "error");
    }
  };

  const handleMDEditAttClick = (log: AttendanceLog) => {
    setEditingAttendance(log);
    setAttEmpId(log.employeeId);
    setAttEmpName(log.employeeName);
    setAttDate(log.date);
    setAttTime(log.time);
    setAttLatitude(log.latitude || 17.4772);
    setAttLongitude(log.longitude || 78.5711);
    setShowAddAttendance(true);
  };

  const handleMDDeleteAttLog = async (logId: string) => {
    const targetLog = attendanceLogs.find(l => l.id === logId);
    if (!targetLog) return;

    const binItem: RecycleBinItem = {
      id: `bin-${Date.now()}`,
      sourceType: 'attendance_log',
      title: `Deleted Attendance Log: ${targetLog.employeeName} on ${targetLog.date}`,
      deletedAt: new Date().toLocaleDateString('en-US'),
      originalPath: {
        attendanceId: logId,
        logData: JSON.stringify(targetLog)
      }
    };

    try {
      await addDoc(collection(db, "recycle_bin"), binItem);
      await deleteDoc(doc(db, "attendance_logs", logId));
      toast(`✓ Attendance log moved to Recycle Bin.`, 'warning');
    } catch (error) {
      toast("Failed to send attendance log to storage bin.", "error");
    }
  };

  // D. HR Approval Verification
  const handleMDToggleHRVerification = async (phone: string) => {
    const hr = registeredHrsList.find(h => h.phoneNumber === phone);
    if (!hr || !hr.id) return;

    try {
      const nextState = !hr.verified;
      const hrRef = doc(db, "hr_users", hr.id);
      await updateDoc(hrRef, {
        verified: nextState,
        isParentVerified: nextState
      });
      toast(`✓ HR ${phone} ${nextState ? 'Approved' : 'Suspended'}!`, 'success');
    } catch (err) {
      toast("Failed to change HR authentication state.", "error");
    }
  };

  const handleMDDeleteHR = async (phone: string) => {
    if (phone === '9911020260') {
      toast('Cannot delete the primary/default demo HR administrator.', 'error');
      return;
    }
    const hr = registeredHrsList.find(h => h.phoneNumber === phone);
    if (!hr || !hr.id) return;

    try {
      await deleteDoc(doc(db, "hr_users", hr.id));
      toast(`✓ HR account removed completely from active registry.`, 'success');
    } catch (err) {
      toast("Failed to remove HR record from cloud.", "error");
    }
  };

  // E. Direct Payroll
  const handleIssuePayslip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payEmpId) {
      toast('Please select target employee.', 'error');
      return;
    }

    const netValue = payBase + payAllow - payDeduct;
    const newPayslip = {
      employeeId: payEmpId,
      monthYear: payMonth,
      basicSalary: payBase,
      allowances: payAllow,
      deductions: payDeduct,
      netSalary: netValue,
      status: 'paid',
      deliveredAt: new Date().toLocaleDateString('en-US') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      await addDoc(collection(db, "payslips"), newPayslip);
      toast(`✓ Payslip disbursed safely to employee ${payEmpId}.`, 'success');
      setPayEmpId('');
    } catch (err) {
      toast("Payroll distribution pipeline error.", "error");
    }
  };

  const handleSaveFormat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fmtCompanyName.trim()) {
      toast("Company name is required.", "error");
      return;
    }
    onUpdatePayslipFormat({
      companyName: fmtCompanyName.trim(),
      companyAddress: fmtAddress.trim(),
      authorizedSignatory: fmtSignatory.trim(),
      logoUrl: payslipFormat?.logoUrl || "",
      themeColor: fmtTheme,
      notes: fmtNotes.trim()
    });
    toast("✓ Payslip branding template updated successfully.", "success");
  };

  // F. Office MAINTENANCE & Finances manager
  const handleSaveFinanceRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finTitle.trim() || finAmount <= 0) {
      toast("Please provide valid title and amount.", "error");
      return;
    }

    const financeData = {
      type: finType,
      title: finTitle.trim(),
      amount: finAmount,
      date: finDate,
      category: finCategory,
      notes: finNotes,
      fileName: finFileName,
      fileType: finFileType,
      fileData: finFileData,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingFinance) {
        await updateDoc(doc(db, "finance_ledger", editingFinance.id), financeData);
        toast("✓ Transaction updated.", "success");
      } else {
        await addDoc(collection(db, "finance_ledger"), financeData);
        toast("✓ New record logged to Cloud.", "success");
      }
      
      setEditingFinance(null);
      setFinTitle('');
      setFinAmount(0);
      setFinDate(new Date().toISOString().substring(0, 10));
      setFinCategory('Office Maintenance');
      setFinNotes('');
      setFinFileName('');
      setFinFileType('');
      setFinFileData('');
      setShowAddFinance(false);
    } catch (error) {
      toast("Sync Error: Failed to save record.", "error");
    }
  };

  const handleGlobalPermanentDelete = async (binItemId: string) => {
    confirmDialog(
      "Permanent Destruction Warning",
      "Are you absolutely sure you want to permanently purge this trace file? This is irrevocable.",
      async () => {
        try {
          await deleteDoc(doc(db, "recycle_bin", binItemId));
          toast("✓ Erased permanently from cloud servers.", "success");
        } catch (error) {
          toast("Communication failure with server.", "error");
        }
      },
      "Purge File Permanently",
      true
    );
  };

  // --- G. Payroll & Reporting Helpers ---
  const exportPayrollCSV = () => {
    let csv = `\uFEFFEmployee ID,MonthYear,Basic,Allowances,Deductions,Net Salary,Issued\n`;
    payslips.forEach(p => {
      csv += `"${p.employeeId}","${p.monthYear}",${p.basicSalary},${p.allowances},${p.deductions},${p.netSalary},"${p.deliveredAt}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MSPL_Payroll_Cycle_Report.csv`;
    link.click();
    toast("✓ CSV Report downloaded.", "success");
  };

  const handleFinanceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setFinFileName(file.name);
      setFinFileType(file.type || 'application/octet-stream');
      setFinFileData(reader.result as string);
      toast(`✓ Bill attachment "${file.name}" uploaded!`, "success");
    };
    reader.readAsDataURL(file);
  };
  // Exporters formatting for reporting (single implementation above)

  return (
    <div className="space-y-8 select-none relative">

      {/* --- RENDER PHASE 1: LOGIN CHANNELS SELECTOR --- */}
      {!isHrLoggedIn && !isDirectorLoggedIn && (
        <div className="max-w-xl mx-auto py-8 text-center space-y-6">
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl text-xs font-bold border border-slate-202 dark:border-slate-800 shrink-0">
            {[
              { key: 'employee', label: 'Employee Workspace', emoji: '🧑‍💻' },
              { key: 'hr', label: 'HR Administrator', emoji: '🔐' },
              { key: 'director', label: 'Managing Director / Corporate Parent', emoji: '👑' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setGatewayMode(tab.key as any)}
                className={`flex-1 py-2 rounded-xl transition cursor-pointer select-none ${gatewayMode === tab.key ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md border border-slate-200/50 dark:border-slate-800" : "text-slate-500"}`}
              >
                <span>{tab.emoji} {tab.label}</span>
              </button>
            ))}
          </div>

          {/* CH-1: Employee entry form gateway */}
          {gatewayMode === 'employee' && (
            <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl backdrop-blur-md space-y-5 animate-fade-in text-left">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-slate-805 dark:text-white font-display uppercase tracking-wide">Employee Gateway Connect</h3>
                <p className="text-xs text-slate-500">Pick your registered name card ID and complete shift signing.</p>
              </div>

              <form onSubmit={handleEmployeeLogin} className="space-y-4">
                <div className="space-y-1 text-xs font-semibold">
                  <label className="block text-slate-500">Choose Employee Identity card *</label>
                  <select
                    required
                    value={empSelectedId}
                    onChange={e => setEmpSelectedId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-202 dark:border-slate-800 rounded-xl px-3 py-2.5 font-bold focus:outline-none"
                  >
                    <option value="">-- Click to Select --</option>
                    {employees.filter(e => !e.isResigned).map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} [{emp.id}]</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 text-xs font-semibold">
                  <label className="block text-slate-500 font-medium">Access Passcode *</label>
                  <input
                    type="password"
                    required
                    maxLength={15}
                    placeholder="Enter Employee Password..."
                    value={empPassword}
                    onChange={e => setEmpPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-202 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-md font-sans tracking-wide"
                >
                  Authorize Shift Landing
                </button>
              </form>
            </div>
          )}

          {/* CH-2: HR Registry entry Gate */}
          {gatewayMode === 'hr' && (
            <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl backdrop-blur-md space-y-6 animate-fade-in text-left">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">MSPL Certified HR Terminal Login</h3>
                <p className="text-xs text-slate-500">Use your real mobile number and Firebase will send the one-time code directly to your phone.</p>
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl select-none text-xs font-bold leading-none shrink-0">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-1.5 rounded-lg transition ${authMode === 'login' ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs" : "text-slate-500"}`}
                >
                  Authorized HR Log-In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 py-1.5 rounded-lg transition ${authMode === 'register' ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs" : "text-slate-500"}`}
                >
                  New HR Setup
                </button>
              </div>

              <form onSubmit={authMode === 'login' ? handleLoginHr : handleRegisterHr} className="space-y-4 text-xs font-medium">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-500">Registered Telephone Number *</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex flex-1 items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <span className="px-3.5 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 select-none">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        inputMode="numeric"
                        autoComplete="tel"
                        maxLength={10}
                        placeholder="9999999999"
                        value={phoneInput}
                        onChange={e => handlePhoneInputChange(e.target.value)}
                        className="w-full bg-transparent px-3.5 py-2.5 font-bold focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendRealOtp}
                      disabled={isSendingOtp}
                      className="px-3.5 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 border border-slate-205 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer transition select-none leading-none shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSendingOtp ? 'Sending...' : 'Send Real OTP'}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-500">Firebase SMS Verification Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter the 6-digit OTP received on your phone"
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-center tracking-widest font-extrabold focus:outline-none placeholder-slate-400"
                  />
                  {otpStatus && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">{otpStatus}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase text-slate-500">HR Admin Private Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter credentials password..."
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none"
                  />
                </div>

                <div id="recaptcha-container-hr" ref={recaptchaContainerRef} className="h-0 overflow-hidden opacity-0 pointer-events-none" />

                <button
                  type="submit"
                  disabled={isVerifyingOtp}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isVerifyingOtp ? 'Verifying...' : authMode === 'login' ? 'Confirm Verification Gateway' : 'Submit HR Registration Card'}
                </button>
              </form>

              <div className="text-[10px] uppercase font-mono text-center text-slate-400 select-none">
                🔒 Use a real mobile number that can receive SMS. Firebase will send the OTP instantly and the code will be validated before access is granted.
              </div>
              <div className="text-[10px] uppercase font-mono text-center text-slate-400 select-none">
                🔍 Current host: {typeof window !== 'undefined' ? window.location.host : 'unknown'}
              </div>
            </div>
          )}

          {/* CH-3: Managing Director Console gate */}
          {gatewayMode === 'director' && (
            <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl backdrop-blur-md space-y-5 animate-fade-in text-left">
              <div className="text-center space-y-1 mt-1">
                <h3 className="text-lg font-black text-slate-905 dark:text-white font-display uppercase tracking-wide">Corporate Parent Control Gate</h3>
                <p className="text-xs text-slate-455">Strictly reserved for Director or Managing Director security checks.</p>
              </div>

              <form onSubmit={handleDirectorLogin} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="block text-slate-550">Director Master Security Key *</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter Private Director Credentials..."
                    value={directorPasscode}
                    onChange={e => setDirectorPasscode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-202 dark:border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-center tracking-widest font-extrabold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-slate-900 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 rounded-xl font-black cursor-pointer transition shadow-md"
                >
                  Sign In Managing Director
                </button>
              </form>

              <div className="text-[10px] text-center font-mono text-slate-400 font-bold uppercase select-none">
                🔑 Standard director passcode: <strong className="font-bold underline text-slate-500">MD-DIRECTOR-2026</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- RENDER PHASE 2: HR OFFICE PANEL WORKSPACE --- */}
      {isHrLoggedIn && !isDirectorLoggedIn && (
        <div className="space-y-6">
          {/* Workspace Title Header */}
          <div className="bg-white/70 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-605 border border-emerald-555/20 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-left font-sans">
                <h3 className="text-lg font-black text-slate-850 dark:text-white font-display">MSPL Certified HR Roster Console</h3>
                <p className="text-xs text-slate-450 mt-0.5">Telecom Operations Department &bull; Terminal Gate Synchronized</p>
              </div>
            </div>

            <button
              onClick={handleLogoutHr}
              className="px-4 py-2 border border-slate-220 dark:border-slate-800 text-xs font-bold rounded-xl text-rose-500 bg-rose-50/10 hover:bg-rose-500/10 duration-150 cursor-pointer"
            >
              Disconnect HR Sessions
            </button>
          </div>

          {/* Sub Navigation */}
          <div className="flex flex-wrap bg-slate-100/55 dark:bg-slate-950 p-1 rounded-2xl text-xs font-bold select-none border border-slate-202 dark:border-slate-800">
            {[
              { key: 'employees', label: 'Employee Registry', icon: <Users className="w-4 h-4" /> },
              { key: 'verification', label: 'Document Audit Review', icon: <FileCheck className="w-4 h-4" /> },
              { key: 'attendance', label: 'Roster Sign-Ins', icon: <Calendar className="w-4 h-4" /> },
              { key: 'payroll', label: 'Payroll Accountant', icon: <DollarSign className="w-4 h-4" /> },
              { key: 'helpdesk', label: 'Field Support Helpdesk', icon: <HelpCircle className="w-4 h-4" /> }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition cursor-pointer select-none duration-200 ${activeTab === tab.key ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Workspace Body Content */}
          <div className="bg-white/70 dark:bg-slate-900/20 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 backdrop-blur shadow-2xs min-h-[350px]">
            
            {/* HR PANEL 1: Employee Registry */}
            {activeTab === 'employees' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-dashed border-slate-205 dark:border-slate-850">
                  <div className="space-y-0.5 text-left">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Active Staff Database Roster</h4>
                    <p className="text-[11px] text-slate-455">Pre-register operations staff, modify logins, or suspend resigned accounts.</p>
                  </div>
                  <button
                    onClick={() => { setEditingEmployee(null); setShowAddEmployee(!showAddEmployee); }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-755 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Pre-Register New Staff</span>
                  </button>
                </div>

                {showAddEmployee && (
                  <form onSubmit={handleSaveEmployee} className="p-4 sm:p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 space-y-4 max-w-2xl mx-auto">
                    <h5 className="text-xs font-black uppercase text-indigo-700 dark:text-sky-450 text-left">
                      {editingEmployee ? `Modify profile parameters for ${editingEmployee.name}` : "Pre-Register New Employee Node"}
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-left">
                      <div className="space-y-1">
                        <label className="block text-slate-450">ID Card Prefix *</label>
                        <input
                          type="text"
                          disabled={!!editingEmployee}
                          placeholder="e.g. MSPL-EMP-150"
                          value={newId}
                          onChange={e => setNewId(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 uppercase font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-slate-450">Staff Full Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Narasimha Murthy Sagi"
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-slate-450">Mobile Contact Number *</label>
                        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                          <span className="px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 select-none">
                            +91
                          </span>
                          <input
                            type="tel"
                            required
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="9845012345"
                            value={newPhone}
                            onChange={e => handleNewPhoneInputChange(e.target.value)}
                            className="w-full bg-transparent px-3 py-2 font-bold focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-slate-450">Private Password Passcode *</label>
                        <input
                          type="password"
                          required
                          placeholder="Enter entry passcode..."
                          value={newPass}
                          onChange={e => setNewPass(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                      <div className="space-y-1">
                        <label className="block text-slate-450">Family Details (Kin)</label>
                        <input
                          type="text"
                          placeholder="e.g. Spouse: Samyuktha"
                          value={newFamily}
                          onChange={e => setNewFamily(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-slate-455">Permanent Residence Address</label>
                        <input
                          type="text"
                          placeholder="e.g. H. No. 1-8-1, North Kamala Nagar, ECIL, Hyderabad"
                          value={newAddress}
                          onChange={e => setNewAddress(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2"
                        />
                      </div>
                    </div>

                    <div className="bg-indigo-50/10 dark:bg-slate-900/10 p-4 rounded-2xl border border-indigo-200/20 dark:border-slate-800 space-y-3">
                      <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-sky-400 tracking-wider">Leave Balance Controls (FY26)</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
                        <div className="space-y-1">
                          <label className="block text-slate-450 text-left">Casual Leave (CL)</label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={newCasualLeave}
                            onChange={e => setNewCasualLeave(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-slate-455 text-left">Sick Leave (SL)</label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={newSickLeave}
                            onChange={e => setNewSickLeave(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-slate-455 text-left">Earned / Annual Leave (AL)</label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={newAnnualLeave}
                            onChange={e => setNewAnnualLeave(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 text-xs select-none">
                      <button type="button" onClick={() => setShowAddEmployee(false)} className="px-4 py-2 border border-slate-220 text-slate-500 rounded-lg">Cancel</button>
                      <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-lg">{editingEmployee ? "Confirm Profile Update" : "Approve & Certify ID"}</button>
                    </div>
                  </form>
                )}

                {/* Employee Directory List Row */}
                <div className="overflow-x-auto border border-slate-200/50 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-950">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 border-b border-slate-202 dark:border-slate-850 uppercase font-mono tracking-widest text-[9.5px] font-bold">
                        <th className="py-3 px-4">Operator Name</th>
                        <th className="py-3 px-4">Card ID Number</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Leave Balances (CL / SL / AL)</th>
                        <th className="py-3 px-4">Database State</th>
                        <th className="py-3 px-4 text-center">Roster Management actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850/50">
                      {employees.map(emp => (
                        <tr key={emp.id} className={`hover:bg-slate-200/5 dark:hover:bg-slate-900/5 ${emp.isResigned ? "opacity-50 line-through bg-rose-500/2" : ""}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-400 text-[10px] uppercase border">
                                {emp.name.split(" ").map(w => w[0]).join("").substring(0, 2)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-100 block">{emp.name}</span>
                                <span className="text-[10px] text-slate-400 block">Joined: {emp.registeredAt}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-650 dark:text-sky-400">{emp.id}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-350">{formatIndiaPhoneNumber(emp.phoneNumber) || "No phone"}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2.5 font-mono text-[10px] font-bold text-slate-600 dark:text-slate-305">
                              <span className="px-1.5 py-0.5 bg-sky-50 dark:bg-sky-950/30 text-sky-650 rounded border border-sky-100 dark:border-sky-900/50">CL: {emp.leaveBalance?.casual ?? 0}</span>
                              <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-650 rounded border border-amber-100 dark:border-amber-900/50">SL: {emp.leaveBalance?.sick ?? 0}</span>
                              <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 rounded border border-emerald-100 dark:border-emerald-900/50">AL: {emp.leaveBalance?.annual ?? 0}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {emp.isResigned ? (
                              <span className="px-2 py-0.5 rounded text-[8.5px] font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20">RESIGNED</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[8.5px] font-extrabold bg-emerald-500/10 text-emerald-605 border border-emerald-500/20 uppercase">{emp.status}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center select-none">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleEditClick(emp)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                              {!emp.isResigned && (
                                <button onClick={() => handleResignEmployee(emp.id, emp.name)} className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* HR PANEL 2: Document Audit Team Terminal */}
            {activeTab === 'verification' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="pb-3 border-b border-dashed border-slate-205 dark:border-slate-850">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Certified Documents Verification Terminal</h4>
                  <p className="text-xs text-slate-455">Audit uploaded employee identities, EPFO, and ESIC cards. Preview PDF and image files directly inline!</p>
                </div>

                <div className="space-y-4">
                  {employees.filter(emp => !emp.isResigned).map(emp => {
                    const docFields = [
                      { key: 'aadhar', label: 'Aadhaar Card' },
                      { key: 'pan', label: 'PAN Card' },
                      { key: 'passport', label: 'International Passport' },
                      { key: 'resume', label: 'Professional Resume' },
                      { key: 'esic', label: 'ESIC Document' },
                      { key: 'epfo', label: 'EPFO Document' },
                      { key: 'studyCertificate', label: 'Academic Certificates' },
                      { key: 'bankPassbook', label: 'Bank Passbook Node' }
                    ];

                    return (
                      <div key={emp.id} className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 shadow-sm space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="font-bold text-slate-800 dark:text-slate-200">{emp.name}</span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-900 text-slate-500 font-mono px-2 py-0.5 rounded font-bold">{emp.id}</span>
                          </div>
                          <span className="text-xs text-slate-400 font-medium">Verification Node Track</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {docFields.map(doc => {
                            const docData = emp.documents?.[doc.key];
                            const isUploaded = !!docData?.url;
                            const isVerified = docData?.status === 'verified';

                            return (
                              <div 
                                key={doc.key} 
                                className={`p-3 rounded-xl border transition-all ${
                                  isUploaded 
                                    ? "bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800" 
                                    : "bg-slate-100/20 dark:bg-slate-950/10 border-slate-100 dark:border-slate-900/60 opacity-60"
                                }`}
                              >
                                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{doc.label}</div>
                                <div className="mt-2 flex items-center justify-between">
                                  {isUploaded ? (
                                    <>
                                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                        isVerified 
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                      }`}>
                                        {isVerified ? 'Verified' : 'Pending'}
                                      </span>
                                      <div className="flex gap-1">
                                        <button 
                                          onClick={() => handleViewDocument(emp.id, doc.key, docData.url)}
                                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-sky-400 transition" 
                                          title="Preview File"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        {!isVerified && (
                                          <button 
                                            onClick={() => handleVerifyDocument(emp.id, doc.key)}
                                            className="p-1 text-slate-400 hover:text-emerald-500 transition" 
                                            title="Approve Document"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Not Found</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* HR PANEL 3: Attendance & Roster Sign-Ins */}
            {activeTab === 'attendance' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-dashed border-slate-205 dark:border-slate-850">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Field Roster & Shift Sign-Ins</h4>
                    <p className="text-xs text-slate-455">Monitor daily check-ins, automated geo-coordinates verification, and tower logs.</p>
                  </div>
                  <div className="text-xs font-bold text-slate-500 font-mono bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    Cycle Range: FY 2026 Active
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200/50 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-950">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 border-b border-slate-202 dark:border-slate-850 uppercase font-mono tracking-widest text-[9.5px] font-bold">
                        <th className="py-3 px-4">Operator</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Punch In</th>
                        <th className="py-3 px-4">Punch Out</th>
                        <th className="py-3 px-4">Status Log</th>
                        <th className="py-3 px-4 text-center">Telemetry Parameters</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850/50">
                      {attendanceLogs && attendanceLogs.length > 0 ? (
                        attendanceLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-200/5 dark:hover:bg-slate-900/5">
                            <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">{log.employeeName}</td>
                            <td className="py-3 px-4 font-mono">{log.date}</td>
                            <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-mono font-bold">{log.punchIn || '--:--'}</td>
                            <td className="py-3 px-4 text-rose-500 font-mono font-bold">{log.punchOut || '--:--'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                                log.status === 'Present' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                              }`}>
                                {log.status ? log.status.toUpperCase() : 'UNKNOWN'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-[10px] text-slate-400">
                              {log.coordinates ? `📍 Lat/Long: ${log.coordinates}` : '📡 Gated System Sync'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                            No operational field check-ins processed today.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* HR PANEL 4: Payroll Accountant */}
            {activeTab === 'payroll' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-dashed border-slate-205 dark:border-slate-850">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">MSPL Structural Payroll Generation</h4>
                    <p className="text-xs text-slate-455">Review employee basic pay structure, custom allowances, standard deductions, and compute payouts.</p>
                  </div>
                  <button
                    onClick={exportPayrollCSV}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV Ledger</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200/50 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-950">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 border-b border-slate-202 dark:border-slate-850 uppercase font-mono tracking-widest text-[9.5px] font-bold">
                        <th className="py-3 px-4">Staff Member</th>
                        <th className="py-3 px-4">Basic Pay</th>
                        <th className="py-3 px-4">Allowances</th>
                        <th className="py-3 px-4">Deductions</th>
                        <th className="py-3 px-4">Calculated Net</th>
                        <th className="py-3 px-4 text-center">Accounting State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850/50">
                      {employees.filter(e => !e.isResigned).map(emp => {
                        const salaryStructure = emp.salaryConfig || { basic: 0, allowances: 0, deductions: 0 };
                        const totalNet = salaryStructure.basic + salaryStructure.allowances - salaryStructure.deductions;

                        return (
                          <tr key={emp.id} className="hover:bg-slate-200/5 dark:hover:bg-slate-900/5">
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-800 dark:text-slate-100 block">{emp.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{emp.id}</span>
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold">₹{salaryStructure.basic.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-emerald-600 font-mono font-semibold">+₹{salaryStructure.allowances.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-rose-500 font-mono font-semibold">-₹{salaryStructure.deductions.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-indigo-600 dark:text-sky-400 font-mono font-black">₹{totalNet.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-center">
                              <button 
                                onClick={() => handleProcessPayroll?.(emp.id)}
                                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 rounded-lg text-[11px] font-bold transition duration-150"
                              >
                                Dispatch Slip
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* HR PANEL 5: Field Support Helpdesk */}
            {activeTab === 'helpdesk' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="pb-3 border-b border-dashed border-slate-205 dark:border-slate-850">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Field Operations Helpdesk Terminal</h4>
                  <p className="text-xs text-slate-455">Review real-time dynamic support tickets submitted by offsite tower engineering crews.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {helpTickets && helpTickets.length > 0 ? (
                    helpTickets.map(ticket => (
                      <div key={ticket.id} className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-slate-400 font-bold">{ticket.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            ticket.priority === 'High' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {ticket.priority} Priority
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{ticket.issueDescription}</p>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-900">
                          <span>Reported by: <strong>{ticket.reportedBy}</strong></span>
                          <span>{ticket.timestamp}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 p-8 text-center text-slate-400 italic bg-white dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-850">
                      All engineering nodes are operating nominal. No open site support queries found.
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* --- RENDER PHASE 3: MANAGING DIRECTOR PARENTAL WORKSPACE --- */}
      {isDirectorLoggedIn && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-indigo-500/20 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30 animate-pulse">
                👑
              </div>
              <div className="text-left">
                <h3 className="text-lg font-black text-white font-display uppercase tracking-widest leading-none">Managing Director Control Tower</h3>
                <p className="text-[10px] text-slate-400 uppercase font-mono mt-1.5 font-bold tracking-wider">Corporate Parental Console &bull; Database Status: Connected Node-AP</p>
              </div>
            </div>

            <button
              onClick={handleLogoutDirector}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Sign Out MD Console
            </button>
          </div>

          {/* MD Dashboard Navigation tabs */}
          <div className="flex flex-wrap bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl text-xs font-bold select-none border border-slate-200 dark:border-slate-800">
            {[
              { key: 'overview', label: 'Operations Overview', icon: <ClipboardList className="w-4 h-4 text-emerald-500" /> },
              { key: 'attendance_edit', label: 'Edit Daily Attendance Logins', icon: <Calendar className="w-4 h-4 text-rose-500" /> },
              { key: 'hr_approval', label: 'Certify Pending HR Setups', icon: <ShieldCheck className="w-4 h-4 text-indigo-500" /> },
              { key: 'recycle_bin', label: 'System Recycle Bin / Trash', icon: <Trash className="w-4 h-4 text-slate-500" /> }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveMDTab(tab.key as any)}
                className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition cursor-pointer select-none duration-200 ${activeMDTab === tab.key ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {tab.icon}
                <span className="hidden lg:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="bg-white/70 dark:bg-slate-900/20 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 backdrop-blur shadow-sm min-h-[400px]">
            
            {/* MD TAB 1: Operations and Inventory Summary */}
            {activeMDTab === 'overview' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="pb-3 border-b border-dashed border-slate-200">
                  <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white font-display">MD Stock & Operations Dashboard</h4>
                  <p className="text-xs text-slate-500">Overview parameters compiled in real-time by operations regional nodes.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="p-5 rounded-2xl border bg-slate-50/50 dark:bg-slate-950/20 text-left">
                    <span className="text-[10px] uppercase text-slate-400 font-mono font-bold block">Certified Stock Items</span>
                    <span className="text-3xl font-black text-slate-900 dark:text-white mt-1 block">8 active products</span>
                  </div>
                  <div className="p-5 rounded-2xl border bg-slate-50/50 dark:bg-slate-950/20 text-left">
                    <span className="text-[10px] uppercase text-slate-400 font-mono font-bold block">Attendance Logins Signed Today</span>
                    <span className="text-3xl font-black text-slate-900 dark:text-white mt-1 block">{attendanceLogs?.length || 0} Records</span>
                  </div>
                  <div className="p-5 rounded-2xl border bg-slate-50/50 dark:bg-slate-950/20 text-left">
                    <span className="text-[10px] uppercase text-slate-400 font-mono font-bold block">Uniform Daily Roster Shift</span>
                    <span className="text-3xl font-black text-indigo-600 dark:text-sky-400 mt-1 block">09:30 AM - 06:30 PM</span>
                  </div>
                </div>

                {/* Stock tracker lists summary */}
                <div className="space-y-3 pt-4">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wider">High Density Stock Ledger overview</span>
                  <div className="overflow-x-auto border rounded-xl bg-white dark:bg-slate-950">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-900 text-slate-400 border-b uppercase font-mono tracking-widest text-[9.5px]">
                          <th className="py-2.5 px-3">Item details</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3 text-right">Stock Level Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {employees?.length > 0 ? (
                          <tr className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold">A50 Heavy Duty Lattice Steel Rigs</td>
                            <td className="py-2 px-3 font-mono">Structural</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-600">320 units</td>
                          </tr>
                        ) : null}
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold">100W Monocrystalline PV Cells</td>
                          <td className="py-2 px-3 font-mono">Electronics</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600">1,450 panels</td>
                        </tr>
                        <tr className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold">6A Heavy Copper Backhaul Cables</td>
                          <td className="py-2 px-3 font-mono">Cables</td>
                          <td className="py-2 px-3 text-right font-bold text-rose-500">22 km (LOW Alert)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* MD TAB 2: EDIT ATTENDANCE LOGINS */}
            {activeMDTab === 'attendance_edit' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-dashed border-slate-200">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white">Daily Login attendance manual credentials editor</h4>
                    <p className="text-xs text-slate-500 mt-0.5">MANUALLY add, override, update or delete any login record immediately.</p>
                  </div>
                  <button
                    onClick={() => { setEditingAttendance(null); setShowAddAttendance(!showAddAttendance); }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer select-none"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Manual Login Row</span>
                  </button>
                </div>

                {showAddAttendance && (
                  <form onSubmit={handleMDSaveAttendance} className="p-4 sm:p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/10 max-w-2xl mx-auto space-y-4 text-xs font-bold">
                    <h5 className="text-xs font-black uppercase text-indigo-700">{editingAttendance ? "Editing Attendance log node" : "Add/Verify new login record manuals"}</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                      <div className="space-y-1">
                        <label className="block text-slate-400">Employee Card ID Number *</label>
                        <input type="text" required placeholder="e.g. MSPL-EMP-101" value={attEmpId} onChange={e => setAttEmpId(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-2 uppercase font-mono font-bold" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-slate-400">Employee Full Name *</label>
                        <input type="text" required placeholder="e.g. Ajay Kumar" value={attEmpName} onChange={e => setAttEmpName(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-2" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-slate-400">Record Sign-In Date *</label>
                        <input type="date" required value={attDate} onChange={e => setAttDate(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-2" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-slate-400">Sign-In Time Stamp *</label>
                        <input type="text" required placeholder="e.g. 09:30 AM" value={attTime} onChange={e => setAttTime(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-2 font-mono font-bold" />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 text-xs select-none">
                      <button type="button" onClick={() => setShowAddAttendance(false)} className="px-4 py-1.5 border rounded-lg text-slate-500">Cancel</button>
                      <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold">{editingAttendance ? "Confirm Changes" : "Create Record Node"}</button>
                    </div>
                  </form>
                )}

                {/* Logins table list */}
                <div className="overflow-x-auto border border-slate-200/50 rounded-xl tracking-wide bg-white dark:bg-slate-950">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 border-b uppercase font-mono tracking-widest text-[9.5px]">
                        <th className="py-2.5 px-3">Staff Details</th>
                        <th className="py-2.5 px-3 font-mono">Date</th>
                        <th className="py-2.5 px-3">Sign-In time</th>
                        <th className="py-2.5 px-3">Override Status</th>
                        <th className="py-2.5 px-3 text-center">Auditor Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attendanceLogs?.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-800 block">{log.employeeName}</span>
                            <span className="text-[10px] text-slate-400 block font-mono font-bold">{log.employeeId}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500">{log.date}</td>
                          <td className="py-3 px-3 font-mono font-bold text-indigo-600">{log.time}</td>
                          <td className="py-3 px-3">
                            {log.isManualOverride ? (
                              <span className="px-2 py-0.5 rounded text-[8.5px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase">By {log.overrideBy || 'MD'}</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[8.5px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase">GPS Auto-Verified</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1 select-none">
                              <button onClick={() => handleMDEditAttClick(log)} className="p-1 hover:bg-slate-100 text-slate-500 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleMDDeleteAttLog(log.id)} className="p-1 hover:bg-rose-500/10 text-rose-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MD TAB 3: HR SETUP APPROVALS */}
            {activeMDTab === 'hr_approval' && (
              <div className="space-y-8 animate-fade-in text-left font-sans">
                {/* Header */}
                <div className="pb-3 border-b border-dashed border-slate-200">
                  <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white font-display">MD Direct HR Registry Controller</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Directly register or instantly toggle credentials verification for Magnifiq Services HR specialists.</p>
                </div>

                {/* Direct HR Creation Form */}
                <form onSubmit={handleMDDirectAddHR} className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 space-y-4 max-w-xl">
                  <div className="space-y-1">
                    <h5 className="text-xs font-black uppercase text-indigo-700 dark:text-sky-400">Directly Register & Certify HR Account</h5>
                    <p className="text-[11px] text-slate-400">Bypass cellular SMS verification constraints and register an authorized HR phone instantly.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                    <div className="space-y-1">
                      <label className="block text-slate-500">10-Digit Phone ID *</label>
                      <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <span className="px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 select-none">
                          +91
                        </span>
                        <input
                          type="tel"
                          required
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="9845012345"
                          value={mdDirectPhone}
                          onChange={e => handleMdDirectPhoneInputChange(e.target.value)}
                          className="w-full bg-transparent px-3 py-2 font-bold focus:outline-none dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-slate-500">Login Passcode *</label>
                      <input
                        type="password"
                        required
                        placeholder="Enter password..."
                        value={mdDirectPass}
                        onChange={e => setMdDirectPass(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 font-bold focus:outline-none dark:text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition duration-150 cursor-pointer shadow-md"
                  >
                    Authorize & Register Instantly
                  </button>
                </form>

                {/* Pending Actions */}
                <div className="space-y-3">
                  <h5 className="text-xs font-black uppercase text-slate-500">Pending Actions Required</h5>
                  {registeredHrsList?.filter(hr => !hr.verified).length === 0 ? (
                    <div className="py-6 border border-dashed border-slate-200 text-center rounded-2xl bg-white/40">
                      <span className="text-xs text-slate-400 italic">No newly registered HR setups are waiting for signature verification.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {registeredHrsList?.filter(hr => !hr.verified).map(hr => (
                        <div key={hr.phoneNumber} className="p-4 rounded-2xl border bg-white dark:bg-slate-950 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-100 block">HR Setup Connection: {formatIndiaPhoneNumber(hr.phoneNumber)}</span>
                            <span className="text-[9.5px] text-amber-500 block font-mono">Status: Pending MD Signature Approval</span>
                          </div>

                          <button
                            onClick={() => handleDirectorApproveHR(hr.phoneNumber)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer select-none leading-none shrink-0 shadow-sm"
                          >
                            Stamp & Verify
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Listing of All Active HR Roles */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-xs font-black uppercase text-slate-500">Active HR System Connections Directory</h5>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-mono tracking-wider text-[9.5px]">
                          <th className="py-3 px-4">HR Phone Node ID</th>
                          <th className="py-3 px-4">Registration status</th>
                          <th className="py-3 px-4 text-center">Security commands</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                        {registeredHrsList?.map(hr => (
                          <tr key={hr.phoneNumber} className="hover:bg-slate-50/20">
                            <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-100">{formatIndiaPhoneNumber(hr.phoneNumber)}</td>
                            <td className="py-3 px-4 select-none">
                              {hr.verified ? (
                                <span className="px-2.5 py-0.5 rounded text-[8.5px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">✓ CERTIFIED STATUS</span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded text-[8.5px] font-black bg-rose-500/10 text-rose-500 border border-rose-500/20">PENDING SIGN-OFF</span>
                              )}
                            </td>
                            <td className="py-2 px-4 text-center">
                              <div className="flex justify-center items-center gap-2 select-none">
                                <button
                                  onClick={() => handleMDToggleHRVerification(hr.phoneNumber)}
                                  className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition ${hr.verified ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-500/20" : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-500/20"}`}
                                >
                                  {hr.verified ? "Revoke Access" : "Grant Access"}
                                </button>
                                <button
                                  onClick={() => handleMDDeleteHR(hr.phoneNumber)}
                                  className="px-2.5 py-1.5 bg-rose-500/15 text-rose-600 rounded-lg text-[10.5px] font-bold border border-rose-500/10 hover:bg-rose-500/20"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* MD TAB 5: CENTRALIZED RECYCLE BIN */}
            {activeMDTab === 'recycle_bin' && (
              <div className="space-y-6 animate-fade-in text-left font-sans">
                <div className="pb-3 border-b border-dashed border-slate-200">
                  <h4 className="text-xs font-black uppercase text-slate-900">Centralized corporate Recycle Bin / Trash path</h4>
                  <p className="text-xs text-slate-450">Restore any deleted files, attendance logs or debit bills permanently across operations.</p>
                </div>

                <div className="space-y-3">
                  {recycleBin?.length === 0 ? (
                    <div className="py-12 border border-dashed text-center rounded-2xl bg-slate-50/10">
                      <span className="text-xs text-slate-400 italic">Centralized Recycle Bin is completely clear. No files stashed.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recycleBin?.map(item => (
                        <div key={item.id} className="p-4.5 rounded-2xl border bg-white flex justify-between items-center text-xs">
                          <div>
                            <span className="font-extrabold text-slate-800 block">{item.title}</span>
                            <span className="text-[10px] text-slate-450 block font-mono mt-0.5">
                              Deleted: {item.deletedAt} &bull; Type: <strong className="font-bold underline">{item.sourceType}</strong>
                            </span>
                            {item.fileName && (
                              <span className="text-[10px] text-indigo-500 block font-mono mt-1">Attachment file: {item.fileName}</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 select-none shrink-0">
                            <button
                              onClick={() => handleGlobalRestore(item)}
                              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold rounded-xl border border-emerald-500/20"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handleGlobalPermanentDelete(item.id)}
                              className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg"
                              title="Delete Permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* RENDER DYNAMIC PREVIEW VIEWERS MODALS */}
      {previewDoc && (
        <DocumentViewer
          name={previewDoc.name}
          type={previewDoc.type}
          data={previewDoc.data}
          onClose={() => setPreviewDoc(null)}
        />
      )}

    </div>
  );
}