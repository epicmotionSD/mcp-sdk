# Error Handling

The SDK provides a complete set of error classes that follow the JSON-RPC 2.0 specification. Every error automatically formats correctly for MCP clients.

## Error Hierarchy

```
MCPError (base class)
├── ValidationError       - Invalid input parameters
├── ToolNotFoundError     - Requested tool doesn't exist
├── ToolExecutionError    - Tool failed during execution
├── ResourceNotFoundError - Resource URI not found
├── AuthenticationError   - Auth required or failed
├── AuthorizationError    - Not permitted
├── RateLimitError        - Too many requests
├── TimeoutError          - Operation timed out
├── DependencyError       - External dependency unavailable
└── ConfigurationError    - Invalid server config
```

## Error Codes

All errors map to JSON-RPC 2.0 error codes:

| Error | Code | When to Use |
|-------|------|-------------|
| `ValidationError` | -32602 | Invalid parameters from client |
| `ToolNotFoundError` | -32001 | Tool name doesn't exist |
| `ToolExecutionError` | -32002 | Tool logic failed |
| `ResourceNotFoundError` | -32003 | Resource URI invalid |
| `AuthenticationError` | -32004 | Missing or invalid credentials |
| `AuthorizationError` | -32005 | Authenticated but not allowed |
| `RateLimitError` | -32006 | Too many requests |
| `TimeoutError` | -32007 | Operation exceeded time limit |
| `DependencyError` | -32009 | External service unavailable |
| `ConfigurationError` | -32010 | Server misconfigured |

## Usage Examples

### ValidationError

Thrown automatically by `validateInput()`, or throw manually:

```typescript
import { ValidationError } from '@openconductor/mcp-sdk/errors'

// Field-level validation failure
throw new ValidationError('email', 'Must be a valid email', 'not-valid')

// JSON-RPC output:
// {
//   code: -32602,
//   message: "Validation failed for 'email': Must be a valid email",
//   data: { field: "email", reason: "Must be a valid email", value: "not-valid" }
// }
```

### ToolExecutionError

When your tool logic fails:

```typescript
import { ToolExecutionError } from '@openconductor/mcp-sdk/errors'

try {
  const result = await fetchExternalAPI()
} catch (error) {
  throw new ToolExecutionError('fetch-data', 'External API failed', error)
}
```

### DependencyError

When an external service is down:

```typescript
import { DependencyError } from '@openconductor/mcp-sdk/errors'

const dbCheck = await db.ping()
if (!dbCheck) {
  throw new DependencyError('postgres', 'Connection refused')
}
```

### RateLimitError

Include retry-after when possible:

```typescript
import { RateLimitError } from '@openconductor/mcp-sdk/errors'

if (requestCount > limit) {
  throw new RateLimitError(60000) // Retry after 60 seconds
}
```

### AuthorizationError

Specify what action was denied:

```typescript
import { AuthorizationError } from '@openconductor/mcp-sdk/errors'

// Without resource
throw new AuthorizationError('delete')

// With resource
throw new AuthorizationError('delete', '/files/secret.txt')
// Message: "Not authorized to delete on '/files/secret.txt'"
```

## Creating Custom Errors

Extend `MCPError` for custom error types:

```typescript
import { MCPError, ErrorCodes } from '@openconductor/mcp-sdk/errors'

class QuotaExceededError extends MCPError {
  constructor(resource: string, limit: number, current: number) {
    super(
      ErrorCodes.RATE_LIMIT_ERROR,
      `Quota exceeded for ${resource}: ${current}/${limit}`,
      { resource, limit, current }
    )
    this.name = 'QuotaExceededError'
  }
}
```

## Error Response Format

All errors serialize to JSON-RPC 2.0:

```typescript
const error = new ValidationError('amount', 'Must be positive', -5)

// error.toJSON()
{
  code: -32602,
  message: "Validation failed for 'amount': Must be positive",
  data: { field: "amount", reason: "Must be positive", value: -5 }
}

// error.toResponse('req-123')
{
  jsonrpc: "2.0",
  id: "req-123",
  error: {
    code: -32602,
    message: "Validation failed for 'amount': Must be positive",
    data: { field: "amount", reason: "Must be positive", value: -5 }
  }
}
```

## Best Practices

**DO:**
- Use specific error types (not generic `Error`)
- Include helpful context in error data
- Log errors before throwing for debugging
- Use `ToolExecutionError` as a catch-all for tool failures

**DON'T:**
- Expose sensitive data in error messages
- Use error messages as control flow
- Catch and re-throw without adding context
