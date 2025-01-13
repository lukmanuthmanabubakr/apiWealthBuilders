const nodemailer = require("nodemailer");
const path = require("path");

// const sendAdminNotificationEmail = async (adminEmail, user, investment) => {
//   const subject = "New Investment Approval Required";
//   const template = "adminNotification";

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
//     to: adminEmail,
//     subject,
//     template,
//     context: {
//       userName: user.name,
//       userEmail: user.email,
//       investmentId: investment._id,
//       amount: investment.amount.toFixed(2),
//       plan: investment.plan,
//       link: `${process.env.FRONTEND_URL}/admin/investments/${investment._id}`,
//     },
//   };

//   // Send email
//   transporter.sendMail(options, (err, info) => {
//     if (err) {
//       console.error("Error sending email to admin:", err);
//     } else {
//       console.log("Admin notification email sent:", info.response);
//     }
//   });
// };

// module.exports = { sendAdminNotificationEmail };







const sendAdminNotificationEmail = async (adminEmail, user, investment) => {
  const subject = "New Investment Approval Required";
  const template = "adminNotification";

  const hbs = (await import("nodemailer-express-handlebars")).default;

  // Create transporter
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
  });

  // Configure handlebars for templates
  transporter.use(
    "compile",
    hbs({
      viewEngine: {
        extName: ".handlebars",
        partialsDir: path.resolve("./views"),
        defaultLayout: false,
      },
      viewPath: path.resolve("./views"),
      extName: ".handlebars",
    })
  );

  // Email options
  const options = {
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject,
    template,
    context: {
      userName: user.name,
      userEmail: user.email,
      investmentId: investment._id,
      amount: investment.amount.toFixed(2),
      plan: investment.plan,
      startDate: investment.startDate.toLocaleDateString(),
      endDate: investment.endDate.toLocaleDateString(),
      maturityAmount: investment.maturityAmount.toFixed(2),
      link: `${process.env.FRONTEND_URL}/admin/investments/${investment._id}`,
    },
  };

  // Send email
  transporter.sendMail(options, (err, info) => {
    if (err) {
      console.error("Error sending email to admin:", err);
    } else {
      console.log("Admin notification email sent:", info.response);
    }
  });
};

module.exports = { sendAdminNotificationEmail };
