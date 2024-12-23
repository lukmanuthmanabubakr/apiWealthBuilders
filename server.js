require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const userRoute = require('./routes/userRoute');
const paymentRoutes = require('./routes/paymentRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const withDrawRoutes = require('./routes/withdrawRoutes');
const errorHandler = require('./middleware/errorMiddleware');
const seedPlans = require('./utils/seedInvestmentPlans');

const app = express();

// Middlewares
app.set("trust proxy", 1); 
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(bodyParser.json());

app.use(
  cors({
    origin: ['https://www.greenwoodsy.com', 'http://localhost:3000', 'https://api.greenwoodsy.com'],
    credentials: true,
  })
);
// app.use(cors({ origin: 'https://www.greenwoodsy.com', credentials: true }));


// Routes
app.use("/api/users", userRoute);
app.use("/api/payments", paymentRoutes);
app.use("/api/invest", investmentRoutes);
app.use("/api/withDraw", withDrawRoutes);

app.get("/", (req, res) => {
  res.send("Home Page");
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 9009;

// Connect to database and seed plans
mongoose.connect(process.env.MONGO_DB_URL).then(async () => {
  console.log("Database connected");

  // Seed investment plans if they don't exist
  await seedPlans();

  app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
}).catch((err) => console.error("Database connection error:", err));