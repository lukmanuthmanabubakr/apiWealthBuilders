const mongoose = require("mongoose");

const paymentLogSchema = mongoose.Schema(
  {
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Please add an amount"], // Amount of the payment
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"], // Status of the payment
      default: "pending", // Default status is pending
    },
    adminConfirmation: {
      type: Boolean,
      default: false, // Whether the admin has confirmed the payment.
    },
    paymentDate: {
      type: Date,
      default: Date.now, // Automatically set the payment date.
    },
    notes: {
      type: String,
      default: "", // Optional field for any additional notes.
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields.
    minimize: false,
  }
);

const PaymentLog = mongoose.model("PaymentLog", paymentLogSchema);
module.exports = PaymentLog;
