import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

function SalesReport() {
  const [salesData, setSalesData] = useState({
    totalSales: 0,
    totalRevenue: 0,
    salesByEvent: {},
    monthlySales: {}
  });
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchSalesData();
  }, [currentUser]);

  async function fetchSalesData() {
    try {
      const salesQuery = query(
        collection(db, 'sales'),
        where('promoterId', '==', currentUser.uid)
      );
      const salesSnapshot = await getDocs(salesQuery);
      
      let total = 0;
      let revenue = 0;
      const byEvent = {};
      const byMonth = {};

      salesSnapshot.docs.forEach(doc => {
        const sale = doc.data();
        total += sale.quantity;
        revenue += sale.totalPrice;
        
        // Aggregazione per evento
        byEvent[sale.eventId] = (byEvent[sale.eventId] || 0) + sale.quantity;
        
        // Aggregazione per mese
        const month = new Date(sale.date).toLocaleString('it-IT', { month: 'long', year: 'numeric' });
        byMonth[month] = (byMonth[month] || 0) + sale.quantity;
      });

      setSalesData({
        totalSales: total,
        totalRevenue: revenue,
        salesByEvent: byEvent,
        monthlySales: byMonth
      });
    } catch (error) {
      console.error('Errore nel recupero dei dati di vendita:', error);
    }
  }

  return (
    <div style={{ padding: '20px' }}>      
      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Riepilogo</h3>
          <p>Totale Biglietti Venduti: {salesData.totalSales}</p>
        </div>

        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Vendite per Mese</h3>
          {Object.entries(salesData.monthlySales).map(([month, quantity]) => (
            <div key={month}>
              <p>{month}: {quantity} biglietti</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SalesReport; 