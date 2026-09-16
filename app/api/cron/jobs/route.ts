import type { NextRequest } from "next/server"
import { syncJobOffers } from "@/lib/job-sync"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    return Response.json(await syncJobOffers())
  } catch (error) {
    console.error("[v0] Daily job sync failed:", error)
    return Response.json({ error: "Jobbsynken misslyckades" }, { status: 500 })
  }
}
