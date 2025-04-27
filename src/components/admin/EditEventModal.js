import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { uploadImage } from '../../services/ImageService';
import './AdminStyles.css';
import { FaCalendarAlt } from 'react-icons/fa';

// Definizione dei tipi di biglietti disponibili
const TICKET_TYPES = [
  { id: 'general', name: 'Generale', description: 'Biglietto standard' },
  { id: 'vip', name: 'VIP', description: 'Accesso a area VIP' },
  { id: 'backstage', name: 'Backstage', description: 'Include accesso backstage' },
  { id: 'early_bird', name: 'Early Bird', description: 'Prezzo scontato prevendita' },
  { id: 'group', name: 'Gruppo', description: 'Per gruppi di 5+ persone' },
  { id: 'last_rate', name: 'Last Rate', description: 'Biglietto ultima tariffa disponibile' },
  { id: 'early_pass', name: 'Early Pass', description: 'Pass con accesso anticipato' },
  { id: 'prime_vip', name: 'Prime VIP', description: 'Biglietto VIP esclusivo/prioritario' }
];

// Definizione dei tipi di tavoli disponibili
const TABLE_TYPES = [
  { id: 'standard', name: 'Standard', description: 'Tavolo standard', defaultSeats: 4 },
  { id: 'vip', name: 'VIP', description: 'Tavolo area VIP', defaultSeats: 6 },
  { id: 'prive', name: 'Privé', description: 'Tavolo area privé', defaultSeats: 8 },
  { id: 'platinum', name: 'Platinum', description: 'Tavolo premium con servizio dedicato', defaultSeats: 10 }
];

