const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

// Function to generate JWT
const generateToken = (id, adminId = null, impersonating = false) => {
  return jwt.sign(
    { id, adminId, impersonating },
    process.env.JWT_SECRET,
    { expiresIn: "1d" } // Token valid for 1 day
  );
};

// Admin Impersonation Controller

// const impersonateUser = asyncHandler(async (req, res) => {
//   const { userId } = req.params;

//   const userToImpersonate = await User.findById(userId);
//   if (!userToImpersonate) {
//     return res.status(404).json({ message: "User not found" });
//   }

//   // Generate new JWT for the impersonated user, storing the admin's ID
//   const token = generateToken(userToImpersonate._id, req.user._id, true);

//   res.cookie("token", token, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "none",
//   });

//   res.status(200).json({
//     message: `Admin is now impersonating ${userToImpersonate.email}`,
//   });
// });


// Admin Impersonation Controller
const impersonateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const userToImpersonate = await User.findById(userId);
    if (!userToImpersonate) {
        return res.status(404).json({ message: "User not found" });
    }

    // Set isImpersonated to true in the database
    userToImpersonate.isImpersonated = true;
    await userToImpersonate.save();

    // Generate new JWT for the impersonated user, storing the admin's ID
    const token = generateToken(userToImpersonate._id, req.user._id, true);

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
    });

    res.status(200).json({ 
        message: `Admin is now impersonating ${userToImpersonate.email}`,
        isImpersonated: userToImpersonate.isImpersonated
    });
});


// Exit Impersonation
// const exitImpersonation = asyncHandler(async (req, res) => {
//   const token = req.cookies.token;

//   if (!token) {
//     return res.status(401).json({ message: "No active session found" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // Ensure the user is actually impersonating someone
//     if (!decoded.impersonating || !decoded.adminId) {
//       return res
//         .status(400)
//         .json({ message: "You are not impersonating any user" });
//     }

//     // Find the original admin
//     const adminUser = await User.findById(decoded.adminId);
//     if (!adminUser) {
//       return res.status(404).json({ message: "Admin session not found" });
//     }

//     // Generate a new token for the admin
//     const newToken = generateToken(adminUser._id);

//     res.cookie("token", newToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "none",
//     });

//     res
//       .status(200)
//       .json({ message: "Impersonation ended, back to admin session" });
//   } catch (error) {
//     return res.status(401).json({ message: "Invalid token" });
//   }
// });

// Exit Impersonation
const exitImpersonation = asyncHandler(async (req, res) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.status(401).json({ message: "No active session found" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Ensure the user is actually impersonating someone
        if (!decoded.impersonating || !decoded.adminId) {
            return res.status(400).json({ message: "You are not impersonating any user" });
        }

        // Find the original admin
        const adminUser = await User.findById(decoded.adminId);
        if (!adminUser) {
            return res.status(404).json({ message: "Admin session not found" });
        }

        // Find the impersonated user and reset isImpersonated to false
        const impersonatedUser = await User.findById(decoded.id);
        if (impersonatedUser) {
            impersonatedUser.isImpersonated = false;
            await impersonatedUser.save();
        }

        // Generate a new token for the admin
        const newToken = generateToken(adminUser._id);

        res.cookie("token", newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
        });

        res.status(200).json({ 
            message: "Impersonation ended, back to admin session",
            isImpersonated: false 
        });
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
});



module.exports = { impersonateUser, exitImpersonation };
