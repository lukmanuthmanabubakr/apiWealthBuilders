const express = require("express");
const router = express.Router();
const { createTransaction, confirmPayment, viewPaymentStatus, getPendingTransactions, rejectPayment } = require("../controllers/paymentController");
const {
    protect,
    adminOnly,
    verifiedOnly,
  } = require("../middleware/authMiddleware");


// Route to create a transaction (user submits a payment);
router.post("/create", protect, verifiedOnly, createTransaction);

// Route to confirm a payment (admin confirms payment)
router.patch("/confirmPayment", protect, verifiedOnly, adminOnly, confirmPayment);
router.patch("/rejectPayment", protect, verifiedOnly, adminOnly, rejectPayment);
router.get("/viewPaymentStatus/:transactionId", protect, adminOnly, viewPaymentStatus);
router.get("/pending-deposit", protect, adminOnly, getPendingTransactions);



module.exports = router;
