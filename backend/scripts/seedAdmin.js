import dotenv from "dotenv";

import { getAdminAccount } from "../src/config/env.js";
import { connectDB } from "../src/config/db.js";
import { ensureAdminAccount } from "../src/utils/ensureAdminAccount.js";

dotenv.config();

async function seedAdmin() {
  const adminAccount = getAdminAccount();

  if (!adminAccount) {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD are required to seed an admin");
  }

  await connectDB();
  await ensureAdminAccount();
  console.log("Configured admin account ensured");
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
