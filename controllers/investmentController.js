// const asyncHandler = require("express-async-handler");
// const Investment = require("../models/Investment");
// const InvestmentPlan = require("../models/InvestmentPlan");
// const User = require("../models/userModel");
// const { sendAdminNotificationEmail } = require("../utils/emailUtils");
// const Transaction = require("../models/transactionModel");
// const Withdrawal = require("../models/withdrawalModel");
// const { sendUserNotificationEmail } = require("../services/sendUserNotificationEmail");

// const startInvestment = asyncHandler(async (req, res) => {
//   const { planName, amount } = req.body;
//   const userId = req.user._id;

//   // Ensure amount is treated as a number
//   const investmentAmount = parseFloat(amount);

//   if (isNaN(investmentAmount)) {
//     return res.status(400).json({ message: "Invalid investment amount." });
//   }

//   // Find the user
//   const user = await User.findById(userId);
//   if (!user || !user.isVerified) {
//     return res.status(403).json({ message: "User is not verified." });
//   }

//     // Check if user has enough balance
//     if (user.balance < amount) {
//       return res.status(400).json({ message: "Insufficient balance." });
//     }

//   // Find the selected investment plan
//   const plan = await InvestmentPlan.findOne({ name: planName });
//   if (!plan) {
//     return res.status(404).json({ message: "Investment plan not found." });
//   }

//   // Validate that the amount is within the plan's allowed range
//   if (investmentAmount < plan.minAmount || investmentAmount > plan.maxAmount) {
//     return res.status(400).json({
//       message: `Amount must be between ${plan.minAmount} and ${plan.maxAmount} for the ${plan.name} plan.`,
//     });
//   }

//   // Calculate maturity amount based on the plan's interest rate
//   const interestRate = plan.interestRate / 100;
//   const maturityAmount = parseFloat((amount * (1 + interestRate)).toFixed(2));
//   const durationInDays = plan.durationDays;
//   const endDate = new Date();
//   endDate.setDate(endDate.getDate() + durationInDays);
// endDate.setTime(endDate.getTime() + 60 * 1000);

// Add maturity amount to user's total maturity
// user.totalMaturityAmount = (user.totalMaturityAmount || 0) + maturityAmount;
// console.log("Updated totalMaturityAmount:", user.totalMaturityAmount);

//   // Create the new investment record with status "Pending"
//   const newInvestment = new Investment({
//     user: userId,
//     plan: plan.name,
//     amount: investmentAmount,
//     startDate: new Date(),
//     maturityAmount: maturityAmount,
//     endDate: endDate,
//     status: "Pending", // Set the status to "Pending"
//     adminApprovalConfirmation: "Pending", // Admin approval default to "pending"
//   });

//   // Save the new investment
//   await newInvestment.save();

//   // Send notification to admin
//   const adminEmail = process.env.ADMIN_EMAIL; // Define admin email in .env
//   await sendAdminNotificationEmail(adminEmail, user, newInvestment);

//   // Return the response to the user
//   return res.status(201).json({
//     message: `Investment of $${investmentAmount} in ${plan.name} is on hold pending admin approval.`,
//     investment: newInvestment,
//   });
// });

// const approveInvestment = asyncHandler(async (req, res) => {
//   const { investmentId } = req.params;

//   // Find the investment
//   const investment = await Investment.findById(investmentId).populate("user");
//   if (!investment) {
//     return res.status(404).json({ message: "Investment not found." });
//   }

//   if (investment.status !== "Pending") {
//     return res.status(400).json({ message: "Investment is already processed." });
//   }

//   const user = investment.user;

//   // Update investment status and approval
//   investment.status = "Active";
//   investment.adminApprovalConfirmation = "approved";
//   investment.approvalDate = new Date();

//   // Update user's investment balance
//   user.balance -= investment.amount;
//   user.investmentBalance += investment.amount;

//   // Deduct the amount from the user's balance (already done when investment was initiated)
//   await user.save();
//   await investment.save();

