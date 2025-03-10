import emailjs from '@emailjs/browser';

// Costanti per EmailJS
const EMAILJS_SERVICE_ID = 'service_sy3o38j';
const EMAILJS_TEMPLATE_ID = 'template_hp3771g';
const EMAILJS_PUBLIC_KEY = 'I-QS6yxI9dhNJuUZO';

// Inizializza EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

export async function sendTicketEmail(ticketData) {
  try {
    // Crea un oggetto con i dati del biglietto per il QR
    const qrData = encodeURIComponent(JSON.stringify({
      ticketCode: ticketData.ticketCode,
      eventId: ticketData.eventId,
      eventName: ticketData.eventName,
      quantity: ticketData.quantity
    }));

    // Genera l'URL del QR code utilizzando un servizio esterno
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}`;

    // Log per verificare il QR code
    console.log('QR Code Data URL:', qrCodeUrl);

    // Crea l'HTML per il biglietto con il QR code incorporato
    const ticketHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="text-align: center; color: #333;">Il tuo biglietto per ${ticketData.eventName}</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Nome:</strong> ${ticketData.customerName}</p>
          <p><strong>Data:</strong> ${new Date(ticketData.eventDate).toLocaleDateString()}</p>
          <p><strong>Luogo:</strong> ${ticketData.eventLocation}</p>
          <p><strong>Quantità:</strong> ${ticketData.quantity}</p>
          <p><strong>Codice Biglietto:</strong> ${ticketData.ticketCode}</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <img src="${qrCodeUrl}" alt="QR Code" style="width: 300px; height: 300px; margin: 0 auto;">
          <p style="color: #666; margin-top: 10px;">Mostra questo QR code all'ingresso</p>
        </div>

        <div style="text-align: center; color: #666; font-size: 14px; margin-top: 20px;">
          <p>Questo è un biglietto valido per l'ingresso.</p>
          <p>Non condividere questo QR code con nessuno.</p>
        </div>
      </div>
    `;

    // Prepara i parametri per il template
    const templateParams = {
      to_email: ticketData.customerEmail,
      to_name: ticketData.customerName,
      event_name: ticketData.eventName,
      event_date: new Date(ticketData.eventDate).toLocaleDateString(),
      event_location: ticketData.eventLocation,
      ticket_code: ticketData.ticketCode,
      quantity: ticketData.quantity,
      total_price: ticketData.totalPrice.toFixed(2),
      qr_code: qrCodeUrl,
      html_content: ticketHtml
    };

    // Invia l'email
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    if (response.status !== 200) {
      throw new Error('Errore nell\'invio dell\'email');
    }

    return response;
  } catch (error) {
    console.error('Errore nell\'invio dell\'email:', error);
    throw error;
  }
} 