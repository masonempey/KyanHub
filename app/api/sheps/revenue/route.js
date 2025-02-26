// app/api/sheets/[sheetId]/[sheetName]/columnA/route.js
import googleService from "@/lib/services/googleService";

export async function GET(request, { params }) {
  try {
    const { sheetId, sheetName } = params;
    const range = `${sheetName}!A:C`;
    const sheetData = await googleService.getSheetData(sheetId, range);

    const excludeValues = [
      "Monthly Sum",
      "Products",
      "Real Price Per",
      "Price per Unit",
    ];
    const filteredData = sheetData
      .filter((row) => row.length > 0 && row[0])
      .filter((row) => !excludeValues.includes(row[0]));

    const columnA = filteredData.map((row) => row[0]);
    const columnC = filteredData.map((row) => row[2] || "");

    console.log("Rates:", columnC);

    return new Response(
      JSON.stringify({ success: true, sheetName, columnA, rates: columnC }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
