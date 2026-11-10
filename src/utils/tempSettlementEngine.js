import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const toCents = (value) => Math.round((Number(value) || 0) * 100);
export const fromCents = (value) => Number((value / 100).toFixed(2));

export const formatInr = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

export const formatPdfCurrency = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

export const formatExpenseDateTime = (isoOrLocal) => {
  if (!isoOrLocal) return '-';
  const dt = new Date(isoOrLocal);
  if (Number.isNaN(dt.getTime())) return String(isoOrLocal);
  return dt.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const getCurrentDateTimeLocal = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
};

export const getExpenseSharesMap = (expense, memberIds) => {
  const validParticipants = (expense.participants || []).filter((id) => memberIds.includes(id));

  if (expense.splitType === 'exact' && Array.isArray(expense.splitDetails) && expense.splitDetails.length > 0) {
    return expense.splitDetails.reduce((acc, item) => {
      if (memberIds.includes(item.memberId)) {
        acc[item.memberId] = (acc[item.memberId] || 0) + toCents(item.amount);
      }
      return acc;
    }, {});
  }

  if (validParticipants.length === 0) return {};

  const totalCents = toCents(expense.amount);
  const baseShare = Math.floor(totalCents / validParticipants.length);
  const remainder = totalCents - baseShare * validParticipants.length;

  return validParticipants.reduce((acc, memberId, idx) => {
    acc[memberId] = baseShare + (idx === validParticipants.length - 1 ? remainder : 0);
    return acc;
  }, {});
};

export const calculateTempTripSummary = (trip) => {
  const members = trip?.members || [];
  const expenses = trip?.expenses || [];
  const memberIds = members.map((m) => m.id);
  const memberMap = members.reduce((acc, m) => {
    acc[m.id] = m;
    return acc;
  }, {});

  const ledger = members.reduce((acc, m) => {
    acc[m.id] = {
      memberId: m.id,
      name: m.name,
      totalPaidCents: 0,
      totalShareCents: 0,
      netBalanceCents: 0
    };
    return acc;
  }, {});

  let totalSpentCents = 0;

  expenses.forEach((expense) => {
    const amountCents = toCents(expense.amount);
    if (amountCents <= 0) return;

    totalSpentCents += amountCents;

    if (expense.paidBy && ledger[expense.paidBy]) {
      ledger[expense.paidBy].totalPaidCents += amountCents;
    }

    const shares = getExpenseSharesMap(expense, memberIds);
    Object.entries(shares).forEach(([memberId, shareCents]) => {
      if (ledger[memberId]) {
        ledger[memberId].totalShareCents += shareCents;
      }
    });
  });

  const memberBalances = Object.values(ledger).map((entry) => {
    const netBalanceCents = entry.totalPaidCents - entry.totalShareCents;
    return {
      memberId: entry.memberId,
      name: entry.name,
      totalPaid: fromCents(entry.totalPaidCents),
      totalShare: fromCents(entry.totalShareCents),
      netBalance: fromCents(netBalanceCents),
      netBalanceCents
    };
  });

  // Greedy minimum-transaction settlement algorithm
  const creditors = [];
  const debtors = [];

  memberBalances.forEach((entry) => {
    if (entry.netBalanceCents > 1) {
      creditors.push({ memberId: entry.memberId, amount: entry.netBalanceCents });
    } else if (entry.netBalanceCents < -1) {
      debtors.push({ memberId: entry.memberId, amount: Math.abs(entry.netBalanceCents) });
    }
  });

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt = debtors[j];
    const settleAmount = Math.min(credit.amount, debt.amount);

    settlements.push({
      fromId: debt.memberId,
      fromName: memberMap[debt.memberId]?.name || 'Member',
      toId: credit.memberId,
      toName: memberMap[credit.memberId]?.name || 'Member',
      amount: fromCents(settleAmount)
    });

    credit.amount -= settleAmount;
    debt.amount -= settleAmount;

    if (credit.amount < 1) i += 1;
    if (debt.amount < 1) j += 1;
  }

  const totalSpent = fromCents(totalSpentCents);
  const perPersonAvg = members.length > 0 ? fromCents(Math.round(totalSpentCents / members.length)) : 0;

  return {
    totalSpent,
    expenseCount: expenses.length,
    memberCount: members.length,
    perPersonAvg,
    memberBalances,
    settlements
  };
};

