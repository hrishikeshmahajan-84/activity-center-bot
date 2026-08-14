import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// CORS: restrict to the configured origin in production; allow all in development.
// Set CORS_ORIGIN to the deployed app URL (e.g. https://your-app.replit.app) in production.
const corsOrigin: string | boolean =
  process.env.CORS_ORIGIN ??
  (process.env.NODE_ENV === "production"
    ? false // block all cross-origin in production if not explicitly configured
    : true); // allow all in development for convenient local testing

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
