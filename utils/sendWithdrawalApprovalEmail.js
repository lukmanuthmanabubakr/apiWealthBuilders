// const nodemailer = require("nodemailer");
// const path = require("path");

// const sendWithdrawalApprovalEmail = async (
//   subject,
//   send_to,
//   sent_from,
//   reply_to,
//   template,
//   name,
//   walletAddress,
//   amount
// ) => {
//   // Dynamically import nodemailer-express-handlebars
//   const hbs = (await import("nodemailer-express-handlebars")).default;

//   // Create Email Transporter
//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: 465,
//     secure: true,
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//     tls: {
//       rejectUnauthorized: false,
//     },
//     timeout: 30000,
//   });

//   const handlebarsOptions = {
//     viewEngine: {
//       extName: ".handlebars",
//       partialsDir: path.resolve("./views"),
//       defaultLayout: false,
//     },
//     viewPath: path.resolve("./views"),
//     extName: ".handlebars",
//   };

//   transporter.use("compile", hbs(handlebarsOptions));

//   // Options for sending email
//   const options = {
//     from: sent_from,
//     to: send_to,
//     replyTo: reply_to,
//     subject,
//     template,
//     context: {
//       name,
//       walletAddress,
//       amount,
//     },
//   };

//   // Send Email
//   try {
//     const info = await transporter.sendMail(options);
//     console.log("Withdrawal approval email sent successfully:", info.response);
//   } catch (err) {
//     console.error("Error sending withdrawal approval email:", err);
//     throw new Error("Failed to send withdrawal approval email.");
//   }
// };


// const sendWithdrawalRejectionEmail = async (
//   subject,
//   send_to,
//   sent_from,
//   reply_to,
//   template,
//   name,
//   walletAddress,
//   amount
// ) => {
//   // Dynamically import nodemailer-express-handlebars
//   const hbs = (await import("nodemailer-express-handlebars")).default;

//   // Create Email Transporter
//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: 465,
//     secure: true,
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//     tls: {
//       rejectUnauthorized: false,
//     },
//     timeout: 30000,
//   });

//   const handlebarsOptions = {
//     viewEngine: {
//       extName: ".handlebars",
//       partialsDir: path.resolve("./views"),
//       defaultLayout: false,
//     },
//     viewPath: path.resolve("./views"),
//     extName: ".handlebars",
//   };

//   transporter.use("compile", hbs(handlebarsOptions));

//   // Options for sending email
//   const options = {
//     from: sent_from,
//     to: send_to,
//     replyTo: reply_to,
//     subject,
//     template,
//     context: {
//       name,
//       walletAddress,
//       amount,
//     },
//   };

//   // Send Email
//   try {
//     const info = await transporter.sendMail(options);
//     console.log("Withdrawal Declination email sent successfully:", info.response);
//   } catch (err) {
//     console.error("Error sending withdrawal approval email:", err);
//     throw new Error("Failed to send withdrawal approval email.");
//   }
// };

// module.exports = {
//   sendWithdrawalApprovalEmail,
//   sendWithdrawalRejectionEmail
// };















const nodemailer = require("nodemailer");
const path = require("path");

// Helper function to create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
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
};

// Helper function to configure handlebars
const configureHandlebars = (transporter) => {
  const hbs = require("nodemailer-express-handlebars");
  const handlebarsOptions = {
    viewEngine: {
      extName: ".handlebars",
      partialsDir: path.resolve("./views"),
      defaultLayout: false,
    },
    viewPath: path.resolve("./views"),
    extName: ".handlebars",
  };

  transporter.use("compile", hbs(handlebarsOptions));
};

// Helper function to send email
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    configureHandlebars(transporter);

    const info = await transporter.sendMail(options);
    console.log("Email sent successfully:", info.response);
    return info;
  } catch (err) {
    console.error("Error sending email:", err);
    throw new Error(err.message || "Failed to send email.");
  }
};

// Function to send withdrawal approval email
const sendWithdrawalApprovalEmail = async (
  subject,
  send_to,
  sent_from,
  reply_to,
  template,
  name,
  walletAddress,
  amount
) => {
  const options = {
    from: sent_from,
    to: send_to,
    replyTo: reply_to,
    subject,
    template,
    context: {
      name,
      walletAddress,
      amount,
    },
  };

  return sendEmail(options);
};

// Function to send withdrawal rejection email
const sendWithdrawalRejectionEmail = async (
  subject,
  send_to,
  sent_from,
  reply_to,
  template,
  name,
  walletAddress,
  amount
) => {
  const options = {
    from: sent_from,
    to: send_to,
    replyTo: reply_to,
    subject,
    template,
    context: {
      name,
      walletAddress,
      amount,
    },
  };

  return sendEmail(options);
};

module.exports = {
  sendWithdrawalApprovalEmail,
  sendWithdrawalRejectionEmail,
};
