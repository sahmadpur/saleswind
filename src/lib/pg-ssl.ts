import type { PoolConfig } from "pg";

/**
 * Build a node-postgres config from a DATABASE_URL.
 *
 * Postgres self-hosted over the internet uses a self-signed TLS cert. We want
 * the connection encrypted but without CA verification. Recent node-postgres
 * (pg v9 / pg-connection-string) treats `sslmode=require` as strict
 * `verify-full`, which rejects a self-signed cert. So when the URL opts into
 * SSL we strip `sslmode` from the string and enable TLS via an explicit `ssl`
 * option with verification disabled. URLs without an sslmode (e.g. local dev on
 * localhost) connect without TLS, unchanged.
 *
 * Note: Prisma Migrate reads the raw DATABASE_URL itself and interprets
 * `sslmode=require` as encrypt-without-verify, so the full URL stays correct
 * for migrations — this only adjusts the runtime node-postgres driver.
 */
export function pgConfigFromUrl(databaseUrl: string | undefined): PoolConfig {
  const raw = databaseUrl ?? "";
  const wantsSsl = /[?&]sslmode=(require|prefer|verify-ca|verify-full|no-verify)/.test(raw);
  if (!wantsSsl) return { connectionString: raw || undefined };

  const url = new URL(raw);
  url.searchParams.delete("sslmode");
  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
  };
}
