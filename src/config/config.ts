import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

interface AuthResponse {
  success: boolean;
  access_token: string;
  token_type: string;
  refresh_token: string | null;
  amazon_refresh_token: string | null;
  expires_in: number | null;
}

export const config = {
  server: {
    port: process.env.PORT || 9000,
    nodeEnv: process.env.NODE_ENV || "development",
    allowedOrigins: process.env.ALLOWED_ORIGINS || "http://localhost:3000",
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || "fallback_secret_key",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
    tokenCookieName: "auth-token",
  },
  database: {
    mongoURI: process.env.MONGODB_URI || "",
  },
  cookie: {
    secret: process.env.COOKIE_SECRET || "cookie_secret",
    domain: process.env.COOKIE_DOMAIN || "localhost",
  },
  gcp: {
    projectId: process.env.GCP_PROJECT_ID || "interface-v1",
    bucketName: process.env.GCP_BUCKET_NAME || "interface-v1",
    keyFilePath: process.env.GCP_KEY_FILE_PATH || "path/to/keyfile.json",
  },
};

export type { AuthResponse };
