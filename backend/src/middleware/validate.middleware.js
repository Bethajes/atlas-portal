const { z } = require('zod');

/**
 * @desc    Request Validation Middleware using Zod
 * @param   {import('zod').ZodSchema} schema - Zod schema object
 */
const validate = (schema) => (req, res, next) => {
  try {
    // Validate request body
    const validatedData = schema.parse(req.body);
    // Replace req.body with validated and sanitized data
    req.body = validatedData;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      
      return res.status(400).json({
        success: false,
        message,
        errors: error.errors,
      });
    }
    next(error);
  }
};

module.exports = validate;
