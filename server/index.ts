import express, { type Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { serveStatic } from "./static";
import { createServer } from "http";

const STAGING_URL = process.env.API_BASE_URL || "https://staging.unio.tec.br";

const app = express();
const httpServer = createServer(app);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms → ${STAGING_URL}`);
    }
  });
  next();
});

app.use(
  "/api",
  createProxyMiddleware({
    target: STAGING_URL,
    changeOrigin: true,
    secure: true,
    pathRewrite: (path) => {
      if (path.startsWith("/api")) return path;
      return `/api${path}`;
    },
    on: {
      proxyReq: (proxyReq, req) => {
        log(`PROXY ${req.method} ${proxyReq.path} → ${STAGING_URL}${proxyReq.path}`, "proxy");
      },
      error: (err, req, res) => {
        log(`PROXY ERROR ${req.method} ${req.url}: ${err.message}`, "proxy");
        if (res && "status" in res && typeof res.status === "function") {
          (res as Response).status(502).json({
            erro: "Erro de comunicação com o servidor staging.",
            detalhe: err.message,
          });
        }
      },
    },
  })
);

app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error("Internal Server Error:", err);
  if (res.headersSent) return next(err);
  return res.status(status).json({ message });
});

(async () => {
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => {
      log(`serving on port ${port}`);
      log(`API proxy → ${STAGING_URL}`);
    }
  );
})();
