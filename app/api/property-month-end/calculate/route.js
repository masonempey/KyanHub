import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/admin";
import MonthEndService from "@/lib/services/monthEndService";
import googleService from "@/lib/services/googleService";
import PropertyService from "@/lib/services/propertyService";

export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    try {
      await auth.verifyIdToken(token);
    } catch (e) {
      console.error("Auth verification error:", e);
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // Parse request data
    const data = await request.json();
    const {
      propertyId,
      propertyName,
      year,
      month,
      monthNumber,
      bookings,
      dryRun = false,
    } = data;

    // Instead of fetching from API routes, use the service modules directly
    // Get expenses data
    await googleService.init();
    let expensesTotal = 0;
    try {
      const sheetId = await PropertyService.getClientSheetID(propertyId);
      if (sheetId) {
        // Similar logic to what's in your /api/sheets/expenses
        // This is simplified - you might need to adapt it based on your actual expenses service
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
        const monthNumber = monthMap[month.toLowerCase()];

        // Calculate expenses (simplified version)
        const unPaddedMonthNumber = monthNumber.replace(/^0/, "");

        // Get data from Expenses sheet
        const expensesData = await googleService.getSheetData(
          sheetId,
          "Expenses!A1:C1000"
        );

        // Find the year row
        const yearRowIndex = expensesData.findIndex(
          (row) => row[0] && row[0].toString() === year.toString()
        );

        if (yearRowIndex !== -1) {
          // Calculate expenses total
          let monthFound = false;
          const lowerMonthName = month.toLowerCase();

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
              // MM/DD/YYYY or MM-DD-YYYY format
              new RegExp(`^${monthNumber}[/-]\\d{1,2}[/-]\\d{4}$`).test(
                currentCell
              ) ||
              // M/DD/YYYY or M-DD-YYYY format
              new RegExp(`^${unPaddedMonthNumber}[/-]\\d{1,2}[/-]\\d{4}$`).test(
                currentCell
              ) ||
              // Other date formats
              new RegExp(`^\\d{4}[/-]${monthNumber}[/-]\\d{1,2}$`).test(
                currentCell
              );

            if (containsMonthName || containsMonthNumber) {
              monthFound = true;

              // Check if there's a value in column C (index 2)
              if (row[2]) {
                // Remove currency symbols and convert to number
                const expenseValue = parseFloat(
                  row[2].toString().replace(/[^0-9.-]+/g, "")
                );
                if (!isNaN(expenseValue)) {
                  expensesTotal += expenseValue;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error getting expenses:", error);
      // Continue with zero expenses
    }

    // Get owner data directly
    let ownerInfo = null;
    let ownershipPercentage = 100;
    try {
      ownerInfo = await PropertyService.getPropertyOwner(propertyId);
      if (ownerInfo) {
        ownershipPercentage = ownerInfo.ownership_percentage || 100;
      }
    } catch (error) {
      console.error("Error getting owner info:", error);
      // Continue with default values
    }

    // Revenue calculation
    const paddedMonthNum = monthNumber.toString().padStart(2, "0");
    const unPadedMonthNum = monthNumber.toString();

    const monthYearKeyPadded = `${year}-${paddedMonthNum}`;
    const monthYearKeyUnpadded = `${year}-${unPadedMonthNum}`;

    // Calculate revenue
    const totalRevenue = bookings.reduce((sum, booking) => {
      const revenuePadded = booking.revenueByMonth?.[monthYearKeyPadded] || 0;
      const revenueUnpadded =
        booking.revenueByMonth?.[monthYearKeyUnpadded] || 0;
      const revenue = parseFloat(revenuePadded || revenueUnpadded || 0);
      return sum + revenue;
    }, 0);

    // Calculate cleaning fees
    const totalCleaning = bookings.reduce((sum, booking) => {
      const cleaningMatch =
        booking.cleaningFeeMonth === monthYearKeyPadded ||
        booking.cleaningFeeMonth === monthYearKeyUnpadded;
      const cleaning = cleaningMatch ? parseFloat(booking.cleaningFee || 0) : 0;
      return sum + cleaning;
    }, 0);

    // Calculate net amount and owner profit
    const netAmount = totalRevenue - totalCleaning - expensesTotal;
    const ownerProfit = (netAmount * ownershipPercentage) / 100;

    // If not a dry run, save to the database
    let dbResult = null;
    if (!dryRun) {
      dbResult = await MonthEndService.updateRevenueStatus(
        propertyId,
        propertyName,
        year,
        month,
        monthNumber,
        totalRevenue,
        totalCleaning,
        expensesTotal,
        netAmount,
        bookings.length,
        null, // sheetId - not updating the sheet yet
        ownershipPercentage
      );
    }

    // Return the calculation results
    return NextResponse.json({
      success: true,
      propertyId,
      propertyName,
      revenue_amount: totalRevenue,
      cleaning_fees_amount: totalCleaning,
      expenses_amount: expensesTotal,
      net_amount: netAmount,
      owner_percentage: ownershipPercentage,
      owner_profit: ownerProfit,
      booking_count: bookings.length,
      month,
      monthNumber,
      year,
      status: dbResult?.status || "draft",
      dryRun,
    });
  } catch (error) {
    console.error("Error calculating month-end:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
