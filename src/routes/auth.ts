import { Router, Request, Response, NextFunction } from "express";
import axios, { AxiosError } from "axios";
import { LoginCredentials, AuthResponse, ErrorResponse } from "../types/auth";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../config/config";
import User from "../models/User";
const router = Router();

const MAX_USERNAME_LENGTH = 100;
const MAX_PASSWORD_LENGTH = 128;

// Rate limiting configuration
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 5 attempts per window
  message: { error: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation middleware
const validateLoginInput = (
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

  next();
};

router.post(
  "/login",
  loginLimiter,
  validateLoginInput,
  async (
    req: Request<{}, {}, LoginCredentials>,
    res: Response
  ): Promise<void> => {
    try {
      const { username, password } = req.body;

      const user = await User.findOne({
        username: username,
      });

      if (!user) {
        res.status(401).json({
          error: "Invalid credentials",
        } as ErrorResponse);
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        res.status(401).json({
          error: "Invalid credentials",
        } as ErrorResponse);
        return;
      }

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

      // Set cookie and return response
      res.cookie(config.auth.tokenCookieName, data.access_token, {
        httpOnly: true,
        secure: config.server.nodeEnv === "production",
        domain: config.cookie.domain,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: config.server.nodeEnv === "production" ? "strict" : "lax",
        path: "/",
      });

      // Return success response without sensitive data
      res.status(200).json(data);
    } catch (error) {
      // Handle different types of errors
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ErrorResponse>;
        const statusCode = axiosError.response?.status || 500;

        // Use generic error messages to prevent information leakage
        const errorMessage =
          statusCode === 401 ? "Invalid credentials" : "Authentication failed";

        res.status(statusCode).json({
          error: errorMessage,
        } as ErrorResponse);
      } else {
        // Log error details securely
        console.error("Auth error:", {
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
