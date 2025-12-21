import { DatabaseAdapter } from "./adapter.js";
import { SQLiteAdapter } from "./sqlite-adapter.js";
// PostgreSQL adapter will be added later
import { PostgreSQLAdapter } from "./postgres-adapter.js";

/**
 * Create database adapter based on environment configuration
 *
 * Priority:
 * 1. PostgreSQL if DATABASE_URL is set to postgresql://
 * 2. SQLite (default for development)
 */
export function createDatabase(): DatabaseAdapter {
  const databaseUrl = process.env.DATABASE_URL;

  // Production: PostgreSQL
  if (
    databaseUrl?.startsWith("postgresql://") ||
    databaseUrl?.startsWith("postgres://")
  ) {
    // TODO: Implement PostgreSQL adapter
    return new PostgreSQLAdapter(databaseUrl);
    console.warn(
      "PostgreSQL adapter not yet implemented, falling back to SQLite"
    );
  }

  // Development: SQLite (uses WorkspaceManager internally)
  return new SQLiteAdapter();
}
