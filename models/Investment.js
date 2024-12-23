// models/Investment.js
const mongoose = require("mongoose");

const investmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  plan: String,
  amount: Number,
  startDate: Date,
  endDate: Date,
  maturityAmount: Number,
  status: { type: String, default: "Active" },
});

module.exports = mongoose.model("Investment", investmentSchema);