export const buildWhatsAppSummaryText = (trip, summary) => {
  const memberNameById = (trip.members || []).reduce((acc, m) => {
    acc[m.id] = m.name;
    return acc;
  }, {});

  const lines = [
    `*${trip.name} - Temporary Settlement Report*`,
    `Members (${trip.members.length}): ${trip.members.map((m) => m.name).join(', ')}`,
    `Total Trip Spend: ${formatPdfCurrency(summary.totalSpent)}`,
    `Expenses Logged: ${summary.expenseCount}`,
    '',
    '*Final Settlement (Who Pays Whom):*'
  ];

  if (summary.settlements.length === 0) {
    lines.push('- Everyone is settled up!');
  } else {
    summary.settlements.forEach((s, idx) => {
      lines.push(`${idx + 1}. ${s.fromName} -> ${s.toName}: ${formatPdfCurrency(s.amount)}`);
    });
  }

  lines.push('', '*Member Summary:*');
  summary.memberBalances.forEach((m) => {
    const status =
      m.netBalance > 0.01
        ? `Gets back ${formatPdfCurrency(m.netBalance)}`
        : m.netBalance < -0.01
          ? `Owes ${formatPdfCurrency(Math.abs(m.netBalance))}`
          : 'Settled';
    lines.push(`- ${m.name}: Paid ${formatPdfCurrency(m.totalPaid)} | Share ${formatPdfCurrency(m.totalShare)} | ${status}`);
  });

  if (trip.expenses.length > 0) {
    lines.push('', '*Expense Details:*');
    const sorted = [...trip.expenses].sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    sorted.forEach((exp, idx) => {
      const payer = memberNameById[exp.paidBy] || 'Unknown';
      const participants = (exp.participants || []).map((id) => memberNameById[id] || 'Unknown').join(', ');
      const placeLabel = exp.location ? ` @ ${exp.location}` : '';
      lines.push(
        `${idx + 1}. ${exp.description}${placeLabel} (${formatPdfCurrency(exp.amount)}) - Paid by ${payer} at ${formatExpenseDateTime(exp.dateTime)} | Included: ${participants}`
      );
    });
  }

  lines.push('', 'Generated via SmartSplit Temp Settlement');
  return lines.join('\n');
};

export const downloadTempSettlementPdf = (trip, summary) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const memberNameById = (trip.members || []).reduce((acc, m) => {
    acc[m.id] = m.name;
    return acc;
  }, {});

  // Branded Header Banner
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 86, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(trip.name || 'Temporary Trip Settlement', 40, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('SmartSplit - Temporary Settlement Report', 40, 56);
  doc.text(`Generated: ${formatExpenseDateTime(new Date().toISOString())}`, 40, 71);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Total Spend: ${formatPdfCurrency(summary.totalSpent)}`, pageWidth - 40, 44, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`${summary.memberCount} Members  |  ${summary.expenseCount} Expenses`, pageWidth - 40, 62, { align: 'right' });

  let cursorY = 112;

  // Members list line
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Trip Members:', 40, cursorY);
  doc.setFont('helvetica', 'normal');
  const memberListText = doc.splitTextToSize(
    (trip.members || []).map((m) => m.name).join(', '),
    pageWidth - 125
  );
  doc.text(memberListText, 118, cursorY);
  cursorY += memberListText.length * 14 + 14;

  // Section 1: Final Settlement Plan
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. Final Settlement Plan (Who Pays Whom)', 40, cursorY);
  cursorY += 8;

  const settlementRows =
    summary.settlements.length > 0
      ? summary.settlements.map((s, idx) => [
          idx + 1,
          s.fromName,
          s.toName,
          formatPdfCurrency(s.amount)
        ])
      : [['-', 'All members are settled', '-', formatPdfCurrency(0)]];

  autoTable(doc, {
    startY: cursorY,
    head: [['#', 'Who Pays (From)', 'Receives (To)', 'Amount']],
    body: settlementRows,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 9.5 },
    bodyStyles: { fontSize: 9.5, textColor: [30, 41, 59] },
    margin: { left: 40, right: 40 }
  });

  cursorY = (doc.lastAutoTable?.finalY || cursorY + 40) + 22;

  // Section 2: Member Balance Summary
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. Member Balance Summary', 40, cursorY);
  cursorY += 8;

  const memberRows = summary.memberBalances.map((m) => {
    const status =
      m.netBalance > 0.01
        ? `Gets back ${formatPdfCurrency(m.netBalance)}`
        : m.netBalance < -0.01
          ? `Needs to pay ${formatPdfCurrency(Math.abs(m.netBalance))}`
          : 'Settled';
    return [
      m.name,
      formatPdfCurrency(m.totalPaid),
      formatPdfCurrency(m.totalShare),
      status
    ];
  });

  autoTable(doc, {
    startY: cursorY,
    head: [['Member', 'Total Paid', 'Total Share', 'Net Status']],
    body: memberRows,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 9.5 },
    bodyStyles: { fontSize: 9.5, textColor: [30, 41, 59] },
    margin: { left: 40, right: 40 }
  });

  cursorY = (doc.lastAutoTable?.finalY || cursorY + 40) + 22;

  // Section 3: Expense Timeline
  if (cursorY > doc.internal.pageSize.getHeight() - 120) {
    doc.addPage();
    cursorY = 44;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('3. Expense Details (Who Paid, Where, When & Participants)', 40, cursorY);
  cursorY += 8;

  const sortedExpenses = [...(trip.expenses || [])].sort(
    (a, b) => new Date(a.dateTime) - new Date(b.dateTime)
  );

  const expenseRows =
    sortedExpenses.length > 0
      ? sortedExpenses.map((exp, idx) => [
          idx + 1,
          formatExpenseDateTime(exp.dateTime),
          exp.location ? `${exp.description} (${exp.location})` : exp.description,
          memberNameById[exp.paidBy] || 'Unknown',
          (exp.participants || []).map((id) => memberNameById[id] || 'Unknown').join(', '),
          formatPdfCurrency(exp.amount)
        ])
      : [['-', '-', 'No expenses recorded', '-', '-', formatPdfCurrency(0)]];

  autoTable(doc, {
    startY: cursorY,
    head: [['#', 'Date & Time', 'Expense / Place', 'Paid By', 'Included Members', 'Amount']],
    body: expenseRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 96 },
      5: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 40, right: 40 }
  });

  const safeFileName = (trip.name || 'Temp_Trip')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  doc.save(`${safeFileName || 'Temp_Trip'}_Settlement_Report.pdf`);
};
