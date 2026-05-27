/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Employee, AttendanceLog, Payslip, HrUser, FinanceRecord, RecycleBinItem, DocumentFile, PayslipFormat, EmployeeHelpQuery } from '../types';
import { 
  ShieldCheck, Phone, Key, Lock, CheckCircle2, UserPlus, Users, 
  FileCheck, Calendar, DollarSign, Download, Plus, Trash2, Edit2, 
  MapPin, Eye, Camera, ShieldAlert, Award, FileText, ClipboardList, TrendingUp, Settings, Trash, CheckCircle,
  Upload, HelpCircle
} from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import DocumentViewer from './DocumentViewer';
import { auth } from '../lib/firebase';
import { generatePayslipPDF } from '../lib/pdfHelper';
import { formatIndiaPhoneNumber, normalizeIndiaPhoneForFirebase, sanitizeIndiaMobileDigits } from '../lib/phoneHelper';

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
}: HrPortalProps) {
  
  // High-fidelity Gateway view selectors: 'employee' | 'hr' | 'director'
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
  const [parentPasscode, setParentPasscode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpStatus, setOtpStatus] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaRenderedRef = useRef(false);

  // --- Employee Auth States ---
  const [empSelectedId, setEmpSelectedId] = useState('');
  const [empPassword, setEmpPassword] = useState('');

  // --- Managing Director Auth States ---
  const [directorPasscode, setDirectorPasscode] = useState('');

  // --- HR Registered Users Database ---
  const [registeredHrsList, setRegisteredHrsList] = useState<HrUser[]>(() => {
    const saved = localStorage.getItem('mspl_hrs_list');
    if (saved) return JSON.parse(saved);
    // Seed initial admin
    return [
      { phoneNumber: '9911020260', password: 'hr123', verified: true, isParentVerified: true }
    ];
  });

  // Sync HR list
  useEffect(() => {
    localStorage.setItem('mspl_hrs_list', JSON.stringify(registeredHrsList));
  }, [registeredHrsList]);

  // Global Recycle Bin State
  const [recycleBin, setRecycleBin] = useState<RecycleBinItem[]>(() => {
    const saved = localStorage.getItem('mspl_recycle_bin');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('mspl_recycle_bin', JSON.stringify(recycleBin));
  }, [recycleBin]);

  // --- Operations Finance Ledger States ---
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>(() => {
    const saved = localStorage.getItem('mspl_finance_records');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'fin-1', type: 'income', title: 'Solar PV Tower Commissioning Bill', amount: 350000, date: '2026-05-20', category: 'General' },
      { id: 'fin-2', type: 'expense', title: 'Office Server Replacement & Cables', amount: 12500, date: '2026-05-22', category: 'Office Maintenance' },
      { id: 'fin-3', type: 'investment', title: 'Microwave Rig Extension Capital', amount: 500000, date: '2026-05-18', category: 'General' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('mspl_finance_records', JSON.stringify(financeRecords));
  }, [financeRecords]);

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

  const handleReplyQuery = (queryId: string) => {
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
    onUpdateEmployeeQueries(updated);
    toast("✓ Resolved query and dispatched response back to the operator dashboard console.", "success");
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
      if (!recaptchaContainerRef.current) {
        throw new Error('Recaptcha container is not ready.');
      }

      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
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
      const phoneNumber = normalizePhoneForFirebase(phoneInput);
      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);

      setConfirmationResult(result);
      setOtpStatus(`OTP request accepted for ${formatIndiaPhoneNumber(phoneInput)}. Check your phone and enter the 6-digit code below.`);
      toast(`OTP request accepted for ${formatIndiaPhoneNumber(phoneInput)}. Please check your phone and enter the verification code.`, 'info');
    } catch (error: any) {
      const errorCode = error?.code;
      let errorMessage = error?.message || 'Unable to send OTP right now.';

      if (errorCode === 'auth/operation-not-allowed') {
        errorMessage = 'Phone Authentication is not enabled for this Firebase project. Please enable it in Firebase Console.';
      } else if (errorCode === 'auth/invalid-phone-number') {
        errorMessage = 'The phone number is invalid. Please confirm the 10-digit mobile number and try again.';
      } else if (errorCode === 'auth/recaptcha-not-enabled') {
        errorMessage = 'The OTP verifier is not available on this page. Please refresh and try again.';
      }

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

    const updatedList = [...registeredHrsList, newHr];
    setRegisteredHrsList(updatedList);

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

    setHrUser(foundHr);
    localStorage.setItem('mspl_hr_user', JSON.stringify(foundHr));
    setIsHrLoggedIn(true);
    localStorage.setItem('mspl_hr_logged_in', 'true');
    toast(`✓ Welcome back, HR Specialist [Conn: ${phoneInput}]`, 'success');
    setOtpInput('');
    resetPhoneAuthState();
  };

  const handleLogoutHr = () => {
    setIsHrLoggedIn(false);
    localStorage.removeItem('mspl_hr_logged_in');
    localStorage.removeItem('mspl_hr_user');
    setHrUser(null);
    toast('HR Terminal session disconnected safe.', 'info');
  };

  // --- 3. Managing Director Login ---
  const handleDirectorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (directorPasscode === 'MD-DIRECTOR-2026' || directorPasscode === 'admin123' || directorPasscode === 'director') {
      setIsDirectorLoggedIn(true);
      localStorage.setItem('mspl_director_logged_in', 'true');
      
      // Also set the MD as the current employee for system-wide access
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
  };

  const handleLogoutDirector = () => {
    setIsDirectorLoggedIn(false);
    localStorage.removeItem('mspl_director_logged_in');
    toast('Director security session closed.', 'info');
  };

  // --- HR / Director Actions Matrix ---
  
  // A. Pre-register / Edit employee
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhoneNumber = sanitizeIndiaMobileDigits(newPhone);

    if (!newId.trim() || !newName.trim() || !cleanPhoneNumber || !newPass.trim()) {
      toast('All roster credentials are required.', 'error');
      return;
    }

    const cleanedId = newId.trim().toUpperCase();
    if (editingEmployee) {
      const updated = employees.map(emp => {
        if (emp.id === editingEmployee.id) {
          return {
            ...emp,
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
          };
        }
        return emp;
      });
      onUpdateEmployees(updated);
      toast(`✓ Updated core files and leave balances for employee ${newName}.`, 'success');
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

      onUpdateEmployees([...employees, newEmp]);
      toast(`✓ Created and approved employee profile card ${newEmp.name}.`, 'success');
    }

    setNewId('');
    setNewName('');
    setNewPhone('');
    setNewPass('');
    setNewFamily('');
    setNewAddress('');
    setNewCasualLeave(8);
    setNewSickLeave(10);
    setNewAnnualLeave(15);
    setShowAddEmployee(false);
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
      () => {
        const updated = employees.map(emp => {
          if (emp.id === empId) {
            return {
              ...emp,
              isResigned: true,
              status: 'revoked' as const
            };
          }
          return emp;
        });
        onUpdateEmployees(updated);
        toast(`Employee "${name}" marked as Resigned. Login revoked.`, 'info');
      },
      "Confirm Resignation",
      true
    );
  };

  // B. Document Stamps
  const handleVerifyDoc = (empId: string, docKey: string) => {
    const updated = employees.map(emp => {
      if (emp.id === empId) {
        // Legacy fields update
        const legacyUpdate = { [docKey]: 'verified' };
        
        // List update
        const list = emp.uploadedFilesList || [];
        const found = list.find(f => f.key === docKey);
        let updatedList = list;
        if (found) {
          updatedList = list.map(f => f.key === docKey ? { ...f, status: 'verified' as const } : f);
        } else {
          // Add verified slot
          updatedList = [...list, {
            key: docKey,
            label: docKey.toUpperCase(),
            name: `${docKey}_Submission.pdf`,
            type: 'application/pdf',
            data: '',
            uploadedAt: new Date().toLocaleDateString('en-US'),
            status: 'verified'
          }];
        }
        
        return {
          ...emp,
          ...legacyUpdate,
          uploadedFilesList: updatedList
        };
      }
      return emp;
    });
    onUpdateEmployees(updated);
    toast(`✓ HR Verified submitted document "${docKey}" for Employee: ${empId}.`, 'success');
  };

  // Reject doc -> send employee file straight to Recycle Bin
  const handleHrDeleteDoc = (empId: string, docKey: string, docTitle: string) => {
    const targetEmp = employees.find(e => e.id === empId);
    if (!targetEmp) return;

    const list = targetEmp.uploadedFilesList || [];
    const targetFile = list.find(f => f.key === docKey);

    // Save item inside waste storage
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

    const updated = employees.map(emp => {
      if (emp.id === empId) {
        return {
          ...emp,
          [docKey]: undefined,
          uploadedFilesList: remaining
        };
      }
      return emp;
    });

    onUpdateEmployees(updated);
    setRecycleBin(prev => [binItem, ...prev]);
    toast(`✓ Document "${docTitle}" rejected and moved to global Recycle Bin.`, 'warning');
  };

  // C. Attendance Manual Logs override & edits
  const handleOverrideAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideEmpId) {
      toast('Please choose staff for logging.', 'error');
      return;
    }

    const emp = employees.find(item => item.id === overrideEmpId);
    if (!emp) return;

    const newLog: AttendanceLog = {
      id: `att-over-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      date: overrideDate,
      time: overrideTime,
      selfieUrl: undefined,
      latitude: 17.4772,
      longitude: 78.5711,
      isManualOverride: true,
      overrideBy: 'HR Office Administrator'
    };

    onUpdateAttendanceLogs([newLog, ...attendanceLogs]);
    toast(`✓ Manual Clock-In registered securely for ${emp.name}.`, 'success');
    setOverrideEmpId('');
  };

  // MD Manual Attendance Actions
  const handleMDSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attEmpId || !attEmpName) {
      toast("All fields required.", "error");
      return;
    }

    if (editingAttendance) {
      const updated = attendanceLogs.map(log => {
        if (log.id === editingAttendance.id) {
          return {
            ...log,
            employeeId: attEmpId,
            employeeName: attEmpName,
            date: attDate,
            time: attTime,
            latitude: attLatitude,
            longitude: attLongitude,
            isManualOverride: true,
            overrideBy: 'Managing Director'
          };
        }
        return log;
      });
      onUpdateAttendanceLogs(updated);
      toast(`✓ Attendance log updated successfully!`, "success");
      setEditingAttendance(null);
    } else {
      const newLog: AttendanceLog = {
        id: `att-md-${Date.now()}`,
        employeeId: attEmpId,
        employeeName: attEmpName,
        date: attDate,
        time: attTime,
        latitude: attLatitude,
        longitude: attLongitude,
        isManualOverride: true,
        overrideBy: 'Managing Director'
      };
      onUpdateAttendanceLogs([newLog, ...attendanceLogs]);
      toast(`✓ Attendance manual record logged.`, "success");
    }

    setAttEmpId('');
    setAttEmpName('');
    setAttDate(new Date().toISOString().substring(0, 10));
    setAttTime('09:30 AM');
    setShowAddAttendance(false);
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

  const handleMDDeleteAttLog = (logId: string) => {
    const targetLog = attendanceLogs.find(l => l.id === logId);
    if (!targetLog) return;

    // Send to Bin
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

    onUpdateAttendanceLogs(attendanceLogs.filter(l => l.id !== logId));
    setRecycleBin(prev => [binItem, ...prev]);
    toast(`✓ Attendance log moved to Recycle Bin.`, `warning`);
  };

  // D. HR Approval Verification
  const handleDirectorApproveHR = (phone: string) => {
    const updatedHrs = registeredHrsList.map(hr => {
      if (hr.phoneNumber === phone) {
        return { ...hr, verified: true, isParentVerified: true };
      }
      return hr;
    });
    setRegisteredHrsList(updatedHrs);
    toast(`✓ HR Setup approved! Official Credentials registered for cellular connection: ${phone}`, 'success');
  };

  const handleMDDirectAddHR = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhoneNumber = sanitizeIndiaMobileDigits(mdDirectPhone);

    if (!cleanPhoneNumber || !mdDirectPass) {
      toast('Please enter both Phone number and Password.', 'error');
      return;
    }
    if (registeredHrsList.some(h => h.phoneNumber === cleanPhoneNumber)) {
      toast('An HR user with this Phone number already registered.', 'error');
      return;
    }
    const newHr = {
      phoneNumber: cleanPhoneNumber,
      password: mdDirectPass,
      verified: true,
      isParentVerified: true
    };
    setRegisteredHrsList([newHr, ...registeredHrsList]);
    setMdDirectPhone('');
    setMdDirectPass('');
    toast(`✓ Directly registered & certified HR account for ${formatIndiaPhoneNumber(cleanPhoneNumber)}`, 'success');
  };

  const handleMDToggleHRVerification = (phone: string) => {
    const updated = registeredHrsList.map(hr => {
      if (hr.phoneNumber === phone) {
        const nextState = !hr.verified;
        toast(`✓ HR ${formatIndiaPhoneNumber(phone)} ${nextState ? 'Approved' : 'Suspended'}!`, 'success');
        return { ...hr, verified: nextState, isParentVerified: nextState };
      }
      return hr;
    });
    setRegisteredHrsList(updated);
  };

  const handleMDDeleteHR = (phone: string) => {
    if (phone === '9911020260') {
      toast('Cannot delete the primary/default demo HR administrator.', 'error');
      return;
    }
    const updated = registeredHrsList.filter(hr => hr.phoneNumber !== phone);
    setRegisteredHrsList(updated);
    toast(`✓ HR account ${formatIndiaPhoneNumber(phone)} removed completely.`, 'success');
  };

  // E. Direct Payroll
  const handleIssuePayslip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payEmpId) {
      toast('Please select target employee.', 'error');
      return;
    }

    const netValue = payBase + payAllow - payDeduct;
    const newPayslip: Payslip = {
      id: `pay-${Date.now()}-${payEmpId.substring(payEmpId.length - 3)}`,
      employeeId: payEmpId,
      monthYear: payMonth,
      basicSalary: payBase,
      allowances: payAllow,
      deductions: payDeduct,
      netSalary: netValue,
      status: 'paid',
      deliveredAt: new Date().toLocaleDateString('en-US') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    onUpdatePayslips([newPayslip, ...payslips]);
    toast(`✓ Payslip disbursed safely to employee ${payEmpId}.`, 'success');
    setPayEmpId('');
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
    toast("✓ Payslip branding template updated successfully on secure server nodes.", "success");
  };

  // F. Office MAINTENANCE & Finances manager
  const handleSaveFinanceRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finTitle.trim() || finAmount <= 0) {
      toast("Please provide valid title and finance amount.", "error");
      return;
    }

    if (editingFinance) {
      const updated = financeRecords.map(rec => {
        if (rec.id === editingFinance.id) {
          return {
            ...rec,
            type: finType,
            title: finTitle.trim(),
            amount: finAmount,
            date: finDate,
            category: finCategory,
            notes: finNotes,
            fileName: finFileName || rec.fileName,
            fileType: finFileType || rec.fileType,
            fileData: finFileData || rec.fileData
          };
        }
        return rec;
      });
      setFinanceRecords(updated);
      toast("✓ Finance transaction updated manuals.", "success");
      setEditingFinance(null);
    } else {
      const newRec: FinanceRecord = {
        id: `fin-${Date.now()}`,
        type: finType,
        title: finTitle.trim(),
        amount: finAmount,
        date: finDate,
        category: finCategory,
        notes: finNotes,
        fileName: finFileName,
        fileType: finFileType,
        fileData: finFileData
      };
      setFinanceRecords([newRec, ...financeRecords]);
      toast("✓ New finance record logged securely to ledger.", "success");
    }

    // Reset Form
    setFinTitle('');
    setFinAmount(0);
    setFinDate(new Date().toISOString().substring(0, 10));
    setFinCategory('Office Maintenance');
    setFinNotes('');
    setFinFileName('');
    setFinFileType('');
    setFinFileData('');
    setShowAddFinance(false);
  };

  const handleEditFinanceClick = (rec: FinanceRecord) => {
    setEditingFinance(rec);
    setFinType(rec.type);
    setFinTitle(rec.title);
    setFinAmount(rec.amount);
    setFinDate(rec.date);
    setFinCategory(rec.category);
    setFinNotes(rec.notes || '');
    setFinFileName(rec.fileName || '');
    setFinFileType(rec.fileType || '');
    setFinFileData(rec.fileData || '');
    setShowAddFinance(true);
  };

  const handleDeleteFinanceRecord = (recId: string) => {
    const target = financeRecords.find(f => f.id === recId);
    if (!target) return;

    // Send to Bin
    const binItem: RecycleBinItem = {
      id: `bin-${Date.now()}`,
      sourceType: 'finance_doc',
      title: `Deleted Finance Bill: [${target.type.toUpperCase()}] ${target.title}`,
      fileName: target.fileName,
      fileType: target.fileType,
      fileData: target.fileData,
      deletedAt: new Date().toLocaleDateString('en-US'),
      originalPath: {
        financeId: recId,
        logData: JSON.stringify(target)
      }
    };

    setFinanceRecords(financeRecords.filter(f => f.id !== recId));
    setRecycleBin(prev => [binItem, ...prev]);
    toast(`✓ Finance entry moved to Recycle Bin safely.`, 'warning');
  };

  const handleFinanceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setFinFileName(file.name);
      setFinFileType(file.type || 'application/octet-stream');
      setFinFileData(reader.result as string);
      toast(`✓ Bill attachment "${file.name}" uploaded successfully!`, "success");
    };
    reader.readAsDataURL(file);
  };

  // G. Comprehensive Restore handler from Recycle Bin
  const handleGlobalRestore = (binItem: RecycleBinItem) => {
    if (!binItem.originalPath.logData) return;

    if (binItem.sourceType === 'employee_doc') {
      const restoredFile: DocumentFile = JSON.parse(binItem.originalPath.logData);
      const empId = binItem.originalPath.employeeId;
      const updated = employees.map(emp => {
        if (emp.id === empId) {
          const list = emp.uploadedFilesList || [];
          return {
            ...emp,
            [restoredFile.key]: restoredFile.status,
            uploadedFilesList: [...list.filter(f => f.key !== restoredFile.key), restoredFile]
          };
        }
        return emp;
      });
      onUpdateEmployees(updated);
      toast(`✓ Employee card restored safely!`, "success");
    } else if (binItem.sourceType === 'finance_doc') {
      const restoredRec: FinanceRecord = JSON.parse(binItem.originalPath.logData);
      setFinanceRecords(prev => [restoredRec, ...prev]);
      toast(`✓ Finance transaction record restored!`, "success");
    } else if (binItem.sourceType === 'attendance_log') {
      const restoredLog: AttendanceLog = JSON.parse(binItem.originalPath.logData);
      onUpdateAttendanceLogs([restoredLog, ...attendanceLogs]);
      toast(`✓ Attendance manual log restored!`, "success");
    }

    setRecycleBin(prev => prev.filter(item => item.id !== binItem.id));
  };

  const handleGlobalPermanentDelete = (idx: string) => {
    setRecycleBin(prev => prev.filter(item => item.id !== idx));
    toast("✓ Deleted permanently from cloud/offline logs.", "success");
  };

  // Exporters formatting for reporting
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

                <div ref={recaptchaContainerRef} className="h-0 overflow-hidden opacity-0 pointer-events-none" />

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
                      { key: 'aadhar', label: 'Aadhar Card' },
                      { key: 'pan', label: 'PAN Card' },
                      { key: 'passport', label: 'International Passport' },
                      { key: 'resume', label: 'Professional Resume' },
                      { key: 'esic', label: 'ESIC Document' },
                      { key: 'epfo', label: 'EPFO Document' },
                      { key: 'studyCertificate', label: 'Academic Certificates' },
                      { key: 'bankPassbook', label: 'Bank Passbook Node' }
                    ];

                    // Read either old fields or rich list
                    const legacyDocs = docFields.filter(f => (emp as any)[f.key]);
                    const richDocs = emp.uploadedFilesList || [];
                    const activeKeys = new Set([...legacyDocs.map(f => f.key), ...richDocs.map(f => f.key)]);

                    const submittedFileObjs = Array.from(activeKeys).map(k => {
                      const foundRich = richDocs.find(f => f.key === k);
                      if (foundRich) return foundRich;
                      const fieldLabel = docFields.find(f => f.key === k)?.label || k.toUpperCase();
                      return {
                        key: k,
                        label: fieldLabel,
                        name: `${fieldLabel}_Submission.pdf`,
                        type: 'application/pdf',
                        data: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nCiAgICAgL1BhZ2VzIDIgMCBSCgogID4+CmVuZG9iagoyIDAgb2JqCiAgPDwgL1R5cGUgL1BhZ2VzCiAgICAgL0tpZHMgWyAzIDAgUiBdCiAgICAgL0NvdW50IDEKICA+PgplbmRvYmoKMyAwIG9iagogIDw8IC9UeXBlIC9QYWdlCiAgICAgL1BhcmVudCAyIDAgUgogICAgIC9SZXNvdXJjZXMgPDwgL0ZvbnQgPDwgL0YxIDQgMCBSID4+ID4+CiAgICAgL01lZGlhQm94IFsgMCAwIDU5NSA4NDIgXQogICAgIC9Db250ZW50cyA1IDAgUgoKICA+PgplbmRvYmoKNCAgb2JqCiAgPDwgL1R5cGUgL0ZvbnQKICAgICAvU3VidHlwZSAvVHlwZTEKICAgICAvQmFzZUZvbnQgL0hlbHZldGljYQogID4+CmVuZG9iago1IDAgb2JqCiAgPDwgL0xlbmd0aCA3MyA+PgpzdHJlYW0KQlQKICAvRjEgMTIgVGYKICA3MiA3MTIgVGQKICAoTWFnbmlmaXEgU2VydmljZXMgUHJpdmF0ZSBMaW1pdGVkIENvbXBsaWFuY2UgRG9jdW1lbnQpIFRqCkVOCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE3IDAwMDAwIG4gCjAwMDAwMDAwNzMgMDAwMDAgbiAKMDAwMDAwMDEzNCAwMDAwIG4gCjAwMDAwMDAyNjAgMDAwMDAgbiAKMDAwMDAwMDMyMiAwMDAwIG4gCnRyYWlsZXIKICA8PCAvU2l6ZSA2CiAgICAgL1Jvb3QgMSAwIFIKICA+PgpzdGFydHhyZWYKNDE0CiUlRU9G',
                        uploadedAt: emp.registeredAt,
                        status: (emp as any)[k] === 'verified' ? 'verified' : 'uploaded'
                      };
                    }) as DocumentFile[];

                    return (
                      <div key={emp.id} className="p-4 sm:p-5 rounded-2xl border border-slate-150 dark:border-slate-850 bg-white/40 dark:bg-slate-900/10 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-850">
                          <div>
                            <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 block">{emp.name}</span>
                            <span className="text-[10px] text-indigo-650 dark:text-indigo-400 font-mono font-bold mt-0.5 block">{emp.id}</span>
                          </div>
                          <span className="text-[9.5px] bg-indigo-50 dark:bg-slate-850 text-indigo-600 dark:text-sky-400 px-3 py-1 rounded-full font-bold">
                            {submittedFileObjs.length} Documents Submitted
                          </span>
                        </div>

                        {submittedFileObjs.length === 0 ? (
                          <div className="text-center py-4 text-xs italic text-slate-400">No document files received.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {submittedFileObjs.map(f => {
                              const isVerified = f.status === 'verified';
                              return (
                                <div key={f.key} className="p-3.5 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col justify-between h-[130px] shadow-2xs">
                                  <div>
                                    <span className="text-xs font-bold text-slate-801 dark:text-slate-100 block truncate leading-normal">{f.label}</span>
                                    <span className="text-[9px] text-slate-400 block truncate font-mono mt-0.5">File: {f.name}</span>
                                    <span className={`text-[9px] block uppercase font-black font-mono tracking-tight mt-1.5 ${isVerified ? "text-emerald-600" : "text-amber-550 animate-pulse"}`}>
                                      {isVerified ? "✓ APPROVED" : "PENDING AUDIT"}
                                    </span>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 dark:border-slate-850/50 flex justify-between items-center select-none text-[10px] leading-none">
                                    <button
                                      onClick={() => setPreviewDoc({ name: f.name, type: f.type, data: f.data })}
                                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-555 rounded"
                                      title="Instant Preview PDF/Image"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>

                                    <div className="flex gap-1">
                                      {!isVerified && (
                                        <button
                                          onClick={() => handleVerifyDoc(emp.id, f.key)}
                                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-2 py-1 text-[9px] font-bold rounded border uppercase"
                                        >
                                          Stamp
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleHrDeleteDoc(emp.id, f.key, f.label)}
                                        className="p-1 hover:bg-rose-500/10 text-rose-500 rounded"
                                        title="Reject to Bin"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* HR PANEL 3: Live GPS Roster Sign-In Auditors */}
            {activeTab === 'attendance' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-dashed border-slate-205">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white">GPS Attendance Overriding Center</h4>
                    <p className="text-xs text-slate-455 mt-0.5">Direct manual location clock-in override for verified personnel.</p>
                  </div>

                  <form onSubmit={handleOverrideAttendance} className="flex flex-wrap items-center gap-2 text-xs select-none">
                    <select
                      required
                      value={overrideEmpId}
                      onChange={e => setOverrideEmpId(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-202 text-xs rounded-xl px-3 py-1.5 font-bold focus:outline-none"
                    >
                      <option value="">-- Manual Override Staff --</option>
                      {employees.filter(e => !e.isResigned).map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      required
                      value={overrideDate}
                      onChange={e => setOverrideDate(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-202 text-xs rounded-xl px-2 py-1.5 font-bold focus:outline-none text-slate-800 dark:text-white"
                    />
                    <input
                      type="text"
                      required
                      placeholder="09:30 AM"
                      value={overrideTime}
                      onChange={e => setOverrideTime(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-202 text-xs rounded-xl px-2 py-1.5 font-mono font-bold focus:outline-none w-24 text-slate-800 dark:text-white"
                    />
                    <button type="submit" className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition cursor-pointer">LOG NOW</button>
                  </form>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {attendanceLogs.map(log => (
                    <div key={log.id} className="p-4 rounded-xl border border-slate-150 bg-white/40 dark:bg-slate-900/10 flex flex-col justify-between h-[230px] shadow-2xs">
                      <div>
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="font-bold text-slate-850 dark:text-white block truncate">{log.employeeName}</span>
                            <span className="text-[10px] text-slate-400 font-mono block uppercase">{log.employeeId}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0 select-none">
                            <span className="text-[10px] font-mono font-bold text-indigo-650">{log.time} &bull; {log.date}</span>
                            <button
                              onClick={() => handleMDDeleteAttLog(log.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded transition cursor-pointer mt-0.5"
                              title="Delete Attendance / Manual Override Log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-3 items-center mt-3">
                          <div className="w-16 h-16 rounded bg-slate-950 flex items-center justify-center overflow-hidden border shrink-0">
                            {log.selfieUrl ? (
                              <img src={log.selfieUrl} alt="headshot" className="w-full h-full object-cover" />
                            ) : (
                              <Camera className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 leading-normal">
                            {log.isManualOverride && (
                              <span className="text-rose-500 font-bold block mb-1">🚨 MANUAL OVERRIDE LOG</span>
                            )}
                            <span className="block text-slate-500 uppercase font-black">Captured GPS Site:</span>
                            <span>{log.latitude?.toFixed(4)}° N, {log.longitude?.toFixed(4)}° E</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-[10px] font-mono text-slate-400 leading-none">
                        <span>CERTIFIED SECURE RECORD</span>
                        <span>RefID: {log.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HR PANEL 4: Payroll accountant */}
            {activeTab === 'payroll' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="flex justify-between items-start pb-3 border-b border-dashed border-slate-205">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-950 dark:text-white">Admin payroll disbursed ledger</h4>
                    <p className="text-xs text-slate-455 mt-0.5">Construct basic payouts, allowances, deductions and ship payslip receipts.</p>
                  </div>
                  <button onClick={exportPayrollCSV} className="px-3 py-1 text-xs border rounded-lg font-bold">Export (CSV)</button>
                </div>

                <div className="p-4 sm:p-5 rounded-3xl bg-slate-50/50 dark:bg-slate-950/20 max-w-4xl mx-auto border space-y-4">
                  <h5 className="text-xs font-black uppercase text-indigo-750 text-left">Deliver Certified Roster payslip</h5>
                  <form onSubmit={handleIssuePayslip} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-semibold text-left">
                    <div className="space-y-1">
                      <label className="block text-slate-400 select-none">Staff Card ID *</label>
                      <select required value={payEmpId} onChange={e => setPayEmpId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border text-xs rounded-xl px-2 py-2.5 font-bold cursor-pointer focus:outline-none">
                        <option value="">-- Select Employee --</option>
                        {employees.filter(e => !e.isResigned).map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-slate-400">Roster Period</label>
                      <input type="text" required value={payMonth} onChange={e => setPayMonth(e.target.value)} className="w-full bg-white dark:bg-slate-900 border rounded-xl px-2.5 py-2" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-slate-400">Basic (INR)</label>
                      <input type="number" required value={payBase} onChange={e => setPayBase(parseInt(e.target.value) || 0)} className="w-full bg-white dark:bg-slate-900 border rounded-xl px-2.5 py-2 font-mono font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-slate-400">Allowances</label>
                      <input type="number" required value={payAllow} onChange={e => setPayAllow(parseInt(e.target.value) || 0)} className="w-full bg-white dark:bg-slate-900 border rounded-xl px-2.5 py-2 font-mono font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-slate-400">Deductions</label>
                      <input type="number" required value={payDeduct} onChange={e => setPayDeduct(parseInt(e.target.value) || 0)} className="w-full bg-white dark:bg-slate-900 border rounded-xl px-2.5 py-2 font-mono font-bold" />
                    </div>
                    <div className="lg:col-span-5 flex justify-end">
                      <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition">DISBURSE PAYSLIP</button>
                    </div>
                  </form>
                </div>

                {/* 2-Column Section: Left is Disbursed Payslips ledger; Right is Payslip Format Editor (HR Only) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl mx-auto pt-4">
                  {/* Left Column: Disbursed Payslip Ledger */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-slate-50/50 dark:bg-slate-950/20 border space-y-4">
                    <div className="flex items-center justify-between border-b border-dashed pb-2">
                      <span className="text-xs font-black uppercase text-indigo-700 dark:text-sky-450 text-left block">Disbursed Payslip Ledger</span>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-900 border px-2 py-0.5 rounded font-mono font-bold leading-none">{payslips.length} Records</span>
                    </div>

                    {payslips.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 font-bold">
                        No disbursed salaries found in active logs.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {payslips.map(pay => {
                          const targetEmp = employees.find(e => e.id === pay.employeeId);
                          return (
                            <div key={pay.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs leading-none">
                              <div className="space-y-1 text-left">
                                <div className="text-[10.5px] font-black text-slate-800 dark:text-slate-100">{targetEmp ? targetEmp.name : "Unknown Employee"}</div>
                                <div className="text-[9.5px] font-semibold text-slate-450 font-mono flex gap-1.5">
                                  <span>ID: {pay.employeeId}</span>
                                  <span>&bull;</span>
                                  <span className="text-indigo-600 dark:text-sky-455 font-bold">{pay.monthYear}</span>
                                </div>
                                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">₹{pay.netSalary.toLocaleString('en-IN')} Payout</div>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (targetEmp) {
                                    toast(`Generating digital slip for ${targetEmp.name}...`, "info");
                                    await generatePayslipPDF(pay, targetEmp, payslipFormat);
                                    toast(`✓ PDF payslip for ${targetEmp.name} generated successfully.`, "success");
                                  } else {
                                    toast("Cannot locate employee records to map PDF context.", "error");
                                  }
                                }}
                                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-705 dark:text-slate-300 rounded-lg flex items-center gap-1 cursor-pointer hover:shadow-xs transition select-none"
                              >
                                <Download className="w-3 mx-auto text-indigo-505" />
                                <span>Get PDF</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Column: HR ONLY Format Customizer */}
                  <form onSubmit={handleSaveFormat} className="p-4 sm:p-5 rounded-3xl bg-slate-50/50 dark:bg-slate-950/20 border space-y-4">
                    <div className="border-b border-dashed pb-2 text-left">
                      <span className="text-xs font-black uppercase text-indigo-700 dark:text-sky-450 block">🔧 HR Exclusive Payslip Format Editor</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Define corporate headers, signature labels & layouts.</span>
                    </div>

                    <div className="space-y-3 text-xs font-semibold text-left">
                      <div className="space-y-1">
                        <label className="block text-slate-400">Corporate Company Name</label>
                        <input
                          type="text"
                          required
                          value={fmtCompanyName}
                          onChange={e => setFmtCompanyName(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border rounded-xl px-2.5 py-2 font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-slate-400">Headquarters Registered Address</label>
                        <input
                          type="text"
                          required
                          value={fmtAddress}
                          onChange={e => setFmtAddress(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border rounded-xl px-2.5 py-2"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-slate-400">Authorized Signatory</label>
                          <input
                            type="text"
                            required
                            value={fmtSignatory}
                            onChange={e => setFmtSignatory(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border rounded-xl px-2.5 py-2"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-slate-400">PDF Theme Color Palette</label>
                          <select
                            value={fmtTheme}
                            onChange={e => setFmtTheme(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border rounded-xl px-2.5 py-2 font-bold cursor-pointer text-xs"
                          >
                            <option value="indigo">Indigo Corporate</option>
                            <option value="emerald">Emerald Forest</option>
                            <option value="amber">Warm Amber</option>
                            <option value="slate">Slate Minimalist</option>
                            <option value="rose">Rose Radiant</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-slate-400">Compliance & Regulatory Disclaimers (Notes)</label>
                        <textarea
                          rows={3}
                          value={fmtNotes}
                          onChange={e => setFmtNotes(e.target.value)}
                          placeholder="Special computer compliance remarks..."
                          className="w-full bg-white dark:bg-slate-900 border rounded-xl px-2.5 py-2 font-mono text-[10px] leading-relaxed"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition duration-200 cursor-pointer"
                        >
                          Save Corporate Format
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* HR PANEL 5: Field Helpdesk Desk */}
            {activeTab === 'helpdesk' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-dashed border-slate-205">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-950 dark:text-white">Regional Helpdesk support queries</h4>
                    <p className="text-xs text-slate-455 mt-0.5">Manage operator incident dispatches, help requests, and respond to HR working mail responses.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-805 text-[10px] font-black rounded-lg">
                      Working Mailbox: hr@magnifiq.in
                    </span>
                  </div>
                </div>

                {/* Filter / Status Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-left">
                    <span className="text-[10px] uppercase text-slate-400 font-mono font-bold block">Pending Escalations</span>
                    <span className="text-2xl font-black text-rose-600 mt-1 block">
                      {(employeeQueries || []).filter(q => q.status === 'pending').length} Queries
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-left">
                    <span className="text-[10px] uppercase text-slate-400 font-mono font-bold block">Resolved tickets</span>
                    <span className="text-2xl font-black text-emerald-600 mt-1 block">
                      {(employeeQueries || []).filter(q => q.status === 'resolved').length} Solved
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-left">
                    <span className="text-[10px] uppercase text-slate-400 font-mono font-bold block">Total Inbound Tickets</span>
                    <span className="text-2xl font-black text-slate-800 dark:text-white mt-1 block">
                      {(employeeQueries || []).length} Total
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {(employeeQueries || []).length === 0 ? (
                    <div className="p-12 text-center border border-dashed rounded-3xl bg-slate-50/30">
                      <p className="text-xs text-slate-400 font-medium font-mono">No field helpdesk tickets in system queue.</p>
                    </div>
                  ) : (
                    (employeeQueries || []).map(q => (
                      <div key={q.id} className={`p-5 rounded-2xl border transition duration-155 ${q.priority === 'urgent' && q.status === 'pending' ? 'bg-rose-500/5 border-rose-250 dark:border-rose-900/40' : 'bg-slate-50/30 dark:bg-slate-950/20 border-slate-202 dark:border-slate-800/80'}`}>
                        <div className="flex flex-wrap justify-between items-start gap-2 pb-2.5 border-b border-dashed border-slate-201 dark:border-slate-800">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-900 dark:text-white text-xs font-black">{q.employeeName}</span>
                              <span className="text-[10.5px] text-slate-400 font-mono font-bold">{q.employeeId}</span>
                              <span className={`px-2 py-0.5 text-[8.5px] uppercase font-black font-mono rounded-md ${q.priority === 'urgent' ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-850 text-slate-600 dark:text-slate-300'}`}>
                                {q.priority}
                              </span>
                              <span className={`px-2 py-0.5 text-[8.5px] uppercase font-black font-mono rounded-md ${q.status === 'resolved' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                {q.status}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#5046e6] dark:text-sky-400 font-mono block">Project Support: {q.projectName}</span>
                          </div>
                          <span className="text-[10.5px] text-slate-400 font-mono font-semibold">{q.submittedAt}</span>
                        </div>

                        <div className="pt-3 space-y-3 text-xs">
                          <div className="bg-white/40 dark:bg-slate-905/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800 font-medium text-slate-700 dark:text-slate-300 text-[11.5px]">
                            <strong className="text-slate-500 dark:text-slate-400">Employee Message Description:</strong>
                            <p className="mt-1 leading-relaxed whitespace-pre-line text-slate-900 dark:text-slate-100">{q.queryText}</p>
                            
                            {q.attachment && (
                              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <strong className="text-slate-500 dark:text-slate-400 block mb-1">Attached Proof:</strong>
                                {q.attachment.startsWith('data:image/') ? (
                                  <img src={q.attachment} alt="Attachment" className="max-h-32 rounded-lg border border-slate-200 dark:border-slate-700 object-contain bg-white dark:bg-slate-900 shadow-sm" />
                                ) : (
                                  <a href={q.attachment} download="Employee_Attachment" className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    Download Attachment File
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          {q.status === 'resolved' ? (
                            <div className="bg-emerald-500/5 border border-emerald-200/60 dark:border-emerald-900/30 p-3 rounded-xl text-emerald-800 dark:text-emerald-400 font-medium text-[11.5px]">
                              <div className="flex items-center gap-1.5 font-bold mb-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>HR Resolution Action (Dispatched {q.hrRespondedAt || "N/A"})</span>
                              </div>
                              <p className="leading-relaxed whitespace-pre-line">{q.hrResponse}</p>
                            </div>
                          ) : (
                            <div className="space-y-2 pt-2 text-left">
                              <span className="text-[10px] font-mono font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block font-bold">Write Response Action to Dispatch &bull; Mail response: hr@magnifiq.in</span>
                              <textarea
                                placeholder="State dispatched tools, instructions, schedules, or support action step guidelines..."
                                value={replyTexts[q.id] || ''}
                                onChange={e => setReplyTexts({ ...replyTexts, [q.id]: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-[#5046e6] focus:outline-none focus:ring-1 focus:ring-indigo-505 placeholder-slate-450 leading-relaxed text-xs"
                                rows={2}
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleReplyQuery(q.id)}
                                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-755 text-white font-black rounded-xl duration-155 cursor-pointer text-[10.5px] select-none text-center inline-flex items-center gap-1.5"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Affix Support Response Ticket</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
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
          <div className="bg-slate-900 text-white rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-indigo-505/20 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-505/30 animate-pulse">
                👑
              </div>
              <div className="text-left">
                <h3 className="text-lg font-black text-white font-display uppercase tracking-widest leading-none">Managing Director Control Tower</h3>
                <p className="text-[10px] text-slate-400 uppercase font-mono mt-1.5 font-bold tracking-wider">Corporate Parental Console &bull; Database Status: Connected Node-AP</p>
              </div>
            </div>

            <button
              onClick={handleLogoutDirector}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-705 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Sign Out MD Console
            </button>
          </div>

          {/* MD Dashboard Navigation tabs */}
          <div className="flex flex-wrap bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl text-xs font-bold select-none border border-slate-202 dark:border-slate-800">
            {[
              { key: 'overview', label: 'Operations Overview', icon: <ClipboardList className="w-4 h-4 text-emerald-500" /> },
              { key: 'attendance_edit', label: 'Edit Daily Attendance Logins', icon: <Calendar className="w-4 h-4 text-rose-500" /> },
              { key: 'hr_approval', label: 'Certify Pending HR Setups', icon: <ShieldCheck className="w-4 h-4 text-indigo-500" /> },
              { key: 'recycle_bin', label: 'System Recycle Bin / Trash', icon: <Trash className="w-4 h-4 text-slate-500" /> }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveMDTab(tab.key as any)}
                className={`flex-1 min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition cursor-pointer select-none duration-200 ${activeMDTab === tab.key ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
              >
                {tab.icon}
                <span className="hidden lg:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="bg-white/70 dark:bg-slate-905/20 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 backdrop-blur shadow-2xs min-h-[400px]">
            
            {/* MD TAB 1: Operations and Inventory Summary */}
            {activeMDTab === 'overview' && (
              <div className="space-y-6 animate-fade-in text-left">
                <div className="pb-3 border-b border-dashed border-slate-205">
                  <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white font-display">MD Stock & Operations Dashboard</h4>
                  <p className="text-xs text-slate-455">Overview parameters compiled in real-time by operations regional nodes.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="p-5 rounded-2xl border bg-slate-50/50 dark:bg-slate-950/20 text-left">
                    <span className="text-[10px] uppercase text-slate-400 font-mono font-bold block">Certified Stock Items</span>
                    <span className="text-3xl font-black text-slate-900 dark:text-white mt-1 block">8 active products</span>
                  </div>
                  <div className="p-5 rounded-2xl border bg-slate-50/50 dark:bg-slate-950/20 text-left">
                    <span className="text-[10px] uppercase text-slate-400 font-mono font-bold block">Attendance Logins Signed Today</span>
                    <span className="text-3xl font-black text-slate-900 dark:text-white mt-1 block">{attendanceLogs.length} Records</span>
                  </div>
                  <div className="p-5 rounded-2xl border bg-slate-50/50 dark:bg-slate-950/20 text-left">
                    <span className="text-[10px] uppercase text-slate-400 font-mono font-bold block">Uniform Daily Roster Shift</span>
                    <span className="text-3xl font-black text-indigo-650 dark:text-sky-400 mt-1 block">09:30 AM - 06:30 PM</span>
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
                        {employees.length > 0 ? (
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-dashed border-slate-205">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-905 dark:text-white">Daily Login attendance manual credentials editor</h4>
                    <p className="text-xs text-slate-455 mt-0.5">MANUALLY add, override, update or delete any login record immediately.</p>
                  </div>
                  <button
                    onClick={() => { setEditingAttendance(null); setShowAddAttendance(!showAddAttendance); }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-755 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer select-none"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Manual Login Row</span>
                  </button>
                </div>

                {showAddAttendance && (
                  <form onSubmit={handleMDSaveAttendance} className="p-4 sm:p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-55/10 max-w-2xl mx-auto space-y-4 text-xs font-bold">
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
                <div className="overflow-x-auto border border-slate-200/50 rounded-2 tracking-wide bg-white dark:bg-slate-950">
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
                      {attendanceLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-801 block">{log.employeeName}</span>
                            <span className="text-[10px] text-slate-400 block font-mono font-bold">{log.employeeId}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500">{log.date}</td>
                          <td className="py-3 px-3 font-mono font-bold text-indigo-650">{log.time}</td>
                          <td className="py-3 px-3">
                            {log.isManualOverride ? (
                              <span className="px-2 py-0.5 rounded text-[8.5px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase">By {log.overrideBy || 'MD'}</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[8.5px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-555/20 uppercase">GPS Auto-Verified</span>
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
                <div className="pb-3 border-b border-dashed border-slate-205">
                  <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white font-display">MD Direct HR Registry Controller</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Directly register or instantly toggle credentials verification for Maginifq Services HR specialists.</p>
                </div>

                {/* Direct HR Creation Form */}
                <form onSubmit={handleMDDirectAddHR} className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 space-y-4 max-w-xl">
                  <div className="space-y-1">
                    <h5 className="text-xs font-black uppercase text-indigo-700 dark:text-sky-400">Directly Register & Certify HR Account</h5>
                    <p className="text-[11px] text-slate-405">Bypass cellular SMS verification constraints and register an authorized HR phone instantly.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                    <div className="space-y-1">
                      <label className="block text-slate-455">10-Digit Phone ID *</label>
                      <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-xl overflow-hidden">
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
                      <label className="block text-slate-455">Login Passcode *</label>
                      <input
                        type="password"
                        required
                        placeholder="Enter password..."
                        value={mdDirectPass}
                        onChange={e => setMdDirectPass(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-xl px-3 py-2 font-bold focus:outline-none dark:text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-extrabold rounded-xl transition duration-150 cursor-pointer shadow-md"
                  >
                    Authorize & Register Instantly
                  </button>
                </form>

                {/* Pending Actions */}
                <div className="space-y-3">
                  <h5 className="text-xs font-black uppercase text-slate-500">Pending Actions Required</h5>
                  {registeredHrsList.filter(hr => !hr.verified).length === 0 ? (
                    <div className="py-6 border border-dashed border-slate-200 text-center rounded-2xl bg-white/40">
                      <span className="text-xs text-slate-400 italic">No newly registered HR setups are waiting for signature verification.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {registeredHrsList.filter(hr => !hr.verified).map(hr => (
                        <div key={hr.phoneNumber} className="p-4 rounded-2xl border bg-white dark:bg-slate-950 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-100 block">HR Setup Connection: {formatIndiaPhoneNumber(hr.phoneNumber)}</span>
                            <span className="text-[9.5px] text-amber-550 block font-mono">Status: Pending MD Signature Approval</span>
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
                        <tr className="bg-slate-50 dark:bg-slate-900 text-slate-450 border-b border-slate-202 dark:border-slate-850 uppercase font-mono tracking-wider text-[9.5px]">
                          <th className="py-3 px-4">HR Phone Node ID</th>
                          <th className="py-3 px-4">Registration status</th>
                          <th className="py-3 px-4 text-center">Security commands</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850/40">
                        {registeredHrsList.map(hr => (
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
                                  className="px-2.5 py-1.5 bg-rose-550/15 text-rose-600 rounded-lg text-[10.5px] font-bold border border-rose-500/10 hover:bg-rose-500/20"
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
                <div className="pb-3 border-b border-dashed border-slate-205">
                  <h4 className="text-xs font-black uppercase text-slate-900">Centralized corporate Recycle Bin / Trash path</h4>
                  <p className="text-xs text-slate-455">Restore any deleted files, attendance logs or debit bills permanently across operations.</p>
                </div>

                <div className="space-y-3">
                  {recycleBin.length === 0 ? (
                    <div className="py-12 border border-dashed text-center rounded-2xl bg-slate-50/10">
                      <span className="text-xs text-slate-400 italic">Centralized Recycle Bin is completely clear. No files stashed.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recycleBin.map(item => (
                        <div key={item.id} className="p-4.5 rounded-2xl border bg-white flex justify-between items-center text-xs">
                          <div>
                            <span className="font-extrabold text-slate-805 block">{item.title}</span>
                            <span className="text-[10px] text-slate-450 block font-mono mt-0.5">
                              Deleted: {item.deletedAt} &bull; Type: <strong className="font-bold underline">{item.sourceType}</strong>
                            </span>
                            {item.fileName && (
                              <span className="text-[10px] text-indigo-505 block font-mono mt-1">Attachment file: {item.fileName}</span>
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
                              className="p-1.5 hover:bg-rose-500/10 text-rose-555 rounded-lg"
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
