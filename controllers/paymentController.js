const Transaction = require("../models/transactionModel");
const PaymentLog = require("../models/paymentLogModel");
const User = require("../models/userModel"); // User model for validation
const sendEmail = require("../utils/sendEmail");
const asyncHandler = require("express-async-handler");
const { sendPaymentConfirmationEmail, sendPaymentRejectionEmail } = require("../services/emailService");

const createTransaction = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id; 

  // Fetch the admin's wallet address
  const admin = await User.findOne({ role: "admin" });
 


  // Create a new transaction entry
  const newTransaction = new Transaction({
    user: userId, // Set the 'user' field with the userId
    amount,
    status: "Pending", // Initial status as "Pending"
    transactionId: `TX-${Date.now()}`, // Generate a unique transaction ID
  });

  // Save the transaction to the database
  await newTransaction.save();

  // Send Email Notification to Admin
  const subject = "New Payment Transaction Created";
  const send_to = admin.email; // Send to admin's email
  const sent_from = process.env.EMAIL_USER; // Your email (sender)
  const reply_to = "noreply@yourdomain.com"; // Optional: Can be the same as sent_from
  const template = "paymentNotification"; // The template you want to use for the email
  const name = req.user.name; // User's name who created the transaction
  const link = `${process.env.FRONTEND_URL}/transaction/${newTransaction._id}`;
  const transactionAmount = newTransaction.amount; // Use 'transactionAmount' for clarity

  try {
    // Include amount in the email context here
    await sendEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      name,
      link,
      transactionAmount
    );
    return res.status(201).json({
      message: "Deposited successfully and email sent",
      transaction: newTransaction,
    });
  } catch (error) {
    res.status(500);
    throw new Error("Email not sent, please try again");
  }
});

const getPendingTransactions = asyncHandler(async (req, res) => {
  try {
    const pendingDeposit = await Transaction.find({
      status: "Pending",
    }).populate("user", "name email");
    res
      .status(200)
      .json({
        message: "Pending Deposit fetched successfully.",
        deposit: pendingDeposit,
      });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pending withdrawals." });
  }
});


const confirmPayment = asyncHandler(async (req, res) => {
  try {
    const { transactionId, status, notes } = req.body;

    // Ensure the status is valid before proceeding
    const validStatuses = ["Pending", "Confirmed", "Rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status provided." });
    }

    // Check if the transaction exists
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    // Check if the transaction is still pending before confirming
    if (transaction.status !== "Pending") {
      return res.status(400).json({
        message: "Transaction has already been confirmed or rejected.",
      });
    }

    // Update the transaction status to the provided status (Confirmed or Rejected)
    transaction.status = status;
    await transaction.save();

    // Create a payment log entry to track the confirmation
    const paymentLog = new PaymentLog({
      transaction: transaction._id,
      amount: transaction.amount,
      status: status === "Pending" ? "pending" : status.toLowerCase(), // Ensure status is in lowercase for PaymentLog
      adminConfirmation: true,
      notes: notes || "", // Include notes if provided
    });

    // Save the payment log
    await paymentLog.save();

    // Get the user details for email notification and balance update
    const user = await User.findById(transaction.user);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Update user's balance if the transaction is confirmed
    if (status === "Confirmed") {
      user.balance += transaction.amount;
      await user.save();
    }

    // Send an email notification to the user
    await sendPaymentConfirmationEmail(user, transaction, status);

    // Return success response to the admin
    return res.status(200).json({
      message: "Payment confirmed successfully.",
      paymentLog,
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return res.status(500).json({ message: "Failed to confirm payment." });
  }
});


const viewPaymentStatus = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;


  // Validate the transaction ID format
  if (!transactionId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ message: "Invalid transaction ID format." });
  }

  // Find the transaction by its ID
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found." });
  }


  // Find the payment log entry for this transaction
  const paymentLog = await PaymentLog.findOne({ transaction: transaction._id.toString() });

  // If no payment log is found, return the transaction with Pending status and a custom message
  if (!paymentLog) {
    return res.status(202).json({
      transaction: {
        _id: transaction._id,
        user: transaction.user,
        amount: transaction.amount,
        transactionId: transaction.transactionId,
        status: "Pending",  // Default status when payment log is not found
        __v: transaction.__v,
      },
      message: "Payment is still pending. Admin confirmation is required."  // Custom message when payment is pending
    });
  }


  // Determine the status based on admin confirmation
  const status = paymentLog.adminConfirmation ? "Confirmed" : "Pending";

  // Send the transaction and payment log details as the response
  return res.status(200).json({
    transaction: {
      transactionId: transaction.transactionId,
      amount: transaction.amount,
      status,  // Use the dynamically determined status
      adminConfirmation: paymentLog.adminConfirmation,
      notes: paymentLog.notes,
      paymentDate: paymentLog.paymentDate,
    },
    message: status === "Pending" ? "Payment is still pending. Admin confirmation is required." : "Payment has been confirmed." // Custom message based on the status
  });
});

const rejectPayment = asyncHandler(async (req, res) => {
  try {
    const { transactionId, status, notes } = req.body;

    // Ensure the status is valid before proceeding
    const validStatuses = ["Pending", "Confirmed", "Rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status provided." });
    }

    // Check if the transaction exists
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    // Check if the transaction is still pending before rejecting
    if (transaction.status !== "Pending") {
      return res.status(400).json({
        message: "Transaction has already been confirmed or rejected.",
      });
    }

    // Update the transaction status to "Rejected"
    transaction.status = status;
    await transaction.save();

    // Create a payment log entry to track the rejection
    const paymentLog = new PaymentLog({
      transaction: transaction._id,
      amount: transaction.amount,
      status: status === "Pending" ? "pending" : status.toLowerCase(), // Ensure status is in lowercase for PaymentLog
      adminConfirmation: false,
      notes: notes || "", // Include notes if provided
    });

    // Save the payment log
    await paymentLog.save();

    // Get the user details for email notification
    const user = await User.findById(transaction.user);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Send an email notification to the user
    await sendPaymentRejectionEmail(user, transaction, notes);

    // Return success response to the admin
    return res.status(200).json({
      message: "Payment rejected successfully.",
      paymentLog,
    });
  } catch (error) {
    console.error("Error rejecting payment:", error);
    return res.status(500).json({ message: "Failed to reject payment." });
  }
});






module.exports = {
  createTransaction, // User creates transactions
  confirmPayment, 
  viewPaymentStatus,
  getPendingTransactions,
  rejectPayment
};
