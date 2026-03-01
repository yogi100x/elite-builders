export const ALLOWED_UPLOAD_MIME_TYPES = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/zip",
] as const;

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const DIFFICULTY_LABELS: Record<string, string> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    expert: "Expert",
};

export const DIFFICULTY_COLORS: Record<string, string> = {
    beginner: "bg-green-100 text-green-800",
    intermediate: "bg-blue-100 text-blue-800",
    advanced: "bg-orange-100 text-orange-800",
    expert: "bg-red-100 text-red-800",
};

export const STATUS_LABELS: Record<string, string> = {
    "in-review": "In Review",
    awarded: "Awarded",
    "not-selected": "Not Selected",
};

export const BADGE_COLORS: Record<number, string> = {
    1: "#10B981", // emerald — level 1
    2: "#2563EB", // blue — level 2
    3: "#F59E0B", // amber — level 3
    4: "hsl(258 90% 66%)", // achievement purple — level 4
    5: "#EF4444", // red — elite level 5
};

export const ONBOARDING_BADGE = {
    name: "First Build",
    color: "#10B981",
    level: 1,
} as const;
