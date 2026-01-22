# Validation Guide

Input validation is critical for MCP servers. The SDK uses [Zod](https://zod.dev) for schema validation with MCP-specific helpers and automatic error formatting.

## Quick Start

```typescript
import { validateInput, z } from '@openconductor/mcp-sdk'

const handler = validateInput(
  z.object({
    query: z.string().min(1),
    limit: z.number().int().positive().default(10)
  }),
  async (input) => {
    // input is typed: { query: string, limit: number }
    return search(input.query, input.limit)
  }
)
```

## Core Functions

### `validate(schema, input, options?)`

Validates input against a schema, throws `ValidationError` on failure:

```typescript
import { validate, z } from '@openconductor/mcp-sdk'

const schema = z.object({ name: z.string() })
const data = validate(schema, userInput)
// Throws ValidationError if invalid, returns typed data if valid
```

### `validateInput(schema, handler, options?)`

Wraps a handler with automatic validation:

```typescript
const handler = validateInput(
  z.object({ id: z.string().uuid() }),
  async (input) => fetchById(input.id)
)
// Handler receives validated, typed input
```

### Options

```typescript
interface ValidateOptions {
  stripUnknown?: boolean  // Remove extra keys (default: true)
  formatError?: (error: ZodError) => string  // Custom error messages
}
```

## Built-in Schemas

Common patterns ready to use:

```typescript
import { schemas, z } from '@openconductor/mcp-sdk'

const mySchema = z.object({
  // Strings
  name: schemas.nonEmptyString,  // string, min 1 char
  email: schemas.email,          // valid email format
  website: schemas.url,          // valid URL
  id: schemas.uuid,              // UUID format
  timestamp: schemas.isoDate,    // ISO 8601 datetime
  
  // Numbers
  count: schemas.positiveInt,    // int > 0
  
  // Pagination
  limit: schemas.limit,          // 1-100, default 10
  offset: schemas.offset,        // >= 0, default 0
  
  // Boolean with string coercion
  enabled: schemas.booleanish,   // true | false | 'true' | 'false'
})
```

## Schema Patterns

### Optional with Defaults

```typescript
z.object({
  query: z.string(),
  limit: z.number().default(10),         // Optional, defaults to 10
  format: z.enum(['json', 'xml']).optional()  // Optional, no default
})
```

### Unions and Enums

```typescript
z.object({
  // Specific values only
  status: z.enum(['pending', 'active', 'done']),
  
  // Multiple types
  id: z.union([z.string(), z.number()]),
  
  // Discriminated unions
  action: z.discriminatedUnion('type', [
    z.object({ type: z.literal('create'), data: z.any() }),
    z.object({ type: z.literal('delete'), id: z.string() }),
  ])
})
```

### Arrays and Objects

```typescript
z.object({
  // Array with constraints
  tags: z.array(z.string()).min(1).max(10),
  
  // Nested objects
  author: z.object({
    name: z.string(),
    email: z.string().email()
  }),
  
  // Record (dynamic keys)
  metadata: z.record(z.string(), z.any())
})
```

### Transformations

```typescript
z.object({
  // Transform on parse
  date: z.string().transform(s => new Date(s)),
  
  // Coerce types
  count: z.coerce.number(),  // '5' -> 5
  
  // Preprocess
  email: z.preprocess(
    val => typeof val === 'string' ? val.toLowerCase().trim() : val,
    z.string().email()
  )
})
```

### Custom Validation

```typescript
z.object({
  // Custom refinement
  password: z.string().refine(
    pw => pw.length >= 8 && /[A-Z]/.test(pw),
    { message: 'Password must be 8+ chars with uppercase' }
  ),
  
  // Async validation
  username: z.string().refine(
    async (name) => !(await isUsernameTaken(name)),
    { message: 'Username already taken' }
  )
})
```

## Error Messages

Validation failures become structured `ValidationError`:

```typescript
const schema = z.object({
  email: z.string().email('Invalid email format'),
  age: z.number().min(18, 'Must be 18 or older')
})

validate(schema, { email: 'bad', age: 15 })
// Throws: ValidationError
// {
//   code: -32602,
//   message: "Validation failed for 'email': Invalid email format",
//   data: { field: "email", reason: "Invalid email format", value: "bad" }
// }
```

## Type Inference

Get TypeScript types from schemas:

```typescript
import { z, type Infer } from '@openconductor/mcp-sdk'

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email()
})

type User = Infer<typeof UserSchema>
// { id: string; name: string; email: string }
```

## Best Practices

**DO:**
- Use `.default()` for optional params with sensible defaults
- Validate at the boundary (in `validateInput` wrappers)
- Use built-in `schemas.*` for common patterns
- Add custom error messages for user-facing fields

**DON'T:**
- Over-validate internal data
- Use `.passthrough()` without good reason
- Forget to handle `undefined` vs `null`
