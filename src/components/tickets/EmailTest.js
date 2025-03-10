import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = "service_sy3o38j";
const EMAILJS_TEMPLATE_ID = "template_hp3771g";
const EMAILJS_PUBLIC_KEY = "I-QS6yxI9dhNJuUZO";

// Test template semplice
const templateHTML = `
<div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial;">
    <h2>Test Email con QR Code</h2>
    <div style="margin: 20px 0;">
        <p>Questo è un test di invio QR code.</p>
        <div style="text-align: center;">
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==" alt="Test QR" style="width: 200px; height: 200px;"/>
        </div>
    </div>
</div>
`;

// Funzione di test
export const testEmail = async (email) => {
  try {
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: email,
        from_name: "Test Sistema",
        reply_to: "noreply@test.com",
        html_content: templateHTML
      },
      EMAILJS_PUBLIC_KEY
    );

    console.log('Test email response:', response);
    return response;
  } catch (error) {
    console.error('Test email error:', error);
    throw error;
  }
}; 