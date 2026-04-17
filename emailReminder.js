import emailjs from '@emailjs/browser';

const SERVICE_ID  = 'service_jxbdd13';
const TEMPLATE_ID = 'template_36g17yc';
const PUBLIC_KEY  = 'Y-EOKz3S_RJZMsW5d';

export async function sendEmailReminder(appointment) {
  const { patientName, patientEmail, doctorName, date, time, type } = appointment;

  if (!patientEmail) {
    return { success: false, error: 'No email address for patient' };
  }

  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : date;

  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email:     patientEmail,
        patient_name: patientName,
        doctor_name:  doctorName || 'your doctor',
        date:         formattedDate,
        time:         time,
        type:         type || 'General Consultation',
      },
      PUBLIC_KEY
    );
    return { success: true };
  } catch (err) {
    console.error('EmailJS error:', err);
    return { success: false, error: err?.text || err?.message || 'Failed to send email' };
  }
}

export function generateReminderText(appointment) {
  const { patientName, doctorName, date, time, type } = appointment;
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'N/A';
  return `Dear ${patientName}, your appointment with ${doctorName} is scheduled on ${formattedDate} at ${time} (${type || 'General'}). Please arrive 10 minutes early. - MediCore HMS`;
}

export function copyReminderToClipboard(appointment) {
  const text = generateReminderText(appointment);
  navigator.clipboard.writeText(text);
  return { success: true, text };
}
