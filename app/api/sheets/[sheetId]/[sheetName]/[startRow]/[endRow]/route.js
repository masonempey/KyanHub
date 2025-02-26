// app/api/sheets/[sheetId]/[sheetName]/[startRow]/[endRow]/route.js
import googleService from "@/lib/services/googleService";

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { sheetId, sheetName, startRow, endRow } = resolvedParams;
    const start = parseInt(startRow);
    const end = parseInt(endRow);
    const range = `${sheetName}!A${start}:CZ${end}`;

    const sheetData = await googleService.getSheetData(sheetId, range);

    return new Response(
      JSON.stringify({ success: true, sheetName, range, data: sheetData }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
