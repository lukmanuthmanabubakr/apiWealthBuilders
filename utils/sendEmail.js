const nodemailer = require("nodemailer");
const path = require("path");

const sendEmail = async (
  subject,
  send_to,
  sent_from,
  reply_to,
  template,
  name,
  link,
  amount,
  status,
  transactionId,
  plan, // Ensure this is included
  startDate
) => {
  // Dynamically import nodemailer-express-handlebars
  const hbs = (await import("nodemailer-express-handlebars")).default;

  // Create Email Transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    timeout: 30000,
  });

  const handlearOptions = {
    viewEngine: {
      extName: ".handlebars",
      partialsDir: path.resolve("./views"),
      defaultLayout: false,
    },
    viewPath: path.resolve("./views"),
    extName: ".handlebars",
  };

  transporter.use("compile", hbs(handlearOptions));

  // Options for sending email
  const options = {
    from: sent_from,
    to: send_to,
    replyTo: reply_to,
    subject,
    template,
    context: {
      name,
      link,
      amount,
      status,
      transactionId,
      plan, // Ensure this is included
      startDate
    },
  };

  // Send Email
  transporter.sendMail(options, function (err, info) {
    if (err) {
      // If there's an error, log it immediately
      console.error("Error sending email:", err);
      console.log("Failed to send email. Please try again.");
    } else {
      // If email is successfully sent, log success message
      console.log("Email sent successfully:", info);
      console.log("Email sent successfully!");
    }
  });
};

module.exports = sendEmail;
