// Backend: FastAPI "Ball Com API" — routes are mounted at the root (no /api/v1 prefix).
// Override via Vite env: VITE_API_URL (use import.meta.env, not process.env, in the browser).
export const url =
  import.meta.env.VITE_API_URL || "https://frosted-griminess-obvious.ngrok-free.dev";
