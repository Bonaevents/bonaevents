import { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { uploadImage } from '../../services/ImageService'; // Importa la funzione di upload
import './AdminStyles.css';

// Definizioni TICKET_TYPES e TABLE_TYPES rimangono invariate...
// ... (TICKET_TYPES e TABLE_TYPES come prima) ...
const TICKET_TYPES = [
  { id: 'general', name: 'Generale', description: 'Biglietto standard' },
  { id: 'vip', name: 'VIP', description: 'Accesso a area VIP' },
  { id: 'backstage', name: 'Backstage', description: 'Include accesso backstage' },
  { id: 'early_bird', name: 'Early Bird', description: 'Prezzo scontato prevendita' },
  { id: 'student', name: 'VIP Early birds', description: 'Accesso anticipato area VIP' },
  { id: 'group', name: 'Gruppo', description: 'Per gruppi di 5+ persone' }
];

const TABLE_TYPES = [
  { id: 'standard', name: 'Standard', description: 'Tavolo standard', defaultSeats: 4 },
  { id: 'vip', name: 'VIP', description: 'Tavolo area VIP', defaultSeats: 6 },
  { id: 'prive', name: 'Privé', description: 'Tavolo area privé', defaultSeats: 8 },
  { id: 'platinum', name: 'Platinum', description: 'Tavolo premium con servizio dedicato', defaultSeats: 10 }
];


function CreateEventModal({ onClose, onEventCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    posterImageFile: null, // Per il file della locandina
    posterImageUrl: '', // URL dopo l'upload
    eventDates: [], // Array per le date specifiche dell'evento
    isMultiEntryPackage: false, // Nuovo campo per pacchetti
    isActive: true, // Aggiunto: i nuovi eventi sono attivi di default
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Stato per il generatore di date ricorrenti
  const [recurringDateConfig, setRecurringDateConfig] = useState({
    startDate: '',
    endDate: '',
    dayOfWeek: '', // 0 per Domenica, 1 per Lunedì, ..., 6 per Sabato, '' per Ogni Giorno
    defaultCommission: '', // Nuovo campo per commissione default
    defaultQuantity: '',   // Nuovo campo per quantità default
    defaultPrice: '',      // Nuovo campo per prezzo default
  });

  // Gestore generico per campi semplici
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        posterImageFile: e.target.files[0] // Salva l'oggetto File
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // --- Gestione isMultiEntryPackage ---
  const handlePackageToggle = (e) => {
    setFormData(prev => ({
      ...prev,
      isMultiEntryPackage: e.target.checked
    }));
  };

  // --- Gestione Date Evento ---

  // Aggiunge una nuova data vuota all'array
  const addEventDate = () => {
    setFormData(prev => ({
      ...prev,
      eventDates: [
        ...prev.eventDates,
        {
          id: Date.now(), // ID temporaneo per la key nel map
          date: '',
          ticketTypes: [], // Biglietti specifici per questa data
          hasTablesForDate: false,
          tableTypes: [], // Tavoli specifici per questa data
        }
      ]
    }));
  };

  // Rimuove una data dall'array
  const removeEventDate = (index) => {
    setFormData(prev => ({
      ...prev,
      eventDates: prev.eventDates.filter((_, i) => i !== index)
    }));
  };

  // Gestisce la modifica di un campo per una data specifica (es. la data stessa)
  const handleDateChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      eventDates: prev.eventDates.map((dateItem, i) =>
        i === index ? { ...dateItem, [field]: value } : dateItem
      )
    }));
  };

   // Gestisce il toggle per i tavoli in una data specifica
   const handleHasTablesToggle = (index, checked) => {
    setFormData(prev => ({
      ...prev,
        eventDates: prev.eventDates.map((dateItem, i) =>
            i === index ? { ...dateItem, hasTablesForDate: checked, tableTypes: checked ? dateItem.tableTypes : [] } : dateItem // Resetta i tavoli se deselezionato
        )
    }));
  };


  // --- Gestione Biglietti per Data ---

  // Aggiunge/Rimuove un tipo di biglietto per una data specifica
  const toggleTicketTypeForDate = (dateIndex, ticketType) => {
    setFormData(prev => ({
      ...prev,
      eventDates: prev.eventDates.map((dateItem, i) => {
        if (i === dateIndex) {
          const existingTicketIndex = dateItem.ticketTypes.findIndex(t => t.id === ticketType.id);
          let updatedTicketTypes;
          if (existingTicketIndex > -1) {
            // Rimuovi
            updatedTicketTypes = dateItem.ticketTypes.filter(t => t.id !== ticketType.id);
          } else {
            // Aggiungi con valori default/vuoti o da defaultTicketSettings
            let newTicketCommission = '';
            let newTicketQuantity = '';
            let newTicketPrice = '';

            if (dateItem.defaultTicketSettings) {
              if (typeof dateItem.defaultTicketSettings.commission === 'number') {
                newTicketCommission = dateItem.defaultTicketSettings.commission;
              }
              if (typeof dateItem.defaultTicketSettings.quantity === 'number') {
                newTicketQuantity = dateItem.defaultTicketSettings.quantity;
              }
              if (typeof dateItem.defaultTicketSettings.price === 'number') {
                newTicketPrice = dateItem.defaultTicketSettings.price;
              }
            }
            updatedTicketTypes = [...dateItem.ticketTypes, { 
              ...ticketType, 
              price: newTicketPrice,
              quantity: newTicketQuantity, 
              commission: newTicketCommission 
            }];
          }
          return { ...dateItem, ticketTypes: updatedTicketTypes };
        }
        return dateItem;
      })
    }));
  };

  // Aggiorna un campo (prezzo/quantità/commissione) di un biglietto per una data specifica
  const handleTicketChangeForDate = (dateIndex, ticketId, field, value) => {
     // Assicurati che il valore sia numerico o vuoto
     const numericValue = value === '' ? '' : Number(value);
     if (isNaN(numericValue) || numericValue < 0) return; // Ignora input non validi

    setFormData(prev => ({
      ...prev,
      eventDates: prev.eventDates.map((dateItem, i) => {
        if (i === dateIndex) {
          return {
            ...dateItem,
            ticketTypes: dateItem.ticketTypes.map(ticket =>
              ticket.id === ticketId ? { ...ticket, [field]: numericValue } : ticket
            )
          };
        }
        return dateItem;
      })
    }));
  };


  // --- Gestione Tavoli per Data ---

   // Aggiunge/Rimuove un tipo di tavolo per una data specifica
   const toggleTableTypeForDate = (dateIndex, tableType) => {
    setFormData(prev => ({
        ...prev,
        eventDates: prev.eventDates.map((dateItem, i) => {
            if (i === dateIndex && dateItem.hasTablesForDate) {
                const existingTableIndex = dateItem.tableTypes.findIndex(t => t.id === tableType.id);
                let updatedTableTypes;
                if (existingTableIndex > -1) {
                    // Rimuovi
                    updatedTableTypes = dateItem.tableTypes.filter(t => t.id !== tableType.id);
                } else {
                    // Aggiungi con valori default/vuoti
                    updatedTableTypes = [...dateItem.tableTypes, { ...tableType, price: '', seats: tableType.defaultSeats, quantity: '' }];
                }
                return { ...dateItem, tableTypes: updatedTableTypes };
            }
            return dateItem;
        })
    }));
};

