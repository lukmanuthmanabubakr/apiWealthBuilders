
// const nodemailer = require("nodemailer");
// const path = require("path");

// const sendUserNotificationEmail = async (userEmail, userName, investment, status) => {
//   const subject = status === "approved" 
//     ? "Your Investment Has Been Approved!" 
//     : "Your Investment Has Been Rejected";

//   const template = status === "approved" 
//     ? "investmentApproved" 
//     : "investmentRejected";

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
//   });

//   // Configure handlebars for templates
//   transporter.use(
//     "compile",
//     hbs({
//       viewEngine: {
//         extName: ".handlebars",
//         partialsDir: path.resolve("./views"),
//         defaultLayout: false,
//       },
//       viewPath: path.resolve("./views"),
//       extName: ".handlebars",
//     })
//   );

//   // Email options
//   const options = {
//     from: process.env.EMAIL_USER,
//     to: userEmail,
//     subject,
//     template,
//     context: {
//       userName,
//       investmentId: investment._id,
//       amount: investment.amount.toFixed(2),
//       plan: investment.plan,
//       startDate: investment.startDate.toDateString(),
//       endDate: investment.endDate.toDateString(), // Added endDate
//       maturityAmount: investment.maturityAmount.toFixed(2), // Added maturityAmount
//     },
//   };

//   // Send email
//   transporter.sendMail(options, (err, info) => {
//     if (err) {
//       console.error(`Error sending ${status} email to user:`, err);
//     } else {
//       console.log(`${status} email sent to user:`, info.response);
//     }
//   });
// };

// module.exports = { sendUserNotificationEmail };




const nodemailer = require("nodemailer");
const path = require("path");

const sendUserNotificationEmail = async (userEmail, userName, investment, status) => {
  try {
    // Define subject and template based on status
    const subject =
      status === "approved"
        ? "Your Investment Has Been Approved!"
        : "Your Investment Has Been Rejected";

    const template =
      status === "approved"
        ? "investmentApproved"
        : "investmentRejected";

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

    // Handlebars options
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
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject,
      template,
      context: {
        userName,
        investmentId: investment._id,
        amount: investment.amount.toFixed(2),
        plan: investment.plan,
        startDate: investment.startDate.toDateString(),
        endDate: investment.endDate.toDateString(), // Ensure this is included
        maturityAmount: investment.maturityAmount.toFixed(2), // Ensure this is included
      },
    };

    // Send Email
    const emailResponse = await transporter.sendMail(options);

    console.log(`${status} email sent to user:`, emailResponse.response);

    return emailResponse;
  } catch (err) {
    console.error(`Error sending ${status} email to user:`, err.message);
    throw new Error(err.message || "Something went wrong while sending the email.");
  }
};

module.exports = { sendUserNotificationEmail };
