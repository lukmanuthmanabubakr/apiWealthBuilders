const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const { generateToken, hashToken } = require("../utils");
var parser = require("ua-parser-js");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const countries = require("../data/countries.json");
const Token = require("../models/tokenModel");
const crypto = require("crypto");
const Cryptr = require("cryptr");

// const

const cryptr = new Cryptr(process.env.CRYPTR_KEY);

const generateReferralCode = (userId) => {
  return `${userId.toString().slice(-6)}${Math.random()
    .toString(36)
    .substring(2, 8)}`;
};

//To Register User
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, referralCode, phone, country } = req.body;

  // Validation
  if (!name || !email || !password || !phone || !country) {
    res.status(400);
    throw new Error("Please fill in all the required fields.");
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be up to 6 characters.");
  }

  // Check if country is valid
  const isValidCountry = countries.some((c) => c.name === country);
  if (!isValidCountry) {
    res.status(400);
    throw new Error("Invalid country selection.");
  }

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("Email already in use.");
  }

  const phoneExist = await User.findOne({ phone });
  if (phoneExist) {
    res.status(400);
    throw new Error("Phone Number already in use.");
  }

  // Get UserAgent
  const ua = parser(req.headers["user-agent"]);
  const userAgent = [ua.ua];

  const user = await User.create({
    name,
    email,
    password,
    phone,
    userAgent,
    country,
    balance: 0,
    referralCode: generateReferralCode(email),
  });

  if (referralCode) {
    const referringUser = await User.findOne({ referralCode });
    if (referringUser) {
      referringUser.balance += 5; // Add 5 to the balance of the referrer
      referringUser.referrals.push(user._id); // Add new user to referrals list
      await referringUser.save();
      user.referredBy = referringUser._id; // Save the referrer in the new user
      await user.save();
    }
  }

  // Generate Token
  const token = generateToken(user._id);

  // Send HTTP-only cookie
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400), // 1 day
    sameSite: "none",
    secure: true,
  });

  if (user) {
    const {
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      isVerified,
      country,
      referralCode,
    } = user;

    res.status(201).json({
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      isVerified,
      country,
      referralCode,
      token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

const getReferrals = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate(
    "referrals",
    "name photo email"
  );

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  if (!user.referrals || user.referrals.length === 0) {
    // Respond with a message if no referrals
    return res.status(200).json({ message: "No referrals" });
  }

  res.status(200).json({ referrals: user.referrals });
});

//To Login User
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  //   Validation
  if (!email || !password) {
    res.status(400);
    throw new Error("Please add email and password");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found, please signup");
  }

  const passwordIsCorrect = await bcrypt.compare(password, user.password);

  if (!passwordIsCorrect) {
    res.status(400);
    throw new Error("Invalid email or password");
  }
  if (user.role === "suspended") {
    res.status(401);
    throw new Error("Account suspended, please contact support");
  }

  // Trigger 2FA for UserAgent
  const ua = parser(req.headers["user-agent"]);
  const thisUserAgent = ua.ua;
  console.log(thisUserAgent);
  const allowedAgent = user.userAgent.includes(thisUserAgent);

  if (!allowedAgent) {
    // Genrate 6 digit code
    const loginCode = Math.floor(100000 + Math.random() * 900000);
    console.log(loginCode);

    // Encrypt login code before saving to DB
    const encryptedLoginCode = cryptr.encrypt(loginCode.toString());

    // Delete the user Token if it exists in DB
    let userToken = await Token.findOne({ userId: user._id });
    if (userToken) {
      await userToken.deleteOne();
    }

    // Save Token to DB
    await new Token({
      userId: user._id,
      lToken: encryptedLoginCode,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60 * (60 * 1000), // just 60mins
    }).save();

    res.status(400);
    throw new Error("New browser or device detected");
  }

  // Generate Token
  const token = generateToken(user._id);

  if (user && passwordIsCorrect) {
    // Send HTTP-only cookie
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 86400), // 1 day
      sameSite: "none",
      secure: true,
    });

    const {
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      country,
      isVerified,
      referralCode,
    } = user;

    res.status(200).json({
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      country,
      isVerified,
      token,
      referralCode,
    });
  } else {
    res.status(500);
    throw new Error("Something went wrong, please try again");
  }
});

//To Log-out User
const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    path: "/",
    httpOnly: true,
    expires: new Date(0), // 1 day
    sameSite: "none",
    secure: true,
  });
  return res.status(200).json({ message: "Logout successful" });
});

