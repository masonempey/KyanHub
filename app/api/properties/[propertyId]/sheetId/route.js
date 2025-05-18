import { NextResponse } from "next/server";
import PropertyService from "@/lib/services/propertyService";
import { auth } from "@/lib/firebase/admin";

export async function GET(request, { params }) {
  try {
    // Verify authentication
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      await auth.verifyIdToken(token);
    } catch (authError) {
      console.error("Token verification failed:", authError);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { propertyId } = params;
    console.log(`Getting sheet ID for property: ${propertyId}`);

    try {
      const sheetId = await PropertyService.getClientSheetID(propertyId);
      return NextResponse.json({ success: true, sheetId });
    } catch (error) {
      console.error(`Error getting sheet ID: ${error.message}`);
      return NextResponse.json({
        success: false,
        error: error.message,
        sheetId: null,
      });
    }
  } catch (error) {
    console.error("Error in sheetId endpoint:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
