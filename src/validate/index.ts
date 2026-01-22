import { z, ZodError, type ZodSchema, type ZodTypeDef, type SafeParseReturnType } from 'zod'
import { ValidationError } from '../errors'

// Re-export zod for convenience
export { z, ZodError, type ZodSchema }
export type { ZodTypeDef }

/**
 * Options for input validation
 */
export interface ValidateOptions {
  /** Strip unknown keys from objects (default: true) */
  stripUnknown?: boolean
  /** Custom error formatter */
  formatError?: (error: ZodError) => string
}

/**
 * Validates input against a Zod schema
 * Throws ValidationError on failure with detailed field info
 */
export function validate<T>(
  schema: ZodSchema<T>,
  input: unknown,
  options: ValidateOptions = {}
): T {
  const { stripUnknown = true } = options

  const result = (
    stripUnknown
      ? schema.safeParse(input)
      : schema instanceof z.ZodObject
        ? schema.strict().safeParse(input)
        : schema.safeParse(input)
  ) as SafeParseReturnType<unknown, T>

  if (!result.success) {
    const firstError = result.error.errors[0]
    const field = firstError.path.join('.') || 'input'
    const reason = firstError.message
    throw new ValidationError(field, reason, firstError.path.length > 0 
      ? getNestedValue(input, firstError.path) 
      : input
    )
  }

  return result.data
}

/**
 * Creates a validated tool handler
 * Wraps your handler function with automatic input validation
 */
export function validateInput<TInput, TOutput>(
  schema: ZodSchema<TInput>,
  handler: (input: TInput) => TOutput | Promise<TOutput>,
  options: ValidateOptions = {}
): (input: unknown) => Promise<TOutput> {
  return async (input: unknown) => {
    const validated = validate(schema, input, options)
    return handler(validated)
  }
}


/**
 * Helper to extract nested value from object by path
 */
function getNestedValue(obj: unknown, path: (string | number)[]): unknown {
  let current = obj
  for (const key of path) {
    if (current === null || current === undefined) return undefined
    current = (current as Record<string | number, unknown>)[key]
  }
  return current
}

/**
 * Common schema patterns for MCP tools
 */
export const schemas = {
  /** Non-empty string */
  nonEmptyString: z.string().min(1, 'Cannot be empty'),
  
  /** Positive integer */
  positiveInt: z.number().int().positive(),
  
  /** Pagination limit (1-100, default 10) */
  limit: z.number().int().min(1).max(100).default(10),
  
  /** Pagination offset (>= 0, default 0) */
  offset: z.number().int().min(0).default(0),
  
  /** URL string */
  url: z.string().url(),
  
  /** Email string */
  email: z.string().email(),
  
  /** UUID string */
  uuid: z.string().uuid(),
  
  /** ISO date string */
  isoDate: z.string().datetime(),
  
  /** Boolean with string coercion ('true'/'false' -> boolean) */
  booleanish: z.union([
    z.boolean(),
    z.enum(['true', 'false']).transform(v => v === 'true'),
  ]),
}

/**
 * Type helper to infer schema type
 */
export type Infer<T extends ZodSchema> = z.infer<T>
