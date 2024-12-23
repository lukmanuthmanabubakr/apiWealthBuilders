const asyncHandler = require("express-async-handler");
const Investment = require("../models/Investment");
const InvestmentPlan = require("../models/InvestmentPlan");
const User = require("../models/userModel");
const {
  sendInvestmentConfirmationEmail,
} = require("../services/sendInvestmentConfirmationEmail");
const Transaction = require("../models/transactionModel");
const Withdrawal = require("../models/withdrawalModel");



const startInvestment = asyncHandler(async (req, res) => {
  let { planName, amount } = req.body;
  const userId = req.user._id;

  // Ensure amount is treated as a number
  amount = parseFloat(amount);

  // Check if amount is a valid number
  if (isNaN(amount)) {
    return res.status(400).json({ message: "Invalid investment amount." });
  }

  // Find the user
  const user = await User.findById(userId);
  if (!user || !user.isVerified) {
    return res.status(403).json({ message: "User is not verified." });
  }

  // Check if user has enough balance
  if (user.balance < amount) {
    return res.status(400).json({ message: "Insufficient balance." });
  }

  // Find the selected investment plan
  const plan = await InvestmentPlan.findOne({ name: planName });
  if (!plan) {
    return res.status(404).json({ message: "Investment plan not found." });
  }

  // Validate that the amount is within the plan's allowed range
  if (amount < plan.minAmount || amount > plan.maxAmount) {
    return res.status(400).json({
      message: `Amount must be between ${plan.minAmount} and ${plan.maxAmount} for the ${plan.name} plan.`,
    });
  }

  // Update the user's balance and investment amounts
  user.balance -= amount;
  user.investmentBalance = (user.investmentBalance || 0) + amount;

  // Calculate maturity amount based on the plan's interest rate
  const interestRate = plan.interestRate / 100;
  const maturityAmount = parseFloat((amount * (1 + interestRate)).toFixed(2));
  const durationInDays = plan.durationDays;
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + durationInDays);
  // endDate.setTime(endDate.getTime() + 60 * 1000);

  // Add maturity amount to user's total maturity
  // user.totalMaturityAmount = (user.totalMaturityAmount || 0) + maturityAmount;
  // console.log("Updated totalMaturityAmount:", user.totalMaturityAmount);

  await user.save();

  // Create the new investment record
  const newInvestment = new Investment({
    user: userId,
    plan: plan.name,
    amount,
    startDate: new Date(),
    maturityAmount: maturityAmount,
    endDate: endDate,
  });
  await newInvestment.save();

  // Send the investment confirmation email
  await sendInvestmentConfirmationEmail(user, newInvestment);

  // Return the success response
  return res.status(201).json({
    message: `Successfully invested $${amount} in ${plan.name}.`,
    investment: newInvestment,
  });
});

const getTotalInvestmentAmount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Find the user
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  // Send the total investment amount
  return res.status(200).json({
    totalInvestmentAmount: user.totalInvestmentAmount || 0,
  });
});

//get user investment history
const investmentHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Find all investments made by the user
  const investments = await Investment.find({ user: userId }).sort({
    startDate: -1,
  });

  if (!investments || investments.length === 0) {
    return res
      .status(404)
      .json({ message: "No investments found for this user." });
  }

  const investmentStatus = investments.map((investment) => {
    const currentDate = new Date();
    const status = investment.endDate > currentDate ? "Active" : "Ended";

    return {
      investmentId: investment._id,
      plan: investment.plan,
      amount: investment.amount,
      startDate: investment.startDate,
      endDate: investment.endDate,
      maturityAmount: investment.maturityAmount,
      status: status,
    };
  });

  // Return the status of the user's investments
  return res.status(200).json({
    message: "Investment history fetched successfully.",
    investments: investmentStatus,
  });
});

// Automatically deposit maturity amount when the user visits their dashboard or refreshes the page
const checkAndDepositMaturityAmounts = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Find the user
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  // Get all active investments of the user
  const investments = await Investment.find({
    user: userId,
    status: "Active",
  });

  const now = new Date();

  // Process each investment to see if it has ended
  for (const investment of investments) {
    if (now >= investment.endDate) {
      // Deposit the maturity amount into user's balance
      user.totalMaturityAmount += investment.maturityAmount;
      user.investmentBalance -= investment.amount;

      // Update the investment status to 'Ended'
      investment.status = "Ended";

      // Save the updated user and investment
      await user.save();
      await investment.save();
    }
  }

  return res.status(200).json({
    message: "Maturity amounts deposited if investment has ended.",
    userBalance: user.balance,
  });
});


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

//     // Combine and sort the results by date (latest first)
//     const combinedHistory = [...transactions, ...investments].sort((a, b) => {
//       const dateA = a.createdAt || a.startDate;
//       const dateB = b.createdAt || b.startDate;
//       return new Date(dateB) - new Date(dateA);
//     });

//     // Return the combined and sorted history
//     return res.status(200).json({
//       message: "Transaction history fetched successfully.",
//       history: combinedHistory,
//     });
//   } catch (error) {
//     console.error("Error fetching transaction history:", error);
//     return res.status(500).json({ message: "Failed to fetch transaction history." });
//   }
// });


const getTransactionHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  try {
    // Fetch user's deposit transactions
    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 }) // Sort by creation date (latest first)
      .select("amount status transactionId createdAt"); // Fetch relevant fields

    // Fetch user's investments
    const investments = await Investment.find({ user: userId })
      .sort({ startDate: -1 }) 
      .select("amount plan startDate endDate maturityAmount");

    // Fetch user's withdrawal history
    const withdrawals = await Withdrawal.find({ user: userId })
      .sort({ requestDate: -1 }) // Sort by request date (latest first)
      .select("amount status walletAddress requestDate"); // Fetch relevant fields

    // Combine all histories (transactions, investments, withdrawals)
    const combinedHistory = [
      ...transactions.map(item => ({ ...item.toObject(), type: "Transaction" })),
      ...investments.map(item => ({ ...item.toObject(), type: "Investment" })),
      ...withdrawals.map(item => ({ ...item.toObject(), type: "Withdrawal" }))
    ];

    // Sort the combined history by date (latest first)
    const sortedHistory = combinedHistory.sort((a, b) => {
      const dateA = a.createdAt || a.startDate || a.requestDate;
      const dateB = b.createdAt || b.startDate || b.requestDate;
      return new Date(dateB) - new Date(dateA);
    });

    // Return the combined and sorted history
    return res.status(200).json({
      message: "Transaction history fetched successfully.",
      history: sortedHistory,
    });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return res.status(500).json({ message: "Failed to fetch transaction history." });
  }
});




module.exports = {
  startInvestment,
  getTotalInvestmentAmount,
  investmentHistory,
  checkAndDepositMaturityAmounts,
  getTransactionHistory
};
