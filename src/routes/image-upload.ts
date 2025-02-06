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
      // Sanitize the filename to remove any problematic characters
      const sanitizedOriginalname = file.originalname.replace(
        /[^a-zA-Z0-9.-]/g,
        "_"
      );
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      // Ensure the file is stored at the root of the bucket without any subfolder
      cb(null, `${uniqueSuffix}-${sanitizedOriginalname}`);
    },
    contentType: (req, file) => file.mimetype,
  }),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit per file
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/gif"];
    allowedMimes.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Invalid file type"));
  },
});

// Handle file upload errors
const handleUploadError = (error: any, req: Request, res: Response) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res
      .status(400)
      .json({ error: "File size exceeds limit of 15MB" } as ErrorResponse);
  }
  if (error.message === "Invalid file type") {
    return res.status(400).json({
      error: "Invalid file type. Allowed types: JPEG, PNG, GIF, PDF",
    } as ErrorResponse);
  }
  return res.status(500).json({ error: "File upload failed" } as ErrorResponse);
};

// Multiple file upload route
router.post(
  "/image-upload",
  uploadLimiter,
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ error: "User not found" } as ErrorResponse);
      return;
    }

    // Get max files from header, default to 10 if not specified
    const maxFiles = parseInt(req.headers["x-max-files"] as string) || 10;

    // Use a single upload handler that can handle both single and multiple files
    upload.array("files", maxFiles)(req, res, async (err) => {
      if (err) {
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          // If files field fails, try single file upload
          upload.single("file")(req, res, async (singleErr) => {
            if (singleErr) {
              console.error("Multer error:", singleErr);
              handleUploadError(singleErr, req, res);
              return;
            }
            if (!req.file) {
              res.status(400).json({
                error:
                  "No file uploaded. Use 'file' for single or 'files' for multiple uploads.",
              } as ErrorResponse);
              return;
            }
            await handleSuccessfulUpload([req.file], user, res);
          });
          return;
        }
        console.error("Multer error:", err);
        handleUploadError(err, req, res);
        return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files || !files.length) {
        res.status(400).json({
          error:
            "No files uploaded. Use 'file' for single or 'files' for multiple uploads.",
        } as ErrorResponse);
        return;
      }
      await handleSuccessfulUpload(files, user, res);
    });
  }
);

// Helper function to handle successful upload
async function handleSuccessfulUpload(
  files: Express.Multer.File[],
  user: any,
  res: Response
) {
  try {
    const uploadedFiles = files.map((file) => {
      const publicUrl = `https://storage.googleapis.com/${
        config.gcp.bucketName
      }/${encodeURIComponent(file.filename)}`;
      return {
        title: file.originalname,
        link: publicUrl,
        company: user.company,
        mimetype: file.mimetype,
        size: file.size,
      };
    });

    await Image.insertMany(uploadedFiles);

    res.json({
      message:
        files.length > 1
          ? "Files uploaded successfully"
          : "File uploaded successfully",
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Error saving file details to database:", error);
    res.status(500).json({
      error: "Failed to save file details to database",
    } as ErrorResponse);
  }
}

export default router;