//   // Notify the user via email
//   await sendUserNotificationEmail(user.email, user.name, investment, "approved");

//   res.status(200).json({
//     message: `Investment ${investmentId} has been approved and added to the user's investment balance.`,
//     investment,
//   });
// });

// // Reject Investment
// const rejectInvestment = asyncHandler(async (req, res) => {
//   const { investmentId } = req.params;

//   // Find the investment
//   const investment = await Investment.findById(investmentId).populate("user");
//   if (!investment) {
//     return res.status(404).json({ message: "Investment not found." });
//   }

//   if (investment.status !== "Pending") {
//     return res.status(400).json({ message: "Investment is already processed." });
//   }

//   const user = investment.user;

//   // Update investment status and rejection
//   investment.status = "Rejected";
//   investment.adminApprovalConfirmation = "rejected";
//   investment.rejectionDate = new Date();

//   await user.save();
//   await investment.save();

//   // Notify the user via email
//   await sendUserNotificationEmail(user.email, user.name, investment, "rejected");

//   res.status(200).json({
//     message: `Investment ${investmentId} has been rejected, and the amount has been refunded to the user's balance.`,
//     investment,
//   });
// });

// const getTotalInvestmentAmount = asyncHandler(async (req, res) => {
//   const userId = req.user._id;

//   // Find the user
//   const user = await User.findById(userId);
//   if (!user) {
//     return res.status(404).json({ message: "User not found." });
//   }

//   // Send the total investment amount
//   return res.status(200).json({
//     totalInvestmentAmount: user.totalInvestmentAmount || 0,
//   });
// });

// //get user investment history
// const investmentHistory = asyncHandler(async (req, res) => {
//   const userId = req.user._id;

//   // Find all investments made by the user
//   const investments = await Investment.find({ user: userId }).sort({
//     startDate: -1,
//   });

//   if (!investments || investments.length === 0) {
//     return res
//       .status(404)
//       .json({ message: "No investments found for this user." });
//   }

//   const investmentStatus = investments.map((investment) => {
//     const currentDate = new Date();
//     const status = investment.endDate > currentDate ? "Active" : "Ended";

//     return {
//       investmentId: investment._id,
//       plan: investment.plan,
//       amount: investment.amount,
//       startDate: investment.startDate,
//       endDate: investment.endDate,
//       maturityAmount: investment.maturityAmount,
//       status: status,
//     };
//   });

//   // Return the status of the user's investments
//   return res.status(200).json({
//     message: "Investment history fetched successfully.",
//     investments: investmentStatus,
//   });
// });

// // Automatically deposit maturity amount when the user visits their dashboard or refreshes the page
// const checkAndDepositMaturityAmounts = asyncHandler(async (req, res) => {
//   const userId = req.user._id;

//   // Find the user
//   const user = await User.findById(userId);
//   if (!user) {
//     return res.status(404).json({ message: "User not found." });
//   }

//   // Get all active investments of the user
//   const investments = await Investment.find({
//     user: userId,
//     status: "Active",
//   });

//   const now = new Date();

//   // Process each investment to see if it has ended
//   for (const investment of investments) {
//     if (now >= investment.endDate) {
//       // Deposit the maturity amount into user's balance
//       user.totalMaturityAmount += investment.maturityAmount;
//       user.investmentBalance -= investment.amount;

//       // Update the investment status to 'Ended'
//       investment.status = "Ended";

//       // Save the updated user and investment
//       await user.save();
//       await investment.save();
//     }
//   }

//   return res.status(200).json({
//     message: "Maturity amounts deposited if investment has ended.",
//     userBalance: user.balance,
//   });
// });

// const getTransactionHistory = asyncHandler(async (req, res) => {
//   const userId = req.user._id;

//   try {
//     // Fetch user's deposit transactions
//     const transactions = await Transaction.find({ user: userId })
//       .sort({ createdAt: -1 }) // Sort by creation date (latest first)
//       .select("amount status transactionId createdAt"); // Fetch relevant fields

