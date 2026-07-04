/**
 * db/migrate.ts
 * Run with: npm run db:migrate
 */
import dotenv from 'dotenv'
dotenv.config()

import { runMigrations, closePool } from "./index";

runMigrations()
  .then(() => {
    console.log("✓ Migrations applied successfully.");
    return closePool();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Migration failed:", err.message);
    process.exit(1);
  });
