const mongoose = require("mongoose");

const investmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    plan: String,
    amount: Number,
    startDate: Date,
    endDate: Date,
    maturityAmount: Number,
    status: {
      type: String,
      enum: ["Pending", "Active", "Rejected", "Ended"], // Ensure consistency with investment status
      default: "Pending",
    },
    adminApprovalConfirmation: {
      type: String,
      enum: ["approved", "rejected", "Pending"], // Updated to include "Pending"
      default: "Pending", // Default to "Pending"
    },
    approvalDate: Date,
    rejectionDate: Date,
  },
  {
    timestamps: true,
    minimize: false,
  }
);

module.exports = mongoose.model("Investment", investmentSchema);
