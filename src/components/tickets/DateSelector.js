import React from 'react';
import './DateSelector.css';

function DateSelector({ dates, selectedDate, onDateSelect }) {
  console.log("DateSelector - Date ricevute:", dates);
  console.log("DateSelector - Data selezionata:", selectedDate);

  // Controllo errori per date mancanti o vuote
  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    return (
      <div className="date-selector-empty">
        <p>Nessuna data disponibile</p>
      </div>
    );
  }

  // Opzioni per formattare le date
  const dateOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };

  // Ordina le date cronologicamente (dalla più vicina alla più lontana)
  const sortedDates = [...dates].sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date(a.date);
    const dateB = b.date instanceof Date ? b.date : new Date(b.date);
    return dateA - dateB;
  });

  return (
    <div className="date-selector">
      <h3>Seleziona una data:</h3>
      <div className="date-list">
        {sortedDates.map((dateItem) => {
          if (!dateItem || !dateItem.id) {
            console.log("DateSelector - Data invalida:", dateItem);
            return null;
          }

          const isSelected = selectedDate === dateItem.id;
          const dateObj = dateItem.date instanceof Date ? dateItem.date : new Date(dateItem.date);
          
          // Verifica che la data sia valida
          if (isNaN(dateObj.getTime())) {
            console.log("DateSelector - Data non valida:", dateItem);
            return null;
          }
          
          const formattedDate = dateObj.toLocaleDateString('it-IT', dateOptions);
          
          return (
            <div 
              key={dateItem.id} 
              className={`date-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onDateSelect(dateItem.id)}
            >
              <div className="date-item-content">
                <div className="date-info">
                  <div className="date-day">{formattedDate}</div>
                </div>
              </div>
              {isSelected && <div className="date-selected-indicator">✓</div>}
            </div>
          );
        }).filter(Boolean)}
      </div>
    </div>
  );
}

export default DateSelector; 