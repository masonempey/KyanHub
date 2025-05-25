import { NextResponse } from "next/server";
import googleService from "@/lib/services/googleService";
import PropertyService from "@/lib/services/propertyService";

export async function POST(request) {
  try {
    // Initialize Google Services
    await googleService.init();
    const { propertyId, year, monthName } = await request.json();

    // Add comprehensive logging
    console.log(
      `Expenses API called for property: ${propertyId}, ${monthName} ${year}`
    );

    // Get the Google Sheet ID
    let sheetId;
    try {
      sheetId = await PropertyService.getClientSheetID(propertyId);
      console.log(`Retrieved sheet ID: ${sheetId}`);

      if (!sheetId) {
        console.log(`No sheet ID found for property ${propertyId}`);
        return NextResponse.json({
          success: true,
          expensesTotal: 0,
          message: "No Google Sheet configured for this property",
        });
      }
    } catch (idError) {
      console.error("Failed to get sheet ID:", idError);
      return NextResponse.json({
        success: true,
        expensesTotal: 0,
        message: `Error retrieving sheet ID: ${idError.message}`,
      });
    }

    // Verify the sheet exists
    try {
      await googleService.sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });
      console.log("Successfully verified sheet exists");
    } catch (sheetError) {
      console.error("Sheet verification failed:", sheetError);
      return NextResponse.json({
        success: true,
        expensesTotal: 0,
        message: `Google Sheet not found or inaccessible: ${sheetError.message}`,
      });
    }

    // Map month names for flexible matching
    const monthMap = {
      january: "01",
      february: "02",
      march: "03",
      april: "04",
      may: "05",
      june: "06",
      july: "07",
      august: "08",
      september: "09",
      october: "10",
      november: "11",
      december: "12",
    };

    const monthNumber = monthMap[monthName.toLowerCase()];
    const unPaddedMonthNumber = monthNumber.replace(/^0/, "");

    // Get data from Expenses sheet
    let expensesData;
    try {
      expensesData = await googleService.getSheetData(
        sheetId,
        "Expenses!A1:C1000"
      );
      console.log(
        `Successfully retrieved expenses data, ${expensesData.length} rows found`
      );
    } catch (dataError) {
      console.error("Error getting expenses data:", dataError);
      return NextResponse.json({
        success: true,
        expensesTotal: 0,
        message: `"Expenses" tab not found in sheet: ${dataError.message}`,
      });
    }

    // Find the year row
    const yearRowIndex = expensesData.findIndex(
      (row) => row[0] && row[0].toString() === year
    );

    if (yearRowIndex === -1) {
      console.log(`Year ${year} not found in expenses sheet`);
      return NextResponse.json({
        success: true,
        expensesTotal: 0,
        message: `Year ${year} not found in expenses sheet`,
      });
    }

    // Calculate expenses total
    let expensesTotal = 0;
    let monthFound = false;
    const lowerMonthName = monthName.toLowerCase();

    console.log(
      `Looking for expenses for ${monthName} (${monthNumber}) ${year}`
    );

    // Look through each row after the year
    for (let i = yearRowIndex + 1; i < expensesData.length; i++) {
      const row = expensesData[i];

      // Skip empty rows
      if (!row || !row[0]) continue;

      const currentCell = (row[0] || "").toString().toLowerCase();

      // If we find another year, stop looking
      if (/^\d{4}$/.test(currentCell)) break;

      // Various matching patterns for flexibility
      const containsMonthName = currentCell.includes(lowerMonthName);
      const containsMonthNumber =
        // MM/DD/YYYY or MM-DD-YYYY
        new RegExp(`^${monthNumber}[/-]\\d{1,2}[/-]\\d{4}$`).test(
          currentCell
        ) ||
        // M/DD/YYYY or M-DD-YYYY
        new RegExp(`^${unPaddedMonthNumber}[/-]\\d{1,2}[/-]\\d{4}$`).test(
          currentCell
        ) ||
        // YYYY/MM/DD or YYYY-MM-DD
        new RegExp(`^\\d{4}[/-]${monthNumber}[/-]\\d{1,2}$`).test(
          currentCell
        ) ||
        // YYYY/M/DD or YYYY-M-DD
        new RegExp(`^\\d{4}[/-]${unPaddedMonthNumber}[/-]\\d{1,2}$`).test(
          currentCell
        ) ||
        // DD/MM/YYYY or DD-MM-YYYY
        new RegExp(`^\\d{1,2}[/-]${monthNumber}[/-]\\d{4}$`).test(
          currentCell
        ) ||
        // DD/M/YYYY or DD-M-YYYY
        new RegExp(`^\\d{1,2}[/-]${unPaddedMonthNumber}[/-]\\d{4}$`).test(
          currentCell
        );

      if (containsMonthName || containsMonthNumber) {
        monthFound = true;
        console.log(`Found match in row ${i}: ${currentCell}`);

        // Check if there's a value in column C (index 2)
        if (row[2]) {
          // Remove currency symbols and convert to number
          const expenseValue = parseFloat(
            row[2].toString().replace(/[^0-9.-]+/g, "")
          );
          if (!isNaN(expenseValue)) {
            expensesTotal += expenseValue;
            console.log(
              `Added expense: $${expenseValue.toFixed(
                2
              )}, running total: $${expensesTotal.toFixed(2)}`
            );
          }
        }
      }
    }

    console.log(
      `Final expenses total for ${monthName} ${year}: $${expensesTotal.toFixed(
        2
      )}`
    );
    return NextResponse.json({
      success: true,
      expensesTotal: expensesTotal.toFixed(2),
      monthFound,
    });
  } catch (error) {
    console.error("Unexpected error in expenses API:", error);
    // Return success:true so it doesn't block revenue updates
    return NextResponse.json({
      success: true,
      expensesTotal: 0,
      message: `Error processing expenses: ${error.message}`,
    });
  }
}
