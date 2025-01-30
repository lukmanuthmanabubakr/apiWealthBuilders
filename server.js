require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path"); // Required for serving static files
const userRoute = require("./routes/userRoute");
const paymentRoutes = require("./routes/paymentRoutes");
const investmentRoutes = require("./routes/investmentRoutes");
const withDrawRoutes = require("./routes/withdrawRoutes");
const errorHandler = require("./middleware/errorMiddleware");
const seedPlans = require("./utils/seedInvestmentPlans");
const countriesRoutes = require("./routes/countriesRoutes");

const app = express();

// Middlewares
app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(bodyParser.json());

// Serve the uploads directory as static
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  cors({
    origin: [
      "https://www.wealtybuilders.com",
      "http://localhost:3000",
      "https://api.wealtybuilders.com",
    ],
    credentials: true,
  })
);

// Routes
app.use("/api/users", userRoute);
app.use("/api/payments", paymentRoutes);
app.use("/api/invest", investmentRoutes);
app.use("/api/withDraw", withDrawRoutes);
app.use("/api", countriesRoutes);

app.get("/", (req, res) => {
  res.send("Home Page");
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 9009;

// Connect to database and seed plans
mongoose
  .connect(process.env.MONGO_DB_URL)
  .then(async () => {
    console.log("Database connected");

    // Seed investment plans if they don't exist
    await seedPlans();

    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
  })
  .catch((err) => console.error("Database connection error:", err));
