import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config';
import {
    collection, addDoc, doc, runTransaction, serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { sendTicketEmail } from '../../services/EmailService'; // Decommenta import
// import DateSelector from './DateSelector'; // Rimosso se la selezione avviene fuori
import './SellTicketModal.css';
import { generateTicketCode } from '../../utils/ticketUtils';
import { FaTicketAlt, FaUser, FaEnvelope, FaTable, FaEuroSign, FaWhatsapp } from 'react-icons/fa';

// Funzione per mappare il nome del tipo di biglietto
const mapTicketTypeName = (ticketType) => {
  // Se l'ID è "student" o il nome è "Studenti", lo cambia in "VIP Early Birds"
  if (ticketType.id === 'student' || ticketType.name === 'Studenti') {
    return { ...ticketType, name: 'VIP Early Birds' };
  }
  return ticketType;
};

// La prop ora include selectedDateItem
function SellTicketModal({ event, selectedDateItem, onClose, onSold }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Stato del form, inizializzato in base a event e selectedDateItem
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    quantity: 1,
    selectedTicketTypeId: null,
    includeTable: false,
    selectedTableTypeId: null,
    totalPrice: 0,
    // Memorizza i dettagli dei tipi disponibili per questa data
    availableTicketsForDate: [],
    availableTablesForDate: [],
    maxQuantity: 1, // Max selezionabile per il tipo scelto
  });

  // Funzione per inizializzare/aggiornare lo stato del form quando cambiano event o selectedDateItem
  const initializeForm = useCallback(() => {
    if (!event || !selectedDateItem) {
        setError("Dati evento o data mancanti.");
        return;
    }

    // Applica la mappatura dei nomi dei tipi di biglietto
    const ticketsForDate = (selectedDateItem.ticketTypes || []).map(mapTicketTypeName);
    const tablesForDate = selectedDateItem.tableTypes || [];

    // Trova il primo tipo di biglietto disponibile come default
    const defaultTicketType = ticketsForDate.find(t => t.quantity > 0) || (ticketsForDate.length > 0 ? ticketsForDate[0] : null);
    const defaultTableType = tablesForDate.find(t => t.quantity > 0) || (tablesForDate.length > 0 ? tablesForDate[0] : null);

    const initialQuantity = 1;
    const initialTicketPrice = defaultTicketType ? Number(defaultTicketType.price || 0) : 0;
    // Imposta maxQuantity in base alla disponibilità del tipo di default o 1 se non disponibile
    const initialMaxQuantity = defaultTicketType ? Math.max(1, Number(defaultTicketType.quantity || 0)) : 1;
    
    setFormData(prev => ({
      ...prev,
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        quantity: initialQuantity,
        selectedTicketTypeId: defaultTicketType ? defaultTicketType.id : null,
        includeTable: false, // Inizia senza tavolo
        selectedTableTypeId: null,
        totalPrice: initialTicketPrice * initialQuantity,
        availableTicketsForDate: ticketsForDate,
        availableTablesForDate: tablesForDate,
        // Assicura che maxQuantity sia almeno 1 se il tipo di biglietto esiste
        maxQuantity: defaultTicketType ? initialMaxQuantity : 0,
    }));
    setError(null); // Resetta errori

  }, [event, selectedDateItem]);

  // Inizializza il form all'apertura o al cambio di data/evento
  useEffect(() => {
    initializeForm();
  }, [initializeForm]);


  // --- Calcolo Prezzo Totale --- 
  const calculateTotalPrice = useCallback(() => {
    const ticketType = formData.availableTicketsForDate.find(t => t.id === formData.selectedTicketTypeId);
    const tableType = formData.includeTable ? formData.availableTablesForDate.find(t => t.id === formData.selectedTableTypeId) : null;
    
    const ticketPrice = ticketType ? Number(ticketType.price || 0) : 0;
    const tablePrice = tableType ? Number(tableType.price || 0) : 0;
    const quantity = Number(formData.quantity || 0);

    // Se il tavolo è incluso, il prezzo è per tavolo (quantità 1 implicita per tavolo)
    // Altrimenti, il prezzo è per biglietto * quantità
    return formData.includeTable ? tablePrice : (ticketPrice * quantity);

  }, [formData.selectedTicketTypeId, formData.quantity, formData.includeTable, formData.selectedTableTypeId, formData.availableTicketsForDate, formData.availableTablesForDate]);

  // Aggiorna il prezzo totale quando cambiano le selezioni
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      totalPrice: calculateTotalPrice()
    }));
  }, [calculateTotalPrice]);


  // --- Handler Modifiche Input --- 

  const handleInputChange = (e) => {
      const { name, value, type, checked } = e.target;
      if (type === 'checkbox') {
          // Gestione specifica per includeTable
          if (name === 'includeTable') {
              const newIncludeTable = checked;
               // Trova il primo tavolo disponibile come default se si attiva l'opzione
              const defaultTable = formData.availableTablesForDate.find(t => t.quantity > 0);
              const defaultTableId = newIncludeTable && defaultTable ? defaultTable.id : null;
              
      setFormData(prev => ({
        ...prev,
                  includeTable: newIncludeTable,
                  // Seleziona il primo tavolo disponibile se si attiva, altrimenti null
                  selectedTableTypeId: defaultTableId,
                  // Quando si vende un tavolo, la quantità è 1 e non è più modificabile (per i biglietti)
                  quantity: newIncludeTable ? 1 : prev.quantity,
                  maxQuantity: newIncludeTable ? 1 : prev.maxQuantity, // Max 1 se è tavolo
              }));
          } else {
             // Per altre checkbox future
              setFormData(prev => ({ ...prev, [name]: checked }));
          }
      } else if (name === 'selectedTicketTypeId') {
          const selectedType = formData.availableTicketsForDate.find(t => t.id === value);
          // La nuova quantità massima è quella del tipo selezionato, o 0 se non trovato/non disponibile
          const newMax = selectedType ? Math.max(0, Number(selectedType.quantity || 0)) : 0;
          // La quantità attuale non può superare la nuova massima
          const currentQuantity = Math.min(formData.quantity, newMax);

    setFormData(prev => ({
      ...prev,
              selectedTicketTypeId: value,
              quantity: currentQuantity > 0 ? currentQuantity : (newMax > 0 ? 1: 0), // Imposta a 1 se possibile, altrimenti 0
              maxQuantity: newMax,
              // includeTable: false, // Potrebbe non essere necessario deselezionare tavolo qui
              // selectedTableTypeId: null,
          }));
      } else if (name === 'quantity') {
          const newQuantity = value === '' ? '' : parseInt(value);
           // Assicura che la quantità sia un numero valido, >= 1 e <= maxQuantity
          if (newQuantity === '' || (!isNaN(newQuantity) && newQuantity >= 1 && newQuantity <= formData.maxQuantity)) {
              setFormData(prev => ({ ...prev, quantity: newQuantity }));
          } else if (!isNaN(newQuantity) && newQuantity > formData.maxQuantity) {
              // Se l'utente inserisce un valore > max, imposta al massimo consentito
              setFormData(prev => ({ ...prev, quantity: formData.maxQuantity }));
          }
      } else if (name === 'selectedTableTypeId') {
            // Quando si seleziona un tavolo, la quantità di biglietti non è rilevante
    setFormData(prev => ({
      ...prev,
                selectedTableTypeId: value,
                quantity: 1, // Quantità fissa a 1 per vendita tavolo
                maxQuantity: 1 
            }));
      } else {
          // Per altri input (customerName, email, phone)
          setFormData(prev => ({ ...prev, [name]: value }));
      }
  };


  // --- Logica Invio Messaggio WhatsApp --- 
  const generateWhatsAppMessage = (ticketData, ticketLink) => {
    const eventDate = new Date(ticketData.eventDate);
    const formattedDate = eventDate.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let message = `*RIEPILOGO ORDINE*\n\n`;
    message += `*Evento:* ${event.name}\n`;
    message += `*Data:* ${formattedDate}\n`;
    message += `*Luogo:* ${event.location}\n\n`;

    if (ticketData.itemType === 'table') {
        const table = formData.availableTablesForDate.find(t => t.id === ticketData.itemId);
        message += `*Tavolo:* ${table?.name || 'N/D'}\n`;
        message += `*Posti:* ${table?.seats || 'N/D'}\n`;
        message += `*Quantità:* 1\n`; // Sempre 1 per tavolo
    } else {
        const ticket = formData.availableTicketsForDate.find(t => t.id === ticketData.itemId);
        message += `*Biglietto:* ${ticket?.name || 'N/D'}\n`;
        message += `*Quantità:* ${ticketData.quantity}\n`;
    }
    
    message += `*Prezzo Totale:* €${ticketData.totalPrice.toFixed(2)}\n\n`;
    message += `*Cliente:* ${ticketData.customerName}\n`;
    if (ticketData.customerEmail) message += `*Email:* ${ticketData.customerEmail}\n`;
    message += `*Codice Biglietto:* ${ticketData.ticketCode}\n\n`;
    
    // Aggiungi il link al biglietto
    if (ticketLink) {
        message += `*Visualizza il tuo biglietto qui:*\n${ticketLink}\n\n`;
    }

    message += `_Grazie per il tuo acquisto!_`;

    return encodeURIComponent(message);
  };

  const openWhatsApp = (phoneNumber, message) => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    // Aggiungi prefisso internazionale se necessario (es. 39 per Italia)
    const internationalPhone = cleanPhone.startsWith('39') ? cleanPhone : (cleanPhone.length > 10 ? cleanPhone : `39${cleanPhone}`); // Gestisce un po' meglio i prefissi
    const whatsappUrl = `https://wa.me/${internationalPhone}?text=${message}`;
    // window.open(whatsappUrl, '_blank'); // Vecchio metodo
    window.location.href = whatsappUrl; // Nuovo metodo più compatibile
  };


  // --- Gestione Submit (Vendita) --- 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { customerName, customerEmail, customerPhone, quantity, selectedTicketTypeId, includeTable, selectedTableTypeId, totalPrice } = formData;
    
    // Validazioni base
    if (!customerName || !customerPhone) {
      setError("Nome cliente e numero di telefono sono obbligatori.");
      setLoading(false);
      return;
    }

    // Validazione data di vendita
    const eventDate = new Date(selectedDateItem.date);
    const nextDay = new Date(eventDate);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(4, 0, 0, 0); // Imposta a 04:00 AM del giorno successivo

    const now = new Date();

    // Confronta le date usando getTime()
    if (now.getTime() > nextDay.getTime()) {
      setError("Le vendite per questo evento sono chiuse. La vendita dei biglietti termina alle 04:00 AM del giorno successivo all'evento.");
      setLoading(false);
      return;
    }

    if (!includeTable && (!selectedTicketTypeId || quantity < 1)) {
      setError("Seleziona un tipo di biglietto e una quantità valida (almeno 1).");
      setLoading(false);
      return;
    }
    // Se si vende tavolo, assicurarsi che sia selezionato un tipo
    if (includeTable && !selectedTableTypeId) {
        setError("Seleziona un tipo di tavolo.");
        setLoading(false);
        return;
      }
     // Se si vendono biglietti, assicurarsi che la quantità sia valida
     if (!includeTable && (isNaN(parseInt(quantity)) || parseInt(quantity) < 1)) {
        setError("Inserisci una quantità valida per i biglietti.");
        setLoading(false);
        return;
     }

    const ticketCode = generateTicketCode();
    const sellTimestamp = serverTimestamp(); // Usa serverTimestamp

     // Determina cosa è stato venduto (biglietto o tavolo)
     const soldItem = includeTable 
     ? formData.availableTablesForDate.find(t => t.id === selectedTableTypeId)
     : formData.availableTicketsForDate.find(t => t.id === selectedTicketTypeId);

    if (!soldItem) {
        setError("Elemento selezionato non trovato. Riprova.");
        setLoading(false);
        return;
    }

    const itemType = includeTable ? 'table' : 'ticket';
    const itemId = soldItem.id;
    const itemPrice = Number(soldItem.price || 0);
    // La quantità venduta è 1 se è un tavolo, altrimenti la quantità selezionata
    const soldQuantity = includeTable ? 1 : parseInt(quantity);

    // --- Recupera la commissione --- 
    let calculatedCommission = 0;
    if (!includeTable && selectedTicketTypeId) {
        const selectedTypeDetails = formData.availableTicketsForDate.find(t => t.id === selectedTicketTypeId);
        calculatedCommission = parseFloat(selectedTypeDetails?.commission || 0) * parseInt(quantity || 1);
    } else if (includeTable && selectedTableTypeId) {
        // Commissione Tavolo (attualmente 0, può essere modificato)
        const selectedTableDetails = formData.availableTablesForDate.find(t => t.id === selectedTableTypeId);
        // Potresti avere un campo commission anche per i tavoli:
        // calculatedCommission = parseFloat(selectedTableDetails?.commission || 0); 
        calculatedCommission = 0; // <<<< IMPOSTAZIONE ATTUALE: 0 commissione sui tavoli
    }
    // Assicurati che sia un numero valido
    calculatedCommission = isNaN(calculatedCommission) ? 0 : calculatedCommission;

    let ticketDataForEmailAndWhatsApp = null; // Variabile per contenere i dati

    try {
        await runTransaction(db, async (transaction) => {
            const eventRef = doc(db, 'events', event.id);
            const eventDoc = await transaction.get(eventRef);

            if (!eventDoc.exists()) {
                throw new Error("Evento non trovato.");
            }

            const currentEventData = eventDoc.data();
            // Assicurati che eventDates sia un array
            const currentEventDates = Array.isArray(currentEventData.eventDates) ? currentEventData.eventDates : [];

            // Trova l'indice della data specifica nell'array dell'evento
            const dateIndex = currentEventDates.findIndex(d => d.date === selectedDateItem.date);
            if (dateIndex === -1) {
                 // Prova a confrontare gli oggetti Date se le stringhe non corrispondono esattamente
                const selectedDateObj = new Date(selectedDateItem.date);
                const dateIndexByDateObj = currentEventDates.findIndex(d => d.date && new Date(d.date).getTime() === selectedDateObj.getTime());
                if (dateIndexByDateObj === -1) {
                   throw new Error("Data specifica non trovata nell'evento (controllo per data fallito).");
                } else {
                    // Se trovato tramite oggetto Date, usa quell'indice
                     // TODO: Riassegnare dateIndex qui se necessario
                     // dateIndex = dateIndexByDateObj; // Attenzione, modifica una costante!
                     // Meglio gestire con una variabile let se questo scenario è possibile.
                    // Per ora, assumiamo che il confronto stringa funzioni o lanciamo errore.
                   throw new Error("Errore nel confronto date."); // O gestisci il caso dateIndexByDateObj
                }
            }

            let itemIndex = -1;
            let currentQuantityInDb = 0;
            // Seleziona l'array corretto (ticketTypes o tableTypes) e assicurati sia un array
            const itemsArrayInDb = includeTable 
                ? (Array.isArray(currentEventDates[dateIndex].tableTypes) ? currentEventDates[dateIndex].tableTypes : [])
                : (Array.isArray(currentEventDates[dateIndex].ticketTypes) ? currentEventDates[dateIndex].ticketTypes : []);
            
            // Trova l'indice dell'item specifico
            itemIndex = itemsArrayInDb.findIndex(item => item.id === itemId);
            
            if (itemIndex !== -1) {
                currentQuantityInDb = Number(itemsArrayInDb[itemIndex].quantity || 0);
            } else {
                // L'item venduto non esiste più nel DB? Raro ma possibile.
                 throw new Error(`Tipo di ${itemType} con ID ${itemId} non trovato nel database per questa data.`);
             }

            // Verifica finale disponibilità
            if (currentQuantityInDb < soldQuantity) {
                throw new Error(`Disponibilità insufficiente per ${soldItem.name}. Disponibili nel DB: ${currentQuantityInDb}. Richiesti: ${soldQuantity}. Aggiorna la pagina e riprova.`);
            }

            // Prepara l'aggiornamento dell'array eventDates
            const updatedEventDates = [...currentEventDates]; // Copia l'array principale
            // Clona profondamente l'oggetto data che stiamo modificando per evitare mutazioni indesiderate
            const updatedDateItem = JSON.parse(JSON.stringify(updatedEventDates[dateIndex]));
            
             // Clona l'array di items (ticket o table) all'interno della data
            const updatedItemsArray = includeTable ? [...(updatedDateItem.tableTypes || [])] : [...(updatedDateItem.ticketTypes || [])];


            // Aggiorna la quantità dell'item specifico
            if (updatedItemsArray[itemIndex]) { // Doppia verifica che l'indice sia valido
                 updatedItemsArray[itemIndex] = {
                    ...updatedItemsArray[itemIndex],
                    quantity: currentQuantityInDb - soldQuantity, // Sottrai la quantità venduta
                };
            } else {
                 throw new Error("Errore interno: indice item non valido dopo il controllo.");
             }

            // Aggiorna l'array specifico (ticketTypes o tableTypes) nell'oggetto data clonato
            if (includeTable) {
                 updatedDateItem.tableTypes = updatedItemsArray;
        } else {
                 updatedDateItem.ticketTypes = updatedItemsArray;
             }

            // Sostituisci l'oggetto data originale con quello modificato nell'array principale clonato
            updatedEventDates[dateIndex] = updatedDateItem;


            // Aggiorna il documento dell'evento con l'array eventDates modificato
            transaction.update(eventRef, { eventDates: updatedEventDates });

            // Crea il documento del biglietto venduto
            let ticketDocumentData = {
                eventId: event.id,
                eventName: event.name,
                eventDate: selectedDateItem.date, 
                eventLocation: event.location, 
                eventDescription: event.description, 
                sellerId: currentUser.uid,
                sellerName: currentUser.displayName || currentUser.email,
                customerName,
                customerEmail: customerEmail || null, 
                customerPhone,
                ticketCode,
                itemType: itemType, 
                itemId: itemId,
                itemName: soldItem.name,
                ticketType: includeTable ? 'Tavolo' : soldItem.name,
                price: itemPrice, 
                quantity: soldQuantity,
                pricePerItem: itemPrice,
                totalPrice: totalPrice, 
                status: 'sold',
                soldAt: sellTimestamp,
                commissionAmount: calculatedCommission,
                paymentStatus: 'unpaid',
                tableInfo: includeTable ? {
                    typeId: selectedTableTypeId,
                    name: formData.availableTablesForDate.find(t => t.id === selectedTableTypeId)?.name || 'Tavolo Standard',
                } : null,
                isPackageTicket: event.isMultiEntryPackage || false,
                packageAuthorizedDates: [], 
                validatedEntries: [], 
            };

            if (event.isMultiEntryPackage) {
                // Se l'evento è un pacchetto, popola le date autorizzate del pacchetto
                // dalle eventDates dell'evento. Assumiamo che event.eventDates contenga
                // le date valide per il pacchetto.
                // È importante che queste date siano effettivamente quelle del pacchetto.
                if (Array.isArray(event.eventDates)) {
                    ticketDocumentData.packageAuthorizedDates = event.eventDates.map(ed => ed.date); // Salva solo il timestamp/stringa della data
                }
                // Per un pacchetto, la `quantity` si riferisce al numero di pacchetti venduti (solitamente 1).
                // La `eventDate` principale del biglietto potrebbe rappresentare la data di acquisto o la prima data del pacchetto.
            }
            
            const ticketDocRef = doc(collection(db, 'tickets')); 
            transaction.set(ticketDocRef, ticketDocumentData); 

            // Salva i dati per usarli dopo la transazione per email/whatsapp
            ticketDataForEmailAndWhatsApp = { ...ticketDocumentData, id: ticketDocRef.id }; 

        });

      // --- Fuori dalla transazione --- 
      console.log("Transazione completata con successo!");
      
      // --- Invio Email (come prima) --- 
      if (customerEmail && ticketDataForEmailAndWhatsApp) {
        console.log("Tentativo invio email a:", customerEmail);
        try {
            const dataForEmail = { 
                ...ticketDataForEmailAndWhatsApp,
                eventLocation: event?.location || 'N/D',
                eventDescription: event?.description || 'Nessuna descrizione'
             };
            const emailSent = await sendTicketEmail(customerEmail, dataForEmail);
            if (emailSent) {
                console.log("Email di conferma inviata con successo a", customerEmail);
        } else {
                console.warn("Invio email fallito per", customerEmail, "(sendTicketEmail ha restituito false)");
            }
        } catch (emailError) {
            console.error("Errore critico durante l'invio dell'email:", emailError);
        }
      } else if (!customerEmail && ticketDataForEmailAndWhatsApp) {
           console.log("Nessuna email cliente fornita, email non inviata.");
      } else {
          console.warn("Dati biglietto per email/whatsapp non disponibili dopo la transazione.");
      }
      
      // --- Invio messaggio WhatsApp CON LINK (Corretto) --- 
      if (customerPhone && ticketDataForEmailAndWhatsApp && ticketDataForEmailAndWhatsApp.ticketCode) {
          console.log("Preparazione messaggio WhatsApp per:", customerPhone);
          try {
              // Costruisci il link alla pagina del biglietto
              const ticketPageLink = `${window.location.origin}/ticket/${ticketDataForEmailAndWhatsApp.ticketCode}`;
              console.log("Link biglietto generato:", ticketPageLink);

              // Genera il messaggio WhatsApp includendo il link
              // Assicurati che generateWhatsAppMessage accetti il secondo parametro
              const whatsappMessage = generateWhatsAppMessage(ticketDataForEmailAndWhatsApp, ticketPageLink); 
              
              // Apri WhatsApp
              openWhatsApp(customerPhone, whatsappMessage);
          } catch (waError) {
              console.error("Errore durante la preparazione o l'apertura di WhatsApp:", waError);
          }
      } else {
           console.warn("Numero cliente, dati biglietto o codice biglietto mancanti per WhatsApp.");
      }

      onSold(); // Chiama la callback per aggiornare la dashboard e chiudere il modal

    } catch (error) {
      console.error("Errore durante la transazione di vendita:", error);
      // Mostra un messaggio di errore più specifico se possibile
      if (error.message.includes("Disponibilità insufficiente")) {
         setError(error.message); // Mostra l'errore di disponibilità all'utente
      } else {
         setError(`Errore durante la vendita: ${error.message}. Si prega di riprovare.`);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- JSX Rendering --- 
  // Verifica se ci sono biglietti o tavoli disponibili per la data selezionata
  const isAnythingAvailable = 
    formData.availableTicketsForDate.some(t => t.quantity > 0) ||
    (selectedDateItem?.hasTablesForDate && formData.availableTablesForDate.some(t => t.quantity > 0));

  return (
    <div className="modal-overlay">
      <div className="modal-content sell-ticket-modal">
        <h2>Vendi Biglietti/Tavoli per: {event.name}</h2>
        <p><strong>Data Selezionata:</strong> {selectedDateItem ? new Date(selectedDateItem.date).toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' }) : 'N/D'}</p>
        <button onClick={onClose} className="close-modal-btn">&times;</button>

        {error && <p className="error-message">{error}</p>}

        {!isAnythingAvailable ? (
             <div className="unavailable-message">
                <p>Attenzione: Non ci sono biglietti o tavoli disponibili per la vendita per questa data specifica.</p>
                <div className="modal-actions">
                     <button type="button" onClick={onClose} className="cancel-btn">
                         Chiudi
                     </button>
          </div>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="sell-form">
            {/* Dati Cliente */} 
            <div className="form-section customer-details">
                <h4>Dati Cliente</h4>
            <div className="form-group">
                    <label htmlFor="customerName"><FaUser /> Nome Cliente:</label>
                    <input type="text" id="customerName" name="customerName" value={formData.customerName} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
                    <label htmlFor="customerPhone"><FaWhatsapp /> Telefono Cliente:</label>
                    <input type="tel" id="customerPhone" name="customerPhone" value={formData.customerPhone} onChange={handleInputChange} required placeholder="+39..."/>
          </div>
          <div className="form-group">
                    <label htmlFor="customerEmail"><FaEnvelope /> Email Cliente (Opzionale):</label>
                    <input type="email" id="customerEmail" name="customerEmail" value={formData.customerEmail} onChange={handleInputChange} />
            </div>
          </div>

            {/* Selezione Biglietto/Tavolo */} 
            <div className="form-section item-selection">
                <h4>Seleziona Cosa Vendere</h4>
                {/* Opzione Tavolo (se disponibili per la data) */} 
                {selectedDateItem?.hasTablesForDate && formData.availableTablesForDate.some(t=>t.quantity > 0) && (
                    <div className="form-group table-option">
                        <label className="checkbox-label">
                  <input
                    type="checkbox"
                                name="includeTable"
                    checked={formData.includeTable}
                                onChange={handleInputChange}
                  />
                            Vendi un Tavolo (invece di biglietti singoli)
                </label>
              </div>
                )}

                {/* Selettore Tavolo (se opzione tavolo attiva) */} 
              {formData.includeTable && (
                <div className="form-group">
                        <label htmlFor="selectedTableTypeId"><FaTable /> Tipo Tavolo:</label>
                  <select
                            id="selectedTableTypeId" 
                            name="selectedTableTypeId" 
                            value={formData.selectedTableTypeId || ''} 
                            onChange={handleInputChange} 
                    required
                  >
                            <option value="" disabled>-- Seleziona Tavolo --</option>
                            {formData.availableTablesForDate.map(table => (
                                <option key={table.id} value={table.id} disabled={!table.quantity || table.quantity <= 0}>
                                    {table.name} - €{Number(table.price || 0).toFixed(2)} (Disponibili: {table.quantity || 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}

                {/* Selettore Biglietto (se opzione tavolo NON attiva) */} 
                {!formData.includeTable && (
                    <>
                        <div className="form-group">
                            <label htmlFor="selectedTicketTypeId"><FaTicketAlt /> Tipo Biglietto:</label>
                            <select 
                                id="selectedTicketTypeId" 
                                name="selectedTicketTypeId" 
                                value={formData.selectedTicketTypeId || ''} 
                                onChange={handleInputChange} 
                                required
                            >
                             <option value="" disabled>-- Seleziona Biglietto --</option>
                            {formData.availableTicketsForDate.map(ticket => (
                                    <option key={ticket.id} value={ticket.id} disabled={!ticket.quantity || ticket.quantity <= 0}>
                                        {ticket.name} - €{Number(ticket.price || 0).toFixed(2)} (Disponibili: {ticket.quantity || 0})
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Mostra quantità solo se è stato selezionato un tipo di biglietto */} 
                        {formData.selectedTicketTypeId && formData.maxQuantity > 0 && (
                             <div className="form-group">
                                <label htmlFor="quantity">Quantità:</label>
                                <input 
                                    type="number" 
                                    id="quantity" 
                                    name="quantity" 
                                    value={formData.quantity} 
                                    onChange={handleInputChange} 
                                    min="1" 
                                    max={formData.maxQuantity}
                                    required 
                                />
                                <span> (Disponibili: {formData.maxQuantity})</span>
            </div>
          )}
                          {/* Messaggio se il tipo selezionato è esaurito */} 
                         {formData.selectedTicketTypeId && formData.maxQuantity === 0 && (
                            <p className="warning-message">Questo tipo di biglietto è esaurito per la data selezionata.</p>
                         )}
                    </>
                )}
          </div>

            {/* Riepilogo e Azioni */} 
            <div className="form-section summary-actions">
                <h4>Riepilogo</h4>
                <p className="total-price"><strong><FaEuroSign /> Prezzo Totale: €{formData.totalPrice.toFixed(2)}</strong></p>
          <div className="modal-actions">
                        <button 
                            type="submit" 
                            disabled={loading || formData.totalPrice <= 0 || (!formData.includeTable && formData.quantity < 1) || (formData.includeTable && !formData.selectedTableTypeId) }
                            className="sell-confirm-btn"
                         >
                        {loading ? 'Vendita in corso...' : 'Conferma Vendita e Invia WhatsApp'}
                        </button>
                        <button type="button" onClick={onClose} disabled={loading} className="cancel-btn">
              Annulla
            </button>
                    </div>
          </div>
        </form>
        )}

      </div>
    </div>
  );
}

export default SellTicketModal; 
