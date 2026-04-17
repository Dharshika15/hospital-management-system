export function printInvoice(invoice) {
  const printWindow = window.open('', '_blank', 'width=800,height=600');

  const items = (invoice.items || []).map(item => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#475569;">${item.description}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#0f172a;">₹${(item.amount || 0).toLocaleString()}</td>
    </tr>
  `).join('');

  const paymentBadgeColor = {
    cash: '#10b981', card: '#0ea5e9', upi: '#8b5cf6', insurance: '#f59e0b'
  }[invoice.paymentMethod] || '#6366f1';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #fff; color: #0f172a; padding: 0; }
        .page { max-width: 720px; margin: 0 auto; padding: 48px; }

        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .logo { display: flex; align-items: center; gap: 14px; }
        .logo-icon { width: 52px; height: 52px; background: linear-gradient(135deg,#6366f1,#8b5cf6); border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        .logo-icon svg { width: 28px; height: 28px; fill: none; stroke: #fff; stroke-width: 2; }
        .logo-text h1 { font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: 800; color: #0f172a; }
        .logo-text p { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600; margin-top: 2px; }

        .invoice-tag { text-align: right; }
        .invoice-tag h2 { font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight: 900; color: #6366f1; letter-spacing: -1px; }
        .invoice-tag .inv-num { font-size: 0.82rem; color: #94a3b8; font-weight: 600; margin-top: 4px; }
        .invoice-tag .inv-date { font-size: 0.82rem; color: #475569; font-weight: 500; margin-top: 2px; }

        .accent-bar { height: 4px; background: linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899); border-radius: 99px; margin-bottom: 36px; }

        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 36px; }
        .info-box { background: #f8faff; border-radius: 12px; padding: 18px 20px; border: 1px solid rgba(99,102,241,0.12); }
        .info-label { font-size: 0.62rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
        .info-value { font-size: 1rem; font-weight: 700; color: #0f172a; }
        .info-sub { font-size: 0.78rem; color: #64748b; margin-top: 3px; }

        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .items-table thead th { padding: 10px 16px; font-size: 0.68rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.2px; text-align: left; border-bottom: 2px solid #e2e8f0; background: #f8faff; }
        .items-table thead th:last-child { text-align: right; }

        .totals { margin-left: auto; width: 280px; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.875rem; color: #475569; border-bottom: 1px solid #f1f5f9; }
        .total-row:last-child { border-bottom: none; }
        .total-final { display: flex; justify-content: space-between; padding: 14px 20px; background: linear-gradient(135deg,#6366f1,#8b5cf6); border-radius: 12px; margin-top: 8px; }
        .total-final span { color: #fff; font-weight: 800; font-size: 1.1rem; }

        .payment-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 99px; font-size: 0.78rem; font-weight: 700; background: ${paymentBadgeColor}18; color: ${paymentBadgeColor}; border: 1px solid ${paymentBadgeColor}30; margin-top: 8px; }

        .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .footer-note { font-size: 0.78rem; color: #94a3b8; }
        .status-badge { padding: 6px 16px; background: #ecfdf5; color: #10b981; border-radius: 99px; font-size: 0.78rem; font-weight: 700; border: 1px solid rgba(16,185,129,0.2); }

        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-30deg); font-family: 'Outfit', sans-serif; font-size: 6rem; font-weight: 900; color: rgba(99,102,241,0.04); pointer-events: none; z-index: 0; white-space: nowrap; }

        @media print {
          body { padding: 0; }
          .page { padding: 32px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="watermark">PAID</div>
      <div class="page">
        <div class="header">
          <div class="logo">
            <div class="logo-icon">
              <svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <div class="logo-text">
              <h1>MediCore HMS</h1>
              <p>Hospital Management System</p>
            </div>
          </div>
          <div class="invoice-tag">
            <h2>INVOICE</h2>
            <div class="inv-num">${invoice.invoiceNumber}</div>
            <div class="inv-date">${new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>

        <div class="accent-bar"></div>

        <div class="info-grid">
          <div class="info-box">
            <div class="info-label">Bill To</div>
            <div class="info-value">${invoice.patientName}</div>
            <div class="info-sub">Patient</div>
          </div>
          <div class="info-box">
            <div class="info-label">Payment</div>
            <div class="info-value" style="text-transform:capitalize">${invoice.paymentMethod}</div>
            <div class="payment-badge">${invoice.paymentMethod?.toUpperCase()}</div>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${items}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>₹${(invoice.totalAmount || 0).toLocaleString()}</span>
          </div>
          ${(invoice.discount > 0) ? `
          <div class="total-row">
            <span>Discount</span>
            <span style="color:#f43f5e">- ₹${(invoice.discount || 0).toLocaleString()}</span>
          </div>` : ''}
          <div class="total-final">
            <span>Total Amount</span>
            <span>₹${(invoice.finalAmount || 0).toLocaleString()}</span>
          </div>
        </div>

        ${invoice.notes ? `<div style="margin-top:24px;padding:14px 18px;background:#f8faff;border-radius:10px;border:1px solid rgba(99,102,241,0.12);font-size:0.82rem;color:#475569;"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}

        <div class="footer">
          <div class="footer-note">
            <div style="font-weight:700;color:#0f172a;margin-bottom:4px;">Thank you for choosing MediCore HMS</div>
            <div>For queries, contact reception · This is a computer-generated invoice</div>
          </div>
          <div class="status-badge">✓ PAID</div>
        </div>
      </div>

      <div class="no-print" style="position:fixed;bottom:20px;right:20px;display:flex;gap:10px;">
        <button onclick="window.print()" style="padding:12px 24px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;font-family:'Plus Jakarta Sans',sans-serif;font-size:0.875rem;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(99,102,241,0.4);">
          🖨️ Print / Save PDF
        </button>
        <button onclick="window.close()" style="padding:12px 24px;background:#f1f5f9;color:#475569;border:none;border-radius:10px;font-family:'Plus Jakarta Sans',sans-serif;font-size:0.875rem;font-weight:600;cursor:pointer;">
          Close
        </button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