//To Get A User
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    const {
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      country,
      isVerified,
      kycStatus,
      referralCode,
      balance,
      investmentBalance,
      totalMaturityAmount,
    } = user;

    res.status(200).json({
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      country,
      isVerified,
      kycStatus,
      referralCode,
      balance,
      investmentBalance,
      totalMaturityAmount,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

//To Update A User
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    const { name, email, phone, bio, photo, role, isVerified, country } = user;

    user.email = email;
    user.name = req.body.name || name;
    user.country = req.body.country || country;
    user.phone = req.body.phone || phone;
    user.bio = req.body.bio || bio;
    user.photo = req.body.photo || photo;

    const updatedUser = await user.save();

    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      country: updatedUser.country,
      email: updatedUser.email,
      phone: updatedUser.phone,
      bio: updatedUser.bio,
      photo: updatedUser.photo,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified,
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

//To Delete A User
const deleteUser = asyncHandler(async (req, res) => {
  const user = User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  await user.deleteOne();
  res.status(200).json({
    message: "User deleted successfully",
  });
});

//To Get All Users
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort("-createdAt").select("-password");
  if (!users) {
    res.status(500);
    throw new Error("Something went wrong");
  }
  res.status(200).json(users);
});

//To check Login status of a user
const loginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json(false);
  }

  // Verify token
  const verified = jwt.verify(token, process.env.JWT_SECRET);

  if (verified) {
    return res.json(true);
  }
  return res.json(false);
});

//To Upgrade user
const upgradeUser = asyncHandler(async (req, res) => {
  const { role, id } = req.body;

  const user = await User.findById(id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.role = role;
  await user.save();

  res.status(200).json({
    message: `User role updated to ${role}`,
  });
});

//To Send Automated Email
const sendAutomatedEmail = asyncHandler(async (req, res) => {
  const { subject, send_to, reply_to, template, url } = req.body;

  if (!subject || !send_to || !reply_to || !template) {
    res.status(500);
    throw new Error("Missing email parameter");
  }

  // Get user
  const user = await User.findOne({ email: send_to });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const sent_from = process.env.EMAIL_USER;
  const name = user.name;
  const link = `${process.env.FRONTEND_URL}${url}`;

  try {
    await sendEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      name,
      link
    );
    res.status(200).json({ message: "Email Sent" });
  } catch (error) {
    res.status(500);
    throw new Error("Email not sent, please try again");
  }
});

//To send verification Email
const sendVerificationEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.isVerified) {
    // res.status(400);
    // throw new Error("User already verified");
    res.status(200).json({ message: "Account Verification Successful" });
  }

  // Delete Token if it exists in DB
  let token = await Token.findOne({ userId: user._id });
  if (token) {
    await token.deleteOne();
  }

  //   Create Verification Token and Saved
  const verificationToken = crypto.randomBytes(32).toString("hex") + user._id;
  console.log(verificationToken);
  // res.send('Token')

  // Hash token and save
  const hashedToken = hashToken(verificationToken);
  await new Token({
    userId: user._id,
    vToken: hashedToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + 60 * (60 * 1000),
  }).save();

  // Construct Verification URL
  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;

  // Send Email
  const subject = "Verify Your Account - WealthBuilders";
  const send_to = user.email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = "noreply@wealthBuilders.com";
  const template = "verifyEmail";
  const name = user.name;
  const link = verificationUrl;

  try {
    await sendEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      name,
      link
    );
    res.status(200).json({ message: "Verification Email Sent" });
  } catch (error) {
    res.status(500);
    throw new Error("Email not sent, please try again");
  }
});

//To Verify User TOKEN
const verifyUser = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  const hashedToken = hashToken(verificationToken);

  const userToken = await Token.findOne({
    vToken: hashedToken,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(404);
    throw new Error("Invalid or Expired Token");
  }

  // Find User
  const user = await User.findOne({ _id: userToken.userId });

  if (user.isVerified) {
    // res.status(400);
    // throw new Error("User is already verified");
    res.status(200).json({ message: "Account Verification Successful" });
  }

  // Now verify user
  user.isVerified = true;
  user.balance += 5;
  await user.save();

  res.status(200).json({ message: "Account Verification Successful" });
});

