const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(process.cwd(), "dist");
const startPort = Number(process.env.PORT || 8090);
const host = "127.0.0.1";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error("Le dossier dist est introuvable. Lancez d'abord: npm.cmd run build");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const cleanUrl = decodeURIComponent(req.url.split("?")[0].split("#")[0]);
  let filePath = path.join(root, cleanUrl === "/" ? "index.html" : cleanUrl);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(root, "index.html");
  }

  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

function listen(port) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE") {
      server.removeAllListeners("error");
      listen(port + 1);
      return;
    }
    console.error(error);
    process.exit(1);
  });

  server.listen(port, host, () => {
    console.log(`OMG Platforme 509 ouverte: http://${host}:${port}/#/`);
  });
}

listen(startPort);
