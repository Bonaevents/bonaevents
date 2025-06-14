const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'digitalsantix@gmail.com',
    pass: 'fbmr gqtu nlbp gmmd'
  }
});

exports.sendTicketEmail = functions.firestore
  .document('mail/{mailId}')
  .onCreate(async (snap, context) => {
    const mailData = snap.data();
    try {
      await transporter.sendMail({
        from: '"Sistema Biglietti" <TUA-EMAIL@gmail.com>',
        to: mailData.to,
        subject: mailData.message.subject,
        html: mailData.message.html
      });
      return null;
    } catch (error) {
      console.error('Errore invio email:', error);
      throw new Error(error);
    }
});
