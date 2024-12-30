const nodemailer = require("nodemailer");

const sendEmailWithAttachment = async ({ to, subject, text, attachmentPath, attachmentName }) => {
  try {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
        pool: true,
        maxConnections: 10,
        maxMessages: 50,
        logger: true,
        debug: true, 
      });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      attachments: [
        {
          filename: attachmentName,
          path: attachmentPath,
        },
      ],
    });

    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = sendEmailWithAttachment;
