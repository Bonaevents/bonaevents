import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

function QRCodeScanner() {
  const [qrCode, setQrCode] = useState('');
  const [message, setMessage] = useState('');

  const handleScan = async () => {
    try {
      console.log('Cercando biglietto con codice:', qrCode.trim());
      const ticketData = JSON.parse(decodeURIComponent(qrCode.trim()));
      console.log('Dati decodificati dal QR code:', ticketData);
      const ticketRef = doc(db, 'tickets', ticketData.ticketCode);
      const ticketSnap = await getDoc(ticketRef);

      if (ticketSnap.exists()) {
        const ticketData = ticketSnap.data();

        if (ticketData.status === 'used') {
          setMessage('Questo biglietto è già stato utilizzato.');
        } else {
          // Aggiorna lo stato del biglietto a "used"
          await updateDoc(ticketRef, {
            status: 'used'
          });
          setMessage('Biglietto utilizzato con successo.');
        }
      } else {
        setMessage('Biglietto non trovato.');
      }
    } catch (error) {
      console.error('Errore durante la scansione del QR code:', error);
      setMessage('Errore durante la scansione. Riprova.');
    }
  };

  return (
    <div>
      <input
        type="text"
        value={qrCode}
        onChange={(e) => setQrCode(e.target.value)}
        placeholder="Inserisci il codice QR"
      />
      <button onClick={handleScan}>Scansiona</button>
      {message && <p>{message}</p>}
    </div>
  );
}

export default QRCodeScanner; 