function readEnv(key) {
  return process.env[key]?.trim() || "";
}

export function getMongoUri() {
  if (process.env.NODE_ENV === "production") {
    return readEnv("MONGODB_URI");
  }

  return readEnv("MONGODB_URI") || readEnv("MONGO_URI");
}

export function getJwtSecret() {
  return readEnv("JWT_SECRET");
}

export function getAdminAccount() {
  const email = readEnv("ADMIN_USERNAME") || readEnv("ADMIN_EMAIL");
  const password = process.env.ADMIN_PASSWORD || "";

  if (!email || !password) {
    return null;
  }

  return {
    email: email.toLowerCase(),
    password,
    name: readEnv("ADMIN_NAME") || "Scholastica Admin"
  };
}

export function getConfiguredCorsOrigins() {
  return [
    readEnv("CORS_ORIGIN"),
    readEnv("CLIENT_URL"),
    readEnv("FRONTEND_PUBLIC_SITE_URL")
  ]
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

export function validateRuntimeEnv() {
  const required = ["MONGODB_URI", "JWT_SECRET"];

  if (process.env.NODE_ENV === "production") {
    required.push("ADMIN_USERNAME", "ADMIN_PASSWORD");
  }

  const missing = required.filter((key) => !readEnv(key));

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
