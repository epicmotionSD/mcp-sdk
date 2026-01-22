'use strict';

var zod = require('zod');

// src/validate/index.ts

// src/errors/codes.ts
var ErrorCodes = {
  INVALID_PARAMS: -32602};

// src/errors/index.ts
var MCPError = class extends Error {
  code;
  data;
  constructor(code, message, data) {
    super(message);
    this.name = "MCPError";
    this.code = code;
    this.data = data;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  /**
   * Returns JSON-RPC 2.0 formatted error object
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...this.data && { data: this.data }
    };
  }
  /**
   * Create error response for JSON-RPC
   */
  toResponse(id = null) {
    return {
      jsonrpc: "2.0",
      id,
      error: this.toJSON()
    };
  }
};
var ValidationError = class extends MCPError {
  constructor(field, reason, value) {
    super(ErrorCodes.INVALID_PARAMS, `Validation failed for '${field}': ${reason}`, {
      field,
      reason,
      ...value !== void 0 && { value }
    });
    this.name = "ValidationError";
  }
};

// src/validate/index.ts
function validate(schema, input, options = {}) {
  const { stripUnknown = true } = options;
  const result = stripUnknown ? schema.safeParse(input) : schema instanceof zod.z.ZodObject ? schema.strict().safeParse(input) : schema.safeParse(input);
  if (!result.success) {
    const firstError = result.error.errors[0];
    const field = firstError.path.join(".") || "input";
    const reason = firstError.message;
    throw new ValidationError(
      field,
      reason,
      firstError.path.length > 0 ? getNestedValue(input, firstError.path) : input
    );
  }
  return result.data;
}
function validateInput(schema, handler, options = {}) {
  return async (input) => {
    const validated = validate(schema, input, options);
    return handler(validated);
  };
}
function getNestedValue(obj, path) {
  let current = obj;
  for (const key of path) {
    if (current === null || current === void 0) return void 0;
    current = current[key];
  }
  return current;
}
var schemas = {
  /** Non-empty string */
  nonEmptyString: zod.z.string().min(1, "Cannot be empty"),
  /** Positive integer */
  positiveInt: zod.z.number().int().positive(),
  /** Pagination limit (1-100, default 10) */
  limit: zod.z.number().int().min(1).max(100).default(10),
  /** Pagination offset (>= 0, default 0) */
  offset: zod.z.number().int().min(0).default(0),
  /** URL string */
  url: zod.z.string().url(),
  /** Email string */
  email: zod.z.string().email(),
  /** UUID string */
  uuid: zod.z.string().uuid(),
  /** ISO date string */
  isoDate: zod.z.string().datetime(),
  /** Boolean with string coercion ('true'/'false' -> boolean) */
  booleanish: zod.z.union([
    zod.z.boolean(),
    zod.z.enum(["true", "false"]).transform((v) => v === "true")
  ])
};

Object.defineProperty(exports, "ZodError", {
  enumerable: true,
  get: function () { return zod.ZodError; }
});
Object.defineProperty(exports, "z", {
  enumerable: true,
  get: function () { return zod.z; }
});
exports.schemas = schemas;
exports.validate = validate;
exports.validateInput = validateInput;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map