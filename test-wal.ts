import { createClient } from "@libsql/client";
const client = createClient({ url: "file:cache_telemetrias.db" });
async function test() {
  await client.execute("PRAGMA journal_mode = WAL;");
  const res = await client.execute("PRAGMA journal_mode;");
  console.log("Journal Mode is:", res.rows[0]);
}
test();
