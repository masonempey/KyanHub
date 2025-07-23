// app/api/sheets/revenue/route.js (unchanged from last numeric version)
import { NextResponse } from "next/server";
import googleService from "@/lib/services/googleService";
import PropertyService from "@/lib/services/propertyService";
import MonthEndService from "@/lib/services/monthEndService";
import UserService from "@/lib/services/userService";

const SHEET_LAYOUTS = {
  "Kyan Owned Properties": {
    revenueColumn: "H",
    cleaningColumn: "E",
    expensesColumn: "I",
    rightSideStart: "L",
    rightSideEnd: "Q",
  },
  colours_1306: {
    revenueColumn: "B",
    cleaningColumn: "C",
    expensesColumn: "F",
    rightSideStart: "K",
    rightSideEnd: "P",
  },
  "Windsor Town Homes": {
    revenueColumn: "I",
    cleaningColumn: "F",
    expensesColumn: "J",
    rightSideStart: "M",
    rightSideEnd: "R",
  },
  "Windsor Combos": {
    revenueColumn: "C",
    cleaningColumn: "B",
    rightSideStart: "F",
    rightSideEnd: "K",
  },
  "Windsor 5119": {
    revenueColumn: "H",
    cleaningColumn: "E",
    expensesColumn: "I",
    rightSideStart: "L",
    rightSideEnd: "Q",
  },
  default: {
    revenueColumn: "B",
    cleaningColumn: "C",
    expensesColumn: "E",
    rightSideStart: "J",
    rightSideEnd: "O",
  },
};

