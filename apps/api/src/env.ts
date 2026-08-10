import { config as loadDotenv } from "dotenv";
import { join } from "node:path";

/**
 * Populates process.env before any application module is imported.
 *
 * Nest's ConfigModule loads .env during module initialisation — too late for
 * values read at import time, such as the AUTH_THROTTLE_LIMIT consumed inside
 * a @Throttle() decorator. Existing environment variables always win.
 */
loadDotenv({ path: [join(process.cwd(), ".env"), join(process.cwd(), "../../.env")] });