// Aggiorna un campo (prezzo/posti/quantità) di un tavolo per una data specifica
const handleTableChangeForDate = (dateIndex, tableId, field, value) => {
    // Assicurati che il valore sia numerico o vuoto
    const numericValue = value === '' ? '' : Number(value);
    if (isNaN(numericValue) || numericValue < 0) return; // Ignora input non validi


    setFormData(prev => ({
        ...prev,
        eventDates: prev.eventDates.map((dateItem, i) => {
            if (i === dateIndex) {
                return {
                    ...dateItem,
                    tableTypes: dateItem.tableTypes.map(table =>
                        table.id === tableId ? { ...table, [field]: numericValue } : table
                    )
                };
            }
            return dateItem;
        })
    }));
};

  // --- Logica per Generatore Date Ricorrenti ---
  const handleRecurringDateConfigChange = (e) => {
    const { name, value } = e.target;
    setRecurringDateConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenerateRecurringDates = () => {
    const { startDate, endDate, dayOfWeek, defaultCommission, defaultQuantity, defaultPrice } = recurringDateConfig;
    if (!startDate || !endDate) {
      setError('Specifica Data Inizio e Data Fine per la generazione ricorrente.');
      return;
    }

    // Correzione per l'interpretazione della data nel fuso orario locale
    const startParts = startDate.split('-');
    const startYear = parseInt(startParts[0], 10);
    const startMonth = parseInt(startParts[1], 10) - 1; // Mese 0-indexed
    const startDay = parseInt(startParts[2], 10);
    const start = new Date(startYear, startMonth, startDay);

    const endParts = endDate.split('-');
    const endYear = parseInt(endParts[0], 10);
    const endMonth = parseInt(endParts[1], 10) - 1; // Mese 0-indexed
    const endDay = parseInt(endParts[2], 10);
    const end = new Date(endYear, endMonth, endDay);

    if (end < start) {
      setError('La Data Fine non può essere precedente alla Data Inizio.');
      return;
    }

    const newDates = [];
    let year = startYear;
    let month = startMonth;
    let day = startDay;

    // Loop finché la data corrente non supera la data di fine
    while (true) {
      const currentDateObj = new Date(year, month, day); // Crea data per il fuso locale
      
      // Condizione di uscita dal loop se currentDateObj supera la data di fine
      if (currentDateObj.getFullYear() > endYear || 
          (currentDateObj.getFullYear() === endYear && currentDateObj.getMonth() > endMonth) ||
          (currentDateObj.getFullYear() === endYear && currentDateObj.getMonth() === endMonth && currentDateObj.getDate() > endDay)) {
        break; 
      }

      const currentDayOfWeekJS = currentDateObj.getDay(); // 0 per Domenica, ..., 6 per Sabato
      const targetDay = dayOfWeek === '' ? -1 : parseInt(dayOfWeek);

      console.log('[DEBUG Recurring Dates]', {
        currentDateDisplay: currentDateObj.toLocaleDateString('it-IT', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        currentDayOfWeekJS: currentDayOfWeekJS, 
        selectedTargetDay: targetDay, 
        dayOfWeekRaw: dayOfWeek, 
        matches: targetDay === -1 || currentDayOfWeekJS === targetDay
      });

      if (targetDay === -1 || currentDayOfWeekJS === targetDay) {
        const dateString = `${currentDateObj.getFullYear()}-${String(currentDateObj.getMonth() + 1).padStart(2, '0')}-${String(currentDateObj.getDate()).padStart(2, '0')}`;
        if (!formData.eventDates.some(d => d.date === dateString)) {
          const newDateItem = {
            id: Date.now() + newDates.length, 
            date: dateString,
            ticketTypes: [],
            hasTablesForDate: false,
            tableTypes: [],
          };

          // Applica commissione e quantità di default se specificate
          if (defaultCommission !== '' || defaultQuantity !== '' || defaultPrice !== '') {
            newDateItem.defaultTicketSettings = {};
            if (defaultCommission !== '') {
              const commissionValue = parseFloat(defaultCommission);
              if (!isNaN(commissionValue) && commissionValue >= 0) {
                newDateItem.defaultTicketSettings.commission = commissionValue;
              }
            }
            if (defaultQuantity !== '') {
              const quantityValue = parseInt(defaultQuantity, 10);
              if (!isNaN(quantityValue) && quantityValue > 0) {
                newDateItem.defaultTicketSettings.quantity = quantityValue;
              }
            }
            if (defaultPrice !== '') {
              const priceValue = parseFloat(defaultPrice);
              if (!isNaN(priceValue) && priceValue >= 0) {
                newDateItem.defaultTicketSettings.price = priceValue;
              }
            }
          }
          newDates.push(newDateItem);
        }
      }

      // Incrementa la data (passa al giorno successivo)
      const nextDate = new Date(year, month, day + 1); 
      year = nextDate.getFullYear();
      month = nextDate.getMonth();
      day = nextDate.getDate();
    }

    if (newDates.length > 0) {
      setFormData(prev => ({
        ...prev,
        eventDates: [...prev.eventDates, ...newDates].sort((a, b) => new Date(a.date) - new Date(b.date)) // Ordina le date
      }));
      setError(''); // Pulisce eventuali errori precedenti
    } else {
      setError('Nessuna nuova data generata. Controlla i criteri e l\'intervallo.');
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validazioni preliminari
    if (!formData.name || !formData.location) {
      setError('Nome e Località sono obbligatori.');
      setLoading(false);
      return;
    }

    if (formData.eventDates.length === 0) {
        setError('Aggiungi almeno una data per l\'evento.');
      setLoading(false);
      return;
    }

    // Validazione per ogni data
    for (const dateItem of formData.eventDates) {
        if (!dateItem.date) {
            setError('Seleziona una data valida per l\'evento.');
            setLoading(false);
            return;
        }
        if (dateItem.ticketTypes.length === 0) {
            setError('Aggiungi almeno un tipo di biglietto per la data ' + new Date(dateItem.date).toLocaleDateString() + '.');
            setLoading(false);
            return;
        }
        // Validazione biglietti per data
        for (const ticket of dateItem.ticketTypes) {
            if (ticket.price === '' || ticket.quantity === '' || ticket.commission === '' || ticket.price < 0 || ticket.quantity <= 0 || ticket.commission < 0) {
                setError('Inserisci prezzo (>0), quantità (>0) e commissione (>=0) validi per il biglietto "' + ticket.name + '" nella data ' + new Date(dateItem.date).toLocaleDateString() + '.');
                setLoading(false);
                return;
            }
        }
         // Validazione tavoli per data (se presenti)
         if (dateItem.hasTablesForDate) {
            if (dateItem.tableTypes.length === 0) {
                setError('Se hai selezionato "Prevede tavoli" per la data ' + new Date(dateItem.date).toLocaleDateString() + ', aggiungi almeno un tipo di tavolo.');
      setLoading(false);
      return;
    }
            for (const table of dateItem.tableTypes) {
                if (table.price === '' || table.quantity === '' || table.seats === '' || table.price < 0 || table.quantity <= 0 || table.seats <= 0) {
                    setError('Inserisci prezzo (>0), posti (>0) e quantità (>0) validi per il tavolo "' + table.name + '" nella data ' + new Date(dateItem.date).toLocaleDateString() + '.');
        setLoading(false);
        return;
      }
    }
        }
    }


    try {
      let finalPosterImageUrl = formData.posterImageUrl;

      if (formData.posterImageFile) {
        try {
          finalPosterImageUrl = await uploadImage(formData.posterImageFile);
        } catch (uploadError) {
          console.error("Errore durante l'upload dell'immagine:", uploadError);
          setError('Errore durante l\'upload della locandina: ' + uploadError.message);
          setLoading(false);
          return;
        }
      }

      // Prepara i dati dell'evento per Firestore
      const eventData = {
        name: formData.name,
        location: formData.location,
        description: formData.description,
        posterImageUrl: finalPosterImageUrl,
        eventDates: formData.eventDates.map(d => ({
          date: d.date,
          ticketTypes: d.ticketTypes.map(t => ({ id: t.id, name: t.name, price: parseFloat(t.price || 0), quantity: parseInt(t.quantity || 0), commission: parseFloat(t.commission || 0) })),
          hasTablesForDate: d.hasTablesForDate,
          tableTypes: d.tableTypes.map(tb => ({ id: tb.id, name: tb.name, price: parseFloat(tb.price || 0), seats: parseInt(tb.seats || 0), quantity: parseInt(tb.quantity || 0) }))
        })),
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      // Calcola biglietti e tavoli totali per data
      eventData.eventDates = eventData.eventDates.map(d => {
        const totalTicketsForDate = d.ticketTypes.reduce((sum, t) => sum + t.quantity, 0);
        const totalTablesForDate = d.tableTypes.reduce((sum, t) => sum + t.quantity, 0);
        return { ...d, totalTicketsForDate, totalTablesForDate };
      });

      await addDoc(collection(db, 'events'), eventData);

      console.log("Evento creato con successo:", eventData);
      onEventCreated(eventData);
      onClose();

    } catch (error) {
      console.error("Errore nella creazione dell'evento:", error);
      setError('Si è verificato un errore: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- JSX Rendering ---
  return (
    <div className="modal-overlay">
      <div className="modal-content create-event-modal">
        <h2>Crea Nuovo Evento</h2>
        <button onClick={onClose} className="close-modal-btn">&times;</button>

        {error && <p className="error-message">{error}</p>}
        
        <form onSubmit={handleSubmit} className="admin-form">
          {/* Campi Base Evento */}
          <div className="form-group">
            <label htmlFor="name">Nome Evento:</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="location">Località:</label>
            <input type="text" id="location" name="location" value={formData.location} onChange={handleChange} required />
            </div>
          <div className="form-group">
            <label htmlFor="description">Descrizione:</label>
            <textarea id="description" name="description" value={formData.description} onChange={handleChange}></textarea>
          </div>
           {/* Upload Locandina */}
                  <div className="form-group">
            <label htmlFor="posterImageFile">Locandina (Opzionale):</label>
            <input type="file" id="posterImageFile" name="posterImageFile" onChange={handleChange} accept="image/*" />
            {/* Mostra anteprima se c'è già un URL o un file selezionato */}
            {formData.posterImageUrl && !formData.posterImageFile && <img src={formData.posterImageUrl} alt="Anteprima Locandina" style={{ maxWidth: '100px', marginTop: '10px' }} />}
            {formData.posterImageFile && <img src={URL.createObjectURL(formData.posterImageFile)} alt="Anteprima Nuova Locandina" style={{ maxWidth: '100px', marginTop: '10px' }} />}
                  </div>
                  
          {/* Checkbox per Pacchetto Multi-Ingresso */}
          <div className="form-group form-check">
            <input 
              type="checkbox" 
              className="form-check-input" 
              id="isMultiEntryPackage"
              name="isMultiEntryPackage"
              checked={formData.isMultiEntryPackage}
              onChange={handlePackageToggle}
            />
            <label className="form-check-label" htmlFor="isMultiEntryPackage">
              Questo evento è un pacchetto multi-ingresso?
            </label>
            {formData.isMultiEntryPackage && (
              <p className="info-text">
                Le date definite di seguito saranno valide come ingressi separati per il pacchetto.
              </p>
            )}
          </div>

          {/* Sezione Date Evento */}
          <div className="event-dates-section">
            <h3>Date dell'Evento</h3>

            {/* Generatore Date Ricorrenti */}
            <div className="recurring-date-generator">
              <h4>Generatore Date Ricorrenti</h4>
              <div className="form-group inline">
                <label htmlFor="startDate">Da:</label>
                <input type="date" id="startDate" name="startDate" value={recurringDateConfig.startDate} onChange={handleRecurringDateConfigChange} />
              </div>
              <div className="form-group inline">
                <label htmlFor="endDate">A:</label>
                <input type="date" id="endDate" name="endDate" value={recurringDateConfig.endDate} onChange={handleRecurringDateConfigChange} />
              </div>
              <div className="form-group inline">
                <label htmlFor="dayOfWeek">Giorno:</label>
                <select id="dayOfWeek" name="dayOfWeek" value={recurringDateConfig.dayOfWeek} onChange={handleRecurringDateConfigChange}>
                  <option value="">Ogni Giorno</option>
                  <option value="1">Lunedì</option>
                  <option value="2">Martedì</option>
                  <option value="3">Mercoledì</option>
                  <option value="4">Giovedì</option>
                  <option value="5">Venerdì</option>
                  <option value="6">Sabato</option>
                  <option value="0">Domenica</option>
                </select>
              </div>
              {/* Nuovi Campi per Commissione e Quantità Default */}
              <div className="form-group inline">
                <label htmlFor="defaultCommission">Comm. Default (% o fisso):</label>
                <input 
                  type="number" 
                  id="defaultCommission" 
                  name="defaultCommission" 
                  value={recurringDateConfig.defaultCommission} 
                  onChange={handleRecurringDateConfigChange} 
                  placeholder="Es. 10 o 1.5"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="form-group inline">
                <label htmlFor="defaultQuantity">Qtà Default Biglietti:</label>
                <input 
                  type="number" 
                  id="defaultQuantity" 
                  name="defaultQuantity" 
                  value={recurringDateConfig.defaultQuantity} 
                  onChange={handleRecurringDateConfigChange} 
                  placeholder="Es. 100"
                  min="1"
                />
              </div>
              <div className="form-group inline">
                <label htmlFor="defaultPrice">Prezzo Default:</label>
                <input 
                  type="number" 
                  id="defaultPrice" 
                  name="defaultPrice" 
                  value={recurringDateConfig.defaultPrice} 
                  onChange={handleRecurringDateConfigChange} 
                  placeholder="Es. 25.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <button type="button" onClick={handleGenerateRecurringDates} className="generate-dates-btn">
                Genera Date Programmate
              </button>
            </div>
            {/* Fine Generatore Date Ricorrenti */}

            <button type="button" onClick={addEventDate} className="add-date-btn">Aggiungi Data Manualmente</button>

            {formData.eventDates.map((dateItem, index) => (
              <div key={dateItem.id || index} className="event-date-item">
                <h4>Data {index + 1}</h4>
            <div className="form-group">
                  <label htmlFor={`date-${index}`}>Data:</label>
              <input
                    type="date"
                    id={`date-${index}`}
                name="date"
                    value={dateItem.date ? dateItem.date.split('T')[0] : ''}
                    onChange={(e) => handleDateChange(index, 'date', e.target.value)}
                required
              />
                   <button type="button" onClick={() => removeEventDate(index)} className="remove-date-btn">Rimuovi Data</button>
          </div>


                {/* Sezione Biglietti per questa Data */}
                <div className="tickets-for-date-section">
                  <h5>Biglietti per questa data</h5>
                  {TICKET_TYPES.map(ticketType => {
                    const isSelected = dateItem.ticketTypes.some(t => t.id === ticketType.id);
                    const currentTicket = dateItem.ticketTypes.find(t => t.id === ticketType.id);
                return (
                      <div key={ticketType.id} className="ticket-type-config">
                        <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={isSelected}
                            onChange={() => toggleTicketTypeForDate(index, ticketType)}
                        />
                          {ticketType.name} ({ticketType.description})
                      </label>
                    {isSelected && (
                          <div className="ticket-details">
                            <div className="form-group inline">
                              <label htmlFor={`ticket-price-${index}-${ticketType.id}`}>Prezzo:</label>
                          <input
                            type="number"
                                id={`ticket-price-${index}-${ticketType.id}`}
                                value={currentTicket?.price ?? ''}
                                onChange={(e) => handleTicketChangeForDate(index, ticketType.id, 'price', e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                            min="0"
                            required
                          />
                        </div>
                            <div className="form-group inline">
                              <label htmlFor={`ticket-commission-${index}-${ticketType.id}`}>Comm.:</label>
                              <input
                                type="number"
                                id={`ticket-commission-${index}-${ticketType.id}`}
                                value={currentTicket?.commission ?? ''}
                                onChange={(e) => handleTicketChangeForDate(index, ticketType.id, 'commission', e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                required
                              />
                            </div>
                            <div className="form-group inline">
                              <label htmlFor={`ticket-quantity-${index}-${ticketType.id}`}>Quantità:</label>
                          <input
                            type="number"
                                id={`ticket-quantity-${index}-${ticketType.id}`}
                                value={currentTicket?.quantity ?? ''}
                                onChange={(e) => handleTicketChangeForDate(index, ticketType.id, 'quantity', e.target.value)}
                                placeholder="0"
                                step="1"
                            min="1"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

                 {/* Sezione Tavoli per questa Data */}
                 <div className="tables-for-date-section">
            <div className="form-group">
                                        <label className="checkbox-label">
                <input
                  type="checkbox"
                                                checked={dateItem.hasTablesForDate}
                                                onChange={(e) => handleHasTablesToggle(index, e.target.checked)}
                />
                                            Prevede tavoli per questa data?
              </label>
            </div>

                                    {dateItem.hasTablesForDate && (
                                        <>
                                            <h5>Tavoli per questa data</h5>
                                            {TABLE_TYPES.map(tableType => {
                                                const isSelected = dateItem.tableTypes.some(t => t.id === tableType.id);
                                                const currentTable = dateItem.tableTypes.find(t => t.id === tableType.id);
                    return (
                                                    <div key={tableType.id} className="table-type-config">
                                                        <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={isSelected}
                                                                onChange={() => toggleTableTypeForDate(index, tableType)}
                            />
                                                            {tableType.name} ({tableType.description})
                          </label>
                        {isSelected && (
                                                            <div className="table-details">
                                                                <div className="form-group inline">
                                                                    <label htmlFor={`table-price-${index}-${tableType.id}`}>Prezzo:</label>
                              <input
                                type="number"
                                                                        id={`table-price-${index}-${tableType.id}`}
                                                                        value={currentTable?.price ?? ''}
                                                                        onChange={(e) => handleTableChangeForDate(index, tableType.id, 'price', e.target.value)}
                                                                        placeholder="0.00"
                                                                        step="0.01"
                                min="0"
                                required
                              />
                            </div>
                                                                 <div className="form-group inline">
                                                                    <label htmlFor={`table-seats-${index}-${tableType.id}`}>Posti:</label>
                              <input
                                type="number"
                                                                        id={`table-seats-${index}-${tableType.id}`}
                                                                        value={currentTable?.seats ?? tableType.defaultSeats} // Usa default se non specificato
                                                                        onChange={(e) => handleTableChangeForDate(index, tableType.id, 'seats', e.target.value)}
                                                                        placeholder={tableType.defaultSeats}
                                                                        step="1"
                                min="1"
                                required
                              />
                            </div>
                                                                <div className="form-group inline">
                                                                    <label htmlFor={`table-quantity-${index}-${tableType.id}`}>Quantità Tavoli:</label>
                              <input
                                type="number"
                                                                        id={`table-quantity-${index}-${tableType.id}`}
                                                                        value={currentTable?.quantity ?? ''}
                                                                        onChange={(e) => handleTableChangeForDate(index, tableType.id, 'quantity', e.target.value)}
                                                                        placeholder="0"
                                                                        step="1"
                                min="1"
                                required
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </>
            )}
          </div>


              </div>
            ))}
          </div>

          {/* Pulsanti Azione */}
          <div className="modal-actions">
            <button type="submit" disabled={loading} className="save-btn">
              {loading ? 'Creazione...' : 'Crea Evento'}
            </button>
            <button type="button" onClick={onClose} disabled={loading} className="cancel-btn">
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateEventModal; 
