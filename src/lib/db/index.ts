import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as schema from "./schema"; // Import all exports from schema.ts

dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set for Drizzle client"
  );
}

// Create a connection pool. We will use this for all our queries.
// The pool is configured to use the DATABASE_URL from your .env.local file.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // You might want to add SSL configuration here if connecting to Supabase
  // and not running on Vercel or a similar platform that handles it.
  // ssl: {
  //   rejectUnauthorized: false, // Use with caution, see Supabase docs
  // },
});

// Create the Drizzle ORM instance. This is what you'll use to interact with your database.
// It's typed based on your schema.
export const db = drizzle(pool, { schema });

// You can also export the schema if you need to refer to table structures directly elsewhere,
// though often you'll interact with them via the `db` client.
// export * from './schema';