//Forgot password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("No user with this email");
  }

  // Delete Token if it exists in DB
  let token = await Token.findOne({ userId: user._id });
  if (token) {
    await token.deleteOne();
  }

  //   Create Verification Token and Save
  const resetToken = crypto.randomBytes(32).toString("hex") + user._id;
  console.log(resetToken);

  // Hash token and save
  const hashedToken = hashToken(resetToken);
  await new Token({
    userId: user._id,
    rToken: hashedToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + 60 * (60 * 1000), // 60mins
  }).save();

  // Construct Reset URL
  const resetUrl = `${process.env.FRONTEND_URL}/resetPassword/${resetToken}`;

  // Send Email
  const subject = "Password Reset Request - WealthBuilders";
  const send_to = user.email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = "noreply@WealthBuilders.com";
  const template = "forgotPassword";
  const name = user.name;
  const link = resetUrl;

  try {
    await sendEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      name,
      link
    );
    res.status(200).json({ message: "Password Reset Email Sent" });
  } catch (error) {
    res.status(500);
    throw new Error("Email not sent, please try again");
  }
});

//To reset password
const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { password } = req.body;
  // console.log(resetToken);
  // console.log(password);

  const hashedToken = hashToken(resetToken);

  const userToken = await Token.findOne({
    rToken: hashedToken,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(404);
    throw new Error("Invalid or Expired Token");
  }

  // Find User
  const user = await User.findOne({ _id: userToken.userId });

  // Now Reset password
  user.password = password;
  await user.save();

  res.status(200).json({ message: "Password Reset Successful, please login" });
});

//To change the password
const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, password } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!oldPassword || !password) {
    res.status(400);
    throw new Error("Please enter old and new password");
  }

  // Check if old password is correct
  const passwordIsCorrect = await bcrypt.compare(oldPassword, user.password);

  // Save new password
  if (user && passwordIsCorrect) {
    user.password = password;
    await user.save();

    res
      .status(200)
      .json({ message: "Password change successful, please re-login" });
  } else {
    res.status(400);
    throw new Error("Old password is incorrect");
  }
});

//To send login code
const sendLoginCode = asyncHandler(async (req, res) => {
  const { email } = req.params;
  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Find Login Code in DB
  let userToken = await Token.findOne({
    userId: user._id,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(404);
    throw new Error("Invalid or Expired token, please login again");
  }

  const loginCode = userToken.lToken;
  const decryptedLoginCode = cryptr.decrypt(loginCode);

  // Send Login Code
  const subject = "Login Access Code - WealthBuilders";
  const send_to = email;
  const sent_from = process.env.EMAIL_USER;
  const reply_to = "noreply@zino.com";
  const template = "loginCode";
  const name = user.name;
  const link = decryptedLoginCode;

  try {
    await sendEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      template,
      name,
      link
    );
    res.status(200).json({ message: `Access code sent to ${email}` });
  } catch (error) {
    res.status(500);
    throw new Error("Email not sent, please try again");
  }
});

//For User to login with code
const loginWithCode = asyncHandler(async (req, res) => {
  const { email } = req.params;
  const { loginCode } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Find user Login Token
  const userToken = await Token.findOne({
    userId: user.id,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(404);
    throw new Error("Invalid or Expired Token, please login again");
  }

  const decryptedLoginCode = cryptr.decrypt(userToken.lToken);

  if (loginCode !== decryptedLoginCode) {
    res.status(400);
    throw new Error("Incorrect login code, please try again");
  } else {
    // Register userAgent
    const ua = parser(req.headers["user-agent"]);
    const thisUserAgent = ua.ua;
    user.userAgent.push(thisUserAgent);
    await user.save();

    // Generate Token
    const token = generateToken(user._id);

    // Send HTTP-only cookie
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 86400), // 1 day
      sameSite: "none",
      secure: true,
    });

    const { _id, name, email, phone, bio, photo, role, isVerified } = user;

    res.status(200).json({
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      isVerified,
      token,
    });
  }
});

const loginWithGoogle = asyncHandler(async (req, res) => {
  const { userToken } = req.body;
  console.log(userToken);

  const ticket = await client.verifyIdToken({
    idToken: userToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  console.log(payload);

  const { name, email, picture, sub } = payload;
  const password = Date.now() + sub;

  // Get UserAgent
  const ua = parser(req.headers["user-agent"]);
  const userAgent = [ua.ua];

  // Check if user exists
  const user = await User.findOne({ email });

  if (!user) {
    //   Create new user
    const newUser = await User.create({
      name,
      email,
      password,
      photo: picture,
      isVerified: true,
      userAgent,
    });

    if (newUser) {
      // Generate Token
      const token = generateToken(newUser._id);

      // Send HTTP-only cookie
      res.cookie("token", token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 86400), // 1 day
        sameSite: "none",
        secure: true,
      });

      const { _id, name, email, phone, bio, photo, role, isVerified } = newUser;

      res.status(201).json({
        _id,
        name,
        email,
        phone,
        bio,
        photo,
        role,
        isVerified,
        token,
      });
    }
  }

  // User exists, login
  if (user) {
    const token = generateToken(user._id);

    // Send HTTP-only cookie
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 86400), // 1 day
      sameSite: "none",
      secure: true,
    });

    const { _id, name, email, phone, bio, photo, role, isVerified } = user;

    res.status(201).json({
      _id,
      name,
      email,
      phone,
      bio,
      photo,
      role,
      isVerified,
      token,
    });
  }
});

