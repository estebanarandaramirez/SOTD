import { NextResponse } from "next/server";
import { appleAppSiteAssociation } from "@/lib/aasa";

export function GET() {
  return NextResponse.json(appleAppSiteAssociation);
}
