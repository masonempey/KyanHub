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

// app/api/sheets/revenue/route.js
export async function PUT(request) {
  try {
    await googleService.init();
    const { propertyName, bookings, year, monthName } = await request.json();

    const sheetQuery = `${propertyName} mimeType='application/vnd.google-apps.spreadsheet'`;
    console.log("Searching Drive with query:", sheetQuery);
    const sheetResponse = await googleService.drive.files.list({
      q: sheetQuery,
      fields: "files(id, name)",
    });

    if (!sheetResponse?.data?.files) {
      throw new Error("Invalid Drive API response: No files data returned");
    }
    if (!sheetResponse.data.files.length) {
      throw new Error(`No spreadsheet found containing '${propertyName}'`);
    }

    const sheetId = sheetResponse.data.files[0].id;
    const sheetNameResult = sheetResponse.data.files[0].name;
    const sheetName = "revenue";
    console.log(`Found sheet: ${sheetNameResult} (ID: ${sheetId})`);

    const layout = getSheetLayout(propertyName);
    const columnData = await googleService.getSheetData(
      sheetId,
      `${sheetName}!A:A`
    );

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
        console.log(
          "Updating range:",
          `${layout.rightSideStart}${row.row}:${layout.rightSideEnd}${row.row}`,
          row.values
        );
        await googleService.updateRangeValues(
          sheetId,
          sheetName,
          `${layout.rightSideStart}${row.row}:${layout.rightSideEnd}${row.row}`,
          [row.values]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated revenue sheet for ${propertyName} - ${monthName} ${year}`,
    });
  } catch (error) {
    console.error(
      "Sheet update error:",
      error,
      error.errors ? error.errors : "No detailed errors"
    );
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
