// app/api/sheets/revenue/route.js
import { NextResponse } from "next/server";
import googleService from "@/lib/services/googleService";

const SHEET_LAYOUTS = {
  "Kyan Owned Properties": {
    revenueColumn: "H",
    cleaningColumn: "E",
    rightSideStart: "L",
    rightSideEnd: "P",
  },
  colours_1306: {
    revenueColumn: "B",
    cleaningColumn: "C",
    rightSideStart: "K",
    rightSideEnd: "O",
  },
  default: {
    revenueColumn: "B",
    cleaningColumn: "C",
    rightSideStart: "J",
    rightSideEnd: "N",
  },
};

const getSheetLayout = (propertyName) => {
  if (["Era 1102", "Colours 1904", "Colours 1709"].includes(propertyName))
    return SHEET_LAYOUTS["Kyan Owned Properties"];
  if (propertyName === "Colours 1306") return SHEET_LAYOUTS.colours_1306;
  return SHEET_LAYOUTS.default;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export async function PUT(request) {
  try {
    console.log("Starting revenue update...");
    await googleService.init();
    const { propertyName, bookings, year, monthName } = await request.json();
    console.log("Request body:", { propertyName, bookings, year, monthName });

    console.log("Fetching all Drive files to find spreadsheet...");
    const sheetResponse = await googleService.drive.files.list({
      fields: "files(id, name, mimeType)",
    });

    if (!sheetResponse?.data) {
      console.log("No data returned from Drive API");
      throw new Error("Drive API returned no data");
    }

    if (!sheetResponse.data.files) {
      console.log("No 'files' property in response");
      throw new Error("Drive API response missing 'files' property");
    }

    // Log all spreadsheets for debugging
    const allSpreadsheets = sheetResponse.data.files.filter(
      (file) => file.mimeType === "application/vnd.google-apps.spreadsheet"
    );
    console.log(
      "All spreadsheets found:",
      allSpreadsheets.map((file) => ({
        name: file.name,
        id: file.id,
      }))
    );

    // Filter for sheets containing the full propertyName
    const spreadsheets = allSpreadsheets.filter((file) =>
      file.name.toLowerCase().includes(propertyName.toLowerCase())
    );

    if (spreadsheets.length === 0) {
      console.log(`No spreadsheets found containing '${propertyName}'`);
      throw new Error(`No spreadsheet found containing '${propertyName}'`);
    } else {
      console.log(
        `Spreadsheet found: ${spreadsheets[0].name} (ID: ${spreadsheets[0].id})`
      );
    }

    const sheetId = spreadsheets[0].id;
    const sheetNameResult = spreadsheets[0].name;
    const sheetName = "revenue";
    console.log(`Processing sheet: ${sheetNameResult} (ID: ${sheetId})`);

    const layout = getSheetLayout(propertyName);
    const columnData = await googleService.getSheetData(
      sheetId,
      `${sheetName}!A:A`
    );
    console.log("Column A data:", columnData);

    const yearRowIndex = columnData.findIndex(
      (row) => row[0] && row[0].toString() === year
    );
    if (yearRowIndex === -1) throw new Error(`Year ${year} not found`);

    const monthRowIndex = columnData
      .slice(yearRowIndex)
      .findIndex(
        (row) =>
          row[0] && row[0].toString().toLowerCase() === monthName.toLowerCase()
      );
    if (monthRowIndex === -1)
      throw new Error(`Month ${monthName} not found after year ${year}`);

    const actualRowIndex = yearRowIndex + monthRowIndex + 1;
    console.log("Updating row:", actualRowIndex);

    const monthNum = (monthNames.indexOf(monthName) + 1).toString();
    const monthYearKey = `${year}-${monthNum}`;

    const monthTotal = bookings.reduce((sum, booking) => {
      const revenue = booking.revenueByMonth[monthYearKey] || 0;
      return sum + revenue;
    }, 0);

    const cleaningTotal = bookings.reduce((sum, booking) => {
      const cleaning =
        booking.cleaningFeeMonth === monthYearKey ? booking.cleaningFee : 0;
      return sum + cleaning;
    }, 0);

    console.log("Updating values:", { monthTotal, cleaningTotal });
    await googleService.updateSheetValues(sheetId, sheetName, [
      { range: `${layout.revenueColumn}${actualRowIndex}`, value: monthTotal },
      {
        range: `${layout.cleaningColumn}${actualRowIndex}`,
        value: cleaningTotal,
      },
    ]);

    const rightSideData = await googleService.getSheetData(
      sheetId,
      `${sheetName}!${layout.rightSideStart}:${layout.rightSideEnd}`
    );
    console.log("Right side data:", rightSideData);

    const newBookings = bookings.filter((booking) => {
      return !rightSideData.some((row) => {
        if (!row || !row[0]) return false;
        const rowMonth = String(row[0]);
        const rowName = String(row[1] || "");
        return (
          rowMonth.toLowerCase() === monthName.toLowerCase() &&
          rowName.toLowerCase() === booking.guestName.toLowerCase()
        );
      });
    });

    if (newBookings.length > 0) {
      const firstEmptyRow = rightSideData.length + 1;
      const bookingRows = newBookings.map((booking, index) => ({
        values: [
          monthName,
          booking.guestName,
          booking.revenueByMonth[monthYearKey] || 0,
          booking.cleaningFeeMonth === monthYearKey ? booking.cleaningFee : "",
          booking.platform,
        ],
        row: firstEmptyRow + index,
      }));

      for (const row of bookingRows) {
        const range = `${layout.rightSideStart}${row.row}:${layout.rightSideEnd}${row.row}`;
        console.log("Updating range:", range, "with values:", row.values);
        await googleService.updateRangeValues(sheetId, sheetName, range, [
          row.values,
        ]);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated revenue sheet for ${propertyName} - ${monthName} ${year}`,
    });
  } catch (error) {
    console.error("Sheet update error:", error.message, {
      stack: error.stack,
      apiErrors: error.errors || "No API errors provided",
      response: error.response ? error.response.data : "No response data",
    });
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
