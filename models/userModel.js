const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      trim: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
    },
    photo: {
      type: String,
      required: [true, "Please add a photo"],
      default: "https://i.ibb.co/4pDNDk1/avatar.png",
    },
    phone: {
      type: String,
      default: "+1",
    },
    bio: {
      type: String,
      default: "bio",
    },
    role: {
      type: String,
      required: true,
      default: "subscriber",
      // subscriber, author, admin (suspended)
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    userAgent: {
      type: Array,
      required: true,
      default: [],
    },
    balance: {
      type: Number,
      default: 0, // start balance at 0 for new users
    },
    referralCode: { type: String, unique: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    investmentBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    totalMaturityAmount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

// Encrypt password before saving to DB
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(this.password, salt);
  this.password = hashedPassword;
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
