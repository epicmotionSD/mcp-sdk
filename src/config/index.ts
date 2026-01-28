/**
 * @openconductor/mcp-sdk - Global Configuration
 * 
 * Single source of truth for SDK mode (demo vs production)
 */

// ============================================================================
// Types
// ============================================================================

export interface OpenConductorConfig {
  /** OpenConductor API key (optional in demo mode) */
  apiKey?: string
  /** Force demo mode even if API key is provided */
  demoMode?: boolean
  /** Server name for telemetry */
  serverName?: string
  /** Server version */
  serverVersion?: string
  /** Suppress demo mode banner */
  quiet?: boolean
}

export interface ResolvedConfig {
  apiKey: string | null
  demoMode: boolean
  serverName: string
  serverVersion: string
  initialized: boolean
}

// ============================================================================
// State
// ============================================================================

let globalConfig: ResolvedConfig = {
  apiKey: null,
  demoMode: false,
  serverName: 'mcp-server',
  serverVersion: '0.0.0',
  initialized: false,
}

// ============================================================================
// Demo Mode Banner
// ============================================================================

const DEMO_BANNER = `
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🎮  DEMO MODE ACTIVE                                          │
│                                                                 │
│   The SDK is running without an API key.                        │
│   • Payment: Mock billing (always allowed, 9999 credits)        │
│   • Telemetry: Logging to console only                          │
│   • All features work - no data sent to OpenConductor           │
│                                                                 │
│   To enable production mode:                                    │
│   1. Get a free API key at https://openconductor.ai             │
│   2. Set OPENCONDUCTOR_API_KEY environment variable             │
│      or pass apiKey to initOpenConductor()                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
`

const PRODUCTION_BANNER = `
┌─────────────────────────────────────────────────────────────────┐
│   ✅  OpenConductor SDK initialized (production mode)           │
└─────────────────────────────────────────────────────────────────┘
`

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the OpenConductor SDK
 * 
 * Call this once at startup. If no API key is provided (via config or 
 * OPENCONDUCTOR_API_KEY env var), the SDK automatically enables Demo Mode.
 * 
 * @example Production mode
 * ```typescript
 * initOpenConductor({
 *   apiKey: process.env.OPENCONDUCTOR_API_KEY,
 *   serverName: 'my-server',
 *   serverVersion: '1.0.0'
 * })
 * ```
 * 
 * @example Demo mode (explicit)
 * ```typescript
 * initOpenConductor({ demoMode: true })
 * ```
 * 
 * @example Demo mode (auto-detected)
 * ```typescript
 * // No API key? Demo mode activates automatically
 * initOpenConductor({ serverName: 'my-server' })
 * ```
 */
export function initOpenConductor(config: OpenConductorConfig = {}): ResolvedConfig {
  // Resolve API key from config or environment
  const apiKey = config.apiKey ?? process.env.OPENCONDUCTOR_API_KEY ?? null
  
  // Determine demo mode
  // Demo if: explicitly set OR no API key provided
  const demoMode = config.demoMode === true || !apiKey
  
  globalConfig = {
    apiKey: demoMode ? null : apiKey,
    demoMode,
    serverName: config.serverName ?? process.env.OPENCONDUCTOR_SERVER_NAME ?? 'mcp-server',
    serverVersion: config.serverVersion ?? process.env.npm_package_version ?? '0.0.0',
    initialized: true,
  }
  
  // Print banner unless quiet
  if (!config.quiet) {
    if (demoMode) {
      console.log(DEMO_BANNER)
    } else {
      console.log(PRODUCTION_BANNER)
    }
  }
  
  return globalConfig
}

/**
 * Get current SDK configuration
 * Auto-initializes in demo mode if not already initialized
 */
export function getConfig(): ResolvedConfig {
  if (!globalConfig.initialized) {
    // Auto-init in demo mode for zero-config experience
    return initOpenConductor({ quiet: true })
  }
  return globalConfig
}

/**
 * Check if SDK is in demo mode
 */
export function isDemoMode(): boolean {
  return getConfig().demoMode
}

/**
 * Check if SDK is initialized
 */
export function isInitialized(): boolean {
  return globalConfig.initialized
}

/**
 * Reset configuration (mainly for testing)
 */
export function resetConfig(): void {
  globalConfig = {
    apiKey: null,
    demoMode: false,
    serverName: 'mcp-server',
    serverVersion: '0.0.0',
    initialized: false,
  }
}
