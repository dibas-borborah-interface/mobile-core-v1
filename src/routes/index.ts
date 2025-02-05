import { Express } from "express";
import authRouter from "./auth";
import registerRouter from "./register";
import imageUploadRouter from "./image-upload";
import videoUploadRouter from "./video-upload";

export const configureRoutes = (app: Express) => {
  // API routes
  app.use("/api", authRouter);
  app.use("/api", registerRouter);
  app.use("/api", imageUploadRouter);
  app.use("/api", videoUploadRouter);
};
