const fs = require("fs");
const path = require("path");

const url = (process.env.SOCKET_SERVER_URL || "").trim();
const out = path.join(__dirname, "..", "public", "runtime-config.js");
const body = `// Généré au build Vercel — URL du serveur multijoueur (Render)
window.__SOCKET_URL__ = ${JSON.stringify(url)};
`;
fs.writeFileSync(out, body, "utf8");
console.log("runtime-config.js →", url || "(même domaine / localhost)");
