import fs from "fs";
import path from "path";

const targetDirs = ["app", "components", "lib", "supabase"];
const demoKeywords = [
  "DineFlow Bistro",
  "rst_demo",
  "Copper Chimney",
  "Urban Tadka",
  "Spice Symphony",
  "3224500",
  "demo-restaurant",
  "getDemoAdminData",
  "getDemoDashboardData",
  "demoData",
  "mockOrders",
  "mockAnalytics",
  "demoOrders",
  "demoActivities",
  "placeholder",
];

function searchDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== ".git") {
        searchDir(fullPath);
      }
    } else if (entry.isFile() && /\.(tsx|ts|jsx|js|sql)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      demoKeywords.forEach((kw) => {
        if (content.includes(kw)) {
          console.log(`Found "${kw}" in ${fullPath}`);
        }
      });
    }
  }
}

for (const d of targetDirs) {
  if (fs.existsSync(d)) searchDir(d);
}
