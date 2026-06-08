import { config } from "dotenv";
// override:true so the test DB URL wins even if a dev .env was already loaded
config({ path: ".env.test", override: true });
