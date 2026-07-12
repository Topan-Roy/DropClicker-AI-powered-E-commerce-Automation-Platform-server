import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import ApiError from "@utils/ApiError";

type ValidationSource = "body" | "params" | "query";

/**
 * Zod validation middleware factory.
 *
 * Returns an Express middleware that validates the specified part of the request
 * against the provided Zod schema. If validation fails, it throws a structured
 * 422 ApiError with field-level error messages.
 *
 * If validation passes, it REPLACES the source with the parsed + coerced data
 * (e.g. Zod can trim strings, convert types, apply defaults).
 *
 * Usage on a route:
 *   router.post('/register',
 *     validate(registerSchema),           // validates req.body
 *     asyncHandler(authController.register)
 *   )
 *
 *   router.get('/verify/:token',
 *     validate(tokenParamSchema, 'params'), // validates req.params
 *     asyncHandler(authController.verifyEmail)
 *   )
 */
const validate = (
  schema: ZodSchema,
  source: ValidationSource = "body"
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      // Map Zod errors to our field:message format
      const errors = (result.error as ZodError).issues.map((err) => ({
        field: (err.path as (string | number)[]).join("."),
        message: err.message,
      }));

      return next(
        ApiError.unprocessable("Validation failed", errors)
      );
    }

    // Replace source with parsed data (includes Zod transformations & defaults)
    (req as unknown as Record<string, unknown>)[source] = result.data;

    next();
  };
};

export default validate;
