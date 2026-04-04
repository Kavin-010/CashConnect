import rateLimit from "express-rate-limit";

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    errors: [{ message: "Too many requests. Please try again after 15 minutes." }],
  },
});