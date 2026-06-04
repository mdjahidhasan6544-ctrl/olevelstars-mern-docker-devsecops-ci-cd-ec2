import mongoose from "mongoose";

import { getMongoUri } from "./env.js";

export async function connectDB() {
  const mongoUri = getMongoUri();

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
}
