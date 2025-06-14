import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import './ValidateTicket.css';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';

function ValidateTicket() {
  const { currentUser, logout } = useAuth();
  const [ticketCode, setTicketCode] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(''); // 'success', 'error', o 'warning'
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanner, setScanner] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (showScanner) {
      const html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      html5QrcodeScanner.render((decodedText) => {
        handleValidateTicket(decodedText);
        html5QrcodeScanner.clear();
      }, (error) => {
        console.warn(`Code scan error = ${error}`);
      });

      setScanner(html5QrcodeScanner);
    }
  }, [showScanner]);

  const initializeScanner = () => {
    setShowScanner(true);
  };

  const handleInputChange = (e) => {
    setTicketCode(e.target.value);
  };

  async function handleValidateTicket(code) {
    if (!code || code.trim() === '') {
      setMessage('Inserisci un codice biglietto valido');
      setStatus('error');
      return;
    }

    setLoading(true);
    setMessage('');
    setStatus('');
    setTicket(null);

    try {
      let ticketCode = code.trim();

      // Prova a decodificare il codice come JSON (caso QR code)
      try {
        const qrData = JSON.parse(code);
        if (qrData.ticketCode) {
          ticketCode = qrData.ticketCode;
        }
      } catch (e) {
        // Se non è JSON, usa il codice direttamente
        console.log('Usando il codice come stringa semplice');
      }

      console.log('Cercando biglietto con codice:', ticketCode);

      // Cerca il biglietto con il codice fornito
      const ticketsRef = collection(db, 'tickets');
      const q = query(ticketsRef, where('ticketCode', '==', ticketCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setMessage('Biglietto non trovato. Verifica il codice e riprova.');
        setStatus('error');
        setLoading(false);
        return;
      }

      const ticketDoc = querySnapshot.docs[0];
      const ticketData = { id: ticketDoc.id, ...ticketDoc.data() };
      setTicket(ticketData);

      // CONTROLLO 1: Biglietto DISABILITATO
      if (ticketData.status === 'disabled') {
        setMessage('Questo biglietto è stato disabilitato dall\'amministratore.');
        setStatus('error');
        setLoading(false);
        return;
      }

      // CONTROLLO 2: Biglietto GIÀ VALIDATO
      // Usa lo stato 'validated' invece di 'used'
      if (ticketData.status === 'validated') {
        setMessage('Questo biglietto è già stato validato.');
        setStatus('warning');
        setLoading(false);
        return;
      }

      // CONTROLLO 3: Biglietto NON ATTIVO (non 'active')
      // Solo i biglietti 'active' possono essere validati
      if (ticketData.status !== 'active') {
        setMessage(`Biglietto non validabile. Stato attuale: ${getStatusLabel(ticketData.status)}`);
        setStatus('error');
        setLoading(false);
        return;
      }

      // CONTROLLO 4: Data evento passata (già presente, va bene)
      // ... (codice esistente controllo data)
      const eventDateStr = ticketData.eventDate?.seconds ? new Date(ticketData.eventDate.seconds * 1000).toISOString() : ticketData.eventDate;
      if (!eventDateStr) {
        setMessage('Data evento non trovata per questo biglietto.');
        setStatus('error');
        setLoading(false);
        return;
      }
      const eventDate = new Date(eventDateStr);
      const now = new Date();
      // Compara solo giorno, mese, anno
      const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (eventDay < today) {
        setMessage(`Attenzione: L'evento è già passato (${eventDate.toLocaleDateString()}).`);
        setStatus('warning');
        // Potremmo decidere di bloccare o permettere comunque la validazione
        // setLoading(false);
        // return;
      }

      // Aggiorna lo stato del biglietto a 'validated'
      await updateDoc(doc(db, 'tickets', ticketDoc.id), {
        status: 'validated', // Imposta a validated
        validatedAt: serverTimestamp(), // Usa serverTimestamp
        validatedBy: currentUser.uid
      });

      setMessage('Biglietto validato con successo!');
      setStatus('success');
      
      // Aggiorna l'oggetto ticket per riflettere il nuovo stato
      setTicket({...ticketData, status: 'validated'}); // Aggiorna UI con validated
    } catch (error) {
      console.error('Errore durante la validazione:', error);
      setMessage('Si è verificato un errore durante la validazione. Riprova più tardi.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Errore durante il logout:', error);
    }
  };

  return (
    <div className="app-container">
      <header className="main-header">
        <div className="header-container">
          <div className="logo-container">
            <Link to="/" className="logo-link">
              <div className="app-logo">
                <img src="/logo.png" alt="Logo" className="logo-image" />
                <span className="logo-text">Ticket Validator</span>
              </div>
            </Link>
          </div>
          
          <div className="header-right">
            <div className="user-profile">
              <span className="user-info">
                {currentUser && (
                  <>
                    <span className="user-role">Validatore</span>
                    <span className="user-email">{currentUser.email}</span>
                  </>
                )}
              </span>
            </div>
            
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="validator-container">
          <h2>Validazione Biglietti</h2>
          
          <div className="input-methods">
            <button 
              className={`method-button ${!showScanner ? 'active' : ''}`}
              onClick={() => setShowScanner(false)}
            >
              <i className="fas fa-keyboard"></i> Inserimento Manuale
            </button>
            <button 
              className={`method-button ${showScanner ? 'active' : ''}`}
              onClick={initializeScanner}
            >
              <i className="fas fa-qrcode"></i> Scansiona QR Code
            </button>
          </div>
          
          {showScanner ? (
            <div className="scanner-container">
              <div id="reader"></div>
            </div>
          ) : (
            <div className="manual-input">
              <input
                type="text"
                placeholder="Inserisci il codice del biglietto"
                value={ticketCode}
                onChange={handleInputChange}
                disabled={loading}
                className="ticket-input"
              />
              <button
                className="validate-button"
                onClick={() => handleValidateTicket(ticketCode)}
                disabled={loading}
              >
                {loading ? 'Validazione...' : 'Valida Biglietto'}
              </button>
            </div>
          )}
          
          {status && (
            <div className={`validation-message ${status}`}>
              {message}
            </div>
          )}
          
          {ticket && (
            <div className="ticket-details">
              <h3>Dettagli Biglietto</h3>
              <div className="detail-item">
                <span>Codice:</span>
                <span>{ticket.ticketCode}</span>
              </div>
              <div className="detail-item">
                <span>Evento:</span>
                <span>{ticket.eventName}</span>
              </div>
              <div className="detail-item">
                <span>Data Evento:</span>
                <span>{new Date(ticket.eventDate).toLocaleDateString('it-IT', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
              <div className="detail-item">
                <span>Cliente:</span>
                <span>{ticket.customerName}</span>
              </div>
              <div className="detail-item">
                <span>Email Cliente:</span>
                <span>{ticket.customerEmail}</span>
              </div>
              <div className="detail-item">
                <span>Tipo Biglietto:</span>
                <span>
                  {typeof ticket.ticketType === 'object' ? ticket.ticketType.name : 
                   ticket.ticketTypeName || 'Non specificato'}
                </span>
              </div>
              <div className="detail-item">
                <span>Quantità:</span>
                <span>{ticket.quantity}</span>
              </div>
              {ticket.tableInfo && (
                <>
                  <div className="detail-item">
                    <span>Tipo Tavolo:</span>
                    <span>{ticket.tableInfo.type?.name || 'Non specificato'}</span>
                  </div>
                  <div className="detail-item">
                    <span>Numero Tavolo:</span>
                    <span>{ticket.tableInfo.type?.id || 'Non specificato'}</span>
                  </div>
                  <div className="detail-item">
                    <span>Posti Tavolo:</span>
                    <span>{ticket.tableInfo.seats || ticket.tableInfo.type?.seats || 'Non specificato'}</span>
                  </div>
                  <div className="detail-item">
                    <span>Prezzo Tavolo:</span>
                    <span>€{ticket.tableInfo.price || ticket.tableInfo.type?.price || 'Non specificato'}</span>
                  </div>
                </>
              )}
              <div className="detail-item">
                <span>Stato:</span>
                <span className={`status ${ticket.status}`}>
                  {ticket.status === 'valid' ? 'Valido' : 
                   ticket.status === 'used' ? 'Utilizzato' : 
                   ticket.status === 'pending' ? 'In attesa' : 
                   ticket.status}
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer className="main-footer">
        <div className="footer-content">
          © {new Date().getFullYear()} Ticket Management System - Tutti i diritti riservati
        </div>
      </footer>
    </div>
  );
}

export default ValidateTicket;

// Helper function (può essere importata se usata altrove)
function getStatusLabel(status) {
  switch (status) {
    case 'active': return 'Attivo';
    case 'validated': return 'Validato';
    case 'disabled': return 'Disabilitato';
    case 'cancelled': return 'Annullato'; // Se mantenuto
    default: return status;
  }
} 