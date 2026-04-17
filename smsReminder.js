// SMS / WhatsApp Reminder Utility
// Supports MSG91 (India) and Twilio
// Configure via .env — see .env.example for keys

const SMS_PROVIDER = process.env.REACT_APP_SMS_PROVIDER || 'msg91'; // 'msg91' | 'twilio'

// ─── MSG91 ────────────────────────────────────────────────────────────────────
async function sendViaMSG91(phone, message) {
  const authKey  = process.env.REACT_APP_MSG91_AUTH_KEY;
  const senderId = process.env.REACT_APP_MSG91_SENDER_ID || 'MDHMS';

  if (!authKey) throw new Error('MSG91_AUTH_KEY not set in .env');

  // Format phone: must be 91XXXXXXXXXX (no + prefix)
  const formatted = phone.replace(/\D/g, '').replace(/^0/, '91').replace(/^(?!91)/, '91');

  const res = await fetch('https://api.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'authkey': authKey },
    body: JSON.stringify({
      template_id: process.env.REACT_APP_MSG91_TEMPLATE_ID || '',
      sender: senderId,
      short_url: '0',
      mobiles: formatted,
      message,
    }),
  });

  const data = await res.json();
  if (data.type === 'success' || res.ok) return { success: true };
  throw new Error(data.message || 'MSG91 error');
}

// ─── Twilio ───────────────────────────────────────────────────────────────────
async function sendViaTwilio(phone, message, isWhatsApp = false) {
  const accountSid = process.env.REACT_APP_TWILIO_ACCOUNT_SID;
  const authToken  = process.env.REACT_APP_TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.REACT_APP_TWILIO_FROM_NUMBER; // e.g. +14155238886 (WhatsApp sandbox) or +1XXXXXXXXXX

  if (!accountSid || !authToken || !fromNumber) throw new Error('Twilio credentials not set in .env');

  // Format phone: must start with + and country code
  const formatted = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`;

  const from = isWhatsApp ? `whatsapp:${fromNumber}` : fromNumber;
  const to   = isWhatsApp ? `whatsapp:${formatted}`  : formatted;

  // NOTE: Twilio API requires server-side call (CORS blocked from browser).
  // This function is intended to be called from your backend Node.js server.
  // Frontend will call your backend /api/send-sms endpoint instead.
  const res = await fetch('/api/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, body: message, provider: 'twilio' }),
  });

  const data = await res.json();
  if (data.success) return { success: true };
  throw new Error(data.error || 'Twilio error');
}

// ─── WhatsApp via MSG91 ───────────────────────────────────────────────────────
async function sendWhatsAppViaMSG91(phone, appointment) {
  const authKey    = process.env.REACT_APP_MSG91_AUTH_KEY;
  const templateId = process.env.REACT_APP_MSG91_WA_TEMPLATE_ID;

  if (!authKey || !templateId) throw new Error('MSG91 WhatsApp credentials not set in .env');

  const formatted = phone.replace(/\D/g, '').replace(/^0/, '91').replace(/^(?!91)/, '91');

  const res = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'authkey': authKey },
    body: JSON.stringify({
      integrated_number: process.env.REACT_APP_MSG91_WA_NUMBER,
      content_type: 'template',
      payload: {
        to: formatted,
        type: 'template',
        template: {
          name: templateId,
          language: { code: 'en' },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: appointment.patientName },
              { type: 'text', text: appointment.doctorName },
              { type: 'text', text: appointment.date },
              { type: 'text', text: appointment.time },
              { type: 'text', text: appointment.type || 'General' },
            ]
          }]
        }
      }
    }),
  });

  const data = await res.json();
  if (data.type === 'success' || res.ok) return { success: true };
  throw new Error(data.message || 'MSG91 WhatsApp error');
}

// ─── Main exported functions ──────────────────────────────────────────────────

export function buildSMSMessage(appointment) {
  const { patientName, doctorName, date, time, type } = appointment;
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    : date;
  return `Dear ${patientName}, your appointment with Dr. ${doctorName} is confirmed on ${formattedDate} at ${time} (${type || 'General'}). Please arrive 10 mins early. - MediCore HMS`;
}

/**
 * Send SMS reminder
 * @param {string} phone — patient's phone number
 * @param {object} appointment — { patientName, doctorName, date, time, type }
 */
export async function sendSMSReminder(phone, appointment) {
  if (!phone) return { success: false, error: 'No phone number provided' };

  const message = buildSMSMessage(appointment);

  try {
    if (SMS_PROVIDER === 'twilio') {
      return await sendViaTwilio(phone, message, false);
    } else {
      return await sendViaMSG91(phone, message);
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Send WhatsApp reminder
 * @param {string} phone — patient's phone number
 * @param {object} appointment — appointment object
 */
export async function sendWhatsAppReminder(phone, appointment) {
  if (!phone) return { success: false, error: 'No phone number provided' };

  try {
    if (SMS_PROVIDER === 'twilio') {
      const message = buildSMSMessage(appointment);
      return await sendViaTwilio(phone, message, true);
    } else {
      return await sendWhatsAppViaMSG91(phone, appointment);
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Copy reminder text to clipboard (WhatsApp manual send fallback)
 */
export function copyReminderText(appointment) {
  const text = buildSMSMessage(appointment);
  navigator.clipboard?.writeText(text);
  return text;
}

/**
 * Open WhatsApp Web with pre-filled message
 * Works without any API key — manual send
 */
export function openWhatsAppWeb(phone, appointment) {
  const cleaned = phone.replace(/\D/g, '');
  const number  = cleaned.startsWith('91') ? cleaned : `91${cleaned.slice(-10)}`;
  const message = encodeURIComponent(buildSMSMessage(appointment));
  window.open(`https://wa.me/${number}?text=${message}`, '_blank');
}
