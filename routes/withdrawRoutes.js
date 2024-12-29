const express = require("express");
const {
  createWithdrawalRequest,
  getPendingWithdrawals,
  approveWithdrawalRequest,
  getUserWithdrawalHistory,
  getWithdrawalById,
  rejectWithdrawalRequest,
} = require("../controllers/withdrawController");
const {
  protect,
  adminOnly,
  verifiedOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Route to create a withdrawal request
router.post("/create", protect, verifiedOnly, createWithdrawalRequest);

router.get(
  "/get-withdrawal/:id",
  protect,
  verifiedOnly,
  adminOnly,
  getWithdrawalById
);

// Route for admin to approve/reject a withdrawal request
router.put("/approve/:id", protect, adminOnly, approveWithdrawalRequest);
router.put("/reject/:id", protect, adminOnly, rejectWithdrawalRequest);


// Route for admin to view all pending withdrawals
router.get("/pending", protect, adminOnly, getPendingWithdrawals);

// Route to get user's withdrawal history
router.get("/history", protect, getUserWithdrawalHistory);

module.exports = router;
