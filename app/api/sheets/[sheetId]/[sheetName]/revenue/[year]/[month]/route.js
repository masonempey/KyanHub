// app/api/sheets/[sheetId]/[sheetName]/[year]/[month]/route.js
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

export async function PUT(request, { params }) {
  try {
    const { sheetId, sheetName, year, month } = params;
    const { bookings, propertyName } = await request.json();

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
          row[0] && row[0].toString().toLowerCase() === month.toLowerCase()
      );
    if (monthRowIndex === -1)
      throw new Error(`Month ${month} not found after year ${year}`);

    const actualRowIndex = yearRowIndex + monthRowIndex + 1;
    console.log("Updating row:", actualRowIndex);

    const monthNum = (monthNames.indexOf(month) + 1).toString();
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

    await googleService.updateSheetValues(sheetId, sheetName, [
      {
        range: `${layout.revenueColumn}${actualRowIndex}`,
        value: `$${monthTotal.toFixed(2)}`,
      },
      {
        range: `${layout.cleaningColumn}${actualRowIndex}`,
        value: `$${cleaningTotal}`,
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
          rowMonth.toLowerCase() === month.toLowerCase() &&
          rowName.toLowerCase() === booking.guestName.toLowerCase()
        );
      });
    });

    if (newBookings.length > 0) {
      const firstEmptyRow = rightSideData.length + 1;
      const bookingRows = newBookings.map((booking, index) => ({
        values: [
          month,
          booking.guestName,
          `$${(booking.revenueByMonth[monthYearKey] || 0).toFixed(2)}`,
          booking.cleaningFeeMonth === monthYearKey
            ? `$${booking.cleaningFee}`
            : "",
          booking.platform,
        ],
        row: firstEmptyRow + index,
      }));

      for (const row of bookingRows) {
        await googleService.updateRangeValues(
          sheetId,
          sheetName,
          `${layout.rightSideStart}${row.row}:${layout.rightSideEnd}${row.row}`,
          [row.values]
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${sheetName} for ${month} ${year}`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sheet update error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