const getSheetLayout = (propertyName) => {
  const trimmedPropertyName = propertyName.trim();

  if (
    ["Era 1102", "Colours - 1904", "Colours 1709"].includes(trimmedPropertyName)
  )
    return SHEET_LAYOUTS["Kyan Owned Properties"];

  if (trimmedPropertyName === "Colours - 1306")
    return SHEET_LAYOUTS.colours_1306;

  if (
    [
      "Windsor 95 - 703",
      "Windsor 96 - 5503",
      "Windsor 97 - 5505",
      "Windsor 98 - 5507",
    ].includes(trimmedPropertyName)
  )
    return SHEET_LAYOUTS["Windsor Town Homes"];

  if (
    ["Windsor 95/96 Combo", "Windsor 97/98 Combo"].includes(trimmedPropertyName)
  )
    return SHEET_LAYOUTS["Windsor Combos"];

  if (trimmedPropertyName === "Windsor Park - 5119")
    return SHEET_LAYOUTS["Windsor 5119"];

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
    console.log("====== REVENUE UPDATE ROUTE CALLED ======");
    console.log("Starting revenue update...");

    // Initialize Google API
    await googleService.init();
    console.log("Google API initialized with valid credentials");

    // Parse the request body
    const requestBody = await request.json();
    const propertyData = Array.isArray(requestBody)
      ? requestBody
      : [requestBody];
    console.log(`Processing ${propertyData.length} properties`);

    // Declare spreadsheetUrl at the top level
    let spreadsheetUrls = [];

    if (!propertyData.length) {
      return NextResponse.json(
        { success: false, error: "No property data provided" },
        { status: 400 }
      );
    }

    // Process each property
    for (const data of propertyData) {
      const {
        propertyId,
        propertyName,
        bookings,
        year,
        monthName,
        expensesTotal,
      } = data;

      // Validate required fields for each property
      if (!propertyId || !propertyName || !bookings || !year || !monthName) {
        console.error(
          "Missing required data for property:",
          propertyName || "Unknown"
        );
        return NextResponse.json(
          {
            success: false,
            error: `Missing required data for property: ${
              propertyName || "Unknown"
            }`,
          },
          { status: 400 }
        );
      }

      console.log(`Processing property: ${propertyName} (${propertyId})`);
      console.log(`Bookings count: ${bookings.length}`);

      // Get the Google Sheet ID directly from the database
      const sheetId = await PropertyService.getClientSheetID(propertyId);

      if (!sheetId) {
        const errorMsg = `No Google Sheet ID found for property: ${propertyName} (ID: ${propertyId})`;
        console.error(errorMsg);
        return NextResponse.json(
          { success: false, error: errorMsg },
          { status: 404 }
        );
      }

      // Get sheet metadata to confirm it exists
      const sheetMetadata = await googleService.sheets.spreadsheets.get({
        spreadsheetId: sheetId,
        fields: "properties.title",
      });
      const sheetNameResult = sheetMetadata.data.properties.title;
      console.log(`Processing sheet: ${sheetNameResult} (ID: ${sheetId})`);

      const monthIndex = monthNames.indexOf(monthName);
      const monthNum = monthIndex !== -1 ? monthIndex + 1 : null;

      if (monthNum === null) {
        throw new Error(`Invalid month name: ${monthName}`);
      }

      // Check month-end status
      const status = await MonthEndService.getMonthEndStatus(
        propertyId,
        year,
        monthNum
      );
      const statusValue = status?.status || "draft";

      if (statusValue !== "ready" && statusValue !== "complete") {
        return NextResponse.json(
          {
            success: false,
            error: "Property must be marked as Ready before updating revenue",
            currentStatus: statusValue,
          },
          { status: 403 }
        );
      }

      // Get the layout and sheet name
      const layout = getSheetLayout(propertyName);
      const sheetName = getSheetName(propertyName, layout);
      console.log("Using layout:", layout);
      console.log("Using sheet name:", sheetName);

      // Fetch column A data
      const columnData = await googleService.getSheetData(
        sheetId,
        `${sheetName}!A:A`
      );

      // Find year and month rows
      const yearRowIndex = columnData.findIndex(
        (row) => row[0] && row[0].toString() === year
      );
      if (yearRowIndex === -1) throw new Error(`Year ${year} not found`);

      const monthRowIndex = columnData
        .slice(yearRowIndex)
        .findIndex(
          (row) =>
            row[0] &&
            row[0].toString().toLowerCase() === monthName.toLowerCase()
        );
      if (monthRowIndex === -1)
        throw new Error(`Month ${monthName} not found after year ${year}`);

      const actualRowIndex = yearRowIndex + monthRowIndex + 1;
      console.log("Updating row:", actualRowIndex);

      // Calculate totals
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
              booking.cleaningFeeMonth === monthYearKey
                ? booking.cleaningFee
                : 0;
            return sum + cleaning;
          }, 0)
          .toFixed(2)
      );
      const cleaningTotalFormatted =
        cleaningTotal === 0 ? "" : `$${cleaningTotal}`;

      // Format expenses
      const expensesTotalNumber = Number(expensesTotal);
      const expensesTotalFormatted =
        expensesTotalNumber === 0 ? "" : `$${expensesTotalNumber.toFixed(2)}`;

      // Update main totals in a single batch
      await googleService.updateSheetValues(sheetId, sheetName, [
        {
          range: `${layout.revenueColumn}${actualRowIndex}`,
          value: monthTotalFormatted,
        },
        {
          range: `${layout.cleaningColumn}${actualRowIndex}`,
          value: cleaningTotalFormatted,
        },
        {
          range: `${layout.expensesColumn}${actualRowIndex}`,
          value: expensesTotalFormatted,
        },
      ]);

      // Handle booking details
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

      // PERFORMANCE IMPROVEMENT: Use batch updates for booking rows
      if (newBookings.length > 0) {
        const firstEmptyRow = rightSideData.length + 1;

        // Prepare all values for batch update
        const batchUpdates = [];

        newBookings.forEach((booking, index) => {
          const revenue = Number(
            booking.revenueByMonth[monthYearKey] || 0
          ).toFixed(2);
          const cleaning =
            booking.cleaningFeeMonth === monthYearKey
              ? Number(booking.cleaningFee).toFixed(2)
              : "";

          const rowIndex = firstEmptyRow + index;
          const range = `${layout.rightSideStart}${rowIndex}:${layout.rightSideEnd}${rowIndex}`;

          const values = [
            monthName,
            booking.guestName,
            revenue === "0.00" ? "" : `$${revenue}`,
            cleaning === "0.00" ? "" : cleaning ? `$${cleaning}` : "",
            booking.platform,
            booking.bookingCode || "",
          ];

          batchUpdates.push({
            range: range,
            values: [values],
          });
        });

        // Execute a single batch update instead of multiple individual updates
        if (batchUpdates.length > 0) {
          console.log(
            `Updating ${batchUpdates.length} booking rows in a batch`
          );

          // Format the data as expected by the Google Sheets API
          for (const update of batchUpdates) {
            try {
              await googleService.updateRangeValues(
                sheetId,
                sheetName,
                update.range,
                [update.values[0]] // Wrap in array as expected by the API
              );
              console.log(
                `Successfully updated row for ${update.values[0][1]}`
              );
            } catch (updateError) {
              console.error(`Error updating row:`, updateError.message);
            }
          }
        }
      }

      // Get the spreadsheet URL
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
      spreadsheetUrls.push({
        propertyName: propertyName,
        url: sheetUrl,
      });

      // Update revenue and status
      await MonthEndService.updateRevenueAndStatus({
        propertyId,
        propertyName,
        year,
        month: monthName,
        monthNumber: monthNum,
        revenueAmount: monthTotal || 0,
        cleaningAmount: cleaningTotal || 0,
        expensesAmount: expensesTotal || 0,
        netAmount: monthTotal - cleaningTotal - expensesTotal || 0,
        bookingsCount: bookings.length,
        sheetId,
        ownerPercentage: 100, // Default or fetch from somewhere
        status: "ready", // Set to ready now that the update succeeded
      });
    }

    // Return a single URL if there's only one, otherwise return the array
    const spreadsheetUrl =
      spreadsheetUrls.length === 1 ? spreadsheetUrls[0].url : spreadsheetUrls;

    return NextResponse.json({
      success: true,
      message: "Revenue updated successfully",
      spreadsheetUrl,
    });
  } catch (error) {
    console.error("Sheet update error:", error, {
      stack: error.stack,
      apiErrors: error.errors || "No API errors provided",
      response: error.response ? error.response.data : "No response data",
    });

    if (error.response?.status === 403) {
      await UserService.clearUserToken();
      return NextResponse.json({
        success: false,
        error: "Authorization expired. Please sign in again.",
        needsReauth: true,
      });
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
