import bcrypt from "bcrypt";

import { getAdminAccount } from "../config/env.js";
import { User } from "../models/User.js";

export async function ensureAdminAccount() {
  const adminAccount = getAdminAccount();

  if (!adminAccount) {
    return;
  }

  const { email, name, password } = adminAccount;
  const existingAdmin = await User.findOne({ email });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({
      name,
      email,
      studentId: `ADMIN-${Date.now()}`,
      passwordHash,
      role: "admin",
      isVerifiedStudent: true,
      status: "active"
    });

    console.log("Created configured admin account");
    return;
  }

  const passwordMatches = await bcrypt.compare(password, existingAdmin.passwordHash);
  let updated = false;

  if (!passwordMatches) {
    existingAdmin.passwordHash = await bcrypt.hash(password, 12);
    updated = true;
  }

  if (existingAdmin.name !== name) {
    existingAdmin.name = name;
    updated = true;
  }

  if (existingAdmin.role !== "admin") {
    existingAdmin.role = "admin";
    updated = true;
  }

  if (!existingAdmin.isVerifiedStudent) {
    existingAdmin.isVerifiedStudent = true;
    updated = true;
  }

  if (existingAdmin.status !== "active") {
    existingAdmin.status = "active";
    updated = true;
  }

  if (updated) {
    await existingAdmin.save();
    console.log("Synced configured admin account");
  }
}
