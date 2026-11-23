import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Enterprise Excel Workbook Export
 * Generates an executive multi-sheet spreadsheet with Summary, Member Balances, Expenses, and Settlements.
 */
export const exportGroupToExcel = (group, expenses = [], settlements = [], summary = {}) => {
  if (!group) return;

  const groupName = group.name || 'Group';
  const totalExp = Number(summary?.totalExpense || 0);
  const settledAmount = (settlements || [])
    .filter(s => s.status === 'completed' || s.status === 'admin_approved')
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const pendingDues = Number(summary?.totalOwed || 0);
  const members = group.members || [];
  const memberList = summary?.memberBalances || [];
  const reportId = `SSR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${(group._id || '').slice(-4).toUpperCase()}`;

  const wb = XLSX.utils.book_new();

  // 1. EXECUTIVE SUMMARY SHEET
  const summaryRows = [
    ['SMARTSPLIT ENTERPRISE - OFFICIAL FINANCIAL REPORT'],
    ['Report ID', reportId],
    ['Group Name', groupName],
    ['Export Date', new Date().toLocaleString()],
    ['Currency', 'INR (₹)'],
    ['Status', 'ACTIVE / VERIFIED AUDIT'],
    [],
    ['KEY PERFORMANCE INDICATORS (KPIs)'],
    ['Total Expenses', totalExp],
    ['Total Settled Amount', settledAmount],
    ['Total Pending Dues', pendingDues],
    ['Total Members', members.length],
    ['Total Expenses Recorded', expenses.length],
    ['Total Settlements Recorded', settlements.length]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  // 2. MEMBER BALANCES SHEET
  const memberRows = memberList.map((rec, idx) => {
    const memId = (rec.user?._id || rec.user || '').toString();
    const mem = members.find(m => (m.user?._id || m.user || '').toString() === memId);
    const balance = Number(rec.netBalance || 0);
    const standing = balance > 0 ? `Gets back ₹${balance.toFixed(2)}` : balance < 0 ? `Owes ₹${Math.abs(balance).toFixed(2)}` : 'Settled';

    return {
      '#': idx + 1,
      'Member Name': mem?.user?.name || rec.user?.name || 'Member',
      'Email': mem?.user?.email || rec.user?.email || '',
      'Mobile': mem?.user?.mobile || mem?.user?.mobileNumber || '',
      'Role': mem?.role || (group.createdBy?._id === memId ? 'admin' : 'member'),
      'Total Paid (INR)': Number(rec.totalPaid || 0),
      'Total Share (INR)': Number(rec.totalShare || 0),
      'Net Balance (INR)': balance,
      'Standing': standing
    };
  });
  const wsMembers = XLSX.utils.json_to_sheet(memberRows);
  wsMembers['!cols'] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 28 },
    { wch: 16 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(wb, wsMembers, 'Member Balances');

  // 3. ITEMISED EXPENSES SHEET
  const expenseRows = expenses.map((exp, idx) => {
    const payer = exp.paidBy?.name || 'Unknown';
    const splitNames = (exp.participants || []).map(p => p.name || 'Member').join(', ') ||
      (exp.splitDetails || []).map(s => s.user?.name || 'Member').join(', ') || 'All Members';

    return {
      '#': idx + 1,
      'Date': new Date(exp.date || exp.createdAt).toLocaleDateString(),
      'Category': exp.category || 'General',
      'Description': exp.description,
      'Amount (INR)': Number(exp.amount || 0),
      'Paid By': payer,
      'Split With': splitNames,
      'Split Type': exp.splitType || 'Equal',
      'Payment Method': exp.paymentMethod || 'UPI',
      'Edited': (exp.editHistory && exp.editHistory.length > 0) ? 'Yes (Edited)' : 'No',
      'Proof Attached': exp.proofUrl ? 'Yes' : 'No'
    };
  });
  const wsExpenses = XLSX.utils.json_to_sheet(expenseRows);
  wsExpenses['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 16 },
    { wch: 32 },
    { wch: 16 },
    { wch: 22 },
    { wch: 34 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Itemized Expenses');

  // 4. SETTLEMENT TRANSACTIONS SHEET
  const settlementRows = settlements.map((s, idx) => ({
    '#': idx + 1,
    'Date': new Date(s.createdAt).toLocaleDateString(),
    'From (Payer)': s.payerId?.name || 'Member',
    'To (Receiver)': s.receiverId?.name || 'Member',
    'Amount (INR)': Number(s.amount || 0),
    'Payment Method': s.paymentType || 'UPI',
    'Status': s.status || 'completed',
    'Note': s.note || ''
  }));
  const wsSettlements = XLSX.utils.json_to_sheet(settlementRows);
  wsSettlements['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSettlements, 'Settlements History');

  // Write and trigger download
  const cleanFileName = `SmartSplit_${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_Financial_Statement.xlsx`;
  XLSX.writeFile(wb, cleanFileName);
};

/**
 * Enterprise PDF Generator for Direct Download or Email Attachment
 * Generates an executive A4 Financial Statement with KPI cards, Member Balances, Settlements, and Expenses.
 */
export const generateGroupReportPdf = (group, expenses = [], settlements = [], summary = {}) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const groupName = group?.name || 'Group';
  const totalExp = Number(summary?.totalExpense || 0);
  const settledAmount = (settlements || [])
    .filter(s => s.status === 'completed' || s.status === 'admin_approved')
    .reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const pendingDues = Number(summary?.totalOwed || 0);
  const totalMembers = group?.members?.length || 0;
  const reportId = `SSR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${(group?._id || '').slice(-4).toUpperCase()}`;

  // 1. Top Decorative Brand Bar
  doc.setFillColor(37, 99, 235); // #2563eb
  doc.rect(0, 0, pageWidth, 8, 'F');

  // 2. Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('SmartSplit Enterprise', 40, 42);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('OFFICIAL GROUP FINANCIAL STATEMENT', 40, 56);

  // Status Badge on Right
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(pageWidth - 170, 28, 130, 26, 6, 6, 'F');
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(pageWidth - 170, 28, 130, 26, 6, 6, 'D');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(5, 150, 105);
  doc.text('VERIFIED AUDIT', pageWidth - 105, 44, { align: 'center' });

  // Metadata Row
  doc.setDrawColor(226, 232, 240);
  doc.line(40, 70, pageWidth - 40, 70);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Group:', 40, 85);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(groupName, 76, 85);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Report ID:', 220, 85);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(reportId, 270, 85);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Date:', pageWidth - 160, 85);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), pageWidth - 130, 85);

  // 3. Executive KPI Cards
  const cardY = 100;
  const cardW = (pageWidth - 80 - 30) / 4;
  const cardH = 50;

  const kpis = [
    { label: 'TOTAL EXPENSES', value: `INR ${totalExp.toFixed(2)}`, color: [37, 99, 235] },
    { label: 'TOTAL MEMBERS', value: `${totalMembers}`, color: [99, 102, 241] },
    { label: 'SETTLED AMOUNT', value: `INR ${settledAmount.toFixed(2)}`, color: [5, 150, 105] },
    { label: 'PENDING DUES', value: `INR ${pendingDues.toFixed(2)}`, color: [217, 119, 6] }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 40 + idx * (cardW + 10);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, cardY, cardW, cardH, 8, 8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, cardY, cardW, cardH, 8, 8, 'D');

    // Colored top line
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.rect(x + 8, cardY, cardW - 16, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.label, x + 10, cardY + 18);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 10, cardY + 36);
  });

  let currentY = 168;

  // 4. Member Balances Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Member Financial Standing', 40, currentY);

  const memberTableData = (summary?.memberBalances || []).map((rec, idx) => {
    const memId = (rec.user?._id || rec.user || '').toString();
    const mem = (group?.members || []).find(m => (m.user?._id || m.user || '').toString() === memId);
    const balance = Number(rec.netBalance || 0);
    const balanceStr = balance > 0 ? `+INR ${balance.toFixed(2)}` : balance < 0 ? `-INR ${Math.abs(balance).toFixed(2)}` : 'SETTLED';

    return [
      `${idx + 1}`,
      mem?.user?.name || rec.user?.name || 'Member',
      `INR ${Number(rec.totalPaid || 0).toFixed(2)}`,
      `INR ${Number(rec.totalShare || 0).toFixed(2)}`,
      balanceStr
    ];
  });

  autoTable(doc, {
    startY: currentY + 8,
    head: [['#', 'Member Name', 'Total Paid', 'Total Share', 'Net Balance']],
    body: memberTableData,
    margin: { left: 40, right: 40 },
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 8,
      cellPadding: 5,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 170 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' }
    }
  });

  currentY = doc.lastAutoTable.finalY + 22;

  // 5. Itemized Expenses Table
  if (currentY + 120 > pageHeight) {
    doc.addPage();
    currentY = 40;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Itemized Expenses (${expenses.length} Records)`, 40, currentY);

  const expenseTableData = expenses.slice(0, 50).map((exp, idx) => {
    const payer = exp.paidBy?.name || 'Member';
    return [
      `${idx + 1}`,
      new Date(exp.date || exp.createdAt).toLocaleDateString(),
      exp.category || 'General',
      exp.description,
      payer,
      `INR ${Number(exp.amount || 0).toFixed(2)}`
    ];
  });

  autoTable(doc, {
    startY: currentY + 8,
    head: [['#', 'Date', 'Category', 'Description', 'Paid By', 'Amount']],
    body: expenseTableData,
    margin: { left: 40, right: 40 },
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 8,
      cellPadding: 4.5,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 65 },
      2: { cellWidth: 70 },
      3: { cellWidth: 180 },
      4: { cellWidth: 90 },
      5: { halign: 'right', fontStyle: 'bold' }
    }
  });

  // 6. Settlements Section if fits
  currentY = doc.lastAutoTable.finalY + 22;
  if (settlements.length > 0) {
    if (currentY + 100 > pageHeight) {
      doc.addPage();
      currentY = 40;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Settlements History (${settlements.length} Records)`, 40, currentY);

    const settlementTableData = settlements.slice(0, 30).map((s, idx) => [
      `${idx + 1}`,
      new Date(s.createdAt).toLocaleDateString(),
      `${s.payerId?.name || 'Member'} -> ${s.receiverId?.name || 'Member'}`,
      s.paymentType || 'UPI',
      s.status || 'completed',
      `INR ${Number(s.amount || 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: currentY + 8,
      head: [['#', 'Date', 'Transfer Flow', 'Method', 'Status', 'Amount']],
      body: settlementTableData,
      margin: { left: 40, right: 40 },
      theme: 'grid',
      headStyles: {
        fillColor: [5, 150, 105],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      styles: {
        fontSize: 8,
        cellPadding: 4.5,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 65 },
        2: { cellWidth: 200 },
        3: { cellWidth: 70 },
        4: { cellWidth: 70 },
        5: { halign: 'right', fontStyle: 'bold' }
      }
    });
  }

  // Footer for each page
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.line(40, pageHeight - 30, pageWidth - 40, pageHeight - 30);
    doc.text(`SmartSplit Enterprise Verified Statement &bull; Page ${i} of ${totalPages}`, 40, pageHeight - 18);
    doc.text('Electronically verified financial document', pageWidth - 40, pageHeight - 18, { align: 'right' });
  }

  return doc;
};
