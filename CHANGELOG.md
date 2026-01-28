# Changelog

All notable changes to @openconductor/mcp-sdk will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2025-01-28

### 🎮 Zero-Config Demo Mode

Build MCP servers immediately with no API key required. The SDK now auto-detects when no API key is provided and enables a fully-functional demo mode.

### Added

- **`initOpenConductor()`** — Single entry point for SDK initialization
  - Auto-detects demo vs production mode based on API key presence
  - Reads from `OPENCONDUCTOR_API_KEY` environment variable
  - Prints helpful banner showing current mode
  - `quiet` option to suppress banners

- **Demo Mode Features**
  - Mock billing (always allowed, 9999 credits)
  - Console telemetry (all metrics logged locally)
  - Full type safety — same interfaces as production
  - Zero setup required

- **`DemoTelemetry` class** — Console-based telemetry for local development
  - Same API as production `Telemetry` class
  - Pretty-printed console output with `[🎮 DEMO]` prefix
  - `getBuffer()` method for testing/inspection

- **Demo utilities module** (`@openconductor/mcp-sdk/demo`)
  - `MOCK_BILLING_STATUS`, `MOCK_USER_BILLING`, `MOCK_CREDIT_PACKS`
  - `getMockAnalytics()` — Generate realistic mock analytics data
  - `demoLogger` — Structured demo console logging

### Changed

- `initTelemetry()` now auto-detects demo mode and returns `DemoTelemetry`
- `initPayment()` auto-configures with mock data in demo mode
- All payment functions return mock data in demo mode (no API calls)

## [1.0.0] - 2025-01-22

### 🎉 First Stable Release

The SDK is now production-ready with comprehensive documentation.

### Added

- **Complete Error Handling** — 10 JSON-RPC 2.0 compliant error classes
  - `MCPError` (base), `ValidationError`, `ToolNotFoundError`, `ToolExecutionError`
  - `ResourceNotFoundError`, `AuthenticationError`, `AuthorizationError`
  - `RateLimitError`, `TimeoutError`, `DependencyError`, `ConfigurationError`

- **Zod Validation** — Full validation module with helpers
  - `validate()` and `validateInput()` functions
  - Built-in schemas: `nonEmptyString`, `positiveInt`, `limit`, `offset`, `url`, `email`, `uuid`, `isoDate`, `booleanish`
  - Type inference with `Infer<T>`

- **Structured Logging** — JSON logging for observability
  - `createLogger()` with configurable levels
  - Child loggers with context inheritance
  - Pretty-print mode for development

- **Server Utilities** — Production-ready helpers
  - `wrapTool()` — Automatic error handling, logging, timeouts, telemetry
  - `createHealthCheck()` — Standard health endpoints with dependency checks

- **Telemetry** — Optional observability
  - `initTelemetry()` — One-line setup
  - Automatic batching and flushing
  - Privacy-first (no inputs/outputs sent)

- **Tree-Shakeable Exports** — Import only what you need
  - `/errors`, `/validate`, `/logger`, `/server`, `/telemetry`

### Documentation

- [Getting Started Guide](./docs/getting-started.md)
- [Error Handling Guide](./docs/errors.md)
- [Validation Guide](./docs/validation.md)
- [Telemetry Guide](./docs/telemetry.md)
- [Complete API Reference](./docs/api-reference.md)

## [0.2.0] - 2025-01-15

### Added

- Initial telemetry module
- Health check utilities
- Tool wrapper with timeout support

## [0.1.0] - 2025-01-10

### Added

- Initial release
- Basic error handling
- Zod validation wrapper
- Structured logger
