import { Router, Request, Response } from "express";
import multer from "multer";
import MulterCloudStorage from "multer-cloud-storage";
import { config } from "../config/config";
import { ErrorResponse } from "../types/auth";
import rateLimit from "express-rate-limit";
import { authenticateUser } from "../middleware/auth";
import User from "../models/User";
import Image from "../models/Image";
const router = Router();

// Rate limiting configuration
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 uploads per 15 minutes
  message: { error: "Too many upload attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure Multer with Google Cloud Storage
const upload = multer({
  storage: new MulterCloudStorage({
    bucket: config.gcp.bucketName,
    projectId: config.gcp.projectId,
    keyFilename: config.gcp.keyFilePath,
    uniformBucketLevelAccess: true,
    acl: "publicRead",
    filename: (req: Request, file: Express.Multer.File, cb: any) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `${file.fieldname}-${uniqueSuffix}-${file.originalname}`);
    },
    contentType: (req, file) => {
      console.log("Content type for file:", file.mimetype);
      return file.mimetype;
    },
  }),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// Handle file upload errors
const handleUploadError = (
  error: any,
  req: Request,
  res: Response,
  next: Function
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File size exceeds limit of 15MB",
      } as ErrorResponse);
    }
  }
  if (error.message === "Invalid file type") {
    return res.status(400).json({
      error: "Invalid file type. Allowed types: JPEG, PNG, GIF, PDF",
    } as ErrorResponse);
  }
  return res.status(500).json({
    error: "File upload failed",
  } as ErrorResponse);
};

// File upload route
router.post(
  "/image-upload",
  uploadLimiter,
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({
        error: "User not found",
      } as ErrorResponse);
      return;
    }

    upload.single("file")(req, res, async (err) => {
      if (err) {
        console.error("Multer error:", err);
        handleUploadError(err, req, res, () => {});
        return;
      }

      if (!req.file) {
        res.status(400).json({
          error:
            "No file uploaded. Make sure you're sending the file with the key 'file'",
        } as ErrorResponse);
        return;
      }

      try {
        // Generate public URL for the uploaded file
        const publicUrl = `https://storage.googleapis.com/${
          config.gcp.bucketName
        }/${encodeURIComponent(req.file.filename)}`;

        const image = new Image({
          title: req.file.originalname,
          link: publicUrl,
          company: user.company,
          mimetype: req.file.mimetype,
          size: req.file.size,
        });

        await image.save();

        res.json({
          message: "File uploaded successfully",
          fileUrl: publicUrl,
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        });
      } catch (error) {
        console.error("Error saving file details to database:", error);
        res.status(500).json({
          error: "Failed to save file details to database",
        } as ErrorResponse);
      }
    });
  }
);

export default router;
