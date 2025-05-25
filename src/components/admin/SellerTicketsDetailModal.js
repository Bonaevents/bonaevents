import React from 'react';
import './SellerTicketsDetailModal.css'; // CSS per il modale

// Funzione di utilità per formattare timestamp Firestore in data leggibile
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  let date;
  // Controlla se è un oggetto timestamp di Firestore
  if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
  } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    date = new Date(timestamp); // Prova a parsare stringhe/numeri diretti (es. da YYYY-MM-DD)
  } else {
    return 'Data non valida';
  }
  return date.toLocaleDateString('it-IT', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
};

function SellerTicketsDetailModal({ isOpen, onClose, sellerName, tickets, eventDate }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay-st">
      <div className="modal-content-st">
        <button className="modal-close-st" onClick={onClose}>&times;</button>
        <h3>Dettaglio Biglietti Venduti da: {sellerName}</h3>
        <p><strong>Evento del:</strong> {eventDate}</p>
        
        {tickets && tickets.length > 0 ? (
          <div className="table-responsive-st">
            <table className="tickets-detail-table-st">
              <thead>
                <tr>
                  <th>Codice Biglietto</th>
                  <th>Cliente</th>
                  <th>Data Vendita</th>
                  <th>Tipo Biglietto</th>
                  <th>Qtà</th>
                  <th>Prezzo Uni.</th>
                  <th>Comm. Uni.</th>
                  <th>Subtot. Vendita</th>
                  <th>Subtot. Comm.</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => {
                  const unitPrice = Number(ticket.pricePerItem || ticket.price || 0);
                  const quantity = Number(ticket.quantity || 0);
                  const unitCommission = quantity > 0 ? (Number(ticket.commissionAmount || 0) / quantity) : 0;
                  const subtotalSale = Number(ticket.totalPrice || 0);
                  const subtotalCommission = Number(ticket.commissionAmount || 0);

                  return (
                    <tr key={ticket.id}>
                      <td data-label="Codice Biglietto">{ticket.ticketCode || 'N/A'}</td>
                      <td data-label="Cliente">{ticket.customerName || 'N/A'}</td>
                      <td data-label="Data Vendita">{formatDate(ticket.soldAt)}</td>
                      <td data-label="Tipo Biglietto">{ticket.itemName || 'N/A'}</td>
                      <td data-label="Qtà">{quantity}</td>
                      <td data-label="Prezzo Uni.">€{unitPrice.toFixed(2)}</td>
                      <td data-label="Comm. Uni.">€{unitCommission.toFixed(2)}</td>
                      <td data-label="Subtot. Vendita">€{subtotalSale.toFixed(2)}</td>
                      <td data-label="Subtot. Comm.">€{subtotalCommission.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Nessun biglietto specifico da mostrare per questo venditore.</p>
        )}
      </div>
    </div>
  );
}

export default SellerTicketsDetailModal; 