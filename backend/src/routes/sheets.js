const express = require("express");
const router = express.Router();
const googleService = require("../services/googleService");

function getColumnLetter(columnIndex) {
  let letter = "";
  columnIndex++; // Convert to 1-based index

  while (columnIndex > 0) {
    columnIndex--;
    letter = String.fromCharCode(65 + (columnIndex % 26)) + letter;
    columnIndex = Math.floor(columnIndex / 26);
  }

  return letter;
}

router.get("/:sheetId/:sheetName/:startRow/:endRow", async (req, res) => {
  try {
    const { sheetId, sheetName } = req.params;
    const { startRow, endRow } = req.params;

    const start = parseInt(startRow);
    const end = parseInt(endRow);
    const range = `${sheetName}!A${start}:CZ${end}`;

    const sheetData = await googleService.getSheetData(sheetId, range);

    res.json({
      success: true,
      sheetName,
      range,
      data: sheetData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get("/:sheetId/:sheetName/columnA", async (req, res) => {
  try {
    const { sheetId, sheetName } = req.params;
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

    res.json({
      success: true,
      sheetName,
      columnA,
      rates: columnC,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get(
  "/:sheetId/:sheetName/:startRow/:endRow/:propertyName",
  async (req, res) => {
    try {
      const { sheetId, sheetName, startRow, endRow, propertyName } = req.params;

      // Get headers from row 2
      const headers = await googleService.getSheetData(
        sheetId,
        `${sheetName}!A2:CZ2`
      );
      if (!headers?.[0]) throw new Error("No headers found");

      const columnIndex = headers[0].findIndex((h) => h === propertyName);
      if (columnIndex === -1) {
        return res.status(404).json({
          success: false,
          error: `Property ${propertyName} not found in headers`,
        });
      }

      // Get column letter and validate range
      const columnLetter = getColumnLetter(columnIndex);
      const range = `${sheetName}!${columnLetter}${startRow}:${columnLetter}${endRow}`;

      // Get owner's name from first row
      const ownerRange = `${sheetName}!${columnLetter}1:${columnLetter}1`;
      const ownerRow = await googleService.getSheetData(sheetId, ownerRange);
      const ownersName = ownerRow?.[0]?.[0] || "Unknown Owner";

      // Get column values
      const values = await googleService.getSheetData(sheetId, range);

      res.json({
        success: true,
        values: values.map((row) => row[0]),
        ownersName,
        range,
      });
    } catch (error) {
      console.error("Route error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

router.put("/:sheetId/:sheetName/:propertyName", async (req, res) => {
  try {
    const { sheetId, sheetName, propertyName } = req.params;
    const { values } = req.body;

    // Get headers from row 2
    const headers = await googleService.getSheetData(
      sheetId,
      `${sheetName}!A2:CZ2`
    );
    if (!headers?.[0]) throw new Error("No headers found");

    const columnIndex = headers[0].findIndex((h) => h === propertyName);
    if (columnIndex === -1) {
      return res.status(404).json({
        success: false,
        error: `Property ${propertyName} not found in headers`,
      });
    }

    const nonZeroUpdates = values
      .slice(1)
      .map((value, index) => ({ value, index }))
      .filter((item) => item.value !== 0);

    console.log("Updating non-zero values:", {
      propertyName,
      updates: nonZeroUpdates,
    });

    // Update values in sheet
    await googleService.updateNonZeroValues(
      sheetId,
      sheetName,
      columnIndex,
      3, // Start from row 3 (after headers)
      nonZeroUpdates
    );

    res.json({
      success: true,
      message: `Updated values for ${propertyName}`,
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

//Handle Revenue Sheet
router.put("/:sheetId/:sheetName/:year/:month", async (req, res) => {
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
    // london: {
    //   revenueColumn: "B",
    //   cleaningColumn: "D",
    //   rightSideStart: "P",
    //   rightSideEnd: "N",
    // },
    default: {
      revenueColumn: "B",
      cleaningColumn: "C",
      rightSideStart: "J",
      rightSideEnd: "N",
    },
  };

  const getSheetLayout = (propertyName) => {
    if (["Era 1102", "Colours 1904", "Colours 1709"].includes(propertyName)) {
      return SHEET_LAYOUTS["Kyan Owned Properties"];
    }
    if (propertyName === "Colours 1306") {
      return SHEET_LAYOUTS.colours_1306;
    }
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

  try {
    const { sheetId, sheetName, year, month } = req.params;
    const { bookings, propertyName } = req.body;

    // Get layout based on sheet name
    const layout = getSheetLayout(propertyName);

    // 1. Get column A data for year/month
    const columnData = await googleService.getSheetData(
      sheetId,
      `${sheetName}!A:A`
    );

    // 2. Find year row
    const yearRowIndex = columnData.findIndex(
      (row) => row[0] && row[0].toString() === year
    );

    if (yearRowIndex === -1) {
      throw new Error(`Year ${year} not found`);
    }

    // 3. Find month row after year
    const monthRowIndex = columnData
      .slice(yearRowIndex)
      .findIndex(
        (row) =>
          row[0] && row[0].toString().toLowerCase() === month.toLowerCase()
      );

    if (monthRowIndex === -1) {
      throw new Error(`Month ${month} not found after year ${year}`);
    }

    const actualRowIndex = yearRowIndex + monthRowIndex + 1;
    console.log("Updating row:", actualRowIndex);

    // Format month for revenue lookup
    const monthNum = (monthNames.indexOf(month) + 1).toString();
    const monthYearKey = `${year}-${monthNum}`;

    // Calculate totals
    const monthTotal = bookings.reduce((sum, booking) => {
      const revenue = booking.revenueByMonth[monthYearKey] || 0;
      return sum + revenue;
    }, 0);

    const cleaningTotal = bookings.reduce((sum, booking) => {
      const cleaning =
        booking.cleaningFeeMonth === monthYearKey ? booking.cleaningFee : 0;
      return sum + cleaning;
    }, 0);

    // Update left side with configured columns
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

    // Get right side data with configured columns
    const rightSideData = await googleService.getSheetData(
      sheetId,
      `${sheetName}!${layout.rightSideStart}:${layout.rightSideEnd}`
    );

    // Filter out existing bookings
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

      // Update right side with new bookings
      for (const row of bookingRows) {
        await googleService.updateRangeValues(
          sheetId,
          sheetName,
          `${layout.rightSideStart}${row.row}:${layout.rightSideEnd}${row.row}`,
          [row.values]
        );
      }
    }

    res.json({
      success: true,
      message: `Updated ${sheetName} for ${month} ${year}`,
    });
  } catch (error) {
    console.error("Sheet update error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
