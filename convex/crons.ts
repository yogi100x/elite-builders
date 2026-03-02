import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

crons.weekly(
    "weekly-digest",
    { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 0 },
    internal.email.processWeeklyDigest,
)

export default crons
