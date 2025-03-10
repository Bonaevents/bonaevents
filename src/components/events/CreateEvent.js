import { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { uploadImage } from '../../services/ImageService';
import './CreateEvent.css';

function CreateEvent({ onEventCreated }) {
  console.log("SONO IL FILE GIUSTO - CreateEvent.js");
  
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    totalTickets: '',
    ticketPrice: '',
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5000000) { // 5MB limit
        setError('L\'immagine non può superare i 5MB');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage(image);
      }

      const eventData = {
        ...formData,
        totalTickets: parseInt(formData.totalTickets),
        availableTickets: parseInt(formData.totalTickets),
        ticketPrice: parseFloat(formData.ticketPrice),
        imageUrl,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'events'), eventData);
      
      // Reset form
      setFormData({
        name: '',
        date: '',
        location: '',
        totalTickets: '',
        ticketPrice: '',
      });
      setImage(null);
      setImagePreview(null);
      
      onEventCreated();
    } catch (error) {
      setError('Errore nella creazione dell\'evento: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="create-event-container">
      <h2>Crea Nuovo Evento</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Locandina Evento:</label>
          <div className="image-upload-container">
            {imagePreview ? (
              <div className="image-preview">
                <img src={imagePreview} alt="Preview" />
                <button 
                  type="button" 
                  className="remove-image"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="upload-placeholder">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  id="event-image"
                  className="hidden-input"
                />
                <label htmlFor="event-image" className="upload-label">
                  Carica Locandina
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Nome Evento:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Data:</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Luogo:</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Numero Totale Biglietti:</label>
          <input
            type="number"
            name="totalTickets"
            value={formData.totalTickets}
            onChange={handleChange}
            required
            min="1"
          />
        </div>

        <div className="form-group">
          <label>Prezzo Biglietto (€):</label>
          <input
            type="number"
            name="ticketPrice"
            value={formData.ticketPrice}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="submit-button"
        >
          {loading ? 'Creazione in corso...' : 'Crea Evento'}
        </button>
      </form>
    </div>
  );
}

export default CreateEvent;