import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

// Funzione helper per formattare timestamp per PDF (DD/MM/YYYY HH:MM)
function formatTimestampForPDF(timestamp) {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    // Formato italiano più leggibile
    return date.toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    console.error("Errore formattazione timestamp:", timestamp, e);
    return '';
  }
}

// Funzione helper per troncare testo lungo nel PDF
const truncateText = (text, maxLength = 30) => { // Aumenta un po' maxLength
  if (!text) return '';
  // Tronca solo se la lunghezza supera maxLength
  return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
};

// Funzione helper per formattare valute
const formatCurrency = (value) => {
    return (parseFloat(value) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export async function generateOptimizedReport() {
  try {
    console.log('Inizio generazione report PDF per Utente...');
    const doc = new jsPDF({
      orientation: 'portrait', // Portrait dovrebbe andare bene per la struttura per utente
      unit: 'mm', 
      format: 'a4' 
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15; // Posizione Y iniziale
    const leftMargin = 14;
    const contentWidth = pageWidth - (leftMargin * 2); // Larghezza utile contenuto

    // Colori definiti
    const colors = {
      primary: [41, 128, 185],    // Blu Bona
      headerBg: [52, 73, 94],     // Blu Scuro Intestazione
      tableHeader: [220, 220, 220], // Grigio Chiaro per Header Tabella
      tableAltRow: [245, 245, 245], // Grigio Molto Chiaro per Righe Alternate
      textPrimary: [0, 0, 0],        // Nero per testo principale
      textSecondary: [100, 100, 100], // Grigio per testo secondario
      sectionHeader: [70, 130, 180] // Blu più chiaro per sezioni utente
    };

    // --- Intestazione Report ---
    doc.setFontSize(18); 
    doc.setTextColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
    doc.text('Report Dettagliato per Utente', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 7;
    doc.setFontSize(10);
    doc.setTextColor(colors.textSecondary[0], colors.textSecondary[1], colors.textSecondary[2]);
    doc.text(`Generato il: ${new Date().toLocaleString('it-IT')}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10; // Spazio dopo intestazione

    // --- Recupero Dati ---
    console.log('Recupero dati...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const userMap = new Map(usersData.map(u => [u.id, u]));

    const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
    const ticketsData = ticketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const eventsSnapshot = await getDocs(collection(db, 'events'));
    const eventMap = new Map(eventsSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() }]));
    console.log('Dati recuperati.');

    // Funzione helper per aggiungere pagina e piè di pagina
    const checkAddPage = (currentY, margin = 20) => {
      if (currentY > pageHeight - margin) { // Controlla se supera il margine inferiore
        addFooter(); // Aggiungi footer prima di cambiare pagina
        doc.addPage();
        return 15; // Ritorna la y iniziale per la nuova pagina
      }
      return currentY;
    };
    
    // Funzione per aggiungere il piè di pagina
    const addFooter = () => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(colors.textSecondary[0], colors.textSecondary[1], colors.textSecondary[2]);
        // Posiziona il numero di pagina in basso a destra
        doc.text('Pagina ' + pageCount, pageWidth - leftMargin, pageHeight - 10, { align: 'right'});
    };

    // --- 1. Riepilogo Generale (Opzionale, ma utile) ---
    console.log('Creazione Riepilogo Generale...');
    yPosition = checkAddPage(yPosition);
    doc.setFontSize(14);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('1. Riepilogo Generale', leftMargin, yPosition);
    yPosition += 7;

    const totalTicketsSold = ticketsData.reduce((sum, t) => sum + (parseInt(t.quantity, 10) || 1), 0);
    const totalRevenue = ticketsData.reduce((sum, t) => sum + (parseFloat(t.totalPrice) || 0), 0);
    const uniqueEventIds = new Set(ticketsData.map(t => t.eventId).filter(id => id));
    const totalEventsWithSales = uniqueEventIds.size;

    const summaryBody = [
      ['Totale Biglietti Venduti', totalTicketsSold.toString()],
      ['Ricavo Totale Lordo', `€ ${formatCurrency(totalRevenue)}`],
      ['Numero Utenti Registrati', usersData.length.toString()],
      ['Eventi con Vendite', totalEventsWithSales.toString()],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metrica', 'Valore']],
      body: summaryBody,
      theme: 'grid',
      headStyles: { fillColor: colors.primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 2, textColor: colors.textPrimary },
      columnStyles: { 0: { fontStyle: 'bold' } },
      margin: { left: leftMargin, right: leftMargin },
      tableWidth: 'auto',
      didDrawPage: (data) => { addFooter(); } // Aggiungi footer se la tabella crea nuove pagine
    });
    yPosition = doc.lastAutoTable.finalY + 10;

    // --- 2. Dettaglio per Utente ---
    console.log('Inizio ciclo Dettaglio per Utente...');
    let userIndex = 0;
    // Ordina gli utenti per nome per un report consistente
    const sortedUsers = usersData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    for (const user of sortedUsers) {
      userIndex++;
      console.log(`Processing user ${userIndex}/${sortedUsers.length}: ${user.name || user.id}`);
      
      yPosition = checkAddPage(yPosition, 40); // Aumenta il margine richiesto prima di iniziare un nuovo utente

      // Intestazione Sezione Utente
      doc.setFontSize(14);
      doc.setTextColor(colors.sectionHeader[0], colors.sectionHeader[1], colors.sectionHeader[2]);
      doc.text(`2.${userIndex} Utente: ${user.name || '-'} (${user.role || 'N/D'})`, leftMargin, yPosition);
      yPosition += 6;

      // Info Utente (più strutturate)
      doc.setFontSize(9);
      doc.setTextColor(colors.textPrimary[0], colors.textPrimary[1], colors.textPrimary[2]);
      const assignedToUser = user.role === 'promoter' ? userMap.get(user.assignedTeamLeaderId) :
                             user.role === 'teamLeader' ? userMap.get(user.assignedManagerId) : null;
      doc.text(`ID:`, leftMargin, yPosition);
      doc.text(`${user.id}`, leftMargin + 25, yPosition);
      doc.text(`Email:`, leftMargin + contentWidth / 2, yPosition);
      doc.text(`${user.email || '-'}`, leftMargin + contentWidth / 2 + 15, yPosition);
      yPosition += 5;
      doc.text(`Ruolo:`, leftMargin, yPosition);
      doc.text(`${user.role || '-'}`, leftMargin + 25, yPosition);
      doc.text(`Assegnato a:`, leftMargin + contentWidth / 2, yPosition);
      doc.text(`${assignedToUser ? assignedToUser.name || '-' : '-'}`, leftMargin + contentWidth / 2 + 25, yPosition);
      yPosition += 8; // Spazio prima delle stats

      // Statistiche Totali Utente
      const userTickets = ticketsData.filter(t => t.sellerId === user.id);
      const userTotalTickets = userTickets.reduce((sum, t) => sum + (parseInt(t.quantity, 10) || 1), 0);
      const userTotalRevenue = userTickets.reduce((sum, t) => sum + (parseFloat(t.totalPrice) || 0), 0);
      
      doc.setFontSize(10);
      doc.setTextColor(colors.textPrimary[0], colors.textPrimary[1], colors.textPrimary[2]);
      doc.setFont(undefined, 'bold'); // Grassetto per i totali
      doc.text(`Statistiche Totali Utente:`, leftMargin, yPosition);
      doc.setFont(undefined, 'normal'); // Normale
      doc.text(`${userTotalTickets} biglietti venduti`, leftMargin + 45, yPosition);
      doc.text(`Incasso Lordo: € ${formatCurrency(userTotalRevenue)}`, leftMargin + 90, yPosition);
      yPosition += 7; // Spazio prima della tabella eventi

      // Tabella Dettaglio Vendite per Evento (solo se l'utente ha venduto biglietti)
      if (userTickets.length > 0) {
        doc.setFontSize(9);
        doc.setTextColor(colors.textSecondary[0], colors.textSecondary[1], colors.textSecondary[2]);
        doc.text('Dettaglio vendite per evento:', leftMargin, yPosition);
        yPosition += 5;
        
        // Raggruppa le vendite dell'utente per evento
        const eventStats = userTickets.reduce((acc, ticket) => {
          const eventId = ticket.eventId || 'evento_sconosciuto';
          if (!acc[eventId]) {
            acc[eventId] = {
              eventId: eventId,
              eventName: eventMap.get(eventId)?.name || ticket.eventName || 'Evento Sconosciuto',
              ticketsSold: 0,
              revenue: 0
            };
          }
          acc[eventId].ticketsSold += (parseInt(ticket.quantity, 10) || 1);
          acc[eventId].revenue += (parseFloat(ticket.totalPrice) || 0);
          return acc;
        }, {});

        // Converti in array e ordina per incasso decrescente per quell'evento
        const eventStatsArray = Object.values(eventStats).sort((a,b) => b.revenue - a.revenue);

        // Prepara i dati per la tabella
        const eventTableBody = eventStatsArray.map(stat => [
          truncateText(stat.eventName, 45), // Nome evento più lungo
          stat.ticketsSold.toString(),
          formatCurrency(stat.revenue)
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Evento Specifico', 'Biglietti Venduti', 'Incasso Lordo (€)']],
          body: eventTableBody,
          theme: 'grid',
          headStyles: { fillColor: colors.tableHeader, textColor: colors.textPrimary, fontStyle: 'bold', fontSize: 9 },
          styles: { fontSize: 8, cellPadding: 1.5, textColor: colors.textPrimary },
          alternateRowStyles: { fillColor: colors.tableAltRow },
          margin: { left: leftMargin, right: leftMargin }, // Allinea con margine principale
          columnStyles: {
             0: { cellWidth: contentWidth * 0.5 }, // Evento (50%)
             1: { cellWidth: contentWidth * 0.2, halign: 'right' }, // Biglietti (20%)
             2: { cellWidth: contentWidth * 0.3, halign: 'right' }  // Incasso (30%)
           },
          didDrawPage: (data) => { addFooter(); } // Assicura piè pagina su ogni pagina
        });
        yPosition = doc.lastAutoTable.finalY + 10; // Spazio dopo la tabella evento

      } else {
        // Messaggio se l'utente non ha vendite
        doc.setFontSize(9);
        doc.setTextColor(colors.textSecondary[0], colors.textSecondary[1], colors.textSecondary[2]);
        doc.text('Nessuna vendita registrata per questo utente.', leftMargin, yPosition);
        yPosition += 8;
      }
      
      // Linea separatrice tra utenti (opzionale)
      // doc.setDrawColor(colors.tableHeader[0], colors.tableHeader[1], colors.tableHeader[2]);
      // doc.line(leftMargin, yPosition, pageWidth - leftMargin, yPosition);
      // yPosition += 5;

    } // Fine ciclo for users

    // Aggiungi piè di pagina all'ultima pagina generata
    addFooter();

    // --- Salvataggio PDF ---
    console.log('Salvataggio PDF...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    doc.save(`report_utente_dettagliato_${timestamp}.pdf`);

    console.log('Report PDF per Utente generato con successo.');
    alert('Report PDF per Utente generato e scaricato con successo!');

  } catch (error) {
    console.error('Errore FATALE durante la generazione del report PDF per Utente:', error);
    alert(`Errore GRAVE nella generazione del report PDF: ${error.message}. Controlla la console.`);
  }
} 