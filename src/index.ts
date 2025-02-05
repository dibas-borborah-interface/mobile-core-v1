import express, { Express, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import mongoose from "mongoose";
import { config } from "./config/config";
import { configureRoutes } from "./routes";

const app: Express = express();

// Rate limiting - protect against brute force/DDoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

// Group all middleware setup
app.disable("x-powered-by");
app.use(helmet());
app.use(limiter);
app.use(express.json({ limit: "100kb" }));
app.use(hpp());
app.use(
  cors({
    origin: config.server.allowedOrigins?.split(",") || "http://localhost:3000",
    credentials: true,
  })
);

// Database connection
mongoose
  .connect(config.database.mongoURI)
  .then(() => console.log("📦 Connected to MongoDB successfully"))
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });

// configure routes
configureRoutes(app);

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello from Interface Core API! 🚀" });
});

app.listen(config.server.port, () => {
  console.log(
    `⚡️[server]: Server is running at http://localhost:${config.server.port}`
  );
});
