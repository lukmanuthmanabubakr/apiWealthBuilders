// routes/investmentRoutes.js
const express = require("express");
const {
  startInvestment,
  getTotalInvestmentAmount,
  investmentHistory,
  checkAndDepositMaturityAmounts,
  getTransactionHistory,
  approveInvestment,
  rejectInvestment,
  getInvestmentDetails,
  adminPendingInvestment,
} = require("../controllers/investmentController");
const { protect, verifiedOnly, adminOnly } = require("../middleware/authMiddleware");
const InvestmentPlan = require("../models/InvestmentPlan");

const router = express.Router();


// Route to start an investment
router.post("/start-invest", protect, verifiedOnly, startInvestment);
router.put("/:investmentId/approve", approveInvestment);

// Reject investment route
router.put("/:investmentId/reject", rejectInvestment);

router.get(
  "/total-investment",
  protect,
  verifiedOnly,
  getTotalInvestmentAmount
);
// router.get("/investment-history", protect, verifiedOnly, investmentHistory);
router.get(
  "/investment-history",
  protect,
  verifiedOnly,
  investmentHistory
);
router.get("/deposit-maturity", protect, verifiedOnly, checkAndDepositMaturityAmounts);
router.get("/getTransactionHistory", protect, verifiedOnly, getTransactionHistory);
router.get("/investments/:investmentId", getInvestmentDetails);
router.get("/adminPendingInvestment", protect, verifiedOnly, adminOnly, adminPendingInvestment);





router.get("/plans", async (req, res) => {
  try {
    const plans = await InvestmentPlan.find();
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ message: "Error fetching investment plans" });
  }
});

module.exports = router;