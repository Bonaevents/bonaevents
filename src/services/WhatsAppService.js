import { db } from '../firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Rileva se il dispositivo è iOS
 * @returns {boolean}
 */
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Rileva se il dispositivo è Android
 * @returns {boolean}
 */
const isAndroid = () => {
  return /Android/.test(navigator.userAgent);
};

/**
 * Rileva se l'app è in esecuzione in una WebView
 * @returns {boolean}
 */
const isInWebView = () => {
  const userAgent = navigator.userAgent || '';
  return (
    userAgent.includes('wv') || 
    userAgent.includes('WebView') ||
    (userAgent.includes('Safari') && !userAgent.includes('Chrome')) ||
    userAgent.includes('FB_IAB') ||
    userAgent.includes('FBAV') ||
    userAgent.includes('Instagram') ||
    userAgent.includes('WKWebView')
  );
};

/**
 * Formatta correttamente un numero di telefono per WhatsApp
 * @param {string} phoneNumber - Numero di telefono da formattare
 * @returns {string} - Numero formattato correttamente
 */
const formatPhoneForWhatsApp = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Rimuovi tutti i caratteri non numerici
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Se inizia con il prefisso internazionale dell'Italia (39), rimuovilo
  // WhatsApp richiede il prefisso nel formato "39" senza il + iniziale
  if (cleaned.startsWith('39')) {
    return cleaned; // Già nel formato corretto
  }

  // Se inizia con il prefisso internazionale dell'Italia (+39), rimuovilo
  if (cleaned.startsWith('039')) {
    cleaned = cleaned.substring(3);
    return '39' + cleaned;
  }
  
  // Se non ha alcun prefisso, aggiungi il prefisso italiano
  return '39' + cleaned;
};

/**
 * Formatta una data per la visualizzazione
 * @param {Object|string|Date} dateValue - Data da formattare (può essere un timestamp Firestore, una stringa o un oggetto Date)
 * @returns {string} - Data formattata
 */
const formatDate = (dateValue) => {
  if (!dateValue) return 'Data non disponibile';
  
  try {
    let date;
    
    // Gestisci diversi formati di data
    if (typeof dateValue === 'object' && dateValue.seconds) {
      // Timestamp Firestore
      date = new Date(dateValue.seconds * 1000);
    } else if (typeof dateValue === 'string') {
      // Stringa di data
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      // Già un oggetto Date
      date = dateValue;
    } else {
      return 'Data non valida';
    }
    
    // Verifica se la data è valida
    if (isNaN(date.getTime())) return 'Data non valida';
    
    // Formatta la data in italiano
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

// Funzione per formattare la data senza l'ora
const formatDateOnly = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  const date = timestamp instanceof Date 
    ? timestamp 
    : new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
  
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Invia un biglietto tramite WhatsApp
 * @param {Object} ticket - Oggetto con i dati del biglietto
 * @param {string} phoneNumber - Numero di telefono del destinatario
 * @returns {Promise<boolean>} - True se l'operazione è riuscita
 */
export const sendTicketViaWhatsApp = async (ticket, phoneNumber) => {
  try {
    // Validazione del ticket
    if (!ticket || typeof ticket !== 'object') {
      throw new Error('Ticket non valido');
    }

    // Formatta il numero di telefono
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    if (!formattedPhone) {
      throw new Error('Numero di telefono non valido');
    }

    // Usa sempre ticketCode come identificatore principale
    const ticketCode = ticket.ticketCode;
    if (!ticketCode) {
      throw new Error('Codice biglietto non valido');
    }

    console.log('Codice biglietto per il link:', ticketCode);
    
    // Genera il link del biglietto usando l'URL di Vercel
    const ticketLink = `https://gestione-pr-ultimata.vercel.app/ticket/${ticketCode}`;
    console.log('Link generato:', ticketLink);

    // Costruisci il messaggio
    const message = `Ecco il tuo biglietto per ${ticket.eventName || 'l\'evento'}!\n\n` +
      `📅 Data: ${formatDateOnly(ticket.eventDate)}\n` +
      `📍 Luogo: ${ticket.eventLocation || 'Non specificato'}\n` +
      `👤 Nome: ${ticket.customerName || 'Non specificato'}\n` +
      `🎫 Codice: ${ticketCode}\n\n` +
      `Visualizza il biglietto qui: ${ticketLink}`;

    // Costruisci l'URL di WhatsApp
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    console.log('URL WhatsApp generato:', whatsappUrl);

    // Apri WhatsApp usando window.location.href per maggiore compatibilità mobile
    window.location.href = whatsappUrl;

    // Aggiorna il documento del biglietto
    const ticketRef = doc(db, 'tickets', ticket.id);
    await updateDoc(ticketRef, {
      customerPhone: phoneNumber,
      whatsappSentAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Errore nell\'invio del biglietto via WhatsApp:', error);
    throw error;
  }
}; 