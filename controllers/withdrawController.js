const Withdrawal = require("../models/withdrawalModel"); // Model for withdrawal requests
const User = require("../models/userModel");
const sendWithdrawalEmail = require("../utils/sendWithdrawalEmail");
const asyncHandler = require("express-async-handler");
const sendWithdrawalApprovalEmail = require("../utils/sendWithdrawalApprovalEmail");


const createWithdrawalRequest = asyncHandler(async (req, res) => {
  const { amount, walletAddress } = req.body;
  const userId = req.user._id;

  if (amount < 50) {
    return res.status(400).json({
      message: "The minimum amount for withdrawal is $50.",
    });
  }

  // Find the user and check balance
  const user = await User.findById(userId);
  if (!user || user.totalMaturityAmount < amount) {
    return res.status(400).json({ message: "Insufficient balance." });
  }

  // Deduct the amount from the user's balance (set as pending)
  user.totalMaturityAmount -= amount;
  await user.save();

  // Create the withdrawal request
  const newWithdrawal = new Withdrawal({
    user: userId,
    amount,
    walletAddress,
    status: "Pending",
    requestDate: new Date(),
  });
  await newWithdrawal.save();

  // Send notification email to admin
  const admin = await User.findOne({ role: "admin" });
  const subject = "New Withdrawal Request";
  const send_to = admin.email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = "noreply@yourdomain.com";
  const template = "withdrawal"; // Make sure to use the correct email template file
  const name = req.user.name;
  const transactionId = newWithdrawal._id;
  const withdrawalDate = newWithdrawal.requestDate;
  const link = `${process.env.FRONTEND_URL}/withdrawal/${newWithdrawal._id}`;

  try {
    // Send email with necessary details
    await sendWithdrawalEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      name,
      amount,
      walletAddress, // Add walletAddress in the context
      transactionId,
      withdrawalDate,
      link
    );

    res.status(201).json({
      message: "Withdrawal request submitted, Wait for Approval.",
      withdrawal: newWithdrawal,
    });
  } catch (error) {
    res.status(500);
    throw new Error("Failed to send notification email.");
  }
});

const getWithdrawalById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const withdrawal = await Withdrawal.findById(id).populate("user");

  if (!withdrawal) {
    return res.status(404).json({ message: "Withdrawal request not found." });
  }

  res.status(200).json({
    id: withdrawal._id,
    user: withdrawal.user.name,
    walletAddress: withdrawal.walletAddress,
    amount: withdrawal.amount,
    status: withdrawal.status,
    requestDate: withdrawal.requestDate,
  });
});


const approveWithdrawalRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const withdrawal = await Withdrawal.findById(id).populate("user");

  if (!withdrawal || withdrawal.status !== "Pending") {
    return res
      .status(404)
      .json({ message: "Withdrawal request not found or already processed." });
  }

  // Mark withdrawal as approved
  withdrawal.status = "Approved";
  await withdrawal.save();

  // Send email to user confirming withdrawal approval
  const subject = "Withdrawal Approved";
  const send_to = withdrawal.user.email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = "noreply@yourdomain.com";
  const template = "withdrawalApproval";
  const name = withdrawal.user.name;
  const walletAddress = withdrawal.walletAddress;
  const amount = withdrawal.amount;

  try {
    // Use the sendWithdrawalApprovalEmail function to send approval email
    await sendWithdrawalApprovalEmail.sendWithdrawalApprovalEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      name,
      walletAddress,
      amount
    );
    res.status(200).json({ message: "Withdrawal approved and user notified." });
  } catch (error) {
    res.status(500);
    throw new Error("Failed to send approval email.");
  }
});

//Reject Approval
// const rejectWithdrawalRequest = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   const withdrawal = await Withdrawal.findById(id).populate("user");

//   if (!withdrawal || withdrawal.status !== "Pending") {
//     return res
//       .status(404)
//       .json({ message: "Withdrawal request not found or already processed." });
//   }

//   // Mark withdrawal as rejected
//   withdrawal.status = "Rejected";
//   await withdrawal.save();

//   // Send email to user notifying withdrawal rejection
//   const subject = "Withdrawal Rejected";
//   const send_to = withdrawal.user.email;
//   const sent_from = process.env.EMAIL_USER;
//   const reply_to = "noreply@yourdomain.com"; 
//   const template = "withdrawalRejection";  // Assuming you have a template for rejection
//   const name = withdrawal.user.name;
//   const walletAddress = withdrawal.walletAddress;
//   const amount = withdrawal.amount;

//   try {
//     // Use the sendWithdrawalRejectionEmail function to send rejection email
//     await sendWithdrawalApprovalEmail.sendWithdrawalRejectionEmail(
//       subject,
//       send_to,
//       sent_from,
//       reply_to,
//       template,
//       name,
//       walletAddress,
//       amount
//     );
//     res.status(200).json({ message: "Withdrawal rejected and user notified." });
//   } catch (error) {
//     res.status(500);
//     throw new Error("Failed to send rejection email.");
//   }
// });


const rejectWithdrawalRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const withdrawal = await Withdrawal.findById(id).populate("user");

  if (!withdrawal || withdrawal.status !== "Pending") {
    return res
      .status(404)
      .json({ message: "Withdrawal request not found or already processed." });
  }

  // Restore the amount to the user's totalMaturityAmount
  const user = withdrawal.user;
  user.totalMaturityAmount += withdrawal.amount;
  await user.save();

  // Mark withdrawal as rejected
  withdrawal.status = "Rejected";
  await withdrawal.save();

  // Send email to user notifying withdrawal rejection
  const subject = "Withdrawal Rejected";
  const send_to = user.email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = "noreply@yourdomain.com";
  const template = "withdrawalRejection"; // Assuming you have a template for rejection
  const name = user.name;
  const walletAddress = withdrawal.walletAddress;
  const amount = withdrawal.amount;

  try {
    // Use the sendWithdrawalRejectionEmail function to send rejection email
    await sendWithdrawalApprovalEmail.sendWithdrawalRejectionEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      name,
      walletAddress,
      amount
    );

    res
      .status(200)
      .json({ message: "Withdrawal rejected, balance restored, and user notified." });
  } catch (error) {
    res.status(500);
    throw new Error("Failed to send rejection email.");
  }
});



// Fetch pending withdrawal requests for admin
const getPendingWithdrawals = asyncHandler(async (req, res) => {
  try {
    const pendingWithdrawals = await Withdrawal.find({
      status: "Pending",
    }).populate("user", "name email");
    res
      .status(200)
      .json({
        message: "Pending withdrawals fetched successfully.",
        withdrawals: pendingWithdrawals,
      });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pending withdrawals." });
  }
});

// Fetch withdrawal history for a user
const getUserWithdrawalHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  try {
    const withdrawals = await Withdrawal.find({ user: userId }).sort({
      requestDate: -1,
    });
    res
      .status(200)
      .json({
        message: "Withdrawal history fetched successfully.",
        history: withdrawals,
      });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch withdrawal history." });
  }
});

module.exports = {
  createWithdrawalRequest,
  getWithdrawalById,
  approveWithdrawalRequest,
  getPendingWithdrawals,
  getUserWithdrawalHistory,
  rejectWithdrawalRequest
};
