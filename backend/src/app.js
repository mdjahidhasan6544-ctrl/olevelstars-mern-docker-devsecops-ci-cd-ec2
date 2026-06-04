import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { connectDB } from "./config/db.js";
import { getConfiguredCorsOrigins, validateRuntimeEnv } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import studentRoutes from "./routes/student.js";
import { ensureAdminAccount } from "./utils/ensureAdminAccount.js";

dotenv.config();

function normalizeOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return `${value}`.trim().replace(/\/+$/, "");
  }
}

const allowedOrigins = getConfiguredCorsOrigins().map(normalizeOrigin);

function getRequestOrigin(req) {
  const host = req.get("x-forwarded-host") || req.get("host");

  if (!host) {
    return "";
  }

  const proto = (req.get("x-forwarded-proto") || req.protocol || "http").split(",")[0].trim();
  return normalizeOrigin(`${proto}://${host}`);
}

function corsOptions(req, callback) {
  const origin = req.get("origin");
  const normalizedOrigin = origin ? normalizeOrigin(origin) : "";
  const requestOrigin = getRequestOrigin(req);
  const isAllowed =
    !origin ||
    allowedOrigins.includes(normalizedOrigin) ||
    (requestOrigin && normalizedOrigin === requestOrigin);

  callback(isAllowed ? null : new Error("Origin not allowed by CORS"), {
    origin: isAllowed,
    credentials: true
  });
}

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Scholastica Stars 3.0 backend is running",
    healthCheck: "/api/health"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API is healthy"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", studentRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.use(errorHandler);

let startupPromise;

export async function initializeApp() {
  if (!startupPromise) {
    startupPromise = (async () => {
      validateRuntimeEnv();
      await connectDB();
      await ensureAdminAccount();
    })().catch((error) => {
      startupPromise = null;
      throw error;
    });
  }

  return startupPromise;
}

export default app;
