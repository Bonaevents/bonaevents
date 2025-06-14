import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function generateDetailedReport() {
  try {
    console.log('Inizio generazione report dettagliato...');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Colori
    const colors = {
      primary: [41, 128, 185], // Blu
      secondary: [39, 174, 96], // Verde
      accent: [155, 89, 182], // Viola
      headerBg: [52, 73, 94], // Blu scuro
      tableBg: [236, 240, 241], // Grigio chiaro
      eventColor: [230, 126, 34], // Arancione
      promoterColor: [231, 76, 60], // Rosso
    };

    // Funzione helper per aggiungere testo centrato
    const addCenteredText = (text, y, fontSize = 12, color = [0, 0, 0]) => {
      doc.setFontSize(fontSize);
      doc.setTextColor(color[0], color[1], color[2]);
      const textWidth = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor;
      const x = (pageWidth - textWidth) / 2;
      doc.text(text, x, y);
      return y + fontSize / 2;
    };

    // Funzione helper per aggiungere una sezione
    const addSection = (title, y, color = colors.primary) => {
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(10, y, pageWidth - 20, 10, 'F');
      doc.text(title, 15, y + 7);
      doc.setTextColor(0, 0, 0);
      return y + 15;
    };

    // Funzione per aggiungere nuova pagina se necessario
    const checkNewPage = (yPosition, threshold = 230) => {
      if (yPosition > threshold) {
        doc.addPage();
        return 20; // Reset della posizione Y
      }
      return yPosition;
    };

    // Intestazione con stile
    doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');

    let yPosition = addCenteredText('Report Statistiche Dettagliato', 20, 24, [255, 255, 255]);
    yPosition = addCenteredText(`Generato il ${new Date().toLocaleDateString()}`, 30, 12, [255, 255, 255]);
    yPosition = 50;

    // 1. Riepilogo Generale
    console.log('Generazione riepilogo generale...');
    yPosition = addSection('1. Riepilogo Generale', yPosition);
    
    // Recupera tutti i biglietti
    const ticketsQuery = query(collection(db, 'tickets'));
    const ticketsSnapshot = await getDocs(ticketsQuery);
    let tickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Calcola statistiche generali
    let totalTickets = tickets.reduce((acc, ticket) => acc + (ticket.quantity || 0), 0);
    let totalRevenue = tickets.reduce((acc, ticket) => acc + (ticket.totalPrice || 0), 0);
    let totalEvents = new Set(tickets.map(ticket => ticket.eventId)).size;
    let totalSellers = new Set(tickets.map(ticket => ticket.sellerId)).size;

    // Statistiche generali in tabella
    const generalStatsData = [
      ['Metrica', 'Valore'],
      ['Totale Biglietti Venduti', totalTickets.toString()],
      ['Ricavo Totale', `€${totalRevenue.toFixed(2)}`],
      ['Media Prezzo per Biglietto', `€${(totalRevenue / totalTickets).toFixed(2)}`],
      ['Numero Eventi', totalEvents.toString()],
      ['Numero Venditori', totalSellers.toString()],
      ['Numero Transazioni', `${tickets.length}`]
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [generalStatsData[0]],
      body: generalStatsData.slice(1),
      theme: 'grid',
      headStyles: {
        fillColor: colors.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: colors.tableBg
      }
    });

    yPosition = doc.lastAutoTable.finalY + 15;
    yPosition = checkNewPage(yPosition);

    // 1.1 Statistiche per Evento
    console.log('Generazione statistiche per evento...');
    yPosition = addSection('1.1 Statistiche per Evento', yPosition, colors.eventColor);

    // Raggruppa le vendite per evento
    const eventStats = tickets.reduce((acc, ticket) => {
      const eventId = ticket.eventId;
      if (!eventId) return acc;
      
      if (!acc[eventId]) {
        acc[eventId] = {
          eventId,
          eventName: ticket.eventName || 'Evento senza nome',
          totalTickets: 0,
          totalRevenue: 0,
          transactions: 0,
          sellerId: new Set(),
          dates: new Set()
        };
      }
      
      acc[eventId].totalTickets += ticket.quantity || 0;
      acc[eventId].totalRevenue += ticket.totalPrice || 0;
      acc[eventId].transactions += 1;
      acc[eventId].sellerId.add(ticket.sellerId);
      if (ticket.createdAt) {
        acc[eventId].dates.add(new Date(ticket.createdAt).toLocaleDateString());
      }
      
      return acc;
    }, {});

    // Converti in array e ordina per ricavo
    const eventStatsArray = Object.values(eventStats)
      .map(event => ({
        ...event,
        sellerCount: event.sellerId.size,
        dateCount: event.dates.size
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Crea tabella per eventi
    const eventTableHead = [['Evento', 'Biglietti', 'Ricavo', 'Transazioni', 'Venditori', '% del Totale']];
    const eventTableBody = eventStatsArray.map(event => [
      event.eventName,
      event.totalTickets.toString(),
      `€${event.totalRevenue.toFixed(2)}`,
      event.transactions.toString(),
      event.sellerCount.toString(),
      `${((event.totalRevenue / totalRevenue) * 100).toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: eventTableHead,
      body: eventTableBody,
      theme: 'grid',
      headStyles: {
        fillColor: colors.eventColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [255, 248, 240] // Arancione chiaro
      }
    });

    // 2. Statistiche per Manager con dettagli più estesi
    console.log('Generazione statistiche gerarchiche dettagliate...');
    doc.addPage();
    yPosition = 20;
    yPosition = addSection('2. Struttura Gerarchica Dettagliata', yPosition);
    
    // Recupera tutti i manager
    const managersQuery = query(collection(db, 'users'), where('role', '==', 'manager'));
    const managersSnapshot = await getDocs(managersQuery);
    const managers = managersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (managers.length === 0) {
      doc.text('Nessun manager trovato nel sistema.', 15, yPosition);
      yPosition += 10;
    } else {
      // Per ogni manager
      for (const manager of managers) {
        yPosition = checkNewPage(yPosition);
        
        // Aggiungi sezione manager
        yPosition = addSection(`Manager: ${manager.name || manager.email || 'Senza nome'}`, yPosition, colors.primary);
        
        // Recupera i team leader del manager
        const teamLeadersQuery = query(
          collection(db, 'users'),
          where('managerId', '==', manager.id),
          where('role', '==', 'teamLeader')
        );
        const teamLeadersSnapshot = await getDocs(teamLeadersQuery);
        const teamLeaders = teamLeadersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Crea mappa per tracciare vendite per evento del manager
        const managerEventStats = {};
        let managerTotalTickets = 0;
        let managerTotalRevenue = 0;
        let managerTotalPromoters = 0;

        // Per ogni team leader
        for (const leader of teamLeaders) {
          yPosition = checkNewPage(yPosition);
          
          // Recupera i promoter del team leader
          const promotersQuery = query(
            collection(db, 'users'),
            where('teamLeaderId', '==', leader.id),
            where('role', '==', 'promoter')
          );
          const promotersSnapshot = await getDocs(promotersQuery);
          const promoters = promotersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          managerTotalPromoters += promoters.length;

          // Crea mappa per tracciare vendite per evento del team leader
          const leaderEventStats = {};
          let leaderTotalTickets = 0;
          let leaderTotalRevenue = 0;

          // Vendite dirette del team leader
          const leaderTicketsQuery = query(
            collection(db, 'tickets'),
            where('sellerId', '==', leader.id)
          );
          const leaderTicketsSnapshot = await getDocs(leaderTicketsQuery);
          
          // Processa le vendite del team leader
          leaderTicketsSnapshot.docs.forEach(doc => {
            const ticket = doc.data();
            const eventId = ticket.eventId;
            const eventName = ticket.eventName || 'Evento senza nome';
            const quantity = ticket.quantity || 0;
            const revenue = ticket.totalPrice || 0;
            
            // Aggiungi alle statistiche del team leader
            leaderTotalTickets += quantity;
            leaderTotalRevenue += revenue;
            
            // Aggiungi alle statistiche per evento del team leader
            if (eventId) {
              if (!leaderEventStats[eventId]) {
                leaderEventStats[eventId] = { eventName, tickets: 0, revenue: 0 };
              }
              leaderEventStats[eventId].tickets += quantity;
              leaderEventStats[eventId].revenue += revenue;
              
              // Aggiungi alle statistiche per evento del manager
              if (!managerEventStats[eventId]) {
                managerEventStats[eventId] = { eventName, tickets: 0, revenue: 0 };
              }
              managerEventStats[eventId].tickets += quantity;
              managerEventStats[eventId].revenue += revenue;
            }
          });

          // Per ogni promoter del team leader
          for (const promoter of promoters) {
            // Recupera le vendite del promoter
            const promoterTicketsQuery = query(
              collection(db, 'tickets'),
              where('sellerId', '==', promoter.id)
            );
            const promoterTicketsSnapshot = await getDocs(promoterTicketsQuery);
            
            // Crea mappa per tracciare vendite per evento del promoter
            const promoterEventStats = {};
            let promoterTotalTickets = 0;
            let promoterTotalRevenue = 0;
            
            // Processa le vendite del promoter
            promoterTicketsSnapshot.docs.forEach(doc => {
              const ticket = doc.data();
              const eventId = ticket.eventId;
              const eventName = ticket.eventName || 'Evento senza nome';
              const quantity = ticket.quantity || 0;
              const revenue = ticket.totalPrice || 0;
              
              // Aggiungi alle statistiche del promoter
              promoterTotalTickets += quantity;
              promoterTotalRevenue += revenue;
              
              // Aggiungi alle statistiche del team leader
              leaderTotalTickets += quantity;
              leaderTotalRevenue += revenue;
              
              // Aggiungi alle statistiche per evento del promoter
              if (eventId) {
                if (!promoterEventStats[eventId]) {
                  promoterEventStats[eventId] = { eventName, tickets: 0, revenue: 0 };
                }
                promoterEventStats[eventId].tickets += quantity;
                promoterEventStats[eventId].revenue += revenue;
                
                // Aggiungi alle statistiche per evento del team leader
                if (!leaderEventStats[eventId]) {
                  leaderEventStats[eventId] = { eventName, tickets: 0, revenue: 0 };
                }
                leaderEventStats[eventId].tickets += quantity;
                leaderEventStats[eventId].revenue += revenue;
                
                // Aggiungi alle statistiche per evento del manager
                if (!managerEventStats[eventId]) {
                  managerEventStats[eventId] = { eventName, tickets: 0, revenue: 0 };
                }
                managerEventStats[eventId].tickets += quantity;
                managerEventStats[eventId].revenue += revenue;
              }
            });
            
            // Se il promoter ha vendite, crea una pagina dettagliata per lui
            if (promoterTotalTickets > 0) {
              doc.addPage();
              let promoterYPos = 20;
              
              // Intestazione promoter
              promoterYPos = addSection(`Dettagli Promoter: ${promoter.name || promoter.email || 'Senza nome'}`, promoterYPos, colors.promoterColor);
              
              // Info promoter
              doc.setFontSize(12);
              doc.text(`Email: ${promoter.email || 'N/A'}`, 15, promoterYPos);
              promoterYPos += 7;
              doc.text(`Team Leader: ${leader.name || leader.email || 'Senza nome'}`, 15, promoterYPos);
              promoterYPos += 7;
              doc.text(`Manager: ${manager.name || manager.email || 'Senza nome'}`, 15, promoterYPos);
              promoterYPos += 10;
              doc.text(`Totale Biglietti: ${promoterTotalTickets}`, 15, promoterYPos);
              promoterYPos += 7;
              doc.text(`Totale Ricavi: €${promoterTotalRevenue.toFixed(2)}`, 15, promoterYPos);
              promoterYPos += 15;
              
              // Tabella eventi del promoter
              const promoterEventList = Object.values(promoterEventStats).sort((a, b) => b.revenue - a.revenue);
              
              if (promoterEventList.length > 0) {
                const promoterEventHead = [['Evento', 'Biglietti', 'Ricavo', '% del Promoter']];
                const promoterEventRows = promoterEventList.map(event => [
                  event.eventName.substring(0, 25) + (event.eventName.length > 25 ? '...' : ''), // Tronca nomi lunghi
                  event.tickets.toString(),
                  `€${event.revenue.toFixed(2)}`,
                  `${promoterTotalRevenue > 0 ? ((event.revenue / promoterTotalRevenue) * 100).toFixed(1) : '0.0'}%`
                ]);
                
                autoTable(doc, {
                  startY: promoterYPos,
                  head: promoterEventHead,
                  body: promoterEventRows,
                  theme: 'grid',
                  headStyles: {
                    fillColor: colors.promoterColor,
                    textColor: [255, 255, 255],
                    fontStyle: 'bold'
                  },
                  alternateRowStyles: {
                    fillColor: [255, 236, 236] // Rosso chiaro
                  },
                  margin: { left: 15, right: 15 },
                  columnStyles: {
                    0: { cellWidth: 70 }, // Larghezza colonna evento
                    1: { cellWidth: 25 }, // Larghezza colonna biglietti
                    2: { cellWidth: 30 }, // Larghezza colonna ricavo
                    3: { cellWidth: 30 }  // Larghezza colonna percentuale
                  },
                });
              }
            }
          }
          
          // Aggiungi statistiche del team leader alla pagina del manager
          yPosition = checkNewPage(yPosition + 10);
          doc.setFontSize(14);
          doc.text(`Team Leader: ${leader.name || leader.email || 'Senza nome'}`, 20, yPosition);
          yPosition += 8;
          doc.setFontSize(12);
          doc.text(`Promoter: ${promoters.length}`, 25, yPosition);
          yPosition += 8;
          doc.text(`Totale Biglietti: ${leaderTotalTickets}`, 25, yPosition);
          yPosition += 8;
          doc.text(`Totale Ricavi: €${leaderTotalRevenue.toFixed(2)}`, 25, yPosition);
          yPosition += 20;
          
          // Tabella eventi del team leader
          const leaderEventList = Object.values(leaderEventStats).sort((a, b) => b.revenue - a.revenue);
          
          if (leaderEventList.length > 0) {
            const leaderEventHead = [['Evento', 'Biglietti', 'Ricavo', '% del Team']];
            const leaderEventRows = leaderEventList.map(event => [
              event.eventName.substring(0, 25) + (event.eventName.length > 25 ? '...' : ''), // Tronca nomi lunghi
              event.tickets.toString(),
              `€${event.revenue.toFixed(2)}`,
              `${leaderTotalRevenue > 0 ? ((event.revenue / leaderTotalRevenue) * 100).toFixed(1) : '0.0'}%`
            ]);
            
            yPosition = checkNewPage(yPosition);
            
            autoTable(doc, {
              startY: yPosition,
              head: leaderEventHead,
              body: leaderEventRows,
              theme: 'grid',
              headStyles: {
                fillColor: colors.secondary,
                textColor: [255, 255, 255],
                fontStyle: 'bold'
              },
              alternateRowStyles: {
                fillColor: [232, 246, 237] // Verde chiaro
              },
              margin: { left: 25, right: 25 },
              columnStyles: {
                0: { cellWidth: 70 }, // Larghezza colonna evento
                1: { cellWidth: 25 }, // Larghezza colonna biglietti
                2: { cellWidth: 30 }, // Larghezza colonna ricavo
                3: { cellWidth: 30 }  // Larghezza colonna percentuale
              },
            });
            
            yPosition = doc.lastAutoTable.finalY + 25;
          }
          
          // Aggiungi alle statistiche totali del manager
          managerTotalTickets += leaderTotalTickets;
          managerTotalRevenue += leaderTotalRevenue;
        }
        
        // Crea pagina riepilogativa per il manager
        doc.addPage();
        let managerSummaryYPos = 20;
        
        // Intestazione manager
        managerSummaryYPos = addSection(`Riepilogo Manager: ${manager.name || manager.email || 'Senza nome'}`, managerSummaryYPos, colors.primary);
        
        // Info manager
        doc.setFontSize(12);
        doc.text(`Email: ${manager.email || 'N/A'}`, 15, managerSummaryYPos);
        managerSummaryYPos += 7;
        doc.text(`Team Leader: ${teamLeaders.length}`, 15, managerSummaryYPos);
        managerSummaryYPos += 7;
        doc.text(`Promoter: ${managerTotalPromoters}`, 15, managerSummaryYPos);
        managerSummaryYPos += 10;
        doc.text(`Totale Biglietti: ${managerTotalTickets}`, 15, managerSummaryYPos);
        managerSummaryYPos += 7;
        doc.text(`Totale Ricavi: €${managerTotalRevenue.toFixed(2)}`, 15, managerSummaryYPos);
        managerSummaryYPos += 15;
        
        // Tabella eventi del manager
        const managerEventList = Object.values(managerEventStats).sort((a, b) => b.revenue - a.revenue);
        
        if (managerEventList.length > 0) {
          const managerEventHead = [['Evento', 'Biglietti', 'Ricavo', '% del Manager']];
          const managerEventRows = managerEventList.map(event => [
            event.eventName.substring(0, 25) + (event.eventName.length > 25 ? '...' : ''), // Tronca nomi lunghi
            event.tickets.toString(),
            `€${event.revenue.toFixed(2)}`,
            `${managerTotalRevenue > 0 ? ((event.revenue / managerTotalRevenue) * 100).toFixed(1) : '0.0'}%`
          ]);
          
          autoTable(doc, {
            startY: managerSummaryYPos,
            head: managerEventHead,
            body: managerEventRows,
            theme: 'grid',
            headStyles: {
              fillColor: colors.primary,
              textColor: [255, 255, 255],
              fontStyle: 'bold'
            },
            alternateRowStyles: {
              fillColor: colors.tableBg
            },
            margin: { left: 15, right: 15 },
            columnStyles: {
              0: { cellWidth: 70 }, // Larghezza colonna evento
              1: { cellWidth: 25 }, // Larghezza colonna biglietti
              2: { cellWidth: 30 }, // Larghezza colonna ricavo
              3: { cellWidth: 30 }  // Larghezza colonna percentuale
            },
          });
        }
      }
    }

    // Footer su ogni pagina
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Pagina ${i} di ${totalPages}`, pageWidth - 40, doc.internal.pageSize.height - 10);
      doc.text(`Report Statistiche Dettagliato - ${new Date().toLocaleDateString()}`, 15, doc.internal.pageSize.height - 10);
    }

    // Salva il PDF
    doc.save('statistiche_dettagliate.pdf');
    console.log('Report dettagliato generato con successo');
    return true;
  } catch (error) {
    console.error('Errore nella generazione del report dettagliato:', error);
    throw error;
  }
} 