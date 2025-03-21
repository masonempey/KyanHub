// app/api/sheets/revenue/route.js (unchanged from last numeric version)
import { NextResponse } from "next/server";
import googleService from "@/lib/services/googleService";
import PropertyService from "@/lib/services/propertyService";
import EmailService from "@/lib/services/emailService";

const SHEET_LAYOUTS = {
  "Kyan Owned Properties": {
    revenueColumn: "H",
    cleaningColumn: "E",
    rightSideStart: "L",
    rightSideEnd: "Q",
  },
  colours_1306: {
    revenueColumn: "B",
    cleaningColumn: "C",
    rightSideStart: "K",
    rightSideEnd: "P",
  },
  "Windsor Town Homes": {
    revenueColumn: "I",
    cleaningColumn: "F",
    rightSideStart: "M",
    rightSideEnd: "R",
  },
  "Windsor 5119": {
    revenueColumn: "H",
    cleaningColumn: "E",
    rightSideStart: "L",
    rightSideEnd: "Q",
  },
  default: {
    revenueColumn: "B",
    cleaningColumn: "C",
    rightSideStart: "J",
    rightSideEnd: "O",
  },
};

const getSheetLayout = (propertyName) => {
  if (["Era 1102", "Colours - 1904", "Colours 1709"].includes(propertyName))
    return SHEET_LAYOUTS["Kyan Owned Properties"];

  if (propertyName === "Colours 1306") return SHEET_LAYOUTS.colours_1306;

  if (
    [
      "Windsor 95 - 703",
      "Windsor 96 - 5503",
      "Windsor 97 - 5505",
      "Windsor 98 - 5507",
    ].includes(propertyName)
  )
    return SHEET_LAYOUTS["Windsor Town Homes"];

  if (propertyName === "Windsor 5119") return SHEET_LAYOUTS["Windsor 5119"];

  return SHEET_LAYOUTS.default;
};

const getSheetName = (propertyName, layout) => {
  if (layout === SHEET_LAYOUTS["Windsor Town Homes"]) {
    return propertyName;
  }
  return "revenue";
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

    const { propertyId, propertyName, bookings, year, monthName } =
      await request.json();
    console.log("Request body:", {
      propertyId,
      propertyName,
      bookings,
      year,
      monthName,
    });

    console.log(
      "Booking Codes:",
      bookings.map((booking) => booking.bookingCode)
    );

    // Get the Google Sheet ID directly from the database instead of searching
    const sheetId = await PropertyService.getClientSheetID(propertyId);

    if (!sheetId) {
      const errorMsg = `No Google Sheet ID found for property: ${propertyName} (ID: ${propertyId})`;
      console.error(errorMsg);
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 404 }
      );
    }

    console.log(`Using sheet ID ${sheetId} for property ${propertyName}`);

    // Get sheet metadata to confirm it exists and get the actual name
    const sheetMetadata = await googleService.sheets.spreadsheets.get({
      spreadsheetId: sheetId,
      fields: "properties.title,sheets.properties.title",
    });

    const sheetNameResult = sheetMetadata.data.properties.title;
    console.log(`Processing sheet: ${sheetNameResult} (ID: ${sheetId})`);

    // Continue with your existing code for updating the sheet
    const layout = getSheetLayout(propertyName);
    const sheetName = getSheetName(propertyName, layout);
    console.log("Using layout:", layout);
    console.log("Using sheet name:", sheetName);

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

    const monthTotal = Number(
      bookings
        .reduce((sum, booking) => {
          const revenue = booking.revenueByMonth[monthYearKey] || 0;
          return sum + revenue;
        }, 0)
        .toFixed(2)
    );
    const monthTotalFormatted = monthTotal === 0 ? "" : `$${monthTotal}`;

    const cleaningTotal = Number(
      bookings
        .reduce((sum, booking) => {
          const cleaning =
            booking.cleaningFeeMonth === monthYearKey ? booking.cleaningFee : 0;
          return sum + cleaning;
        }, 0)
        .toFixed(2)
    );
    const cleaningTotalFormatted =
      cleaningTotal === 0 ? "" : `$${cleaningTotal}`;

    console.log("Updating values:", {
      monthTotal: monthTotalFormatted,
      cleaningTotal: cleaningTotalFormatted,
    });
    await googleService.updateSheetValues(sheetId, sheetName, [
      {
        range: `${layout.revenueColumn}${actualRowIndex}`,
        value: monthTotalFormatted,
      },
      {
        range: `${layout.cleaningColumn}${actualRowIndex}`,
        value: cleaningTotalFormatted,
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
        const rowBookingCode = String(row[4] || "");
        return (
          (rowMonth.toLowerCase() === monthName.toLowerCase() &&
            rowName.toLowerCase() === booking.guestName.toLowerCase()) ||
          (rowBookingCode && rowBookingCode === booking.bookingCode)
        );
      });
    });

    if (newBookings.length > 0) {
      const firstEmptyRow = rightSideData.length + 1;
      const bookingRows = newBookings.map((booking, index) => {
        const revenue = Number(
          booking.revenueByMonth[monthYearKey] || 0
        ).toFixed(2);
        const cleaning =
          booking.cleaningFeeMonth === monthYearKey
            ? Number(booking.cleaningFee).toFixed(2)
            : "";
        return {
          values: [
            monthName,
            booking.guestName,
            revenue === "0.00" ? "" : `$${revenue}`,
            cleaning === "0.00" ? "" : cleaning ? `$${cleaning}` : "",
            booking.platform,
            booking.bookingCode || "",
          ],
          row: firstEmptyRow + index,
        };
      });

      for (const row of bookingRows) {
        const range = `${layout.rightSideStart}${row.row}:${layout.rightSideEnd}${row.row}`;
        console.log("Updating range:", range, "with values:", row.values);
        await googleService.updateRangeValues(sheetId, sheetName, range, [
          row.values,
        ]);
      }
    }

    EmailService.sendEmail({
      to: "mason@kyanproperties.com",
      subject: "Test Email",
      message: "This is a test email",
      buttonText: "Click me",
      buttonUrl: "https://kyanhub.com",
    });

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
