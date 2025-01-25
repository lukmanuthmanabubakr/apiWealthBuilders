// const nodemailer = require("nodemailer");
// const path = require("path");

// const sendInvestmentConfirmationEmail = async (user, investment, durationDays) => {
//   const subject = 'Investment Confirmation - Your Investment Details';
//   const send_to = user.email;
//   const sent_from = process.env.EMAIL_USER;
//   const reply_to = 'noreply@yourdomain.com';
//   const template = 'investmentConfirmation';

//   // Ensure valid dates and calculate days to maturity
//   const startDate = new Date(investment.startDate);
//   const endDate = new Date(investment.endDate);
//   const maturityDate = endDate.toLocaleDateString("en-US");
//   const maturityAmount = investment.maturityAmount.toFixed(2);
//   const investmentDurationDays = durationDays || Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

//   const hbs = (await import("nodemailer-express-handlebars")).default;

//   // Create transporter
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
//     timeout: 30000, // 30 seconds
//   });

//   // Configure handlebars for templates
//   transporter.use("compile", hbs({
//     viewEngine: {
//       extName: ".handlebars",
//       partialsDir: path.resolve("./views"),
//       defaultLayout: false,
//     },
//     viewPath: path.resolve("./views"),
//     extName: ".handlebars",
//   }));

//   // Email options
//   const options = {
//     from: sent_from,
//     to: send_to,
//     replyTo: reply_to,
//     subject,
//     template,
//     context: {
//       name: user.name,
//       link: `${process.env.FRONTEND_URL}/investment/${investment._id}`,
//       amount: investment.amount.toFixed(2), // Ensuring the format is consistent
//       plan: investment.plan,
//       startDate: startDate.toLocaleDateString("en-US"),
//       investmentDurationDays, // total days for clarity
//       maturityDate,
//       maturityAmount
//     },
//   };

//   // Send Email
//   transporter.sendMail(options, (err, info) => {
//     if (err) {
//       console.error("Error sending email:", err);
//     } else {
//       console.log("Email sent successfully:", info.response);
//     }
//   });
// };

// module.exports = {
//   sendInvestmentConfirmationEmail,
// };




































const nodemailer = require("nodemailer");
const path = require("path");

const sendInvestmentConfirmationEmail = async (user, investment, durationDays) => {
  try {
    const hbs = (await import("nodemailer-express-handlebars")).default;

    // Email Subject and Template Details
    const subject = "Investment Confirmation - Your Investment Details";
    const send_to = user.email;
    const sent_from = process.env.EMAIL_USER;
    const reply_to = "noreply@yourdomain.com";
    const template = "investmentConfirmation";

    // Ensure valid dates and calculate required details
    const startDate = new Date(investment.startDate);
    const endDate = new Date(investment.endDate);
    const maturityDate = endDate.toLocaleDateString("en-US");
    const maturityAmount = investment.maturityAmount.toFixed(2);
    const investmentDurationDays =
      durationDays || Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

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
      timeout: 30000, // 30 seconds
    });

    // Configure handlebars for templates
    const handlebarOptions = {
      viewEngine: {
        extName: ".handlebars",
        partialsDir: path.resolve("./views"),
        defaultLayout: false,
      },
      viewPath: path.resolve("./views"),
      extName: ".handlebars",
    };

    transporter.use("compile", hbs(handlebarOptions));

    // Options for sending email
    const options = {
      from: sent_from,
      to: send_to,
      replyTo: reply_to,
      subject,
      template,
      context: {
        name: user.name,
        link: `${process.env.FRONTEND_URL}/investment/${investment._id}`,
        amount: investment.amount.toFixed(2),
        plan: investment.plan,
        startDate: startDate.toLocaleDateString("en-US"),
        investmentDurationDays,
        maturityDate,
        maturityAmount,
      },
    };

    // Send Email
    const emailResponse = await transporter.sendMail(options);

    return emailResponse;
  } catch (err) {
    throw new Error(err.message || "Failed to send investment confirmation email.");
  }
};

module.exports = sendInvestmentConfirmationEmail;
