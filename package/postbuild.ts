import fs from "fs";
import path from "path";

const sourceReadmePath = path.join(__dirname, "..", "README.md");
const destReadmePath = path.join(__dirname, "README.md");

fs.copyFileSync(sourceReadmePath, destReadmePath);
