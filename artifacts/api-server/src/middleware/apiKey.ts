/**
 * requireApiKey middleware
 *
 * Protects state-changing endpoints (booking, scrape triggers, target mutations)
 * with a pre-shared API key read from the BURNABY_API_KEY environment variable.
 *
 * Expected request header:
 *   Authorization: Bearer <key>
 *
 * Behaviour:
 *   - Key configured:    missing/wrong token → 401/403
 *   - Key not set, dev:  pass through with a warning log (allows local dev)
 *   - Key not set, prod: 503 Service Unavailable (fail safe)
 */

import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.BURNABY_API_KEY;

  if (!apiKey) {
    // Fail safe regardless of environment: without a configured key the
    // endpoint is disabled. Set BURNABY_API_KEY as a Replit secret.
    logger.error(
      { path: req.path },
      "BURNABY_API_KEY is not set – state-changing endpoint blocked until key is configured."
    );
    res.status(503).json({
      error:
        "Service unavailable: BURNABY_API_KEY secret is not configured. " +
        "Add it in the Replit workspace secrets before using this endpoint.",
    });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Unauthorized: Authorization header with Bearer token required.",
    });
    return;
  }

  const token = authHeader.slice("Bearer ".length);
  if (token !== apiKey) {
    res.status(403).json({ error: "Forbidden: Invalid API key." });
    return;
  }

  next();
}
