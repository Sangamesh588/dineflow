import fs from "fs";
const schema = fs.readFileSync("supabase/schema.sql", "utf8");
const lines = schema.split("\n");
lines.forEach((l, i) => {
  if (l.includes("POLICY") && (l.includes("restaurant_members") || l.includes("restaurants"))) {
    console.log(`${i + 1}: ${l}`);
  }
});
