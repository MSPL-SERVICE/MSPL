import { jsPDF } from 'jspdf';
import { Employee, Payslip, PayslipFormat } from '../types';
import logoAsset from '../assets/images/magnifiq_logo_official_1779711238353.png';
import { formatIndiaPhoneNumber } from './phoneHelper';

async function loadImage(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Canvas context failed"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => reject(new Error("Image failed to load: " + err));
    img.src = url;
  });
}

export async function generatePayslipPDF(payslip: Payslip, employee: Employee, format: PayslipFormat) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Color theme mapper
  let primaryColor = [79, 70, 229]; // Indigo [r, g, b] default
  if (format.themeColor === 'emerald') primaryColor = [16, 185, 129];
  else if (format.themeColor === 'amber') primaryColor = [245, 158, 11];
  else if (format.themeColor === 'slate') primaryColor = [71, 85, 105];
  else if (format.themeColor === 'rose') primaryColor = [225, 29, 72];

  // Fonts & styles
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  
  // Header: Logo & Company Name
  const logoX = 20;
  const logoY = 18;
  const logoSize = 24;
  
  // Use official logo image asset
  const logoUrl = logoAsset;
  
  try {
    // Attempt to load and add image logo as Data URL for reliability
    const dataUrl = await loadImage(logoUrl);
    doc.addImage(dataUrl, 'PNG', logoX, logoY, logoSize, logoSize, undefined, 'FAST');
  } catch (error) {
    // Fallback: simple text branding if image fails to load
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("MSPL", logoX + logoSize/2, logoY + logoSize/2 + 1, { align: 'center' });
  }
  
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(format.companyName, logoX + logoSize + 6, logoY + 9);
  
  // Subheader: Address with multi-line support
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const addressLines = doc.splitTextToSize(format.companyAddress, 130);
  doc.text(addressLines, logoX + logoSize + 6, logoY + 14);

  // Line separator
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(20, 46, 190, 46);

  // Doc Title
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text("OFFICIAL SALARY DISBURSEMENT STATEMENT", 20, 53);
  doc.setFontSize(10);
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(`Roster Log ID: ${payslip.id}`, 20, 58);

  // Employee details card box
  doc.setFillColor(248, 250, 252);
  doc.rect(20, 64, 170, 32, "F");
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("EMPLOYEE DETAILS", 25, 71);
  doc.line(25, 73, 185, 73);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Employee Name:`, 25, 79);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(employee.name, 55, 79);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Card ID Prefix:`, 25, 85);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(employee.id, 55, 85);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Mobile Contact:`, 25, 91);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(formatIndiaPhoneNumber(employee.phoneNumber) || "N/A", 55, 91);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Pay Period:`, 110, 79);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(payslip.monthYear, 140, 79);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Issued On:`, 110, 85);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(payslip.deliveredAt, 140, 85);

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`System Status:`, 110, 91);
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(16, 185, 129); // Green
  doc.text("PAID & VERIFIED (ONLINE SECURE)", 140, 91);

  // Earnings and Deductions tables
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("SALARY BREAKDOWN", 20, 110);

  // Table header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(20, 115, 170, 8, "F");
  doc.setFont("Helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("Item Ledger Category", 25, 120);
  doc.text("Type", 110, 120);
  doc.text("Amount (INR)", 150, 120);

  // Item rows
  let currentY = 123;
  const items = [
    { title: "Basic Structure Payout (Basic CTC)", type: "EARNING", amount: payslip.basicSalary },
    { title: "Regional Operations Allowances (Conveyance, Special)", type: "EARNING", amount: payslip.allowances },
    { title: "Payroll Deductions & Deviances (Tax, Provident fund)", type: "DEDUCTION", amount: payslip.deductions }
  ];

  items.forEach((item, index) => {
    doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252);
    doc.rect(20, currentY, 170, 8, "F");
    
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    doc.text(item.title, 25, currentY + 5);
    
    if (item.type === "DEDUCTION") {
      doc.setTextColor(225, 29, 72); // Rose
    } else {
      doc.setTextColor(16, 185, 129); // Emerald
    }
    doc.setFont("Helvetica", "bold");
    doc.text(item.type, 110, currentY + 5);
    
    doc.setTextColor(30, 41, 59);
    doc.text(`INR ${item.amount.toLocaleString('en-IN')}`, 150, currentY + 5);
    currentY += 8;
  });

  // Net salary block
  doc.setFillColor(241, 245, 249);
  doc.rect(20, currentY + 3, 170, 12, "F");
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("NET SALARY PAYOUT", 25, currentY + 11);
  
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`INR ${payslip.netSalary.toLocaleString('en-IN')}`, 150, currentY + 11);

  // Notes
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("REGISTRAR TERMS & REGULATORY COMPLIANCE", 20, currentY + 27);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const textLines = doc.splitTextToSize(format.notes, 165);
  doc.text(textLines, 20, currentY + 32);

  // Signatory & Stamp
  const sigY = currentY + 45;
  doc.setLineWidth(0.3);
  doc.line(115, sigY, 185, sigY);
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(format.authorizedSignatory, 115, sigY + 5);
  
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("AUTHORIZED DIGITAL SIGNATURE STAMP", 115, sigY + 10);

  // Guard lines
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(1.5);
  doc.line(20, 15, 190, 15);
  doc.line(20, 285, 190, 285);

  // Save/Download PDF named properly
  const cleanMonth = payslip.monthYear.replace(/\s+/g, '_');
  doc.save(`Payslip_${employee.id}_${cleanMonth}.pdf`);
}
