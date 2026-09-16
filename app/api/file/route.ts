import { type NextRequest, NextResponse } from "next/server"
import { get } from "@vercel/blob"

export async function GET(request: NextRequest) {
  try {
    const pathname = request.nextUrl.searchParams.get("pathname")
    const download = request.nextUrl.searchParams.get("download")
    if (!pathname) {
      return NextResponse.json({ error: "Saknar pathname" }, { status: 400 })
    }

    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    })

    if (!result) {
      return new NextResponse("Hittades inte", { status: 404 })
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "private, no-cache",
        },
      })
    }

    const headers: Record<string, string> = {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      ETag: result.blob.etag,
      "Cache-Control": "private, no-cache",
    }
    if (download) {
      const name = pathname.split("/").pop() || "download"
      headers["Content-Disposition"] = `attachment; filename="${name.replace(/"/g, "")}"`
    }

    return new NextResponse(result.stream, { headers })
  } catch (error) {
    console.error("[v0] Error serving file:", error)
    return NextResponse.json({ error: "Kunde inte hämta filen" }, { status: 500 })
  }
}
