const IMGBB_API_KEY = 'd9f963c744bc9f72f5333ee95d2232cf';

export const uploadImage = async (imageFile) => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('key', IMGBB_API_KEY);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    
    if (data.success) {
      return data.data.url;
    } else {
      throw new Error('Errore nel caricamento dell\'immagine');
    }
  } catch (error) {
    console.error('Errore upload immagine:', error);
    throw error;
  }
}; 