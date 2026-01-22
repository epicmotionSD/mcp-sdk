import { ZodSchema, ZodError, z } from 'zod';
export { ZodError, ZodSchema, ZodTypeDef, z } from 'zod';

/**
 * Options for input validation
 */
interface ValidateOptions {
    /** Strip unknown keys from objects (default: true) */
    stripUnknown?: boolean;
    /** Custom error formatter */
    formatError?: (error: ZodError) => string;
}
/**
 * Validates input against a Zod schema
 * Throws ValidationError on failure with detailed field info
 */
declare function validate<T>(schema: ZodSchema<T>, input: unknown, options?: ValidateOptions): T;
/**
 * Creates a validated tool handler
 * Wraps your handler function with automatic input validation
 */
declare function validateInput<TInput, TOutput>(schema: ZodSchema<TInput>, handler: (input: TInput) => TOutput | Promise<TOutput>, options?: ValidateOptions): (input: unknown) => Promise<TOutput>;
/**
 * Common schema patterns for MCP tools
 */
declare const schemas: {
    /** Non-empty string */
    nonEmptyString: z.ZodString;
    /** Positive integer */
    positiveInt: z.ZodNumber;
    /** Pagination limit (1-100, default 10) */
    limit: z.ZodDefault<z.ZodNumber>;
    /** Pagination offset (>= 0, default 0) */
    offset: z.ZodDefault<z.ZodNumber>;
    /** URL string */
    url: z.ZodString;
    /** Email string */
    email: z.ZodString;
    /** UUID string */
    uuid: z.ZodString;
    /** ISO date string */
    isoDate: z.ZodString;
    /** Boolean with string coercion ('true'/'false' -> boolean) */
    booleanish: z.ZodUnion<[z.ZodBoolean, z.ZodEffects<z.ZodEnum<["true", "false"]>, boolean, "true" | "false">]>;
};
/**
 * Type helper to infer schema type
 */
type Infer<T extends ZodSchema> = z.infer<T>;

export { type Infer, type ValidateOptions, schemas, validate, validateInput };
