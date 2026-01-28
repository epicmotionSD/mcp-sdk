/**
 * @openconductor/mcp-sdk - Global Configuration
 *
 * Single source of truth for SDK mode (demo vs production)
 */
interface OpenConductorConfig {
    /** OpenConductor API key (optional in demo mode) */
    apiKey?: string;
    /** Force demo mode even if API key is provided */
    demoMode?: boolean;
    /** Server name for telemetry */
    serverName?: string;
    /** Server version */
    serverVersion?: string;
    /** Suppress demo mode banner */
    quiet?: boolean;
}
interface ResolvedConfig {
    apiKey: string | null;
    demoMode: boolean;
    serverName: string;
    serverVersion: string;
    initialized: boolean;
}
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
declare function initOpenConductor(config?: OpenConductorConfig): ResolvedConfig;
/**
 * Get current SDK configuration
 * Auto-initializes in demo mode if not already initialized
 */
declare function getConfig(): ResolvedConfig;
/**
 * Check if SDK is in demo mode
 */
declare function isDemoMode(): boolean;
/**
 * Check if SDK is initialized
 */
declare function isInitialized(): boolean;
/**
 * Reset configuration (mainly for testing)
 */
declare function resetConfig(): void;

export { type OpenConductorConfig, type ResolvedConfig, getConfig, initOpenConductor, isDemoMode, isInitialized, resetConfig };
