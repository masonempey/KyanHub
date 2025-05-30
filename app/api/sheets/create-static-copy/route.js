import { NextResponse } from "next/server";
import googleService from "@/lib/services/googleService";

export async function POST(request) {
  try {
    // Parse request body
    const { sourceSheetId, propertyName, month, year } = await request.json();

    if (!sourceSheetId) {
      return NextResponse.json(
        {
          success: false,
          error: "Source sheet ID is required",
        },
        { status: 400 }
      );
    }

    // Initialize Google service (correct way)
    await googleService.init();

    // Create the static copy
    const result = await googleService.createStaticSheetCopy(
      sourceSheetId,
      propertyName,
      month,
      year
    );

    return NextResponse.json({
      success: true,
      sheetUrl: result.webViewLink,
    });
  } catch (error) {
    console.error("Error creating static sheet copy:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
