"use client"

interface Props {
    url: string | undefined
    className?: string
}

/**
 * Converts YouTube/Vimeo watch URLs to embeddable iframe src.
 * Returns null for unsupported or malformed URLs.
 * Spec: "YT and Vimeo oEmbed (show inline in challenges/submissions)"
 */
function toEmbedUrl(url: string): string | null {
    try {
        const parsed = new URL(url)

        // YouTube: youtube.com/watch?v=ID or youtu.be/ID
        if (parsed.hostname.includes("youtube.com")) {
            const id = parsed.searchParams.get("v")
            if (id) return `https://www.youtube.com/embed/${id}`
        }
        if (parsed.hostname === "youtu.be") {
            const id = parsed.pathname.slice(1)
            if (id) return `https://www.youtube.com/embed/${id}`
        }

        // Vimeo: vimeo.com/ID
        if (parsed.hostname.includes("vimeo.com")) {
            const id = parsed.pathname.split("/").filter(Boolean)[0]
            if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`
        }

        return null
    } catch {
        return null
    }
}

export function VideoEmbed({ url, className }: Props) {
    if (!url) return null

    const embedSrc = toEmbedUrl(url)

    if (!embedSrc) {
        // Unsupported URL — fall back to a plain link
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-primary underline"
            >
                Watch demo video ↗
            </a>
        )
    }

    return (
        <div className={`relative w-full aspect-video rounded-card overflow-hidden ${className ?? ""}`}>
            <iframe
                src={embedSrc}
                title="Demo video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
            />
        </div>
    )
}
