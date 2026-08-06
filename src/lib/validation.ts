import { DateTime } from "luxon";
import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(320, "Email is too long.");

const password = z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .max(72, "Password must contain at most 72 characters.");

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(100, "Name must contain at most 100 characters."),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required.").max(72),
});

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(32, "The verification link is invalid.").max(200),
});

export const createBookingSchema = z.object({
  roomId: z.string().uuid("Choose a valid meeting room."),
  title: z
    .string()
    .trim()
    .min(1, "Booking title is required.")
    .max(100, "Booking title must contain at most 100 characters."),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  recurrence: z
    .object({
      kind: z.literal("weekly"),
      count: z.number().int().min(2).max(12),
    })
    .optional(),
});

export const bookingRangeSchema = z.object({
  roomId: z.string().uuid(),
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});

const officeDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid office date.")
  .refine((value) => DateTime.fromISO(value).isValid, "Choose a valid office date.");

const officeSlotTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):(00|30)$/, "Choose a 30-minute start time.");

export const availabilitySearchSchema = z.object({
  date: officeDate,
  startTime: officeSlotTime,
  durationMinutes: z.coerce
    .number()
    .int()
    .min(30)
    .max(240)
    .refine((value) => value % 30 === 0, "Choose a duration in 30-minute steps."),
  minCapacity: z.coerce.number().int().min(1).max(100),
});
