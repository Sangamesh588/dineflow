import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/invite";
  if (token) {
    redirectUrl.searchParams.set("token", token);
  }
  return NextResponse.redirect(redirectUrl);
}
