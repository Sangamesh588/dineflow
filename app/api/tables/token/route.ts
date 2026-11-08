import { NextResponse } from "next/server";
import { resolveTableToken } from "@/lib/tables/token";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantSlug = searchParams.get("slug");
  const tableToken = searchParams.get("token");

  if (!restaurantSlug || !tableToken) {
    return NextResponse.json(
      { error: "Missing required parameters: slug and token" },
      { status: 400 }
    );
  }

  const result = await resolveTableToken(restaurantSlug, tableToken);
  return NextResponse.json(result);
}
