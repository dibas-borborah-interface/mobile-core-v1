import { Router, Request, Response, NextFunction } from "express";
import axios, { AxiosError } from "axios";
import { LoginCredentials, AuthResponse, ErrorResponse } from "../types/auth";
import rateLimit from "express-rate-limit";
import { config } from "../config/config";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User, { Company } from "../models/User";

const router = Router();

const MAX_USERNAME_LENGTH = 100;
const MAX_PASSWORD_LENGTH = 128;
const MIN_PASSWORD_LENGTH = 4;

// Rate limiting configuration for registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 registration attempts per hour
  message: { error: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration input validation middleware
const validateRegistrationInput = (
  req: Request<{}, {}, LoginCredentials>,
  res: Response,
  next: NextFunction
): void => {
  const { username, password } = req.body;

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !username.trim() ||
    !password.trim()
  ) {
    res.status(400).json({
      error: "Valid username and password are required",
    } as ErrorResponse);
    return;
  }

  // Check length constraints
  if (
    username.length > MAX_USERNAME_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    res.status(400).json({
      error: "Invalid input length",
    } as ErrorResponse);
    return;
  }

  // Basic password strength validation
  if (password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({
      error: "Password must be at least 8 characters long",
    } as ErrorResponse);
    return;
  }

  next();
};

router.post(
  "/register",
  registerLimiter,
  validateRegistrationInput,
  async (
    req: Request<{}, {}, LoginCredentials>,
    res: Response
  ): Promise<void> => {
    try {
      const { username, password, company } = req.body;
      // Check if user already exists
      const existingUser = await User.findOne({ username: username });
      const existingCompany = await Company.findOne({ name: company });
      if (existingUser) {
        res.status(409).json({
          error: "User already registered",
        } as ErrorResponse);
        return;
      }
      if (existingCompany) {
        res.status(409).json({
          error: "Company already registered",
        } as ErrorResponse);
        return;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // create company
      const newCompany = new Company({
        name: company,
        createdAt: new Date(),
      });
      await newCompany.save();
      // Create new user
      const user = new User({
        username: username,
        password: hashedPassword,
        company: newCompany._id,
        createdAt: new Date(),
      });

      await user.save();

      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, config.auth.jwtSecret, {
        expiresIn: "24h",
      });

      const data: AuthResponse = {
        access_token: token,
        user: {
          id: (user._id as string).toString(),
          username: user.username,
        },
      };

      res.status(201).json(data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ErrorResponse>;
        const statusCode = axiosError.response?.status || 500;

        // Provide specific registration error messages
        let errorMessage = "Registration failed";
        if (statusCode === 409) {
          errorMessage = "Email already registered";
        }

        res.status(statusCode).json({
          error: errorMessage,
        } as ErrorResponse);
      } else {
        console.error("Registration error:", {
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown error",
        });

        res.status(500).json({
          error: "Internal server error",
        } as ErrorResponse);
      }
    }
  }
);

export default router;
