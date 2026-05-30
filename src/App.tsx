/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Employee, InventoryItem, ShiftAssignment, AttendanceLog, Payslip, HrUser, PayslipFormat, EmployeeHelpQuery 
} from './types';
import CompanyLogo from './components/CompanyLogo';
import logoAsset from './assets/images/magnifiq_logo_official_1779711238353.png';
import towerAsset from './assets/images/lattice_tower_telecom_1779711889458.png';
import railwayAsset from './assets/images/railway_signaling_system_1779711942256.png';
import solarAsset from './assets/images/utility_solar_farm_1779711926466.png';
import railwaySplicingAsset from './assets/images/railway_ofc_splicing_1779715300000_png_1779715310052.png';
import rfEngineeringAsset from './assets/images/rf_engineering_telecom_1779711997664.png';
import towerMaintenanceAsset from './assets/images/tower_maintenance_climbing_1779712034444.png';
import fiberMaintenanceAsset from './assets/images/fiber_optic_maintenance_1779711909109.png';
import healthScreeningAsset from './assets/images/health_screening_industrial_1779712016590.png';
import fiberBrochure1 from './assets/images/fiber_deployment_maintenance_1779712693892_png_1779715221985.png';
import fiberBrochure2 from './assets/images/ofc_glance_1779712716174_png_1779715240305.png';
import fiberBrochure3 from './assets/images/fiber_om_services_1779712726743_png_1779715258021.png';
import rfBrochure from './assets/images/rf_engineering_brochure_1779715959018.png';
import networkBrochure from './assets/images/network_engineering_brochure_1779715980831.png';
import telecomConstBrochure1 from './assets/images/telecom_construction_brochure_1779716217653.png';
import telecomConstBrochure2 from './assets/images/telecom_high_risk_rectification_1779716240839.png';
import towerMaintBrochure1 from './assets/images/tower_maintenance_brochure_1_1779716383286.png';
import towerMaintBrochure2 from './assets/images/tower_maintenance_brochure_2_1779716400827.png';
import towerMaintBrochure3 from './assets/images/tower_maintenance_brochure_3_1779716415768.png';
import solarBrochure1 from './assets/images/solar_energy_brochure_1_1779716535610.png';
import solarBrochure2 from './assets/images/solar_energy_brochure_2_1779716553588.png';
import railwayBrochure1 from './assets/images/railway_brochure_1_1779716773130.png';
import railwayBrochure2 from './assets/images/railway_brochure_2_1779716804362.png';
import healthBrochure1 from './assets/images/health_brochure_1_1779716950153.png';
import healthBrochure2 from './assets/images/health_brochure_2_1779716966828.png';
import InventoryTracker, { INITIAL_INVENTORY } from './components/InventoryTracker';
import HrPortal from './components/HrPortal';
import EmployeePortal from './components/EmployeePortal';
import { 
  Sun, Moon, ShieldCheck, Layers, Award, HardHat, FileCheck, Phone, Mail, 
  MapPin, Clock, ArrowRight, Menu, X, ChevronRight, Activity, Zap, CheckCircle2,
  RefreshCw, Briefcase, ShieldAlert, Globe, Building2, UserCheck, FileSpreadsheet,
  TrendingUp, Terminal, Wifi, Train, Landmark, Sparkles, Send, Users
} from 'lucide-react';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('mspl-theme');
    // Default to false (Light Mode) to align with mockups
    return saved ? saved === 'dark' : false;
  });
  
  const [activeSection, setActiveSection] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Employee Support Form Inputs
  const [supportEmpId, setSupportEmpId] = useState('');
  const [supportEmpName, setSupportEmpName] = useState('');
  const [supportProject, setSupportProject] = useState('Indus Guntur Tower Erection Scope');
  const [supportPriority, setSupportPriority] = useState<'normal' | 'urgent'>('normal');
  const [supportText, setSupportText] = useState('');
  const [supportAttachment, setSupportAttachment] = useState<string | null>(null);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  // Ticket Status Check State
  const [checkTicketId, setCheckTicketId] = useState('');
  const [checkedTicketResult, setCheckedTicketResult] = useState<EmployeeHelpQuery | null>(null);
  const [checkedTicketError, setCheckedTicketError] = useState('');

  const handleCheckTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckedTicketError('');
    setCheckedTicketResult(null);
    if (!checkTicketId.trim()) return;
    
    // search across employeeQueries
    const found = employeeQueries.find(
      q => q.id.toLowerCase() === checkTicketId.trim().toLowerCase()
    );
    if (found) {
      setCheckedTicketResult(found);
    } else {
      setCheckedTicketError('No ticket found with this precise ID.');
    }
  };

  // Interactive Live Console Terminal Modal State
  const [activeTerminalSector, setActiveTerminalSector] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isTerminalLoading, setIsTerminalLoading] = useState(false);

  // Core State Engine (Local Storage persistent falling back to robust seeds)
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('mspl_employees');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      { id: 'MSPL-EMP-101', role: 'manager', name: 'Ajay Kumar', status: 'approved', registeredAt: '05/10/2016', phoneNumber: '9845012345', password: 'password123', leaveBalance: { casual: 6, sick: 9, annual: 12 } },
      { id: 'MSPL-EMP-102', role: 'employee', name: 'Ramesh Shinde', status: 'approved', registeredAt: '05/12/2016', phoneNumber: '9440123456', password: 'password123', leaveBalance: { casual: 8, sick: 10, annual: 15 } },
      { id: 'MSPL-EMP-150', role: 'employee', name: 'Suman Reddy', status: 'pending', registeredAt: '05/20/2016', phoneNumber: '9650012345', password: 'password123', leaveBalance: { casual: 8, sick: 10, annual: 15 } }
    ];
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('mspl_inventory');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_INVENTORY;
  });

  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>(() => {
    const saved = localStorage.getItem('mspl_attendance_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      { id: 'att-1', employeeId: 'MSPL-EMP-101', employeeName: 'Ajay Kumar', date: '2026-05-23', time: '09:12 AM', latitude: 16.3067, longitude: 80.4365, isManualOverride: false, selfieUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' }
    ];
  });

  const [payslips, setPayslips] = useState<Payslip[]>(() => {
    const saved = localStorage.getItem('mspl_payslips');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      { id: 'pay-101-MAY', employeeId: 'MSPL-EMP-101', monthYear: 'May 2026', basicSalary: 35000, allowances: 5000, deductions: 1200, netSalary: 38800, status: 'paid', deliveredAt: '05/23/2026 10:15 AM' }
    ];
  });

  const [payslipFormat, setPayslipFormat] = useState<PayslipFormat>(() => {
    const saved = localStorage.getItem('mspl_payslip_format');
    const defaultAddress = "H. No. 1-8-1, North Kamala Nagar, Near ETDC Building, ECIL, Hyderabad. Telangana. India. Pin - 500062. Email.id: hr@magnifiq.in";
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.companyAddress && parsed.companyAddress.includes("Vidya Nagar")) {
          parsed.companyAddress = defaultAddress;
        } else {
          // Force it just to be safe
          parsed.companyAddress = defaultAddress;
        }
        return parsed;
      } catch {}
    }
    return {
      companyName: "Magnifiq Services Private Limited",
      companyAddress: defaultAddress,
      logoUrl: logoAsset,
      authorizedSignatory: "Managing Director, MSPL",
      themeColor: "indigo",
      notes: "This is a computer-generated document under regional operational registries and requires no physical stamp once digital pass key is verified by the MD Parental Terminal."
    };
  });

  const [employeeQueries, setEmployeeQueries] = useState<EmployeeHelpQuery[]>(() => {
    const saved = localStorage.getItem('mspl_employee_queries');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: "q-1",
        employeeId: "MSPL-EMP-101",
        employeeName: "Ajay Kumar",
        projectName: "Indus Guntur Tower Erection Scope",
        priority: "urgent",
        queryText: "Need high-tension climbing rigging kit. Currently working at 45m elevation on Guntur municipal lines. Local field lead is out of station.",
        submittedAt: "05/24/2026 02:45 PM",
        status: "pending"
      },
      {
        id: "q-2",
        employeeId: "MSPL-EMP-102",
        employeeName: "Ramesh Shinde",
        projectName: "Vijayawada Jio Backbone OFC Fusion",
        priority: "normal",
        queryText: "Fusion splicer battery calibration failed. Requesting replacement buffer pack to prevent task timeline delays.",
        submittedAt: "05/23/2026 11:30 AM",
        status: "resolved",
        hrResponse: "Approved backup battery pack dispatch from Guntur warehouse on site van. Scheduled delivery within 24 hours.",
        hrRespondedAt: "05/23/2026 04:30 PM"
      }
    ];
  });

  // --- Managing Director Auth State ---
  const [isDirectorLoggedIn, setIsDirectorLoggedIn] = useState(() => {
    return localStorage.getItem('mspl_director_logged_in') === 'true';
  });

  // Current Logged In Employee
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(() => {
    const saved = localStorage.getItem('mspl_current_employee');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return null;
  });

  // Global Dialog notification modallers
  const [modalType, setModalType] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<{ msg: string; type: string } | null>(null);

  // Persisters
  useEffect(() => {
    localStorage.setItem('mspl_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('mspl_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('mspl_attendance_logs', JSON.stringify(attendanceLogs));
  }, [attendanceLogs]);

  useEffect(() => {
    localStorage.setItem('mspl_payslips', JSON.stringify(payslips));
  }, [payslips]);

  useEffect(() => {
    localStorage.setItem('mspl_payslip_format', JSON.stringify(payslipFormat));
  }, [payslipFormat]);

  useEffect(() => {
    localStorage.setItem('mspl_employee_queries', JSON.stringify(employeeQueries));
  }, [employeeQueries]);

  useEffect(() => {
    if (currentEmployee) {
      localStorage.setItem('mspl_current_employee', JSON.stringify(currentEmployee));
    } else {
      localStorage.removeItem('mspl_current_employee');
    }
  }, [currentEmployee]);

  useEffect(() => {
    localStorage.setItem('mspl-theme', isDarkMode ? 'dark' : 'light');
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle active navigation section mapping with viewport scroll behavior
  useEffect(() => {
    const sections = ['home', 'about', 'services', 'portal', 'contact'];
    
    const handleScroll = () => {
      const scrollPos = window.scrollY + 120;
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          const offsetTop = element.offsetTop;
          const offsetHeight = element.offsetHeight;
          if (scrollPos >= offsetTop && scrollPos < offsetTop + offsetHeight) {
            setActiveSection(section);
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const triggerToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => {
      setToastMessage(prev => prev?.msg === msg ? null : prev);
    }, 4000);
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, confirmText = "Confirm", isDanger = false) => {
    setModalType({ title, message, onConfirm, confirmText, isDanger });
  };

  const scrollSmoothTo = (id: string, portalKey?: string) => {
    setIsMobileMenuOpen(false);
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const topOffset = element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
    }
    if (portalKey) {
      setTimeout(() => {
        const event = new CustomEvent('mspl-jump-portal', { detail: { portalId: portalKey } });
        window.dispatchEvent(event);
      }, 300);
    }
  };

  // Clock-In handler
  const handleEmployeeClockIn = (selfieUrl: string, lat: number, lng: number, customDate?: string, customTime?: string) => {
    if (!currentEmployee) return;
    const isManual = !!(customDate || customTime);
    const newLog: AttendanceLog = {
      id: `att-selfie-${Date.now()}`,
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      date: customDate || new Date().toISOString().substring(0, 10),
      time: customTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      selfieUrl: selfieUrl || undefined,
      latitude: lat,
      longitude: lng,
      isManualOverride: isManual,
      overrideBy: isManual ? 'Self-logged' : undefined
    };
    setAttendanceLogs([newLog, ...attendanceLogs]);
  };

  const handleUpdateEmployee = (updated: Employee) => {
    setCurrentEmployee(updated);
    setEmployees(employees.map(emp => emp.id === updated.id ? updated : emp));
  };

  // Keep a map of regional support contacts for employees
  const REGIONAL_SUPPORTS = {
    "Indus Guntur Tower Erection Scope": {
      coordinator: "K. Ramakrishna (Guntur Operations Center Lead)",
      phone: "+91 94401 23456",
      email: "guntur.field@magnifiq.in",
      workspace: "Sector 3 Heavy Rigging Yard, Guntur",
      prioLevel: "Level-1 Support"
    },
    "Vijayawada Jio Backbone OFC Fusion": {
      coordinator: "P. Srinivasa Rao (Krishna Division OFC Desk)",
      phone: "+91 98480 98765",
      email: "vijayawada.ofc@magnifiq.in",
      workspace: "Benz Circle Junction Hub Office, Vijayawada",
      prioLevel: "Level-1 Support"
    },
    "Airtel Nellore Microwave Calibration": {
      coordinator: "D. Venkat Reddy (South Coastal Calibration Wing)",
      phone: "+91 92464 11223",
      email: "nellore.mw@magnifiq.in",
      workspace: "GT Road Calibrators Annex, Nellore",
      prioLevel: "Level-1 Support"
    },
    "Railway VHF Ongole Signal Trenching": {
      coordinator: "M. Bhaskara Rao (Central Railway Liaison)",
      phone: "+91 96500 55443",
      email: "ongole.vhf@magnifiq.in",
      workspace: "Railway Junction Cabin B Area, Ongole",
      prioLevel: "Level-1 Support"
    },
    "Tenali Solar MW Utility Grid": {
      coordinator: "G. Satyanarayana (Renewable Rigging Wing Supervisor)",
      phone: "+91 99890 88776",
      email: "tenali.solar@magnifiq.in",
      workspace: "Chinaravuru Park Solar Grid Substation, Tenali",
      prioLevel: "Level-1 Support"
    }
  };

  useEffect(() => {
    if (currentEmployee) {
      setSupportEmpId(currentEmployee.id);
      setSupportEmpName(currentEmployee.name);
    }
  }, [currentEmployee]);

  // Submit Helpdesk Query direct dispatcher
  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportEmpId.trim() || !supportEmpName.trim() || !supportText.trim()) {
      triggerToast('Please fill out all required helpdesk parameters.', 'error');
      return;
    }
    const newQuery: EmployeeHelpQuery = {
      id: `q-${Date.now()}`,
      employeeId: supportEmpId.trim().toUpperCase(),
      employeeName: supportEmpName.trim(),
      projectName: supportProject,
      priority: supportPriority,
      queryText: supportText.trim(),
      attachment: supportAttachment,
      submittedAt: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      status: 'pending'
    };
    setEmployeeQueries([newQuery, ...employeeQueries]);
    triggerToast(`✓ Help query dispatched successfully.`, 'success');
    setSubmittedTicketId(newQuery.id);
    setSupportText('');
    setSupportAttachment(null);
  };

  // Open testing terminal with simulated diagnostics log
  const handleOpenDiagnostics = (sector: string) => {
    setActiveTerminalSector(sector);
    setIsTerminalLoading(true);
    setTerminalLogs([`Initializing MSPL secure testing channel for: ${sector.toUpperCase()}...`]);
    
    setTimeout(() => {
      const seedLogs = [
        `[AUDIT] Direct Subcontractor Cryptography Key handshake: SUCCESS`,
        `[TELEMETRY] Terminal GPS lock status: FIXED at Depot Guntur HQ`,
        `[NETWORK] Frequency Node calibration check: 18 GHz Carrier Signal Active`,
        `[SECURITY] CPWD Standard Protocol & ISO Certification validated`,
        `[OUTPUT] Active power grid relay sync check: SLA compliance 99.8% OK`,
        `[SUCCESS] Diagnostics completed and certified for current engineering session.`
      ];
      
      let step = 0;
      const interval = setInterval(() => {
        if (step < seedLogs.length) {
          setTerminalLogs(prev => [...prev, seedLogs[step]]);
          step++;
        } else {
          clearInterval(interval);
          setIsTerminalLoading(false);
        }
      }, 350);
    }, 500);
  };

  // Service Detail Modal state
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [enlargedBrochureImg, setEnlargedBrochureImg] = useState<string | null>(null);

  const COMPANY_SERVICES = [
    {
      id: "network-engineering",
      title: "Network Engineering Services & RF Engineering Services",
      icon: <Wifi className="w-5 h-5 text-indigo-600" />,
      imageUrl: rfEngineeringAsset,
      shortDesc: "Comprehensive wireless network designs including 3G, 4G, 5G and Broadband networks.",
      category: "CORE TELECOM",
      brochure: [rfBrochure, networkBrochure],
      details: [
        "Network Engineering Services and RF Engineering Services are provided for all wireless networks such as 3G, 4G, 5G and Wireless Broadband networks.",
        "The skilled and consummate service team ensures that the network design with its multi-technology capabilities meets the performance objectives of customers.",
        "BTS Installation, Integration and Commissioning.",
        "Microwave Installation and Commissioning.",
        "Installation and Commissioning of ODSC, UBR, RRH, NodeB, Wi-Fi Network equipment.",
        "On going Up gradation and Enhancement.",
        "Installation and commissioning of Outdoor small cells.",
        "Radio Network Design & Planning.",
        "Transmission Network Design & Planning.",
        "Microwave Line of Sight Survey.",
        "Microwave Link Budgeting and Link Engineering.",
        "RF Drive Test & Network Optimization."
      ]
    },
    {
      id: "telecom-construction",
      title: "Telecom Site Construction & Equipment Installation",
      icon: <Layers className="w-5 h-5 text-blue-600" />,
      imageUrl: towerAsset,
      shortDesc: "High-quality telecom tower installation and maintenance services across India.",
      category: "CONSTRUCTION",
      brochure: [telecomConstBrochure1, telecomConstBrochure2],
      details: [
        "Qualified and competent in-house teams at Magnific Services are committed to delivering high-quality telecom tower installation services across India.",
        "Ensuring the seamless and efficient expansion of telecommunication networks.",
        "Our expertise spans a wide range of telecom tower services, including the construction, installation, and maintenance of towers, along with site survey, Whether it's in urban, rural, or remote locations.",
        "Ground Based Towers, Roof Top Towers, Roof Top Poles & Wall Mounted Poles.",
        "Site detailed Survey and foundations design.",
        "Construction of Foundations for Tower, Shelter & DG and other related civil works.",
        "Tower installation and painting.",
        "Indoor & Outdoor electrical works including lightening arrestors & aviation lamps.",
        "Supply and installation of infrastructure items like Equipment shelters, A/Cs, DG, Batteries & Earthing System.",
        "EB Liaising for power connection at cell sites."
      ]
    },
    {
      id: "tower-maintenance",
      title: "Tower Maintenance Services",
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      imageUrl: towerMaintenanceAsset,
      shortDesc: "Inspecting, repairing, and optimizing telecom towers to ensure peak performance.",
      category: "MAINTENANCE",
      brochure: [towerMaintBrochure1, towerMaintBrochure2, towerMaintBrochure3],
      details: [
        "Cell tower maintenance is the process of inspecting, repairing, and optimizing telecom towers to ensure they function at their best.",
        "It includes checking structural integrity, testing equipment, and performing necessary repairs to prevent breakdowns.",
        "Regular maintenance is important for keeping towers compliant with regulatory RF Compliance standards.",
        "Magnifiq Services provide complete Turnkey solutions for Telecom Tower Maintenance activities.",
        "Pre-Deployment: Pre-site survey / Joint-site Survey, Detailed survey for database updation.",
        "Deployment: Project Coordination & Site access Clearances, Tower Tightening from top to bottom, Missing / rusted bolts and nuts replacement, Zinc spray Treatment for rusted areas.",
        "Post deployment: Tower Rectification works & Corrective Maintenance, Defect Rectification, Tower Folder update and submission, Update of Over / Under Loaded Towers, Recommendation for Strengthening of Towers."
      ]
    },
    {
      id: "fiber-deployment",
      title: "Fiber Deployment & Maintenance (OFC O&M)",
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      imageUrl: fiberMaintenanceAsset,
      shortDesc: "End-to-end optical Fiber cable (OFC) laying and installation services.",
      category: "FIBER OPTICS",
      brochure: [fiberBrochure1, fiberBrochure2, fiberBrochure3],
      details: [
        "Magnifiq Services specialize in providing end-to-end optical Fiber cable (OFC) laying and installation services that enable seamless connectivity and digital transformation.",
        "With advanced techniques, a skilled workforce, and a commitment to excellence, we deliver robust and reliable solutions for telecommunication networks.",
        "OFC & FTTX Deployment: Route Surveys, Planning and Network Dimensioning, Project Management & ROW Clearances, Trenching, Ducting and Blowing, Splicing, Jointing and FDMS Equipment installation, Testing and Integration, As Built Drawings and documentation on GIS.",
        "Preventive & Corrective O&M: Technology Upgrades, Managed services, Audit services.",
        "OFC Operation & Maintaining: OFC Routes / Patrolling project of Telco's NLD or Backbone OFC Route, Deployment of FRT Teams with vehicles for 24X7 services, Preventive & Corrective maintenance, Breakdown OFC Maintenance, Compliance of SLA & reporting."
      ]
    },
    {
      id: "solar-energy",
      title: "Solar & Energy Management Services",
      icon: <Sun className="w-5 h-5 text-yellow-500" />,
      imageUrl: solarAsset,
      shortDesc: "Implementation and management of solar projects with an experienced technical team.",
      category: "RENEWABLES",
      brochure: [solarBrochure1, solarBrochure2],
      details: [
        "Magnific Services has a strong technical team to implement the solar projects.",
        "The project management team is experienced and accomplished to manage and execute all activities from site survey to integration.",
        "The team Plans and Manages the Project to meet Time Lines."
      ]
    },
    {
      id: "railway-signalling",
      title: "Railway Signalling & Communication Network",
      icon: <Train className="w-5 h-5 text-slate-700" />,
      imageUrl: railwayAsset,
      shortDesc: "Specialized cable route planning and signalling system modifications for railways.",
      category: "RAILWAYS",
      brochure: [railwayBrochure1, railwayBrochure2],
      details: [
        "Detailed route survey and finalization of cable route plan.",
        "Trenching, Ducting and Laying of Signalling and Quad cables.",
        "Modification of existing Track circuit and signalling system.",
        "Equipment placement and connectivity at New Switching and OFC huts.",
        "Commissioning of HPR / DPR in yards and making existing system RE fit.",
        "Commissioning of blocks by installing UFSBI."
      ]
    },
    {
      id: "health-screening",
      title: "Health Screening Services",
      icon: <Activity className="w-5 h-5 text-blue-500" />,
      imageUrl: healthScreeningAsset,
      shortDesc: "Dedicated health screening solutions as part of our diversified service portfolio.",
      category: "HEALTHCARE",
      brochure: [healthBrochure1, healthBrochure2],
      details: [
        "Magnifiq Services holds the baton as a pioneer company to offer a complete range of Telecom services, but also maintains a healthcare division.",
        "Details for Health Screening Services are delivered through our specialized medical practitioners and field health teams.",
        "Health screening units are deployed for industrial safety and employee wellness audits."
      ]
    }
  ];

  return (
    <div id="app-root-container" className={`min-h-screen font-sans transition-all duration-300 selection:bg-indigo-600 selection:text-white ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      
      {/* Official Background Watermark Logo */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center opacity-[0.03] dark:opacity-[0.02]">
        <img 
          src={logoAsset} 
          alt="Watermark" 
          className="w-[80vw] max-w-[1000px] grayscale select-none"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* TOP HEADER - Styled exactly according to image 1 */}
      <header className="sticky top-0 left-0 right-0 z-50 h-16 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between transition-all">
        <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={() => scrollSmoothTo('home')}>
          {/* Brand Mark Company Logo */}
          <div className="flex items-center gap-2.5">
            <CompanyLogo className="w-8 h-8 select-none" />
            <div className="text-left shrink-0 font-display">
              <span className="text-base font-black uppercase tracking-widest text-[#0077b6] dark:text-[#00b4d8] leading-none block font-display">MAGNIFIQ</span>
              <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest leading-none block mt-0.5">SERVICES PRIVATE LIMITED</span>
            </div>
          </div>
        </div>

        {/* Horizontal Navigation Menu (Image 1 Centered design) */}
        <nav className="hidden md:flex items-center space-x-6 font-sans">
          {[
            { id: 'home', label: 'Home' },
            { id: 'about', label: 'About' },
            { id: 'services', label: 'Services' },
            { id: 'portal', label: 'Work Portal' },
            { id: 'contact', label: 'Contact' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => scrollSmoothTo(item.id)}
              className={`text-xs font-bold leading-none py-1 relative transition duration-150 cursor-pointer ${
                activeSection === item.id 
                  ? "text-indigo-650 dark:text-sky-400" 
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <span>{item.label}</span>
              {activeSection === item.id && (
                <span className="absolute bottom-[-18px] left-0 right-0 h-[3px] bg-indigo-650 dark:bg-sky-400 rounded-t-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Action Widgets right corner */}
        <div className="flex items-center space-x-3">
          {/* Active online state indicator */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-250 dark:border-emerald-900/30">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            <span>OPERATIONAL INBOUND</span>
          </div>

          {/* Theme Switcher */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-150 cursor-pointer"
            title="Toggle theme mode"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-[#5046e6]" />}
          </button>

          {/* Styled purple button exactly like image 1 */}
          <button
            onClick={() => scrollSmoothTo('portal')}
            className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-[11px] uppercase tracking-wider py-2 px-4 shadow-sm hover:shadow active:scale-95 transition duration-150 rounded-lg cursor-pointer flex items-center gap-1.5 shrink-0 font-display"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>WORK PORTAL</span>
          </button>

          {/* Mobile hamburger icon trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 duration-150 cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MOBILE MENU CORNER DRAWER */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-b border-slate-201 dark:border-slate-850 overflow-hidden select-none">
          <div className="px-6 py-5 flex flex-col gap-2.5 text-left">
            {[
              { label: "Home / Operations", id: "home" },
              { label: "Corporate About", id: "about" },
              { label: "Our Services Divisions", id: "services" },
              { label: "Access Security Portal", id: "portal" },
              { label: "Contact HQ Board", id: "contact" }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => scrollSmoothTo(item.id)}
                className={`text-left w-full py-2 px-3 rounded-lg text-xs font-bold tracking-wide transition ${activeSection === item.id ? "bg-indigo-50 dark:bg-indigo-950/40 text-[#5046e6] dark:text-sky-400" : "text-slate-600 dark:text-slate-305 hover:bg-slate-50 dark:hover:bg-slate-900/50"}`}
              >
                {item.label}
              </button>
            ))}
            <hr className="border-slate-100 dark:border-slate-800 my-1" />
            <button
              onClick={() => scrollSmoothTo('portal')}
              className="w-full text-center py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-650 hover:bg-indigo-750 rounded-xl shadow-md"
            >
              Access Secure Work Portal
            </button>
          </div>
        </div>
      )}

      {/* Main Container Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 space-y-24">
        
        {/* ================= HERO SECTION (Image 1 & 2 design matching) ================= */}
        <section id="home" className="text-center space-y-10 pt-8 relative">
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Glowing badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50/70 border border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/50 rounded-full text-[10.5px] font-bold text-indigo-700 dark:text-sky-401 tracking-wide">
              <Activity className="w-3.5 h-3.5 text-[#5046e6] animate-pulse" />
              <span>India’s Leading TELCO & Solar Infrastructure Partner</span>
            </div>

            {/* Main title from markup */}
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                Magnifiq Services Private Limited
              </h1>
              <p className="text-xs sm:text-sm font-black tracking-widest text-[#5046e6] uppercase">
                (Formerly known as Tel Towers Private Limited)
              </p>
            </div>

            {/* Engineering text subheading */}
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 bg-clip-text text-transparent font-display">
              Engineering Telecommunication & Clean Energy Grids
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium max-w-3xl mx-auto">
              Erecting heavy lattice structures, managing high-density fiber backhauls, deploying critical railway signaling, and developing utility-scale PV solar installations across South and West India. Delivering turnkey precision with elite safety compliance.
            </p>

            {/* Grid buttons matching Image 2 */}
            <div className="flex flex-wrap justify-center gap-3.5 pt-3">
              <button
                onClick={() => scrollSmoothTo('portal')}
                className="px-6 py-3 bg-[#5046e6] hover:bg-indigo-750 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg hover:shadow-indigo-500/20 active:scale-95 duration-150 cursor-pointer shadow-[#5046e6]/25"
              >
                <span>Access Work Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollSmoothTo('services')}
                className="px-6 py-3 border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-50 transition duration-150 cursor-pointer"
              >
                Explore Divisions
              </button>
            </div>
          </div>

          {/* Bento stats container layout matching image 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto text-left relative pt-4">
            
            {/* Direct large compliance progress bento card */}
            <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm relative flex flex-col justify-between overflow-hidden group hover:shadow-md transition duration-200">
              {/* Background Tower Image */}
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-30 dark:opacity-45 pointer-events-none group-hover:scale-105 transition-transform duration-700 ease-out">
                <img 
                  src={towerAsset} 
                  alt="Telecom Tower" 
                  className="w-full h-full object-cover object-center brightness-110 contrast-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/40 to-white dark:via-slate-900/40 dark:to-slate-900" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[8.5px] font-black bg-indigo-500/10 text-[#5046e6]">PRIMARY SHARD</span>
                    <span className="px-2.5 py-0.5 rounded text-[8.5px] font-black bg-teal-500/10 text-teal-600">ISO CERTIFIED</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-550 dark:bg-indigo-950/20">
                    <Wifi className="w-4 h-4 text-[#5046e6]" />
                  </div>
                </div>

                <div className="space-y-6 mt-2">
                  <div>
                    <span className="text-4xl font-extrabold tracking-tight text-[#5046e6] block group-hover:scale-102 transition duration-250">
                      4,850+
                    </span>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest leading-none block mt-1">Towers Erected</span>
                  </div>

                  <div className="space-y-2.5 max-w-sm">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-400 uppercase tracking-wider">Operational Target Check</span>
                      <span className="text-indigo-650 font-black">94% Target Completion</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-indigo-650 rounded-full" style={{ width: '94%' }} />
                    </div>
                  </div>

                  <p className="text-xs text-slate-455 font-semibold max-w-md">
                    Completed & certified telecom structures, telecom towers, and greenfield arrays.
                  </p>
                </div>
              </div>
            </div>

            {/* Stacked side columns */}
            <div className="grid grid-cols-1 gap-6">
              
              {/* Card 2: Railway Sites */}
              <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between relative overflow-hidden group">
                {/* Background Railway Image */}
                <div className="absolute top-0 right-0 w-3/4 h-full opacity-30 dark:opacity-45 pointer-events-none group-hover:scale-105 transition-transform duration-700 ease-out z-0">
                  <img 
                    src={railwaySplicingAsset} 
                    alt="OFC Splicing Networks" 
                    className="w-full h-full object-cover object-center brightness-110 contrast-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/40 to-white dark:via-slate-900/40 dark:to-slate-900" />
                </div>

                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-slate-800/40 flex items-center justify-center">
                      <Train className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-black tracking-wider text-emerald-600 uppercase font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none block">320+</span>
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block">Railway Sites</span>
                    <p className="text-[11.5px] text-slate-450 leading-relaxed font-medium max-w-[180px]">
                      Commissioned signaling & OFC cabins on active rail corridors.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3: Solar MW Setup */}
              <div className="rounded-3xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between relative overflow-hidden group">
                {/* Background Solar Image */}
                <div className="absolute top-0 right-0 w-3/4 h-full opacity-30 dark:opacity-45 pointer-events-none group-hover:scale-105 transition-transform duration-700 ease-out z-0">
                  <img 
                    src={solarAsset} 
                    alt="Solar Farm" 
                    className="w-full h-full object-cover object-center brightness-110 contrast-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/40 to-white dark:via-slate-900/40 dark:to-slate-900" />
                </div>

                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-slate-800/40 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 text-[8.5px] font-black rounded uppercase font-mono">RENEWABLE</span>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none block">145+ MW</span>
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block">Solar MW Setup</span>
                    <p className="text-[11.5px] text-slate-450 leading-relaxed font-medium max-w-[180px]">
                      High-yield photovoltaic grid arrays engineered for solar parks.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Prime Clients Block matching Mockup */}
          <div className="max-w-4xl mx-auto py-2 flex flex-col items-center space-y-4">
            <div className="flex items-center gap-2 justify-center">
              <span className="text-xs font-black uppercase text-slate-500 tracking-widest">PRIME CLIENTS</span>
              <span className="bg-indigo-600/10 text-[#5046e6] text-[8.5px] font-black px-2 py-0.5 rounded border border-indigo-500/10 mt-[-2px]">CORE PARTNERS</span>
            </div>
            <p className="text-[11.5px] text-slate-455 font-bold mt-1">Direct authorized vendor status and contract operations with Tier-1 giants.</p>
            <div className="flex flex-wrap justify-center items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-white dark:bg-slate-900 text-[10px] font-black text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                INDUS
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-white dark:bg-slate-900 text-[10px] font-black text-indigo-600">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                JIO
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-white dark:bg-slate-900 text-[10px] font-black text-rose-600">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                ARTL
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-white dark:bg-slate-900 text-[10px] font-black text-slate-600">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                RLWY
              </div>
              <div className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 border border-dashed">
                +4
              </div>
            </div>
          </div>
        </section>


        {/* ================= ABOUT SECTION (Image 3 & 4 design matching) ================= */}
        <section id="about" className="scroll-mt-20 space-y-12">
          {/* Section banner */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left">
            <div className="lg:col-span-5 space-y-4">
              <span className="px-2.5 py-1 bg-[#5046e6]/10 text-[#5046e6] text-[9.5px] font-black rounded uppercase tracking-wider font-mono">
                CORPORATE BACKGROUND
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                We Engineer the Infrastructure that Connects and Powers Modern India.
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-401 leading-relaxed font-medium">
                Magnifiq Services Private Limited (formerly known as Tel Towers Private Limited) operates as a premium engineering partner and authorized industrial sub-vendor. Incorporated in 2016, we specialize in delivering high-power microwave telecom nodes, Railway signaling and telecommunications, Optical Fiber Cable (OFC) laying and supply, and Telecommunication and signal tower installations.
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-401 leading-relaxed font-medium">
                Our primary operations are focused across South and Western India, maintaining active status with robust infrastructure deployments.
              </p>
            </div>

            {/* Icons grid column */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: "Structural Precision", desc: "Expert civil casting, heavy-gauge steel erection, and antenna leveling within micro-tolerances.", icon: <Award className="w-4 h-4 text-indigo-500" /> },
                { title: "Rigorous Compliance", desc: "Authorized subcontractor status with Indian Railways, CPWD protocols, and Tier-1 Telecoms.", icon: <ShieldCheck className="w-4 h-4 text-emerald-500" /> },
                { title: "Elite Safety Standards", desc: "Strict zero-incident goal with mandatory high-altitude safety harnesses and active risk audits.", icon: <HardHat className="w-4 h-4 text-amber-500" /> },
                { title: "Hybrid Power Engineering", desc: "Advanced grid synchronization, multi-rack battery optimization, and low-footprint diesel systems.", icon: <Layers className="w-4 h-4 text-cyan-500" /> }
              ].map(item => (
                <div key={item.title} className="p-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl space-y-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-950 text-slate-700">
                      {item.icon}
                    </div>
                    <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 font-display">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-[11.5px] text-slate-455 font-semibold leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Three cards deck exactly matching Image 4 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 text-left">
            
            {/* Column 1: Corporate Registry */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/50 dark:bg-slate-950 p-6 flex flex-col justify-between relative shadow-xs">
              <div>
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-202/60">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    CORPORATE REGISTRY
                  </span>
                  <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-[8px] font-bold text-slate-500 rounded uppercase font-mono">REG</span>
                </div>

                  <div className="space-y-4 text-xs font-semibold">
                    <div>
                      <span className="text-[10px] text-slate-401 block uppercase tracking-wide">Corporate Office</span>
                      <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed font-bold">
                        H. No. 1-8-1, North Kamala Nagar,<br />
                        Near ETDC Building, ECIL, Hyderabad, Telangana.<br />
                        India. Pin - 500 062.
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-401 block uppercase tracking-wide">Registered Office</span>
                      <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed font-bold">
                        H. No. 1-8-1, North Kamala Nagar,<br />
                        Near ETDC Building, ECIL, Hyderabad, Telangana.<br />
                        India. Pin - 500 062.
                      </p>
                    </div>
                  <div>
                    <span className="text-[10px] text-slate-401 block uppercase tracking-wide">Industry</span>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5 font-bold">Telecommunications</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-401 block uppercase tracking-wide">Incorporation Date</span>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5 font-bold">May 03, 2016</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-401 block uppercase tracking-wide">Company Size</span>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5 font-bold">201-500 employees</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-401 block uppercase tracking-wide">Corporate CIN</span>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5 font-mono font-bold truncate select-all">U72900AP2016PTC103174</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Governing Board */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/50 dark:bg-slate-950 p-6 flex flex-col justify-between relative shadow-xs">
              <div>
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-202/60">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    GOVERNING BOARD
                  </span>
                  <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-[8px] font-bold text-slate-500 rounded uppercase font-mono">GOV</span>
                </div>

                <p className="text-[11px] text-slate-455 italic mb-4 leading-relaxed">
                  Led by seasoned telecommunications pioneers and administrative executives driving corporate strategy, safety adherence, and client relations.
                </p>

                <div className="space-y-2.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>Narasimha Murthy Sagi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span>Mareddy Samyuktha</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 p-2.5 rounded-xl border border-indigo-200/20 bg-indigo-500/5 text-[10.5px] font-bold text-indigo-755 dark:text-indigo-400 flex items-start gap-1.5">
                <span>🔍</span>
                <p className="leading-tight">Board coordinates active vendor panels for Indus, Jio, and Airtel directly.</p>
              </div>
            </div>

            {/* Column 3: Financial Profile */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/50 dark:bg-slate-950 p-6 flex flex-col justify-between relative shadow-xs">
              <div>
                <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-202/60">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    FINANCIAL PROFILE
                  </span>
                  <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-[8px] font-bold text-slate-500 rounded uppercase font-mono">FIN</span>
                </div>

                <div className="space-y-4 text-xs font-semibold">
                  <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-202/40">
                    <span className="text-slate-401 block uppercase tracking-wide">Corporate Status</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-600">● ACTIVE</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-202/40">
                    <span className="text-slate-401 block uppercase tracking-wide">Authorized Capital</span>
                    <span className="font-extrabold text-slate-801 dark:text-white">₹3.00 Crores</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-202/40">
                    <span className="text-slate-401 block uppercase tracking-wide">Paid-Up Capital</span>
                    <span className="font-extrabold text-slate-801 dark:text-white">₹2.57 Crores</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-401 block uppercase tracking-wide">Estimated Revenue (FY25)</span>
                    <span className="font-extrabold text-[#5046e6] dark:text-emerald-450">~ ₹39 Crores</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Turnover at a Glance Table */}
          <div className="pt-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 text-[9.5px] font-black rounded uppercase tracking-wider font-mono">
                FINANCIALS
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Turnover at a Glance</h3>
            </div>
            
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <table className="w-full text-left text-[13px] sm:text-sm">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 font-bold">Financial Year</th>
                    <th className="p-4 font-bold text-center border-l border-slate-200 dark:border-slate-700">
                      2024-25
                      <span className="block text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-wider">(Audited)</span>
                    </th>
                    <th className="p-4 font-bold text-center border-l border-slate-200 dark:border-slate-700">
                      2023-24
                      <span className="block text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-wider">(Audited)</span>
                    </th>
                    <th className="p-4 font-bold text-center border-l border-slate-200 dark:border-slate-700">
                      2022-23
                      <span className="block text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-wider">(Audited)</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <td className="p-4 font-semibold text-slate-800 dark:text-slate-300">Turnover (INR)</td>
                    <td className="p-4 text-center font-mono font-medium border-l border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">38,95,10,250</td>
                    <td className="p-4 text-center font-mono font-medium border-l border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">38,07,65,121</td>
                    <td className="p-4 text-center font-mono font-medium border-l border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">37,43,65,000</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <td className="p-4 font-semibold text-slate-800 dark:text-slate-300">Equity Share Capital (INR)</td>
                    <td className="p-4 text-center font-mono font-medium border-l border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">2,57,00,000</td>
                    <td className="p-4 text-center font-mono font-medium border-l border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">2,57,00,000</td>
                    <td className="p-4 text-center font-mono font-medium border-l border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">2,57,00,000</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                    <td className="p-4 font-semibold text-slate-800 dark:text-slate-300">Add: Reserves & Surplus (INR)</td>
                    <td className="p-4 text-center font-mono font-medium border-l border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">6,02,51,828</td>
                    <td className="p-4 text-center font-mono font-medium border-l border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">4,94,22,817</td>
                    <td className="p-4 text-center font-mono font-medium border-l border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">3,99,75,000</td>
                  </tr>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">Net worth (INR)</td>
                    <td className="p-4 text-center font-mono font-bold border-l border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">8,59,51,228</td>
                    <td className="p-4 text-center font-mono font-bold border-l border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">7,51,22,817</td>
                    <td className="p-4 text-center font-mono font-bold border-l border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">6,56,75,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>


        {/* ================= VISION & CORE VALUES SECTION (Added per Request) ================= */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-10 sm:p-12 text-center space-y-12 shadow-sm relative overflow-hidden">
          {/* Subtle background pattern/glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-6 max-w-4xl mx-auto relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-full text-[10px] font-black text-emerald-700 dark:text-emerald-400 tracking-widest uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Corporate Philosophy</span>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight font-display">
                Our Vision for a Connected Future
              </h2>
              <p className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 bg-clip-text text-transparent italic leading-relaxed">
                "To become a Responsible social infrastructure service provider by offering its services to meet & exceed customer expectations in Telecom, Renewable & Health Services."
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {[
              { 
                title: "Teamwork", 
                desc: "Working collaboratively towards common purposes and goals.",
                icon: <Users className="w-5 h-5" />,
                color: "indigo"
              },
              { 
                title: "Adaptability", 
                desc: "Adopting changes swiftly as per changing customer behavior and market trends.",
                icon: <RefreshCw className="w-5 h-5" />,
                color: "amber"
              },
              { 
                title: "Leadership", 
                desc: "Encouraging team members to lead by example and striving for excellence in performance.",
                icon: <Award className="w-5 h-5" />,
                color: "emerald"
              },
              { 
                title: "Communication", 
                desc: "Being authentic in interactions, communicating openly and honestly.",
                icon: <Mail className="w-5 h-5" />,
                color: "blue"
              }
            ].map(value => (
              <div key={value.title} className="p-6 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 rounded-3xl space-y-4 group hover:border-indigo-500/30 transition duration-300">
                <div className={`w-12 h-12 rounded-2xl bg-${value.color}-500/10 text-${value.color}-600 flex items-center justify-center mx-auto group-hover:scale-110 transition duration-300`}>
                  {value.icon}
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">
                    {value.title}
                  </h4>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    {value.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= SERVICES SECTION (Updated per PDF Profile) ================= */}
        <section id="services" className="scroll-mt-20 space-y-10">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 text-[9px] font-black tracking-widest rounded-full uppercase font-mono">
              Industrial Service Divisions
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display">
              End-to-End Infrastructure Excellence
            </h3>
            <p className="text-[10px] font-black uppercase text-[#5046e6] tracking-widest">
              TELECOM &middot; POWER &middot; RAILWAYS &middot; HEALTHCARE
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed font-medium">
              Magnifiq delivering precision engineering across multiple segments including high-density networks and utility-scale solar projects.
            </p>
          </div>

          {/* Dynamic Cards grid matching brochure content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
            {COMPANY_SERVICES.map(service => (
              <div 
                key={service.id} 
                onClick={() => setSelectedService(service)}
                className="flex flex-col border border-slate-200 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer group"
              >
                {/* Image Frame */}
                {service.imageUrl && (
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={service.imageUrl} 
                      alt={service.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300" />
                    <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-500">
                      <span className="px-3 py-1 rounded-full text-[9px] font-black bg-white/90 dark:bg-slate-950/90 text-slate-900 dark:text-white backdrop-blur shadow-sm uppercase tracking-widest border border-white/20">
                        {service.category}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="p-6 flex-1 flex flex-col space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                      {service.icon}
                    </div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide group-hover:text-indigo-600 transition-colors duration-200 leading-tight">
                      {service.title}
                    </h4>
                  </div>
                  
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed line-clamp-3">
                    {service.shortDesc}
                  </p>
                  
                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center text-[10px] font-black text-indigo-600 uppercase tracking-widest gap-1.5 transition duration-200">
                      <span>Full Scope</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400/50 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>


        {/* ================= WORK PORTAL SECTION (Image 6 matching) ================= */}
        <section id="portal" className="scroll-mt-20 space-y-6">
          <div className="pb-4 border-b border-dashed border-slate-200 text-center space-y-1.5">
            <span className="px-2.5 py-0.5 rounded text-[8px] font-black bg-[#5046e6]/10 text-[#5046e6] dark:bg-purple-950/20 uppercase tracking-widest font-mono">
              SECURE MANAGEMENT DESK
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display">
              MSPL Multi-Tenant Infrastructure Portal
            </h3>
            <p className="text-xs text-slate-455 font-semibold leading-relaxed max-w-3xl mx-auto">
              Authorized site engineers and client coordinators can select their dedicated interface channel below to review real-time dispatches, manage site directories, and maintain synchronized digital logs.
            </p>
          </div>

          <div className="p-2 sm:p-5 border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 shadow-sm relative">
            {currentEmployee && !['md', 'director'].includes(currentEmployee.role || '') && currentEmployee.id !== 'MD-001' ? (
              /* Logged in Employee View */
              <div className="space-y-4">
                {/* Session bar exactly matching mockup description */}
                <div className="flex flex-col sm:flex-row justify-between items-center p-4 bg-indigo-50/40 dark:bg-slate-950 border border-slate-201 dark:border-slate-850 rounded-2xl gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-slate-500 font-bold">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow animate-pulse" />
                    <span className="text-slate-401">Active Session:</span>
                    <strong className="text-slate-800 dark:text-slate-100">{currentEmployee.name}</strong>
                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/50 text-[#5046e6] px-2 py-0.5 rounded font-mono uppercase font-black tracking-wide leading-none">{currentEmployee.id}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {/* Parental Override removed for MD - though MD routed to HrPortal anyway */}
                    <button
                      onClick={() => {
                        setCurrentEmployee(null);
                        localStorage.removeItem('mspl_current_employee');
                        triggerToast("Session disconnected safely.", "info");
                      }}
                      className="px-3.5 py-1.5 bg-[#f1f5f9] hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-702 dark:text-slate-200 rounded-xl text-[10.5px] font-bold border border-slate-200 dark:border-slate-800 hover:shadow-xs active:scale-95 duration-100 cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <EmployeePortal 
                    employee={currentEmployee} 
                    attendanceLogs={attendanceLogs} 
                    payslips={payslips} 
                    payslipFormat={payslipFormat}
                    onClockIn={handleEmployeeClockIn} 
                    onUpdateEmployee={handleUpdateEmployee} 
                    toast={triggerToast} 
                  />
                </div>
              </div>
            ) : (
              /* HR Portal & Employee Login Gates (Standard gateway check is contained inside HrPortal.tsx) */
              <HrPortal 
                employees={employees} 
                attendanceLogs={attendanceLogs} 
                payslips={payslips} 
                payslipFormat={payslipFormat}
                employeeQueries={employeeQueries}
                onUpdateEmployeeQueries={setEmployeeQueries}
                onUpdatePayslipFormat={setPayslipFormat}
                onUpdateEmployees={setEmployees} 
                onUpdateAttendanceLogs={setAttendanceLogs} 
                onUpdatePayslips={setPayslips} 
                toast={triggerToast} 
                confirmDialog={triggerConfirm}
                isDirectorLoggedIn={isDirectorLoggedIn || (currentEmployee?.role === 'md' || currentEmployee?.role === 'director')}
                setIsDirectorLoggedIn={(val) => {
                  setIsDirectorLoggedIn(val);
                  if (!val && currentEmployee && (currentEmployee.role === 'md' || currentEmployee.role === 'director')) {
                    setCurrentEmployee(null);
                  }
                }}
                onSelectEmployee={(emp) => {
                  setCurrentEmployee(emp);
                  localStorage.setItem('mspl_current_employee', JSON.stringify(emp));
                }}
                appendTerminalLog={(msg: string) => {
                  setTerminalLogs(prev => [...prev, msg]);
                  setActiveTerminalSector('hr');
                }}
              />
            )}
          </div>
        </section>


        {/* ================= REGIONAL EMPLOYEE HELPDESK & SUPPORT DESK ================= */}
        <section id="contact" className="scroll-mt-20 grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          
          {/* Contact Details Column */}
          <div className="lg:col-span-5 space-y-6 self-start">
            <div className="space-y-2">
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9.5px] font-black rounded-lg uppercase tracking-wider font-mono">
                Employee welfare & coordinates
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight font-display">
                Regional Project Helpdesk
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-401 font-medium leading-relaxed">
                Need immediate field assistance, tool replacement, or HR assistance? Select your regional operational project inside Guntur registries and dispatch requests directly to our HR working mailbox.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-755 dark:text-indigo-400">Headquarters Working Mailbox</span>
                <p className="text-[11.5px] text-slate-455">All dispatched help tickets route instantly to the dedicated HR dispatch server at <strong className="font-bold text-indigo-600 dark:text-indigo-400 font-mono select-all">hr@magnifiq.in</strong> for fast resolution responses.</p>
              </div>

              {/* Dynamic Supporting Coordinates Card based on selected project */}
              <div className="p-5 border border-slate-200/80 dark:border-slate-800 rounded-3xl bg-slate-50/40 dark:bg-slate-900/40 space-y-3 shadow-xs">
                <span className="text-[9.5px] font-mono font-black text-amber-600 uppercase tracking-widest block">
                  📍 Dynamic Regional Coordinates
                </span>
                <div className="space-y-2 text-xs leading-relaxed font-semibold">
                  <div>
                    <span className="text-[10px] text-slate-401 block uppercase">Active Project Site</span>
                    <p className="text-slate-800 dark:text-white font-bold">{supportProject}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-dashed">
                    <div>
                      <span className="text-[10px] text-slate-401 block">Field Coordinator</span>
                      <p className="text-slate-700 dark:text-slate-300 font-bold">{REGIONAL_SUPPORTS[supportProject as keyof typeof REGIONAL_SUPPORTS]?.coordinator || "Unassigned"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-401 block">Support Email</span>
                      <p className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{REGIONAL_SUPPORTS[supportProject as keyof typeof REGIONAL_SUPPORTS]?.email || "hr@magnifiq.in"}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-dashed">
                    <span className="text-[10px] text-slate-401 block">Operations Field Hub</span>
                    <p className="text-slate-600 dark:text-slate-400 italic text-[11px] font-medium">{REGIONAL_SUPPORTS[supportProject as keyof typeof REGIONAL_SUPPORTS]?.workspace || "N/A"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 text-[9.5px] text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span>Live Connection: {REGIONAL_SUPPORTS[supportProject as keyof typeof REGIONAL_SUPPORTS]?.phone || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Central HQ Offices Section */}
              <div className="space-y-4">
                {/* Corporate Office */}
                <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950/40 shadow-2xs flex items-start gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-indigo-505 font-bold mt-0.5 shrink-0">
                    <Building2 className="w-4 h-4 text-[#5046e6]" />
                  </div>
                  <div className="space-y-0.5 text-xs font-semibold">
                    <span className="text-[10.5px] text-slate-401 leading-none uppercase">Corporate Office</span>
                    <p className="text-slate-800 dark:text-slate-300 font-medium leading-relaxed">
                      H. No. 1-8-1, North Kamala Nagar,<br />
                      Near ETDC Building, ECIL, Hyderabad. Telangana.<br />
                      India. Pin - 500 062.
                    </p>
                  </div>
                </div>

                {/* Registered Office */}
                <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950/40 shadow-2xs flex items-start gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-indigo-505 font-bold mt-0.5 shrink-0">
                    <MapPin className="w-4 h-4 text-[#5046e6]" />
                  </div>
                  <div className="space-y-0.5 text-xs font-semibold">
                    <span className="text-[10.5px] text-slate-401 leading-none uppercase">Registered Office</span>
                    <p className="text-slate-800 dark:text-slate-300 font-medium leading-relaxed">
                      H. No. 1-8-1, North Kamala Nagar,<br />
                      Near ETDC Building, ECIL, Hyderabad, Telangana.<br />
                      India. Pin - 500 062.
                    </p>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950/40 shadow-2xs flex items-start gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-indigo-505 font-bold mt-0.5 shrink-0">
                    <Mail className="w-4 h-4 text-[#5046e6]" />
                  </div>
                  <div className="space-y-0.5 text-xs font-semibold">
                    <span className="text-[10.5px] text-slate-401 leading-none uppercase">General Inquiry</span>
                    <p className="text-indigo-600 dark:text-indigo-400 font-mono font-bold leading-relaxed">
                      info@magnifiq.in
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10.5px] text-slate-402 leading-relaxed bg-[#f8fafc] dark:bg-slate-900/40 p-3.5 border border-dashed rounded-xl font-medium">
              ⚖️ MSPL Employee Support Charter aligns fully with central labor standards. All field safety queries resolved within 12 operational hours.
            </p>
          </div>

          {/* Form Support Column */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Check Ticket Status */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-[#1e293b] p-6 sm:p-8 rounded-3xl shadow-sm hover:shadow-xs duration-200">
              <div className="pb-4 border-b border-dashed border-slate-202 mb-6">
                <h4 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 font-display">
                  Check Ticket Status
                </h4>
                <p className="text-xs text-slate-401 mt-0.5">Track your previously raised ticket ID for updates from HR.</p>
              </div>
              <form onSubmit={handleCheckTicket} className="flex gap-3 mb-4">
                <input
                  type="text"
                  required
                  placeholder="e.g. q-1234567890"
                  value={checkTicketId}
                  onChange={e => setCheckTicketId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-202 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-850 dark:text-slate-100 focus:outline-[#5046e6] focus:outline-none focus:ring-1 focus:ring-[#5046e6] font-mono font-bold text-xs"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-black transition duration-150 shadow-md cursor-pointer whitespace-nowrap"
                >
                  Check Status
                </button>
              </form>
              
              {checkedTicketError && (
                <div className="p-3 bg-rose-50/50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 rounded-xl text-xs font-semibold">
                  {checkedTicketError}
                </div>
              )}

              {checkedTicketResult && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800 border-dashed">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Ticket: {checkedTicketResult.id}</span>
                    <span className={`px-2 py-0.5 rounded uppercase font-black text-[10px] tracking-wider font-mono ${checkedTicketResult.status === 'resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {checkedTicketResult.status}
                    </span>
                  </div>
                  <div className="text-xs font-semibold space-y-1">
                    <p className="text-slate-500 dark:text-slate-400">Employee: <span className="text-slate-800 dark:text-slate-200">{checkedTicketResult.employeeName} ({checkedTicketResult.employeeId})</span></p>
                    <p className="text-slate-500 dark:text-slate-400">Project: <span className="text-slate-800 dark:text-slate-200">{checkedTicketResult.projectName}</span></p>
                    <div className="pt-2 text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 dark:text-slate-400 block mb-1">Issue Description:</span>
                      <p className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">{checkedTicketResult.queryText}</p>
                    </div>
                    {checkedTicketResult.attachment && (
                      <div className="pt-2">
                        <span className="text-slate-500 dark:text-slate-400 block mb-1">Proof Attachment:</span>
                        {checkedTicketResult.attachment.startsWith('data:image/') ? (
                          <img src={checkedTicketResult.attachment} alt="Attachment" className="max-h-32 rounded-lg border border-slate-200 dark:border-slate-700 mt-1 object-contain bg-white dark:bg-slate-900" />
                        ) : (
                          <a href={checkedTicketResult.attachment} download="Attachment" className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            Download Attachment File
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {checkedTicketResult.hrResponse && (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 border-dashed">
                      <span className="text-[10px] uppercase font-black text-indigo-600 dark:text-indigo-400 block mb-1 tracking-wider">HR Response</span>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                        {checkedTicketResult.hrResponse}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Raise Ticket */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-[#1e293b] p-6 sm:p-8 rounded-3xl shadow-sm hover:shadow-xs duration-200">
              <div className="pb-4 border-b border-dashed border-slate-202 mb-6">
                <h4 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 font-display">
                  Raise Ticket
                </h4>
                <p className="text-xs text-slate-401 mt-0.5">Dispatches queries directly to the Guntur HR center at <strong>hr@magnifiq.in</strong> with regional telemetry.</p>
              </div>

            <form onSubmit={handleSupportSubmit} className="space-y-5 text-xs font-semibold leading-relaxed">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-455">Employee Card ID Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MSPL-EMP-101"
                    value={supportEmpId}
                    onChange={e => setSupportEmpId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-202 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#5046e6] font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-455">Field Specialist Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ajay Kumar"
                    value={supportEmpName}
                    onChange={e => setSupportEmpName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-202 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#5046e6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-455">Select Custom Regional Project *</label>
                  <select
                    value={supportProject}
                    onChange={e => setSupportProject(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-202 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-850 dark:text-slate-100 focus:outline-[#5046e6] focus:outline-none focus:ring-1 focus:ring-[#5046e6] cursor-pointer"
                  >
                    <option value="Indus Guntur Tower Erection Scope">Indus Guntur Tower Erection Scope</option>
                    <option value="Vijayawada Jio Backbone OFC Fusion">Vijayawada Jio Backbone OFC Fusion</option>
                    <option value="Airtel Nellore Microwave Calibration">Airtel Nellore Microwave Calibration</option>
                    <option value="Railway VHF Ongole Signal Trenching">Railway VHF Ongole Signal Trenching</option>
                    <option value="Tenali Solar MW Utility Grid">Tenali Solar MW Utility Grid</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-455">Core Priority Classification *</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setSupportPriority('normal')}
                      className={`py-2 text-[11px] rounded-xl font-bold border transition duration-150 ${supportPriority === 'normal' ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:border-white' : 'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-slate-202 dark:border-slate-800/80'}`}
                    >
                      Normal (Routine Check)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSupportPriority('urgent')}
                      className={`py-2 text-[11px] rounded-xl font-bold border transition duration-150 ${supportPriority === 'urgent' ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border-slate-202 dark:border-slate-800/80'}`}
                    >
                      ⚠️ Urgent Escalation
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-455">Detailed Specific Incident or Request description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Elaborate on specific requirements, material issues, or help requested. Include altitude indicators, tower codes or equipment ID if applicable."
                  value={supportText}
                  onChange={e => setSupportText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-202 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-850 dark:text-slate-100 focus:outline-[#5046e6] focus:outline-none focus:ring-1 focus:ring-[#5046e6] placeholder-slate-450"
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-slate-455">Proof Attachment (Image/PDF/Doc) Optional</label>
                <div className="relative p-2 border border-slate-202 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setSupportAttachment(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-400 dark:hover:file:bg-indigo-900/50 cursor-pointer"
                  />
                  {supportAttachment && (
                    <button 
                      type="button" 
                      onClick={() => setSupportAttachment(null)}
                      className="shrink-0 text-rose-500 hover:text-rose-700 text-[10px] uppercase tracking-wider font-black px-2 py-1 bg-rose-50 dark:bg-rose-900/20 rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 duration-150 shadow-md hover:shadow-indigo-500/10 cursor-pointer text-center select-none"
              >
                <Send className="w-4 h-4" />
                <span>Dispatch to hr@magnifiq.in</span>
              </button>
            </form>
            
            {submittedTicketId && (
              <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center shadow-sm">
                <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold text-sm">Ticket Successfully Dispatched</span>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium mb-3">Copy your ticket ID to check updates above.</p>
                <div className="inline-block bg-white dark:bg-slate-950 border border-emerald-200 dark:border-emerald-800 px-4 py-2 rounded-lg text-emerald-900 dark:text-emerald-300 font-mono font-black tracking-widest text-lg">
                  {submittedTicketId}
                </div>
              </div>
            )}
            </div>
          </div>
        </section>


        {/* ================= VISUAL MAP MATRIX QUICK JUMP DIRECTORY ================= */}
        <section className="bg-slate-100/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-left scroll-mt-20">
          <div className="pb-3 border-b border-dashed border-slate-202 dark:border-slate-810 mb-6">
            <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-widest font-display flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5046e6]" />
              <span>Visual Site Map & Quick-Jump Directory</span>
            </h4>
            <p className="text-[11px] text-slate-401 mt-0.5">Rapid-access directory matrix built inside Guntur registered systems. Authenticate secure operator terminals, trigger telemetry dispatches, or submit contract bids instantly.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs font-bold font-sans">
            <div className="space-y-3">
              <span className="text-[10px] text-indigo-750 dark:text-indigo-400 uppercase tracking-widest leading-none block font-mono">Corporate Core</span>
              <ul className="space-y-1.5 text-slate-500 dark:text-slate-400">
                <li><button onClick={() => scrollSmoothTo('about')} className="hover:text-indigo-600 hover:underline text-left">About MSPL Engineering</button></li>
                <li><button onClick={() => triggerToast("Direct Access: MSPL Erection Capabilities Matrix is up to date.", "info")} className="hover:text-indigo-600 hover:underline text-left">Erectors Capabilities Matrix</button></li>
                <li><button onClick={() => scrollSmoothTo('about')} className="hover:text-indigo-600 hover:underline text-left">Certification Standards</button></li>
                <li><button onClick={() => triggerToast("Registered Entity CIN: U72900AP2016PTC103174 Hyderabad HQ Telangana", "info")} className="hover:text-indigo-600 hover:underline text-left">CIN Corporate Credentials</button></li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] text-indigo-750 dark:text-indigo-400 uppercase tracking-widest leading-none block font-mono font-mono">Industrial Divisions</span>
              <ul className="space-y-1.5 text-slate-500 dark:text-slate-400 font-semibold">
                <li><button onClick={() => scrollSmoothTo('services')} className="hover:text-indigo-600 hover:underline text-left">Erection & Rigging Overview</button></li>
                <li><button onClick={() => scrollSmoothTo('services')} className="hover:text-indigo-600 hover:underline text-left">OFC Splicing Networks</button></li>
                <li><button onClick={() => scrollSmoothTo('services')} className="hover:text-indigo-600 hover:underline text-left">Heavy Lattice Towers</button></li>
                <li><button onClick={() => scrollSmoothTo('services')} className="hover:text-indigo-600 hover:underline text-left">Utility Photovoltaic Layouts</button></li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] text-indigo-750 dark:text-indigo-400 uppercase tracking-widest leading-none block font-mono">Operator Channels</span>
              <ul className="space-y-1.5 text-slate-500 dark:text-slate-400">
                <li><button onClick={() => handleOpenDiagnostics('indus')} className="hover:text-indigo-600 hover:underline text-left">Indus Towers Portal Link</button></li>
                <li><button onClick={() => handleOpenDiagnostics('jio')} className="hover:text-indigo-600 hover:underline text-left">Reliance Jio 5G Rigging</button></li>
                <li><button onClick={() => handleOpenDiagnostics('airtel')} className="hover:text-indigo-600 hover:underline text-left">Airtel Microwave Channel</button></li>
                <li><button onClick={() => handleOpenDiagnostics('railways')} className="hover:text-indigo-600 hover:underline text-left">Indian Railways Quad Cabin</button></li>
                <li><button onClick={() => handleOpenDiagnostics('renewable solar')} className="hover:text-indigo-600 hover:underline text-left font-bold">PV Solar Array Telemetry</button></li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] text-indigo-750 dark:text-indigo-400 uppercase tracking-widest block font-mono">Bids & Submissions</span>
              <ul className="space-y-1.5 text-slate-500 dark:text-slate-400">
                <li><button onClick={() => scrollSmoothTo('contact')} className="hover:text-indigo-600 hover:underline text-left">RFP Submission Form</button></li>
                <li><button onClick={() => triggerToast("Active Tenders: Open corporate RFPs details published inside workspace", "info")} className="hover:text-indigo-600 hover:underline text-left">Active Tenders Enquiries</button></li>
                <li><button onClick={() => triggerToast("Sub-Contract: Registration database is cached offline.", "info")} className="hover:text-indigo-600 hover:underline text-left">Register New Sub-Contract</button></li>
              </ul>
            </div>
          </div>
        </section>


        {/* ================= FOOTER ================= */}
        <footer className="py-8 border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-405 text-xs text-left select-none space-y-4">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <CompanyLogo className="w-6 h-6 select-none" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide font-display">MAGNIFIQ</span>
              </div>
              
              <p className="text-[11px] leading-relaxed font-semibold">
                Magnifiq Services Private Limited (formerly known as Tel Towers Private Limited) operates as a key industrial sub-vendor erecting and commissioning critical Telecom & Solar utility setups.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[11px] font-bold text-slate-402">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-401 uppercase block">Corporate Office</span>
                  <p className="leading-relaxed">
                    H. No. 1-8-1, North Kamala Nagar,<br />
                    Near ETDC Building, ECIL, Hyderabad. Telangana.<br />
                    India. Pin - 500 062.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-401 uppercase block">Registered Office</span>
                  <p className="leading-relaxed">
                    H. No. 1-8-1, North Kamala Nagar,<br />
                    Near ETDC Building, ECIL, Hyderabad, Telangana.<br />
                    India. Pin - 500 062.
                  </p>
                </div>
              </div>

              <p className="text-[11px] font-bold text-indigo-650 dark:text-sky-400 font-mono flex items-center gap-4">
                <span>CIN: U72900AP2016PTC103174</span>
                <span className="text-slate-402">|</span>
                <span>e-mail: info@magnifiq.in</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 text-[11px] font-bold">
              <div className="space-y-1.5">
                <span className="text-[9.5px] text-slate-401 uppercase block tracking-wider">Industrial Divisions</span>
                <ul className="space-y-1 text-slate-500">
                  <li><button onClick={() => scrollSmoothTo('services')} className="hover:underline">Indus Sites Foundation</button></li>
                  <li><button onClick={() => scrollSmoothTo('services')} className="hover:underline">Reliance Jio 5G Rigging</button></li>
                  <li><button onClick={() => scrollSmoothTo('services')} className="hover:underline">Airtel Rural Microwave</button></li>
                  <li><button onClick={() => scrollSmoothTo('services')} className="hover:underline">Indian Railways Quad Splicing</button></li>
                  <li><button onClick={() => scrollSmoothTo('services')} className="hover:underline">Utility PV Solar Farms</button></li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <span className="text-[9.5px] text-slate-401 uppercase block tracking-wider">Quick Links</span>
                <ul className="space-y-1 text-slate-500">
                  <li><button onClick={() => scrollSmoothTo('about')} className="hover:underline">About Operations</button></li>
                  <li><button onClick={() => scrollSmoothTo('services')} className="hover:underline">Division Services</button></li>
                  <li><button onClick={() => scrollSmoothTo('portal')} className="hover:underline">Launch Work Portal</button></li>
                  <li><button onClick={() => scrollSmoothTo('contact')} className="hover:underline">RFP Bid Proposal Form</button></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200/50 dark:border-slate-810/30 flex flex-col sm:flex-row justify-between items-center text-[10.5px] font-bold text-slate-402 font-mono gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>All physical site assets completely insured. Telemetry logs and control consoles are end-to-end encrypted.</span>
            </span>
            <span>
              © {new Date().getFullYear()} Magnifiq Services Private Limited (formerly known as Tel Towers Private Limited). All rights reserved. | Build v2.10.4-PROD
            </span>
          </div>
        </footer>

      </div>

      {/* ================= SIMULATED TESTING CONSOLE TERMINAL OVERLAY MODAL ================= */}
      <AnimatePresence>
        {activeTerminalSector && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: "100vh", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100vh", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-slate-900 border border-slate-800 text-emerald-400 font-mono rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden text-xs"
            >
              <div className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400 select-none" />
                  <span className="font-bold select-none uppercase">{activeTerminalSector} Active Telemetry Gateway</span>
                </div>
                <button
                  onClick={() => setActiveTerminalSector(null)}
                  className="w-5 h-5 rounded-full bg-slate-800 select-none hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-sans font-extrabold cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="p-5 space-y-2 max-h-[300px] overflow-y-auto text-left leading-relaxed">
                {terminalLogs.map((log, index) => (
                  <div key={index} className="animate-fade-in flex gap-2">
                    <span className="text-slate-500 font-black shrink-0">~ $</span>
                    <span className="select-all">{log}</span>
                  </div>
                ))}

                {isTerminalLoading && (
                  <div className="flex items-center gap-2 text-indigo-400 select-none pt-2 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Streaming operational packets audit...</span>
                  </div>
                )}

                {!isTerminalLoading && (
                  <div className="pt-4 flex flex-col items-center gap-2 border-t border-slate-800 mt-3 animate-fade-in">
                    <button
                      onClick={() => {
                        setActiveTerminalSector(null);
                        scrollSmoothTo('portal');
                      }}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition text-slate-950 font-sans font-black uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer duration-150 shadow-lg"
                    >
                      <ArrowRight className="w-4 h-4 text-slate-950 font-bold" />
                      <span>Proceed to Live Portal</span>
                    </button>
                    <span className="text-[10px] text-slate-400 font-sans font-semibold text-center select-none">
                      Diagnostic pass certified. Click above to access the employee portal.
                    </span>
                  </div>
                )}
              </div>

              <div className="px-4 py-2.5 bg-slate-950/40 border-t border-slate-800/80 text-[10px] text-slate-500 text-right select-none font-sans font-bold">
                Security Protocol: MSPL-GUNTUR-SEC_SHARD-LOCK
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GLOBAL ALERTER TOASTS */}
      {toastMessage && (
        <div id="global-toast-alerter" className="fixed bottom-6 right-6 z-[100] p-4.5 rounded-2xl border border-slate-205 bg-white text-slate-900 dark:bg-slate-900 dark:text-white dark:border-slate-800 shadow-xl max-w-sm flex items-center gap-3 animate-fade-in">
          <div className="shrink-0 select-none">
            {toastMessage.type === 'success' ? (
              <span className="text-emerald-555 font-black text-lg bg-emerald-500/10 px-2 py-0.5 rounded-full">✓</span>
            ) : toastMessage.type === 'warning' ? (
              <span className="text-amber-500 font-black text-lg bg-amber-500/10 px-2.5 py-0.5 rounded-full">⚠</span>
            ) : (
              <span className="text-[#5046e6] font-black text-lg bg-indigo-500/10 px-2.5 py-0.5 rounded-full">ℹ</span>
            )}
          </div>
          <span className="text-xs font-black leading-normal font-sans text-slate-800 dark:text-slate-100">{toastMessage.msg}</span>
        </div>
      )}

      {/* CONFIRMATION MODALLERS */}
      {modalType && (
        <div id="global-confirmation-modal" className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 text-left">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white font-display">
              {modalType.title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              {modalType.message}
            </p>
            <div className="flex justify-end gap-2.5 text-xs pt-1">
              <button
                onClick={() => setModalType(null)}
                className="px-4 py-2 border border-slate-202 dark:border-slate-800 text-slate-500 font-black rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer uppercase tracking-wider text-[10px]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  modalType.onConfirm();
                  setModalType(null);
                }}
                className={`px-4 py-2 text-white font-black rounded-xl cursor-pointer uppercase tracking-wider text-[10px] ${
                  modalType.isDanger ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-650 hover:bg-indigo-750"
                }`}
              >
                {modalType.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ================= SERVICE DETAIL MODAL ================= */}
      <AnimatePresence>
        {selectedService && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedService(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start gap-4 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                    {selectedService.icon}
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-500/10 text-indigo-700 dark:text-sky-400 font-mono tracking-widest uppercase">{selectedService.category}</span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 leading-snug">{selectedService.title}</h3>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedService(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-left">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-[#5046e6] tracking-[2px]">Industrial Division Scope of Work</h4>
                  <div className="space-y-3.5">
                    {selectedService.details.map((point: string, idx: number) => (
                      <div key={idx} className="flex gap-3 items-start group">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition duration-200">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                        <p className="text-[11.5px] sm:text-[12.5px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed group-hover:text-slate-900 dark:group-hover:text-white transition duration-200">
                          {point}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Brochure Section */}
                {selectedService.brochure && (
                  <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase text-indigo-600 tracking-[2px]">Core Division Brochure</h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{selectedService.brochure.length} Pages</span>
                    </div>
                    <div className="space-y-4">
                      {selectedService.brochure.map((img: string, i: number) => (
                        <div 
                          key={i} 
                          onClick={() => setEnlargedBrochureImg(img)}
                          className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-sm hover:shadow-md transition duration-300 cursor-pointer"
                        >
                          <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-lg text-[9px] font-black text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/50 flex items-center gap-1.5">
                            PAGE 0{i + 1}
                            <span className="text-slate-400 font-normal">| Click to Enlarge</span>
                          </div>
                          <img 
                            src={img} 
                            alt={`Brochure Page ${i+1}`} 
                            className="w-full h-auto object-contain transition duration-500 group-hover:scale-[1.02]"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500 leading-relaxed font-bold italic">
                    Disclaimer: All operational activities under this division are performed following Magnifiq Services Safety Protocols and authorized Tier-1 vendor compliance guidelines.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <button 
                  onClick={() => setSelectedService(null)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition duration-150 cursor-pointer shadow-md shadow-indigo-500/10"
                >
                  Return to Divisions
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= ENLARGED BROCHURE IMAGE MODAL ================= */}
      <AnimatePresence>
        {enlargedBrochureImg && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEnlargedBrochureImg(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md cursor-zoom-out"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-max max-w-full max-h-full rounded-2xl overflow-hidden shadow-2xl z-10"
            >
              <button 
                onClick={() => setEnlargedBrochureImg(null)}
                className="absolute top-4 right-4 bg-slate-900/50 hover:bg-slate-900/80 backdrop-blur text-white p-2 text-white rounded-full transition cursor-pointer z-20"
              >
                <X className="w-6 h-6" />
              </button>
              <img 
                src={enlargedBrochureImg} 
                alt="Enlarged Brochure" 
                className="w-auto h-auto max-w-[95vw] max-h-[92vh] object-contain rounded-2xl" 
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