//     // Fetch user's investments
//     const investments = await Investment.find({ user: userId })
//       .sort({ startDate: -1 })
//       .select("amount plan startDate endDate maturityAmount");

//     // Fetch user's withdrawal history
//     const withdrawals = await Withdrawal.find({ user: userId })
//       .sort({ requestDate: -1 }) // Sort by request date (latest first)
//       .select("amount status walletAddress requestDate"); // Fetch relevant fields

//     // Combine all histories (transactions, investments, withdrawals)
//     const combinedHistory = [
//       ...transactions.map(item => ({ ...item.toObject(), type: "Transaction" })),
//       ...investments.map(item => ({ ...item.toObject(), type: "Investment" })),
//       ...withdrawals.map(item => ({ ...item.toObject(), type: "Withdrawal" }))
//     ];

//     // Sort the combined history by date (latest first)
//     const sortedHistory = combinedHistory.sort((a, b) => {
//       const dateA = a.createdAt || a.startDate || a.requestDate;
//       const dateB = b.createdAt || b.startDate || b.requestDate;
//       return new Date(dateB) - new Date(dateA);
//     });

//     // Return the combined and sorted history
//     return res.status(200).json({
//       message: "Transaction history fetched successfully.",
//       history: sortedHistory,
//     });
//   } catch (error) {
//     console.error("Error fetching transaction history:", error);
//     return res.status(500).json({ message: "Failed to fetch transaction history." });
//   }
// });

// module.exports = {
//   startInvestment,
//   approveInvestment,
//   rejectInvestment,
//   getTotalInvestmentAmount,
//   investmentHistory,
//   checkAndDepositMaturityAmounts,
//   getTransactionHistory
// };

const asyncHandler = require("express-async-handler");
const Investment = require("../models/Investment");
const InvestmentPlan = require("../models/InvestmentPlan");
const User = require("../models/userModel");
const Transaction = require("../models/transactionModel");
const Withdrawal = require("../models/withdrawalModel");
const { sendAdminNotificationEmail } = require("../utils/emailUtils");
const {
  sendUserNotificationEmail,
} = require("../services/sendUserNotificationEmail");

/**
 * @desc Start a new investment
 * @route POST /api/investments/start
 * @access Private
 */
const startInvestment = asyncHandler(async (req, res) => {
  const { planName, amount } = req.body;
  const userId = req.user._id;
  const investmentAmount = parseFloat(amount);

  if (isNaN(investmentAmount)) {
    return res.status(400).json({ message: "Invalid investment amount." });
  }

  const user = await User.findById(userId);
  if (!user || !user.isVerified) {
    return res.status(403).json({ message: "User is not verified." });
  }

  if (user.balance < investmentAmount) {
    return res.status(400).json({ message: "Insufficient balance." });
  }

  const plan = await InvestmentPlan.findOne({ name: planName });
  if (!plan) {
    return res.status(404).json({ message: "Investment plan not found." });
  }

  if (investmentAmount < plan.minAmount || investmentAmount > plan.maxAmount) {
    return res.status(400).json({
      message: `Amount must be between ${plan.minAmount} and ${plan.maxAmount} for the ${plan.name} plan.`,
    });
  }

  const interestRate = plan.interestRate / 100;
  const maturityAmount = parseFloat((investmentAmount * (1 + interestRate)).toFixed(2));
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.durationDays);

  // endDate.setTime(endDate.getTime() + 60 * 1000);
  // Add maturity amount to user's total maturity
  // user.totalMaturityAmount = (user.totalMaturityAmount || 0) + maturityAmount;
  // console.log("Updated totalMaturityAmount:", user.totalMaturityAmount);

  const newInvestment = new Investment({
    user: userId,
    plan: plan.name,
    amount: investmentAmount,
    startDate: new Date(),
    maturityAmount,
    endDate,
    status: "Pending",
    adminApprovalConfirmation: "Pending",
  });

  await newInvestment.save();
  await sendAdminNotificationEmail(
    process.env.ADMIN_EMAIL,
    user,
    newInvestment
  );

  res.status(201).json({
    message: `Investment of $${investmentAmount} in ${plan.name} is on hold pending admin approval.`,
    investment: newInvestment,
  });
});

