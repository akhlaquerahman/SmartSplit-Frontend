/**
 * Enterprise PDF-Grade High-DPI Canvas Report Image Generator
 * Renders a razor-sharp, zoom-safe statement PNG with zero DOM truncation or oklch artifacts.
 */

const wrapText = (ctx, text, maxWidth) => {
  const str = String(text || '');
  if (!str) return [''];
  const words = str.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      // Break an extra-long single token if wider than column
      if (ctx.measureText(word).width > maxWidth) {
        let chunk = '';
        for (const ch of word) {
          if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        currentLine = chunk;
      } else {
        currentLine = word;
      }
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
};

const drawRoundedRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const formatCurrency = (val) => `₹${Number(val || 0).toFixed(2)}`;

export const generateWhatsAppStatementImage = async ({
  group,
  expenses = [],
  settlements = [],
  summary = {},
  currentBalance = 0,
  hasCurrentMember = false,
  reportId = 'SSR-REPORT',
  totalSettledAmount = 0
}) => {
  const WIDTH = 1200;
  const PAD = 48;
  const CONTENT_W = WIDTH - PAD * 2; // 1104
  const FONT_FAMILY = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  const members = group?.members || [];
  const memberList = summary?.memberBalances || [];
  const groupName = group?.name || 'Group';
  const totalExp = Number(summary?.totalExpense || 0);
  const pendingDues = Number(summary?.totalOwed || 0);

  const resolvePayerName = (exp) => {
    if (exp?.paidBy?.name) return exp.paidBy.name;
    const pId = (exp?.paidBy?._id || exp?.paidBy || '').toString();
    const found = members.find((m) => (m.user?._id || m.user || '').toString() === pId);
    return found?.user?.name || 'Member';
  };

  // Measurement canvas for exact line wrapping
  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = 10;
  measureCanvas.height = 10;
  const mCtx = measureCanvas.getContext('2d');

  // Precompute wrapped expense rows so height is exact
  mCtx.font = `600 13px ${FONT_FAMILY}`;
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
  );
  const expenseRows = sortedExpenses.map((exp, idx) => {
    const descLines = wrapText(mCtx, exp.description || 'Expense', 380);
    const payerLines = wrapText(mCtx, resolvePayerName(exp), 175);
    const rowLines = Math.max(descLines.length, payerLines.length);
    const rowHeight = Math.max(38, 18 + rowLines * 18);
    return {
      idx: idx + 1,
      date: new Date(exp.date || exp.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      category: (exp.category || 'General').toUpperCase(),
      descLines,
      payerLines,
      amount: formatCurrency(exp.amount),
      edited: Boolean(exp.isEdited || (exp.editHistory && exp.editHistory.length > 0)),
      rowHeight
    };
  });

  const sortedSettlements = [...settlements].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  // Calculate exact document height
  let y = 0;
  y += 10; // top blue bar
  y += 32; // top padding
  y += 64; // header row
  y += 22; // gap
  y += 48; // metadata bar
  y += 24; // gap
  y += 96; // 4 KPI cards
  y += 22; // gap
  if (hasCurrentMember) {
    y += 62; // standing strip
    y += 26;
  }

  // Member summary section
  y += 34; // section title
  y += 40; // table header
  y += Math.max(1, memberList.length) * 44; // rows
  y += 28; // gap

  // Settlements section
  if (sortedSettlements.length > 0) {
    y += 34; // section title
    y += 40; // table header
    y += sortedSettlements.length * 42;
    y += 28;
  }

  // Itemized expenses section
  y += 34; // section title
  y += 40; // table header
  if (expenseRows.length === 0) {
    y += 56;
  } else {
    y += expenseRows.reduce((sum, r) => sum + r.rowHeight, 0);
  }
  y += 36; // gap before footer
  y += 108; // footer + signature
  y += 24; // bottom padding

  const TOTAL_HEIGHT = y;
  const SCALE = Math.max(
    1.25,
    Math.min(2.5, 14500 / TOTAL_HEIGHT, Math.sqrt(120_000_000 / (WIDTH * TOTAL_HEIGHT)))
  );

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(WIDTH * SCALE);
  canvas.height = Math.round(TOTAL_HEIGHT * SCALE);

  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = 'middle';

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, WIDTH, TOTAL_HEIGHT);

  // Top Accent Brand Bar
  ctx.fillStyle = '#2563EB';
  ctx.fillRect(0, 0, WIDTH, 10);

  let curY = 42;

  // 1. Header Row
  // Brand Icon Box
  drawRoundedRect(ctx, PAD, curY, 52, 52, 14);
  ctx.fillStyle = '#EFF6FF';
  ctx.fill();
  ctx.strokeStyle = '#BFDBFE';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#2563EB';
  ctx.font = `900 24px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText('₹', PAD + 26, curY + 27);

  // Brand Title
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A';
  ctx.font = `900 24px ${FONT_FAMILY}`;
  ctx.fillText('SmartSplit', PAD + 66, curY + 17);

  const titleWidth = ctx.measureText('SmartSplit').width;
  drawRoundedRect(ctx, PAD + 76 + titleWidth, curY + 6, 92, 22, 11);
  ctx.fillStyle = '#DBEAFE';
  ctx.fill();
  ctx.fillStyle = '#1D4ED8';
  ctx.font = `800 10px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText('ENTERPRISE', PAD + 76 + titleWidth + 46, curY + 17);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = `700 12px ${FONT_FAMILY}`;
  ctx.fillText('OFFICIAL GROUP FINANCIAL STATEMENT', PAD + 66, curY + 42);

  // Center Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0F172A';
  ctx.font = `900 22px ${FONT_FAMILY}`;
  ctx.fillText('GROUP FINANCIAL REPORT', WIDTH / 2 + 40, curY + 16);

  // Verified Badge
  drawRoundedRect(ctx, WIDTH / 2 + 40 - 72, curY + 30, 144, 24, 12);
  ctx.fillStyle = '#ECFDF5';
  ctx.fill();
  ctx.strokeStyle = '#A7F3D0';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#059669';
  ctx.font = `800 11px ${FONT_FAMILY}`;
  ctx.fillText('✓ VERIFIED AUDIT', WIDTH / 2 + 40, curY + 42);

  // Right Report ID pill
  drawRoundedRect(ctx, WIDTH - PAD - 190, curY + 4, 190, 44, 12);
  ctx.fillStyle = '#F8FAFC';
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.stroke();
  ctx.fillStyle = '#64748B';
  ctx.font = `700 10px ${FONT_FAMILY}`;
  ctx.fillText('REPORT ID', WIDTH - PAD - 95, curY + 18);
  ctx.fillStyle = '#0F172A';
  ctx.font = `800 13px monospace`;
  ctx.fillText(reportId, WIDTH - PAD - 95, curY + 35);

  curY += 64 + 22;

  // 2. Metadata Bar
  drawRoundedRect(ctx, PAD, curY, CONTENT_W, 48, 14);
  ctx.fillStyle = '#F8FAFC';
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = `600 13px ${FONT_FAMILY}`;
  ctx.fillStyle = '#64748B';
  ctx.fillText('Group:', PAD + 18, curY + 24);
  ctx.fillStyle = '#0F172A';
  ctx.font = `800 14px ${FONT_FAMILY}`;
  ctx.fillText(groupName, PAD + 70, curY + 24);

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  ctx.textAlign = 'right';
  ctx.font = `600 13px ${FONT_FAMILY}`;
  ctx.fillStyle = '#64748B';
  ctx.fillText(`Date: ${dateStr}   •   Currency: INR (₹)   •   Status: `, WIDTH - PAD - 78, curY + 24);
  ctx.fillStyle = '#059669';
  ctx.font = `800 13px ${FONT_FAMILY}`;
  ctx.fillText('ACTIVE', WIDTH - PAD - 18, curY + 24);

  curY += 48 + 24;

  // 3. 4 Executive KPI Cards
  const cardGap = 16;
  const cardW = (CONTENT_W - cardGap * 3) / 4;
  const cardH = 96;
  const kpis = [
    { label: 'TOTAL EXPENSES', value: formatCurrency(totalExp), accent: '#2563EB', text: '#0F172A' },
    { label: 'TOTAL MEMBERS', value: `${members.length}`, accent: '#6366F1', text: '#0F172A' },
    { label: 'SETTLED AMOUNT', value: formatCurrency(totalSettledAmount), accent: '#10B981', text: '#059669' },
    { label: 'PENDING DUES', value: formatCurrency(pendingDues), accent: '#F59E0B', text: '#D97706' }
  ];

  kpis.forEach((kpi, i) => {
    const x = PAD + i * (cardW + cardGap);
    drawRoundedRect(ctx, x, curY, cardW, cardH, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top Accent Strip
    ctx.fillStyle = kpi.accent;
    drawRoundedRect(ctx, x + 1, curY + 1, cardW - 2, 5, 4);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748B';
    ctx.font = `800 11px ${FONT_FAMILY}`;
    ctx.fillText(kpi.label, x + 18, curY + 32);

    ctx.fillStyle = kpi.text;
    ctx.font = `900 24px ${FONT_FAMILY}`;
    ctx.fillText(kpi.value, x + 18, curY + 66);
  });

  curY += cardH + 22;

  // 4. Net Standing Strip
  if (hasCurrentMember) {
    const isPos = currentBalance > 0.005;
    const isNeg = currentBalance < -0.005;
    drawRoundedRect(ctx, PAD, curY, CONTENT_W, 62, 16);
    ctx.fillStyle = isPos ? '#ECFDF5' : isNeg ? '#FFF1F2' : '#F8FAFC';
    ctx.fill();
    ctx.strokeStyle = isPos ? '#A7F3D0' : isNeg ? '#FECDD3' : '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    drawRoundedRect(ctx, PAD + 16, curY + 13, 36, 36, 10);
    ctx.fillStyle = isPos ? '#059669' : isNeg ? '#E11D48' : '#475569';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 18px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('₹', PAD + 34, curY + 32);

    ctx.textAlign = 'left';
    ctx.fillStyle = isPos ? '#065F46' : isNeg ? '#9F1239' : '#334155';
    ctx.font = `800 11px ${FONT_FAMILY}`;
    ctx.fillText('YOUR NET STANDING', PAD + 66, curY + 21);

    ctx.font = `700 15px ${FONT_FAMILY}`;
    const standingMsg = isPos
      ? `You are owed ${formatCurrency(currentBalance)} in this group.`
      : isNeg
      ? `You owe ${formatCurrency(Math.abs(currentBalance))} to members.`
      : 'You are completely settled up!';
    ctx.fillText(standingMsg, PAD + 66, curY + 42);

    curY += 62 + 26;
  }

  // Helper to draw a section title
  const drawSectionTitle = (title, badgeText) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.font = `900 17px ${FONT_FAMILY}`;
    ctx.fillText(title, PAD, curY + 14);
    if (badgeText) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#64748B';
      ctx.font = `700 13px ${FONT_FAMILY}`;
      ctx.fillText(badgeText, WIDTH - PAD, curY + 14);
    }
    curY += 34;
  };

  // 5. Member Financial Summary Table
  drawSectionTitle('Member Financial Summary', `${members.length} Total Members`);

  const memTableH = 40 + Math.max(1, memberList.length) * 44;
  drawRoundedRect(ctx, PAD, curY, CONTENT_W, memTableH, 16);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Header bg
  ctx.fillStyle = '#F1F5F9';
  drawRoundedRect(ctx, PAD + 1, curY + 1, CONTENT_W - 2, 39, 14);
  ctx.fill();
  ctx.fillRect(PAD + 1, curY + 20, CONTENT_W - 2, 20);

  ctx.fillStyle = '#475569';
  ctx.font = `800 12px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText('#', PAD + 28, curY + 20);
  ctx.textAlign = 'left';
  ctx.fillText('MEMBER NAME', PAD + 62, curY + 20);
  ctx.textAlign = 'right';
  ctx.fillText('TOTAL PAID', PAD + 680, curY + 20);
  ctx.fillText('TOTAL SHARE', PAD + 880, curY + 20);
  ctx.fillText('NET BALANCE', WIDTH - PAD - 20, curY + 20);

  let rowY = curY + 40;
  memberList.forEach((rec, idx) => {
    const mId = (rec.user?._id || rec.user || '').toString();
    const mem = members.find((m) => (m.user?._id || m.user || '').toString() === mId);
    const mName = mem?.user?.name || rec.user?.name || 'Member';
    const role = mem?.role;
    const paid = Number(rec.totalPaid || 0);
    const share = Number(rec.totalShare || 0);
    const bal = Number(rec.netBalance || 0);

    if (idx > 0) {
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, rowY);
      ctx.lineTo(WIDTH - PAD, rowY);
      ctx.stroke();
    }

    ctx.fillStyle = '#64748B';
    ctx.font = `700 13px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${idx + 1}`, PAD + 28, rowY + 22);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.font = `700 14px ${FONT_FAMILY}`;
    ctx.fillText(mName, PAD + 62, rowY + 22);

    if (role === 'admin') {
      const nw = ctx.measureText(mName).width;
      drawRoundedRect(ctx, PAD + 72 + nw, rowY + 12, 52, 20, 6);
      ctx.fillStyle = '#FEF3C7';
      ctx.fill();
      ctx.fillStyle = '#B45309';
      ctx.font = `800 10px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.fillText('ADMIN', PAD + 72 + nw + 26, rowY + 22);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = '#334155';
    ctx.font = `700 14px ${FONT_FAMILY}`;
    ctx.fillText(formatCurrency(paid), PAD + 680, rowY + 22);
    ctx.fillText(formatCurrency(share), PAD + 880, rowY + 22);

    const balLabel =
      bal > 0.005 ? `+${formatCurrency(bal)}` : bal < -0.005 ? `-${formatCurrency(Math.abs(bal))}` : 'SETTLED';
    const pillW = Math.max(96, ctx.measureText(balLabel).width + 26);
    drawRoundedRect(ctx, WIDTH - PAD - 20 - pillW, rowY + 9, pillW, 26, 13);
    ctx.fillStyle = bal > 0.005 ? '#DCFCE7' : bal < -0.005 ? '#FFE4E6' : '#F1F5F9';
    ctx.fill();
    ctx.fillStyle = bal > 0.005 ? '#15803D' : bal < -0.005 ? '#BE123C' : '#475569';
    ctx.font = `800 12px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText(balLabel, WIDTH - PAD - 20 - pillW / 2, rowY + 22);

    rowY += 44;
  });

  curY += memTableH + 28;

  // 6. Settlements History Table (if any)
  if (sortedSettlements.length > 0) {
    drawSectionTitle('Settlements & Requests', `${sortedSettlements.length} Transactions`);

    const setTableH = 40 + sortedSettlements.length * 42;
    drawRoundedRect(ctx, PAD, curY, CONTENT_W, setTableH, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ECFDF5';
    drawRoundedRect(ctx, PAD + 1, curY + 1, CONTENT_W - 2, 39, 14);
    ctx.fill();
    ctx.fillRect(PAD + 1, curY + 20, CONTENT_W - 2, 20);

    ctx.fillStyle = '#065F46';
    ctx.font = `800 12px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('#', PAD + 28, curY + 20);
    ctx.textAlign = 'left';
    ctx.fillText('DATE', PAD + 62, curY + 20);
    ctx.fillText('TRANSFER FLOW', PAD + 200, curY + 20);
    ctx.fillText('METHOD', PAD + 660, curY + 20);
    ctx.fillText('STATUS', PAD + 800, curY + 20);
    ctx.textAlign = 'right';
    ctx.fillText('AMOUNT', WIDTH - PAD - 20, curY + 20);

    let sY = curY + 40;
    sortedSettlements.forEach((s, idx) => {
      if (idx > 0) {
        ctx.strokeStyle = '#F1F5F9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD, sY);
        ctx.lineTo(WIDTH - PAD, sY);
        ctx.stroke();
      }

      ctx.fillStyle = '#64748B';
      ctx.font = `700 13px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.fillText(`${idx + 1}`, PAD + 28, sY + 21);

      ctx.textAlign = 'left';
      ctx.fillText(
        new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        PAD + 62,
        sY + 21
      );

      ctx.fillStyle = '#0F172A';
      ctx.font = `700 14px ${FONT_FAMILY}`;
      ctx.fillText(`${s.payerId?.name || 'Member'}  →  ${s.receiverId?.name || 'Member'}`, PAD + 200, sY + 21);

      ctx.fillStyle = '#475569';
      ctx.font = `700 13px ${FONT_FAMILY}`;
      ctx.fillText((s.paymentType || 'UPI').toUpperCase(), PAD + 660, sY + 21);

      const status = (s.status || 'completed').toLowerCase();
      const statusColor = status === 'completed' ? '#059669' : status === 'pending' ? '#D97706' : '#E11D48';
      ctx.fillStyle = statusColor;
      ctx.font = `800 12px ${FONT_FAMILY}`;
      ctx.fillText(status.toUpperCase(), PAD + 800, sY + 21);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#059669';
      ctx.font = `800 14px ${FONT_FAMILY}`;
      ctx.fillText(formatCurrency(s.amount), WIDTH - PAD - 20, sY + 21);

      sY += 42;
    });

    curY += setTableH + 28;
  }

  // 7. Itemized Expenses Table
  drawSectionTitle('Itemized Expenses Breakdown', `${expenseRows.length} Records`);

  const expBodyH = expenseRows.length === 0 ? 56 : expenseRows.reduce((s, r) => s + r.rowHeight, 0);
  const expTableH = 40 + expBodyH;

  drawRoundedRect(ctx, PAD, curY, CONTENT_W, expTableH, 16);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#1E40AF';
  drawRoundedRect(ctx, PAD + 1, curY + 1, CONTENT_W - 2, 39, 14);
  ctx.fill();
  ctx.fillRect(PAD + 1, curY + 20, CONTENT_W - 2, 20);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 12px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.fillText('#', PAD + 28, curY + 20);
  ctx.textAlign = 'left';
  ctx.fillText('DATE', PAD + 62, curY + 20);
  ctx.fillText('CATEGORY', PAD + 185, curY + 20);
  ctx.fillText('DESCRIPTION', PAD + 315, curY + 20);
  ctx.fillText('PAID BY', PAD + 745, curY + 20);
  ctx.textAlign = 'right';
  ctx.fillText('AMOUNT', WIDTH - PAD - 20, curY + 20);

  let eY = curY + 40;
  if (expenseRows.length === 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94A3B8';
    ctx.font = `600 14px ${FONT_FAMILY}`;
    ctx.fillText('No expenses recorded in this group yet.', WIDTH / 2, eY + 28);
  } else {
    expenseRows.forEach((r, idx) => {
      if (idx % 2 === 1) {
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(PAD + 1, eY, CONTENT_W - 2, r.rowHeight);
      }
      if (idx > 0) {
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(PAD, eY);
        ctx.lineTo(WIDTH - PAD, eY);
        ctx.stroke();
      }

      const midY = eY + r.rowHeight / 2;

      ctx.fillStyle = '#64748B';
      ctx.font = `700 13px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.fillText(`${r.idx}`, PAD + 28, midY);

      ctx.textAlign = 'left';
      ctx.fillText(r.date, PAD + 62, midY);

      // Category pill
      drawRoundedRect(ctx, PAD + 185, midY - 11, 110, 22, 6);
      ctx.fillStyle = '#EFF6FF';
      ctx.fill();
      ctx.fillStyle = '#1D4ED8';
      ctx.font = `800 10px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.fillText(r.category.slice(0, 14), PAD + 185 + 55, midY);

      // Description (multi-line wrapped cleanly, never clipped!)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0F172A';
      ctx.font = `600 13px ${FONT_FAMILY}`;
      const descStartY = midY - ((r.descLines.length - 1) * 18) / 2;
      r.descLines.forEach((line, lIdx) => {
        ctx.fillText(line, PAD + 315, descStartY + lIdx * 18);
      });

      // Paid By (multi-line safe)
      ctx.fillStyle = '#334155';
      ctx.font = `600 13px ${FONT_FAMILY}`;
      const payerStartY = midY - ((r.payerLines.length - 1) * 18) / 2;
      r.payerLines.forEach((line, lIdx) => {
        ctx.fillText(line, PAD + 745, payerStartY + lIdx * 18);
      });

      // Amount
      ctx.textAlign = 'right';
      ctx.fillStyle = '#0F172A';
      ctx.font = `800 14px ${FONT_FAMILY}`;
      ctx.fillText(r.amount, WIDTH - PAD - 20, midY);

      eY += r.rowHeight;
    });
  }

  curY += expTableH + 36;

  // 8. Official Footer & Signature
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, curY);
  ctx.lineTo(WIDTH - PAD, curY);
  ctx.stroke();

  curY += 28;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B';
  ctx.font = `800 10px ${FONT_FAMILY}`;
  ctx.fillText('PREPARED BY', PAD, curY);
  ctx.fillStyle = '#0F172A';
  ctx.font = `900 14px ${FONT_FAMILY}`;
  ctx.fillText('SmartSplit Enterprise Engine', PAD, curY + 20);
  ctx.fillStyle = '#64748B';
  ctx.font = `500 12px ${FONT_FAMILY}`;
  ctx.fillText(`Report ID: ${reportId}`, PAD, curY + 38);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0F172A';
  ctx.font = `800 13px ${FONT_FAMILY}`;
  ctx.fillText('Electronically Verified Document', WIDTH / 2, curY + 14);
  ctx.fillStyle = '#64748B';
  ctx.font = `500 12px ${FONT_FAMILY}`;
  ctx.fillText('All balances, splits, and settlements are mathematically verified.', WIDTH / 2, curY + 34);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.font = `800 10px ${FONT_FAMILY}`;
  ctx.fillText('AUTHORIZED BY', WIDTH - PAD, curY);
  ctx.fillStyle = '#1E3A8A';
  ctx.font = `italic 700 22px Georgia, serif`;
  ctx.fillText('Akhlaque Rahman', WIDTH - PAD, curY + 22);
  ctx.fillStyle = '#0F172A';
  ctx.font = `800 13px ${FONT_FAMILY}`;
  ctx.fillText('SmartSplit Administrator', WIDTH - PAD, curY + 44);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to render PNG blob'))),
      'image/png',
      1.0
    );
  });

  const imageUrl = canvas.toDataURL('image/png', 1.0);
  return { blob, imageUrl };
};
