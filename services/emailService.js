const sendEmail = require('../utils/sendEmail');

const sendPaymentConfirmationEmail = async (user, transaction, status,) => {
  const subject = 'Payment Confirmation - Your Transaction Status';
  const send_to = user.email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = 'noreply@yourdomain.com';
  const template = 'paymentConfirmation'; // Ensure this template exists

  // Send email
  await sendEmail(
    subject,
    send_to,
    sent_from,
    reply_to,
    template,
    user.name,
    `${process.env.FRONTEND_URL}/transaction/${transaction._id}`,
    transaction.amount,
    status,
    transaction.transactionId
  );
};


const sendPaymentRejectionEmail = async (user, transaction, status,) => {
  const subject = 'Payment Declination - Your Transaction Status';
  const send_to = user.email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = 'noreply@yourdomain.com';
  const template = 'paymentDeclination'; // Ensure this template exists

  // Send email
  await sendEmail(
    subject,
    send_to,
    sent_from,
    reply_to,
    template,
    user.name,
    `${process.env.FRONTEND_URL}/transaction/${transaction._id}`,
    transaction.amount,
    status,
    transaction.transactionId
  );
};

module.exports = {
  sendPaymentConfirmationEmail,
  sendPaymentRejectionEmail
};