const getUserTransactions = async (req, res) => {
  const userId = req.user._id;
  try {
    const transactions = await Transaction.find({ userId }).populate(
      "userId",
      "name email"
    );

    return res.status(200).json({
      message: "User transactions retrieved successfully.",
      transactions,
    });
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    return res
      .status(500)
      .json({ message: "Failed to retrieve transactions." });
  }
};

const updateDepositBalance = async (req, res) => {
  const { id } = req.params; // User ID
  const { operation, amount } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure balance is a number
    user.totalMaturityAmount = Number(user.totalMaturityAmount);

    if (operation === "add") {
      user.totalMaturityAmount += Number(amount);
    } else if (operation === "deduct") {
      if (user.totalMaturityAmount < amount) {
        return res.status(400).json({ message: "Insufficient Total-profit" });
      }
      user.totalMaturityAmount -= Number(amount);
    } else {
      return res.status(400).json({ message: "Invalid operation" });
    }

    await user.save();
    res.json({
      message: "Total-profit updated successfully",
      updatedUser: user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const editDepositBalance = async (req, res) => {
  const { id } = req.params; // User ID
  const { operation, amount } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure balance is a number
    user.balance = Number(user.balance);

    if (operation === "add") {
      user.balance += Number(amount);
    } else if (operation === "deduct") {
      if (user.balance < amount) {
        return res.status(400).json({ message: "Insufficient Balance" });
      }
      user.balance -= Number(amount);
    } else {
      return res.status(400).json({ message: "Invalid operation" });
    }

    await user.save();
    res.json({ message: "Balance updated successfully", updatedUser: user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// const uploadKycDocuments = asyncHandler(async (req, res) => {
//   try {
//     // Ensure the user is authenticated
//     const userId = req.user.id;

//     // Fetch user from the database
//     const user = await User.findById(userId);
//     if (!user) {
//       res.status(404);
//       throw new Error("User not found");
//     }

//     // Prevent re-upload if KYC is still pending
//     if (user.kycStatus === "Pending") {
//       res.status(400);
//       throw new Error(
//         "You have already submitted your KYC documents. Please wait for approval."
//       );
//     }

//     // Check if required files are provided
//     if (!req.files || !req.files.front || !req.files.back) {
//       res.status(400);
//       throw new Error(
//         "Please upload both the front and back of your document."
//       );
//     }

//     // Paths of the uploaded files
//     const frontDocPath = req.files.front[0].path;
//     const backDocPath = req.files.back[0].path;

//     // Convert the file paths to public URLs
//     const baseUrl = process.env.BASE_IMG_URL;
//     const frontDocUrl = `${baseUrl}/${frontDocPath.replace(/\\/g, "/")}`;
//     const backDocUrl = `${baseUrl}/${backDocPath.replace(/\\/g, "/")}`;

//     // Update the user's KYC field and status in the database
//     user.kyc = {
//       frontDoc: frontDocUrl,
//       backDoc: backDocUrl,
//       status: "Pending",
//     };
//     user.kycStatus = "Pending";

//     await user.save();

//     console.log("KYC Status being sent:", user.kycStatus);


//     const adminEmail = process.env.ADMIN_EMAIL || "invest@wealtybuilders.com";
//     await sendEmail(
//       "New KYC Submission",
//       adminEmail,
//       process.env.EMAIL_USER, // Sent from
//       process.env.EMAIL_USER, // Reply-to
//       "kyc-notification", // Name of the handlebars template
//       user.name, // User's name
//       user.kycStatus
//     );

//     res.status(200).json({
//       message: "KYC documents uploaded successfully!",
//       kyc: user.kyc,
//     });
//   } catch (error) {
//     res.status(500);
//     throw new Error(`Error uploading KYC documents: ${error.message}`);
//   }
// });

const uploadKycDocuments = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user from the database
    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (user.kycStatus === "Pending") {
      res.status(400);
      throw new Error("You have already submitted your KYC documents. Please wait for approval.");
    }

    if (!req.files || !req.files.front || !req.files.back) {
      res.status(400);
      throw new Error("Please upload both the front and back of your document.");
    }

    // Cloudinary automatically returns a URL for the uploaded files
    const frontDocUrl = req.files.front[0].path; 
    const backDocUrl = req.files.back[0].path; 

    user.kyc = {
      frontDoc: frontDocUrl,
      backDoc: backDocUrl,
      status: "Pending",
    };
    user.kycStatus = "Pending";

    await user.save();

    console.log("KYC Status being sent:", user.kycStatus);

    // Send notification email
    const adminEmail = process.env.ADMIN_EMAIL || "invest@wealtybuilders.com";
    await sendEmail(
      "New KYC Submission",
      adminEmail,
      process.env.EMAIL_USER,
      process.env.EMAIL_USER,
      "kyc-notification",
      user.name,
      user.kycStatus
    );

    res.status(200).json({
      message: "KYC documents uploaded successfully!",
      kyc: user.kyc,
    });
  } catch (error) {
    res.status(500);
    throw new Error(`Error uploading KYC documents: ${error.message}`);
  }
});



const getPendingKycRequests = asyncHandler(async (req, res) => {
  try {
    // Find all users with KYC status as Pending
    const pendingUsers = await User.find({ kycStatus: "Pending" });

    if (pendingUsers.length === 0) {
      return res.status(404).json({ message: "No pending KYC requests" });
    }

    res.status(200).json({
      message: "Pending KYC requests fetched successfully",
      pendingUsers,
    });
  } catch (error) {
    res.status(500);
    throw new Error(`Error fetching pending KYC requests: ${error.message}`);
  }
});


// Approve KYC request for a specific user
const approveKycRequest = asyncHandler(async (req, res) => {
  try {
    const userId = req.params.id;

    // Find user by ID and ensure the KYC status is "Pending"
    const user = await User.findById(userId);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (user.kycStatus !== "Pending") {
      res.status(400);
      throw new Error("KYC is not pending for this user");
    }

    // Update KYC status to "Approved"
    user.kycStatus = "Approved";
    user.kyc.status = "Approved"; // Update the individual document status

    await user.save();

    console.log("KYC Status being update to:", user.kycStatus);


    // Send KYC approval email
    await sendEmail(
      "Your KYC Verification is Approved",
      user.email,
      process.env.EMAIL_USER,
      process.env.EMAIL_USER,
      "emails/kyc-approved", // Correct path to the template
      user.name
    );
    
    
    res.status(200).json({
      message: "KYC request approved successfully",
      kyc: user.kyc, // Return updated KYC details
    });
  } catch (error) {
    res.status(500);
    throw new Error(`Error approving KYC request: ${error.message}`);
  }
});

// Reject KYC request for a specific user
const rejectKycRequest = asyncHandler(async (req, res) => {
  try {
    const userId = req.params.id;

    // Find user by ID and ensure the KYC status is "Pending"
    const user = await User.findById(userId);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (user.kycStatus !== "Pending") {
      res.status(400);
      throw new Error("KYC is not pending for this user");
    }

    // Update KYC status to "Rejected"
    user.kycStatus = "Rejected";
    user.kyc.status = "Rejected"; // Update the individual document status

    await user.save();
    console.log("KYC Status being updated to:", user.kycStatus);


    // Send KYC rejection email
    await sendEmail(
      "Your KYC Verification is Rejected",
      user.email,
      process.env.EMAIL_USER,
      process.env.EMAIL_USER,
      "emails/kyc-rejected", // Correct path to the template
      user.name
    );
    

    res.status(200).json({
      message: "KYC request rejected successfully",
      kyc: user.kyc, // Return updated KYC details
    });
  } catch (error) {
    res.status(500);
    throw new Error(`Error rejecting KYC request: ${error.message}`);
  }
});







module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  updateUser,
  deleteUser,
  getUsers,
  loginStatus,
  upgradeUser,
  sendAutomatedEmail,
  sendVerificationEmail,
  verifyUser,
  forgotPassword,
  resetPassword,
  changePassword,
  sendLoginCode,
  loginWithCode,
  loginWithGoogle,
  getUserTransactions,
  getReferrals,
  updateDepositBalance,
  editDepositBalance,
  uploadKycDocuments,
  getPendingKycRequests,
  approveKycRequest,
  rejectKycRequest,
};

// res.send('Log out user')