function EditEventModal({ event, onClose, onEventUpdated }) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    posterImageFile: null,
    posterImageUrl: '',
    eventDates: [],
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (event) {
      const initialEventDates = event.eventDates?.map((d, index) => ({
        id: d.id || Date.now() + index,
        date: d.date || '',
        ticketTypes: d.ticketTypes?.map(t => ({ ...t, price: t.price ?? '', quantity: t.quantity ?? '', commission: t.commission ?? '' })) || [],
        hasTablesForDate: d.hasTablesForDate || false,
        tableTypes: d.tableTypes?.map(tb => ({ ...tb, price: tb.price ?? '', seats: tb.seats ?? TABLE_TYPES.find(tt=>tt.id === tb.id)?.defaultSeats ?? '', quantity: tb.quantity ?? '' })) || [],
      })) || [];

      setFormData({
        name: event.name || '',
        location: event.location || '',
        description: event.description || '',
        posterImageUrl: event.posterImageUrl || '',
        posterImageFile: null,
        eventDates: initialEventDates,
      });
    }
  }, [event]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        posterImageFile: e.target.files[0]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const addEventDate = () => {
    setFormData(prev => ({
      ...prev,
      eventDates: [
        ...prev.eventDates,
        {
          id: Date.now(),
          date: '',
          ticketTypes: [],
          hasTablesForDate: false,
          tableTypes: [],
        }
      ]
    }));
  };

  const removeEventDate = (index) => {
    setFormData(prev => ({
      ...prev,
      eventDates: prev.eventDates.filter((_, i) => i !== index)
    }));
  };

  const handleDateChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      eventDates: prev.eventDates.map((dateItem, i) =>
        i === index ? { ...dateItem, [field]: value } : dateItem
      )
    }));
  };

  const handleHasTablesToggle = (index, checked) => {
    setFormData(prev => ({
      ...prev,
        eventDates: prev.eventDates.map((dateItem, i) =>
            i === index ? { ...dateItem, hasTablesForDate: checked, tableTypes: checked ? dateItem.tableTypes : [] } : dateItem
        )
    }));
  };

  const toggleTicketTypeForDate = (dateIndex, ticketType) => {
    setFormData(prev => ({
      ...prev,
      eventDates: prev.eventDates.map((dateItem, i) => {
        if (i === dateIndex) {
          const existingTicketIndex = dateItem.ticketTypes.findIndex(t => t.id === ticketType.id);
          let updatedTicketTypes;
          if (existingTicketIndex > -1) {
            updatedTicketTypes = dateItem.ticketTypes.filter(t => t.id !== ticketType.id);
      } else {
            updatedTicketTypes = [...dateItem.ticketTypes, { ...ticketType, price: '', quantity: '', commission: '' }];
          }
          return { ...dateItem, ticketTypes: updatedTicketTypes };
        }
        return dateItem;
      })
    }));
  };

  const handleTicketChangeForDate = (dateIndex, ticketId, field, value) => {
     const numericValue = value === '' ? '' : Number(value);
     if (isNaN(numericValue) || numericValue < 0) return;
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

  const toggleTableTypeForDate = (dateIndex, tableType) => {
    setFormData(prev => ({
        ...prev,
        eventDates: prev.eventDates.map((dateItem, i) => {
            if (i === dateIndex && dateItem.hasTablesForDate) {
                const existingTableIndex = dateItem.tableTypes.findIndex(t => t.id === tableType.id);
                let updatedTableTypes;
                if (existingTableIndex > -1) {
                    updatedTableTypes = dateItem.tableTypes.filter(t => t.id !== tableType.id);
                } else {
                    updatedTableTypes = [...dateItem.tableTypes, { ...tableType, price: '', seats: tableType.defaultSeats, quantity: '' }];
                }
                return { ...dateItem, tableTypes: updatedTableTypes };
            }
            return dateItem;
        })
    }));
  };

  const handleTableChangeForDate = (dateIndex, tableId, field, value) => {
    const numericValue = value === '' ? '' : Number(value);
    if (isNaN(numericValue) || numericValue < 0) return;
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

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

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
        for (const ticket of dateItem.ticketTypes) {
            if (ticket.price === '' || ticket.quantity === '' || ticket.commission === '' || ticket.price < 0 || ticket.quantity <= 0 || ticket.commission < 0) {
                setError('Inserisci prezzo (>0), quantità (>0) e commissione (>=0) validi per il biglietto "' + ticket.name + '" nella data ' + new Date(dateItem.date).toLocaleDateString() + '.');
      setLoading(false);
      return;
    }
        }
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
          console.error("Errore durante l'upload della nuova immagine:", uploadError);
          setError('Errore durante l\'upload della nuova locandina: ' + uploadError.message);
          setLoading(false);
          return;
        }
      }

      const updateData = {
        name: formData.name,
        location: formData.location,
        description: formData.description,
        posterImageUrl: finalPosterImageUrl,
        eventDates: formData.eventDates.map(d => ({
          date: d.date,
          ticketTypes: d.ticketTypes.map(t => ({ id: t.id, name: t.name, price: t.price, quantity: t.quantity, commission: t.commission })),
          hasTablesForDate: d.hasTablesForDate,
          tableTypes: d.tableTypes.map(tb => ({ id: tb.id, name: tb.name, price: tb.price, seats: tb.seats, quantity: tb.quantity }))
        })),
        updatedAt: new Date().toISOString(),
      };
        updateData.eventDates = updateData.eventDates.map(d => {
            const totalTicketsForDate = d.ticketTypes.reduce((sum, t) => sum + t.quantity, 0);
            const totalTablesForDate = d.tableTypes.reduce((sum, t) => sum + t.quantity, 0);
            return { ...d, totalTicketsForDate, totalTablesForDate };
          });

      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, updateData);

      console.log("Evento aggiornato con successo:", { id: event.id, ...updateData });
      onEventUpdated({ id: event.id, ...updateData });
      onClose();

    } catch (error) {
      console.error("Errore nell'aggiornamento dell'evento:", error);
      setError('Si è verificato un errore durante l\'aggiornamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content edit-event-modal">
        <h2>Modifica Evento</h2>
        <button onClick={onClose} className="close-modal-btn">&times;</button>

        {error && <p className="error-message">{error}</p>}
        
        <form onSubmit={handleSubmit} className="admin-form">
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
                  <div className="form-group">
            <label htmlFor="posterImageFile">Locandina:</label>
            <input type="file" id="posterImageFile" name="posterImageFile" onChange={handleChange} accept="image/*" />
            {formData.posterImageUrl && !formData.posterImageFile && 
              <div className="image-preview">
                <img src={formData.posterImageUrl} alt="Locandina Attuale" style={{ maxWidth: '100px', marginTop: '10px' }} />
                <span>Locandina attuale</span>
                  </div>
             }
            {formData.posterImageFile && 
              <div className="image-preview">
                 <img src={URL.createObjectURL(formData.posterImageFile)} alt="Anteprima Nuova Locandina" style={{ maxWidth: '100px', marginTop: '10px' }} />
                <span>Nuova locandina (sostituirà l'attuale al salvataggio)</span>
              </div>
             }
            {!formData.posterImageUrl && !formData.posterImageFile && <p>Nessuna locandina caricata.</p>}
          </div>

          <div className="event-dates-section">
            <h3>Date dell'Evento</h3>
            <button type="button" onClick={addEventDate} className="add-date-btn">Aggiungi Data</button>

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
                        <div className="form-group inline">
                          <label htmlFor={`ticket-commission-${index}-${ticketType.id}`}>Commissione (€):</label>
                          <input
                            type="number"
                            placeholder="Comm. (€)"
                            title="Commissione (€)"
                            min="0"
                            step="0.01"
                            value={currentTicket?.commission}
                            onChange={(e) => handleTicketChangeForDate(index, ticketType.id, 'commission', e.target.value)}
                            required
                            className="ticket-commission-input"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

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
                                                         value={currentTable?.seats ?? tableType.defaultSeats}
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

          <div className="modal-actions">
            <button type="submit" disabled={loading} className="save-btn">
              {loading ? 'Salvataggio...' : 'Salva Modifiche'}
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

export default EditEventModal; 