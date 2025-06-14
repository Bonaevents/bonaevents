import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Html5Qrcode } from 'html5-qrcode';
import { FaQrcode, FaKeyboard, FaTicketAlt, FaUser, FaCalendarAlt, FaMapMarkerAlt, FaCheck, FaTimes } from 'react-icons/fa';
import './TicketValidator.css';

function TicketValidator({ initializeWithScanner = true }) {
  const { currentUser } = useAuth();
  const [ticketCode, setTicketCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [lastScannedTicketDetails, setLastScannedTicketDetails] = useState(null);
  const [cameraError, setCameraError] = useState(false);
  
  // Refs
  const scannerRef = useRef(null);
  const inputRef = useRef(null);
  const messageTimeoutRef = useRef(null);
  const lastScanTimeRef = useRef(0);
  const scanTimeoutRef = useRef(null);
  const isFirstRenderRef = useRef(true);

  // Inizializzazione ritardata dello scanner
  useEffect(() => {
    if (isFirstRenderRef.current && initializeWithScanner) {
      isFirstRenderRef.current = false;
      setTimeout(() => {
        setScannerActive(true);
      }, 300);
    }
  }, [initializeWithScanner]);

  // Check user permissions
  useEffect(() => {
    async function checkUserRole() {
      try {
        if (!currentUser) {
          setMessage('Utente non autenticato.');
          setMessageType('error');
          return;
        }
        
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
          const currentRole = (userDoc.data().role || '').toLowerCase();
          const allowedRoles = ['manager', 'admin', 'validator']; 
          if (!allowedRoles.includes(currentRole)) {
            setMessage('Non hai i permessi per validare i biglietti.');
            setMessageType('error');
          }
        } else {
          setMessage('Utente non trovato.');
          setMessageType('error');
        }
      } catch (error) {
        console.error('Errore nel recupero del ruolo:', error);
        setMessage('Errore nel verificare i permessi.');
        setMessageType('error');
      }
    }
    checkUserRole();
  }, [currentUser]);

  // Implementazione QR scanner semplificata
  useEffect(() => {
    // Se lo scanner non è attivo, pulire le risorse
    if (!scannerActive) {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(e => console.error("Errore durante l'arresto dello scanner:", e));
          scannerRef.current = null;
        } catch (error) {
          console.error("Errore durante la pulizia dello scanner:", error);
        }
      }
      return;
    }

    // Reset errore fotocamera
    setCameraError(false);
    
    // Pulisci eventuali vecchi scanner ancora attivi
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().catch(e => console.error("Pulizia scanner esistente:", e));
        scannerRef.current = null;
      } catch (error) {
        console.error("Errore pulizia scanner esistente:", error);
      }
    }
    
    const qrContainer = document.getElementById('qr-reader');
    if (!qrContainer) {
      console.error("Elemento 'qr-reader' non trovato nel DOM");
      return;
    }

    console.log("Inizializzazione QR scanner...");
    
    // Pulizia container
    try {
      while (qrContainer.firstChild) {
        qrContainer.removeChild(qrContainer.firstChild);
      }
    } catch (e) {
      console.warn("Errore nella pulizia del container QR:", e);
    }
    
    // Configurazione basilare
    const html5QrCode = new Html5Qrcode("qr-reader");
    
    const qrConfig = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };
    
    // Fotocamera posteriore su dispositivi mobili
    const cameraConfig = {
      facingMode: "environment"
    };

    // Avvia scanner semplificato
    html5QrCode.start(
      cameraConfig, 
      qrConfig,
      (decodedText) => {
        // Successo: QR Code decodificato
        console.log("QR Code decodificato:", decodedText);
        
        // Previeni scansioni multiple
        const now = Date.now();
        if (now - lastScanTimeRef.current < 2000) {
          console.log("Ignorata scansione troppo rapida");
          return;
        }
        
        lastScanTimeRef.current = now;
        
        // Feedback audio
        try {
          const beep = new Audio();
          beep.src = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUt...";
          beep.volume = 0.3;
          beep.play().catch(e => {});
        } catch (e) {}
        
        // Pausa scanner
        try {
          html5QrCode.pause().catch(e => console.error("Errore pausa scanner:", e));
        } catch (error) {
          console.error("Errore durante la pausa dello scanner:", error);
        }
        
        // Elabora il codice
        handleValidateTicket(decodedText)
          .finally(() => {
            // Riprendi scanner dopo 2 secondi
            scanTimeoutRef.current = setTimeout(() => {
              if (scannerActive && scannerRef.current) {
                try {
                  html5QrCode.resume().catch(e => console.error("Errore ripresa scanner:", e));
                } catch (error) {
                  console.error("Errore durante la ripresa dello scanner:", error);
                }
              }
            }, 2000);
          });
      },
      (errorMessage) => {
        // Ignora errori standard
        if (errorMessage.includes("No QR code found")) {
          return;
        }
        console.log("Errore scanner:", errorMessage);
      }
    )
    .then(() => {
      console.log("Scanner QR avviato con successo!");
      scannerRef.current = html5QrCode;
    })
    .catch((err) => {
      console.error("Errore avvio scanner QR:", err);
      setCameraError(true);
      
      if (err.toString().includes("Permission")) {
        showTemporaryMessage("Permessi fotocamera negati. Controlla le impostazioni del browser.", "error", 8000);
      } else {
        showTemporaryMessage("Errore nell'avvio dello scanner. Ricarica la pagina.", "error", 5000);
      }
    });

    // Cleanup
    return () => {
      if (scannerRef.current) {
        console.log("Arresto scanner in cleanup");
        scannerRef.current.stop().catch(e => console.error("Errore arresto scanner:", e));
        scannerRef.current = null;
      }
      
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    };
  }, [scannerActive]);

  // Funzione per mostrare messaggi temporanei
  const showTemporaryMessage = (msg, type = 'info', duration = 4000) => {
    console.log(`[MESSAGE] Type: ${type}, Message: ${msg}`);
    setMessage(msg);
    setMessageType(type);
    if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
    }
    messageTimeoutRef.current = setTimeout(() => {
        setMessage('');
        setMessageType('info');
    }, duration);
  };

  // La logica di validazione dei biglietti rimane invariata
  async function handleValidateTicket(code) {
    console.log("[VALIDATE] Called with code:", code);
    setLastScannedTicketDetails(null);
    
    if (!code) {
        showTemporaryMessage('Codice biglietto non fornito.', 'error');
        setLastScannedTicketDetails({ ticketCode: 'N/A', error: 'Codice non fornito' });
        console.log("[VALIDATE] No code provided.");
        return;
    }
    
    setLoading(true);
    console.log("[VALIDATE] setLoading(true)");
    let currentTicketCode = '';
    let ticketDataForDisplay = null;

    try {
      try {
        const parsedCode = JSON.parse(code);
        currentTicketCode = parsedCode.ticketCode;
        console.log("[VALIDATE] Parsed QR as JSON. Ticket code:", currentTicketCode);
      } catch (e) {
        currentTicketCode = code;
        console.log("[VALIDATE] QR not JSON. Using raw code:", currentTicketCode);
      }

      if (!currentTicketCode || typeof currentTicketCode !== 'string') {
        showTemporaryMessage('Codice biglietto estratto non valido.', 'error');
        setLastScannedTicketDetails({ ticketCode: String(code), error: 'Codice estratto non valido' });
        setLoading(false);
        console.log("[VALIDATE] Invalid extracted ticket code.", currentTicketCode);
        return;
      }
      currentTicketCode = currentTicketCode.trim();
      console.log("[VALIDATE] Searching for ticket code:", currentTicketCode);

      const ticketsRef = collection(db, 'tickets');
      const q = query(ticketsRef, where('ticketCode', '==', currentTicketCode));
      const querySnapshot = await getDocs(q);
      console.log("[VALIDATE] Firestore query result. Empty:", querySnapshot.empty, "Size:", querySnapshot.size);

      if (querySnapshot.empty) {
        showTemporaryMessage('Biglietto non trovato nel sistema.', 'error');
        setLastScannedTicketDetails({ ticketCode: currentTicketCode, error: 'Biglietto non trovato' });
        setLoading(false);
        console.log("[VALIDATE] Ticket not found in DB.");
        return;
      }
      
      const ticketDoc = querySnapshot.docs[0];
      const ticketData = ticketDoc.data();
      const ticketId = ticketDoc.id;
      console.log("[VALIDATE] Ticket found:", { ticketId, ticketData });

      // Estrai tutti i dati necessari per la visualizzazione, inclusi quelli del pacchetto
      ticketDataForDisplay = {
        ticketCode: currentTicketCode,
        id: ticketId,
        eventName: ticketData.eventName || 'N/D',
        eventDate: ticketData.eventDate ? (
          ticketData.eventDate.seconds 
          ? new Date(ticketData.eventDate.seconds * 1000).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : new Date(ticketData.eventDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
        ) : 'N/D',
        eventLocation: ticketData.eventLocation || 'N/D',
        ticketType: ticketData.ticketType || ticketData.itemName || 'Standard',
        customerName: ticketData.customerName || 'N/D',
        customerEmail: ticketData.customerEmail || 'N/D',
        quantity: ticketData.quantity || 1,
        price: ticketData.price != null ? `€${Number(ticketData.price).toFixed(2)}` : 'N/D',
        isValidated: ticketData.isValidated || false, 
        validatedAt: ticketData.validatedAt?.seconds ? new Date(ticketData.validatedAt.seconds * 1000).toLocaleString('it-IT') : null,
        isDisabled: ticketData.isDisabled || false,
        isPackageTicket: ticketData.isPackageTicket || false,
        packageAuthorizedDates: ticketData.packageAuthorizedDates || [],
        validatedEntries: ticketData.validatedEntries || [],
      };
      console.log("[VALIDATE] Ticket data for display (pre-logic):", ticketDataForDisplay);

      // --- LOGICA BIFORCATA ---
      if (ticketData.isPackageTicket === true) {
        // --- NUOVA LOGICA PER BIGLIETTI PACCHETTO ---
        console.log("[VALIDATE_PACKAGE] Processing package ticket.");

        if (ticketData.isDisabled) {
            showTemporaryMessage('Questo pacchetto è stato disabilitato.', 'error');
            setLastScannedTicketDetails({ ...ticketDataForDisplay, status: 'disabled', statusMessage: 'Pacchetto disabilitato' });
            setLoading(false);
            console.log("[VALIDATE_PACKAGE] Package is disabled.");
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let currentEventDateForValidation = null;
        let currentEventDateForValidationTimestamp = null; // Per salvare il timestamp originale Firestore

        if (ticketData.packageAuthorizedDates && Array.isArray(ticketData.packageAuthorizedDates)) {
            for (const authDateEntry of ticketData.packageAuthorizedDates) {
                // authDateEntry potrebbe essere un timestamp Firestore o una stringa/data JS
                const authDate = new Date(authDateEntry.seconds ? authDateEntry.seconds * 1000 : authDateEntry);
                authDate.setHours(0, 0, 0, 0);
                if (authDate.getTime() === today.getTime()) {
                    currentEventDateForValidation = authDate; // Oggetto Date normalizzato
                    currentEventDateForValidationTimestamp = authDateEntry; // Timestamp originale Firestore
                    break;
                }
            }
        }
        
        const todayFormatted = today.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const currentEventDateForValidationFormatted = currentEventDateForValidation 
            ? currentEventDateForValidation.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : todayFormatted;

        if (!currentEventDateForValidation) {
            showTemporaryMessage(`Pacchetto non valido per la data odierna (${todayFormatted}). Controllare le date autorizzate.`, 'error');
            setLastScannedTicketDetails({ ...ticketDataForDisplay, status: 'invalid_date_for_package', statusMessage: `Non valido per ${todayFormatted}` });
            setLoading(false);
            console.log("[VALIDATE_PACKAGE] No authorized date found for today.");
            return;
        }
        console.log(`[VALIDATE_PACKAGE] Validating for package date: ${currentEventDateForValidationFormatted}`);

        const validatedEntries = ticketData.validatedEntries || [];
        const alreadyValidatedForThisDate = validatedEntries.find(entry => {
            const entryDateTimestamp = entry.eventDate; // Questo dovrebbe essere il timestamp Firestore salvato
            const entryDate = new Date(entryDateTimestamp.seconds ? entryDateTimestamp.seconds * 1000 : entryDateTimestamp);
            entryDate.setHours(0, 0, 0, 0);
            return entryDate.getTime() === currentEventDateForValidation.getTime();
        });

        if (alreadyValidatedForThisDate) {
            const validationTime = new Date(alreadyValidatedForThisDate.validatedAt.seconds ? alreadyValidatedForThisDate.validatedAt.seconds * 1000 : alreadyValidatedForThisDate.validatedAt).toLocaleString('it-IT');
            showTemporaryMessage(`Pacchetto già utilizzato per la data ${currentEventDateForValidationFormatted}.`, 'error');
            setLastScannedTicketDetails({ ...ticketDataForDisplay, status: 'package_already_validated_for_date', statusMessage: `Già usato per ${currentEventDateForValidationFormatted} il ${validationTime}` });
            setLoading(false);
            console.log(`[VALIDATE_PACKAGE] Already validated for date: ${currentEventDateForValidationFormatted}`);
            return;
        }

        // Registra la nuova validazione per questa data
        const newValidatedEntry = {
            eventDate: currentEventDateForValidationTimestamp, // Salva il timestamp originale della data del pacchetto
            validatedAt: new Date(), 
            validatedBy: currentUser.uid,
        };
        const updatedValidatedEntries = [...validatedEntries, newValidatedEntry];

        await updateDoc(doc(db, 'tickets', ticketId), {
            validatedEntries: updatedValidatedEntries
        });
        console.log("[VALIDATE_PACKAGE] Package entry successfully validated and updated in DB.");

        const allEntriesUsed = updatedValidatedEntries.length >= (ticketData.packageAuthorizedDates || []).length;
        let successMessage = `Pacchetto VALIDO per ${currentEventDateForValidationFormatted}!`;
        if (allEntriesUsed) {
            successMessage += " Tutti gli ingressi del pacchetto sono stati utilizzati.";
        }
        
        showTemporaryMessage(successMessage, 'success');
        setLastScannedTicketDetails({
            ...ticketDataForDisplay,
            validatedEntries: updatedValidatedEntries, // Aggiorna con la nuova lista
            status: 'package_valid_for_date',
            statusMessage: `VALIDO per ${currentEventDateForValidationFormatted}`,
            currentEntryValidatedAt: newValidatedEntry.validatedAt.toLocaleString('it-IT'),
            allPackageEntriesUsed: allEntriesUsed
        });
        console.log(`[VALIDATE_PACKAGE] Success. All entries used: ${allEntriesUsed}`);

      } else {
        // --- LOGICA ESISTENTE PER BIGLIETTI SINGOLI ---
        console.log("[VALIDATE_SINGLE] Processing single ticket.");

        if (ticketData.isDisabled) {
          showTemporaryMessage('Questo biglietto è stato disabilitato.', 'error');
          setLastScannedTicketDetails({ ...ticketDataForDisplay, status: 'disabled', statusMessage: 'Biglietto disabilitato' });
          setLoading(false);
          console.log("[VALIDATE_SINGLE] Ticket is disabled.");
          return;
        }

        // Per i biglietti singoli, isValidated è il campo principale
        if (ticketData.isValidated) {
          const validatedAtFormatted = ticketDataForDisplay.validatedAt || 'N/D';
          showTemporaryMessage(`Biglietto già validato il ${validatedAtFormatted}.`, 'error');
          setLastScannedTicketDetails({ ...ticketDataForDisplay, status: 'already_validated', statusMessage: `Già validato il ${validatedAtFormatted}` });
          setLoading(false);
          console.log("[VALIDATE_SINGLE] Ticket already validated.");
          return;
        }

        await updateDoc(doc(db, 'tickets', ticketId), {
          isValidated: true,
          validatedAt: new Date(),
          validatedBy: currentUser.uid
        });
        console.log("[VALIDATE_SINGLE] Ticket successfully validated and updated in DB.");

        showTemporaryMessage('Biglietto validato con successo!', 'success');
        setLastScannedTicketDetails({
          ...ticketDataForDisplay,
          isValidated: true, // Aggiorna lo stato per la visualizzazione
          status: 'valid',
          statusMessage: 'Validato con successo',
          // Sovrascrivi validatedAt con quello corrente per visualizzazione immediata
          validatedAt: new Date().toLocaleString('it-IT') 
        });
         console.log("[VALIDATE_SINGLE] Success.");
      }
      // --- FINE LOGICA BIFORCATA ---

    } catch (error) {
      console.error("[VALIDATE] Error during validation process:", error);
      showTemporaryMessage('Errore durante la validazione del biglietto.', 'error');
      setLastScannedTicketDetails({
        ticketCode: currentTicketCode || String(code),
        error: 'Errore di sistema',
        errorDetails: error.message
      });
    } finally {
      setLoading(false);
      setTicketCode(''); 
      console.log("[VALIDATE] setLoading(false) in finally block.");
    }
  }

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!ticketCode.trim()) {
      showTemporaryMessage('Inserisci un codice biglietto valido.', 'error');
      return;
    }
      await handleValidateTicket(ticketCode);
  };
  
  // Funzione per richiedere manualmente i permessi fotocamera
  const requestCameraPermission = async () => {
    try {
      showTemporaryMessage("Richiesta permessi fotocamera...", "info");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      
      setCameraError(false);
      setScannerActive(false);
      setTimeout(() => setScannerActive(true), 500);
      
      showTemporaryMessage("Permessi ottenuti, riavvio scanner...", "success");
    } catch (error) {
      console.error("Errore permessi fotocamera:", error);
      showTemporaryMessage("Impossibile ottenere i permessi fotocamera.", "error");
    }
  };

  return (
    <div className="validator-container">
      <h2>Validazione Biglietti</h2>
      
      <div className="input-methods">
        <button 
          className={`method-button ${scannerActive ? 'active' : ''}`}
          onClick={() => {
            setScannerActive(false);
            setTimeout(() => setScannerActive(true), 300);
          }}
        >
          <FaQrcode /> Scanner QR
        </button>
        <button 
          className={`method-button ${!scannerActive ? 'active' : ''}`}
          onClick={() => setScannerActive(false)}
        >
          <FaKeyboard /> Inserimento Manuale
        </button>
      </div>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      {scannerActive ? (
        <div className="scanner-wrapper">
          <div className="scanner-container" style={{
            height: "350px", 
            background: "#000",
            border: "1px solid #444",
            borderRadius: "12px",
            overflow: "hidden",
            position: "relative"
          }}>
            {/* Container QR base senza modifiche */}
            <div id="qr-reader" style={{
              width: "100%", 
              height: "100%",
              position: "relative"
            }}></div>
            
            {loading && (
              <div className="scanner-loading-overlay">
                <div className="loading-spinner"></div>
                <p>Validazione in corso...</p>
              </div>
            )}
            
            {cameraError && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(0, 0, 0, 0.8)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                color: "white",
                padding: "20px",
                textAlign: "center",
                zIndex: 10
              }}>
                <div style={{ fontSize: "18px", marginBottom: "10px" }}>Errore fotocamera</div>
                <p>Verifica i permessi del browser</p>
                <button 
                  onClick={requestCameraPermission}
                  style={{
                    padding: "10px 20px",
                    background: "#4CAF50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    marginTop: "15px",
                    cursor: "pointer",
                    fontSize: "16px"
                  }}
                >
                  Autorizza Fotocamera
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <form className="manual-input" onSubmit={handleManualSubmit}>
          <input
            type="text"
            className="ticket-input"
            placeholder="Inserisci il codice del biglietto"
            value={ticketCode}
            onChange={(e) => setTicketCode(e.target.value)}
            ref={inputRef}
            autoFocus
          />
          <button
            type="submit" 
            className="validate-button"
            disabled={loading || !ticketCode.trim()}
          >
            {loading ? 'Validazione...' : 'Valida Biglietto'}
          </button>
        </form>
      )}

      {lastScannedTicketDetails && (
        <div className="scanned-ticket-details-container">
          <h4>Dettagli Biglietto</h4>
          
          {lastScannedTicketDetails.error ? (
            <div className="ticket-detail-item error-highlight">
              <strong>Errore:</strong> {lastScannedTicketDetails.error}
              {lastScannedTicketDetails.errorDetails && <small style={{display: 'block', marginTop: '5px'}}>Dettagli: {lastScannedTicketDetails.errorDetails}</small>}
            </div>
          ) : (
            <>
              <div className="ticket-detail-item">
                <FaTicketAlt /> <strong>Evento:</strong> {lastScannedTicketDetails.eventName}
              </div>
              <div className="ticket-detail-item">
                <FaCalendarAlt /> <strong>Data:</strong> {lastScannedTicketDetails.eventDate}
              </div>
              <div className="ticket-detail-item">
                <FaMapMarkerAlt /> <strong>Luogo:</strong> {lastScannedTicketDetails.eventLocation}
              </div>
              <div className="ticket-detail-item">
                <strong>Tipo Biglietto:</strong> {lastScannedTicketDetails.ticketType || 'Standard'}
              </div>
              <div className="ticket-detail-item">
                <FaUser /> <strong>Cliente:</strong> {lastScannedTicketDetails.customerName}
              </div>
              <div className="ticket-detail-item">
                <strong>Email:</strong> {lastScannedTicketDetails.customerEmail}
              </div>
              <div className="ticket-detail-item">
                <strong>Quantità:</strong> {lastScannedTicketDetails.quantity}
              </div>
              <div className="ticket-detail-item">
                <strong>Prezzo:</strong> {lastScannedTicketDetails.price}
              </div>
              <div className="ticket-detail-item">
                <strong>Stato:</strong> 
                {lastScannedTicketDetails.status === 'valid' ? (
                  <span className="status-validated"><FaCheck /> {lastScannedTicketDetails.statusMessage} (il {lastScannedTicketDetails.validatedAt})</span>
                ) : lastScannedTicketDetails.status === 'disabled' ? (
                  <span className="status-disabled"><FaTimes /> {lastScannedTicketDetails.statusMessage}</span>
                ) : lastScannedTicketDetails.status === 'already_validated' ? (
                  <span className="status-already-validated"><FaTimes /> {lastScannedTicketDetails.statusMessage}</span>
                ) : (
                  <span>Sconosciuto ({lastScannedTicketDetails.status})</span>
                )}
              </div>
              <div className="ticket-detail-item">
                <strong>Codice:</strong> {lastScannedTicketDetails.ticketCode}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default TicketValidator; 