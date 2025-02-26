// app/api/sheets/[sheetId]/[sheetName]/[startRow]/[endRow]/[propertyName]/route.js
import googleService from "@/lib/services/googleService";

function getColumnLetter(columnIndex) {
  let letter = "";
  columnIndex++;
  while (columnIndex > 0) {
    columnIndex--;
    letter = String.fromCharCode(65 + (columnIndex % 26)) + letter;
    columnIndex = Math.floor(columnIndex / 26);
  }
  return letter;
}

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { sheetId, sheetName, startRow, endRow, propertyName } =
      resolvedParams;

    const headers = await googleService.getSheetData(
      sheetId,
      `${sheetName}!A2:CZ2`
    );
    if (!headers?.[0]) throw new Error("No headers found");

    const columnIndex = headers[0].findIndex((h) => h === propertyName);
    if (columnIndex === -1) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Property ${propertyName} not found in headers`,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const columnLetter = getColumnLetter(columnIndex);
    const range = `${sheetName}!${columnLetter}${startRow}:${columnLetter}${endRow}`;

    const ownerRange = `${sheetName}!${columnLetter}1:${columnLetter}1`;
    const ownerRow = await googleService.getSheetData(sheetId, ownerRange);
    const ownersName = ownerRow?.[0]?.[0] || "Unknown Owner";

    const values = await googleService.getSheetData(sheetId, range);

    return new Response(
      JSON.stringify({
        success: true,
        values: values.map((row) => row[0]),
        ownersName,
        range,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Route error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
