import emailjs from '@emailjs/browser';

const SERVICE_ID = 'service_qgnc64i';
const TEMPLATE_ID = 'template_oxpembg';
const PUBLIC_KEY = 'xSjIE1ggREjwtKbYK';

// Inizializza EmailJS con la chiave pubblica
emailjs.init(PUBLIC_KEY);

export const sendTicketEmail = async (email, ticketData) => {
  try {
    console.log('Inizio invio email a:', email);
    console.log('Dati biglietto ricevuti:', ticketData);

    // Validazione email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      console.error('Indirizzo email non valido:', email);
      return false;
    }

    // Genera il QR code
    const qrData = encodeURIComponent(JSON.stringify({
      ticketCode: ticketData.ticketCode,
      eventId: ticketData.eventId,
      eventName: ticketData.eventName,
      quantity: ticketData.quantity,
      customerEmail: email
    }));
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}`;
    console.log('QR Code URL generato:', qrCodeUrl);

    // Formatta la data
    const formatDate = (dateString) => {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch (error) {
        console.error('Errore nella formattazione della data:', error);
        return 'Data non disponibile';
      }
    };

    // Prepara i parametri per il template
    const templateParams = {
      to_name: ticketData.customerName,
      customer_email: email,
      event_name: ticketData.eventName,
      event_description: ticketData.eventDescription || 'Dettagli evento non disponibili',
      event_date: formatDate(ticketData.eventDate),
      event_location: ticketData.eventLocation || 'Luogo da definire',
      ticket_type: ticketData.ticketType || 'Standard',
      unit_price: ticketData.price.toFixed(2),
      quantity: ticketData.quantity,
      ticket_code: ticketData.ticketCode,
      total_price: ticketData.totalPrice.toFixed(2),
      qr_code: qrCodeUrl
    };

    console.log('Parametri template preparati:', templateParams);

    // Invia l'email usando EmailJS
    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams
    );

    console.log('Risposta EmailJS:', response);

    if (response.status === 200) {
      console.log('Email inviata con successo');
      return true;
    } else {
      console.error('Errore nell\'invio dell\'email. Status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Errore dettagliato nell\'invio dell\'email:', error);
    if (error.text) {
      console.error('Testo dell\'errore:', error.text);
    }
    return false;
  }
}; 