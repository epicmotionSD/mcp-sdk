# Copilot instructions for @openconductor/mcp-sdk

## Big picture
- Small TypeScript SDK; single public surface re-exported from [src/index.ts](src/index.ts).
- Core modules:
  - Errors + JSON-RPC formatting in [src/errors/index.ts](src/errors/index.ts) with codes in [src/errors/codes.ts](src/errors/codes.ts).
  - Validation wrappers around Zod in [src/validate/index.ts](src/validate/index.ts).
  - Structured JSON logging in [src/logger/index.ts](src/logger/index.ts).
  - Tool wrapping + health checks in [src/server/index.ts](src/server/index.ts).
  - Optional telemetry client in [src/telemetry/index.ts](src/telemetry/index.ts).

## Design & data flow (important)
- `wrapTool()` is the main integration point: creates a per-call `ToolContext`, logs input/output, enforces timeouts via `Promise.race`, and reports telemetry. It rethrows `MCPError` and wraps unknown errors as `ToolExecutionError`.
- `wrapTool()` uses `sanitizeInput()` to redact keys containing `password`, `token`, `secret`, `key`, `auth`, `credential` before logging.
- `validateInput()` wraps a handler with Zod validation and throws `ValidationError` on the first issue.
- `Telemetry` is a singleton: `initTelemetry()` sets a global instance, and `wrapTool()` reads it via `getTelemetry()`; reporting is enabled by default when telemetry is configured.

## Project-specific conventions
- Errors must be JSON-RPC 2.0 compatible via `MCPError.toJSON()` / `toResponse()`.
- Add new error types in [src/errors/index.ts](src/errors/index.ts) and include a code in [src/errors/codes.ts](src/errors/codes.ts).
- Keep exports tree-shakeable: update re-exports in [src/index.ts](src/index.ts) and subpath exports in package.json (`./errors`, `./validate`, `./logger`, `./server`, `./telemetry`).

## Developer workflows
- Node.js >= 18 (see package.json `engines`).
- Build: `npm run build` (tsup builds to dist).
- Dev watch: `npm run dev`.
- Test: `npm run test` (vitest).
- Lint: `npm run lint` (eslint src/).

## Integration points / dependencies
- External runtime dependency: `zod` only.
- Telemetry uses `fetch` and posts batches; no tool inputs/outputs are sent.

## Examples worth following
- Error formatting and JSON-RPC mapping in [src/errors/index.ts](src/errors/index.ts).
- Tool wrapping + timeouts + telemetry in [src/server/index.ts](src/server/index.ts).
- Zod schema helpers and `validateInput()` in [src/validate/index.ts](src/validate/index.ts).
