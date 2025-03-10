import emailjs from '@emailjs/browser';
import QRCode from 'qrcode';

const EMAILJS_SERVICE_ID = "service_sy3o38j";
const EMAILJS_TEMPLATE_ID = "template_hp3771g";
const EMAILJS_PUBLIC_KEY = "I-QS6yxI9dhNJuUZO";

// Inizializza EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

export const sendTicketEmail = async (ticketData, customerEmail) => {
  try {
    // Genera il QR code come URL data
    const qrData = JSON.stringify({
      ticketCode: ticketData.ticketCode,
      eventId: ticketData.eventId,
      eventName: ticketData.eventName,
      quantity: ticketData.quantity,
      customerEmail: customerEmail
    });

    const qrCodeUrl = await QRCode.toDataURL(qrData);

    const templateParams = {
      to_email: customerEmail,
      event_name: ticketData.eventName,
      ticket_code: ticketData.ticketCode,
      event_date: new Date(ticketData.eventDate).toLocaleDateString(),
      event_location: ticketData.eventLocation,
      quantity: ticketData.quantity,
      qr_code: qrCodeUrl
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    if (response.status === 200) {
      console.log('Email inviata con successo');
      return true;
    } else {
      throw new Error('Errore nell\'invio dell\'email');
    }
  } catch (error) {
    console.error('Errore nell\'invio dell\'email:', error);
    throw error;
  }
}; 