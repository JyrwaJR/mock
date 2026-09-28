import fs from "node:fs/promises";
import path from "node:path";

export async function writeToFile(value: unknown, url: string = "/") {
  const filePath = path.join(process.cwd(), "data", "request", "payload.json");

  // 1. Ensure directory exists
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  // 2. Read existing file content if available
  // eslint-disable-next-line
  let existingData: Record<string, any> = {};
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    if (fileContent.trim()) {
      existingData = JSON.parse(fileContent);
    }
  } catch {
    // File doesn't exist yet or is empty, fallback to an empty object
  }

  // 3. Format the URL key (ensures a leading slash e.g., "/facial_registration")
  const urlKey = url.startsWith("/") ? url : `/${url}`;

  // 4. Assign or overwrite the endpoint key with the new payload
  existingData[urlKey] = value;

  // 5. Write the updated map back to disk
  await fs.writeFile(filePath, JSON.stringify(existingData, null, 2), "utf-8");
}
