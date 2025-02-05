import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/config";
import { ErrorResponse } from "../types/auth";
import User from "../models/User";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any; // Replace 'any' with your User type
    }
  }
}

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Authentication required",
      } as ErrorResponse);
      return;
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret) as {
        userId: string;
      };

      // Find user and attach to request
      const user = await User.findById(decoded.userId);

      if (!user) {
        res.status(401).json({
          error: "Invalid authentication token",
        } as ErrorResponse);
        return;
      }

      req.user = user;
      next();
    } catch (jwtError) {
      res.status(401).json({
        error: "Invalid authentication token",
      } as ErrorResponse);
      return;
    }
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      error: "Internal server error",
    } as ErrorResponse);
  }
};