/**
 * @desc Approve an investment
 * @route PATCH /api/investments/:investmentId/approve
 * @access Admin
 */
// const approveInvestment = asyncHandler(async (req, res) => {
//   const { investmentId } = req.params;

//   const investment = await Investment.findById(investmentId).populate("user");
//   if (!investment) {
//     return res.status(404).json({ message: "Investment not found." });
//   }

//   if (investment.status !== "Pending") {
//     return res
//       .status(400)
//       .json({ message: "Investment is already processed." });
//   }

//   const user = investment.user;
//   investment.status = "Active";
//   investment.adminApprovalConfirmation = "approved";
//   investment.approvalDate = new Date();

//   user.balance -= investment.amount;
//   user.investmentBalance += investment.amount;

//   await user.save();
//   await investment.save();
//   await sendUserNotificationEmail(
//     user.email,
//     user.name,
//     investment,
//     "approved"
//   );

//   res.status(200).json({
//     message: `Investment ${investmentId} has been approved and added to the user's investment balance.`,
//     investment,
//   });
// });

const approveInvestment = asyncHandler(async (req, res) => {
  const { investmentId } = req.params;

  const investment = await Investment.findById(investmentId).populate("user");
  if (!investment) {
    return res.status(404).json({ message: "Investment not found." });
  }

  if (investment.status !== "Pending") {
    return res
      .status(400)
      .json({ message: "Investment is already processed." });
  }

  const user = investment.user;
  investment.status = "Active";
  investment.adminApprovalConfirmation = "approved";
  investment.approvalDate = new Date();

  user.balance -= investment.amount;
  user.investmentBalance += investment.amount;

  await user.save();
  await investment.save();

  // Notify user
  await sendUserNotificationEmail(
    user.email,
    user.name,
    investment,
    "approved"
  );

  res.status(200).json({
    message: `Investment ${investmentId} has been approved and added to the user's investment balance.`,
    investment,
  });
});



/**
 * @desc Reject an investment
 * @route PATCH /api/investments/:investmentId/reject
 * @access Admin
 */
const rejectInvestment = asyncHandler(async (req, res) => {
  const { investmentId } = req.params;

  const investment = await Investment.findById(investmentId).populate("user");
  if (!investment) {
    return res.status(404).json({ message: "Investment not found." });
  }

  if (investment.status !== "Pending") {
    return res
      .status(400)
      .json({ message: "Investment is already processed." });
  }

  investment.status = "Rejected";
  investment.adminApprovalConfirmation = "rejected";
  investment.rejectionDate = new Date();

  await investment.save();
  await sendUserNotificationEmail(
    investment.user.email,
    investment.user.name,
    investment,
    "rejected"
  );

  res.status(200).json({
    message: `Investment ${investmentId} has been rejected.`,
    investment,
  });
});

/**
 * @desc Get total investment amount for a user
 * @route GET /api/investments/total
 * @access Private
 */
const getTotalInvestmentAmount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  res
    .status(200)
    .json({ totalInvestmentAmount: user.totalInvestmentAmount || 0 });
});

/**
 * @desc Get user investment history
 * @route GET /api/investments/history
 * @access Private
 */
// const investmentHistory = asyncHandler(async (req, res) => {
//   const investments = await Investment.find({ user: req.user._id }).sort({
//     startDate: -1,
//   });
//   if (!investments.length) {
//     return res.status(404).json({ message: "No investments found." });
//   }

//   const investmentStatus = investments.map((investment) => ({
//     investmentId: investment._id,
//     plan: investment.plan,
//     amount: investment.amount,
//     startDate: investment.startDate,
//     endDate: investment.endDate,
//     maturityAmount: investment.maturityAmount,
//     status: investment.endDate > new Date() ? "Active" : "Ended",
//   }));

//   res.status(200).json({ investments: investmentStatus });
// });

