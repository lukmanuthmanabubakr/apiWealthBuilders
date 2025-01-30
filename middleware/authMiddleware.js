const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

const protect = asyncHandler(async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      res.status(401);
      throw new Error("Not authorized, please login");
    }

    // Verify token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    // Get user id from token
    const user = await User.findById(verified.id).select("-password");

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    if (user.role === "suspended") {
      res.status(400);
      throw new Error("User suspended, please contact support");
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    throw new Error("Not authorized, please login");
  }
});

const verifiedOnly = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.isVerified) {
    next();
  } else {
    res.status(401);
    throw new Error("Not authorized, account not verified");
  }
});

const authorOnly = asyncHandler(async (req, res, next) => {
  if (req.user.role === "author" || req.user.role === "admin") {
    next();
  } else {
    res.status(401);
    throw new Error("Not authorized as an author");
  }
});

const adminOnly = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(401);
    throw new Error("Not authorized as an admin");
  }
});

const kycApprovedOnly = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const user = await User.findById(userId);

  // Check if KYC is not submitted yet
  if (user.kycStatus === "Not Submitted") {
    res.status(400);
    throw new Error("Please complete your KYC verification to continue");
  }

  // Check if KYC is pending (document submission is under review)
  if (user.kycStatus === "Pending") {
    res.status(400);
    throw new Error("Your KYC is under review. Please wait for approval.");
  }

  // Check the individual document status (kyc.status)
  if (user.kyc.status === "Rejected") {
    res.status(400);
    throw new Error("Your KYC submission has been rejected. Please resubmit.");
  }
  if (req.user && req.user.kyc && req.user.kyc.status === "Approved") {
    next();
  } else {
    res.status(403);
    throw new Error(
      "Access denied. Your KYC documents have not been approved yet."
    );
  }
});

module.exports = {
  protect,
  verifiedOnly,
  authorOnly,
  adminOnly,
  kycApprovedOnly,
};
