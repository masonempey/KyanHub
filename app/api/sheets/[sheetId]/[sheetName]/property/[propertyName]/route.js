// app/api/sheets/[sheetId]/[sheetName]/[propertyName]/route.js
import googleService from "@/lib/services/googleService";

export async function PUT(request, { params }) {
  try {
    const { sheetId, sheetName, propertyName } = params;
    const { values } = await request.json();

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

    const nonZeroUpdates = values
      .slice(1)
      .map((value, index) => ({ value, index }))
      .filter((item) => item.value !== 0);

    console.log("Updating non-zero values:", {
      propertyName,
      updates: nonZeroUpdates,
    });

    await googleService.updateNonZeroValues(
      sheetId,
      sheetName,
      columnIndex,
      3,
      nonZeroUpdates
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated values for ${propertyName}`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Update error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