const investmentHistory = asyncHandler(async (req, res) => {
  const investments = await Investment.find({ user: req.user._id }).sort({
    startDate: -1,
  });

  if (!investments.length) {
    return res.status(404).json({ message: "No investments found." });
  }

  const investmentStatus = investments.map((investment) => {
    let status;

    if (investment.status === "Pending") {
      status = "Pending";
    } else if (investment.status === "Active" && investment.endDate > new Date()) {
      status = "Active";
    } else if (investment.status === "Active" && investment.endDate <= new Date()) {
      status = "Ended";
    } else {
      status = investment.status; // Covers Rejected or any unexpected value.
    }

    return {
      investmentId: investment._id,
      plan: investment.plan,
      amount: investment.amount,
      startDate: investment.startDate,
      endDate: investment.endDate,
      maturityAmount: investment.maturityAmount,
      status,
    };
  });

  res.status(200).json({ investments: investmentStatus });
});



/**
 * @desc Check and deposit maturity amounts for ended investments
 * @route POST /api/investments/maturity
 * @access Private
 */
const checkAndDepositMaturityAmounts = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const investments = await Investment.find({
    user: user._id,
    status: "Active",
  });
  const now = new Date();

  for (const investment of investments) {
    if (now >= investment.endDate) {
      user.totalMaturityAmount += investment.maturityAmount;
      user.investmentBalance -= investment.amount;
      investment.status = "Ended";
      await investment.save();
    }
  }

  await user.save();

  res.status(200).json({
    message: "Maturity amounts deposited successfully.",
    userBalance: user.balance,
  });
});

/**
 * @desc Get transaction history (transactions, investments, withdrawals)
 * @route GET /api/investments/transactions
 * @access Private
 */
const getTransactionHistory = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch all transactions, investments, and withdrawals for the user
    const transactions = await Transaction.find({ user: userId }).sort({
      createdAt: -1,
    });
    const investments = await Investment.find({ user: userId }).sort({
      startDate: -1,
    });
    const withdrawals = await Withdrawal.find({ user: userId }).sort({
      requestDate: -1,
    });

    // Combine the history with additional type annotations
    const combinedHistory = [
      ...transactions.map((item) => ({
        ...item.toObject(),
        type: "Transaction",
      })),
      ...investments.map((item) => ({
        ...item.toObject(),
        type: "Investment",
      })),
      ...withdrawals.map((item) => ({
        ...item.toObject(),
        type: "Withdrawal",
      })),
    ];

    // Sort all history entries by date, descending
    const sortedHistory = combinedHistory.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.startDate || a.requestDate);
      const dateB = new Date(b.createdAt || b.startDate || b.requestDate);
      return dateB - dateA;
    });

    // Respond with the sorted transaction history
    res.status(200).json({
      success: true,
      message: "Transaction history fetched successfully.",
      history: sortedHistory,
    });
  } catch (error) {
    console.error("Error fetching transaction history:", error.message);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching the transaction history.",
    });
  }
});

const getInvestmentDetails = asyncHandler(async (req, res) => {
  const { investmentId } = req.params;

  const investment = await Investment.findById(investmentId).populate("user");
  if (!investment) {
    return res.status(404).json({ message: "Investment not found." });
  }

  res.status(200).json({
    message: "Investment details retrieved successfully.",
    investment,
  });
});


const adminPendingInvestment = asyncHandler(async (req, res) => {
  const pendingInvestments = await Investment.find({ status: "Pending" })
    .populate("user")
    .sort({ createdAt: -1 }); // Sort by creation date in descending order

  if (!pendingInvestments || pendingInvestments.length === 0) {
    return res.status(404).json({ message: "No pending investments found." });
  }

  res.status(200).json({
    message: "Pending investments retrieved successfully.",
    pendingInvestments,
  });
});


module.exports = {
  startInvestment,
  approveInvestment,
  rejectInvestment,
  getTotalInvestmentAmount,
  investmentHistory,
  checkAndDepositMaturityAmounts,
  getTransactionHistory,
  getInvestmentDetails,
  adminPendingInvestment
};
