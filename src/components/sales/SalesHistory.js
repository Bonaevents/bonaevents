const renderSalesList = (sales) => {
  return (
    <div className="sales-list">
      {sales.map((sale) => (
        <div key={sale.id} className="sale-item">
          <div className="sale-header">
            <div className="sale-info">
              <span className="sale-date">
                {new Date(sale.timestamp).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <span className="sale-code">Codice: {sale.ticketCode}</span>
            </div>
            <div className="sale-amount">
              €{sale.totalPrice.toFixed(2)}
            </div>
          </div>
          <div className="sale-details">
            <div className="customer-info">
              <p><strong>Cliente:</strong> {sale.customerName}</p>
              <p><strong>Email:</strong> {sale.customerEmail}</p>
              {sale.customerPhone && (
                <p><strong>Telefono:</strong> {sale.customerPhone}</p>
              )}
            </div>
            <div className="ticket-info">
              <p><strong>Tipo Biglietto:</strong> {sale.ticketType.name}</p>
              <p><strong>Quantità:</strong> {sale.quantity}</p>
              <p><strong>Prezzo Unitario:</strong> €{sale.price.toFixed(2)}</p>
              {sale.tableInfo && (
                <div className="table-info">
                  <p><strong>Tipo Tavolo:</strong> {sale.tableInfo.type.name}</p>
                  <p><strong>Numero Tavolo:</strong> {sale.tableInfo.number}</p>
                  <p><strong>Posti:</strong> {sale.tableInfo.seats}</p>
                  <p><strong>Prezzo Tavolo:</strong> €{sale.tableInfo.type.price.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}; 