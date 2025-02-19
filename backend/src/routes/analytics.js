const express = require("express");
const router = express.Router();
const BookingService = require("../services/bookingService");
const MaintenanceService = require("../services/maintenanceService");
const InventoryService = require("../services/inventoryService");

// Helper function to convert month name to number and format it for database comparison
const formatMonthForDB = (year, monthName) => {
  const months = [
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
  const monthIndex = months.findIndex(
    (month) => month.toLowerCase() === monthName.toLowerCase()
  );
  return monthIndex !== -1 ? `${year}-${monthIndex + 1}` : null;
};

// Get analytics data for a specific property and month
router.get("/:propertyId/:year/:month", async (req, res) => {
  try {
    const { propertyId, year, month } = req.params;
    const formattedMonth = formatMonthForDB(year, month); // Assuming this function works as expected

    if (!formattedMonth) {
      return res.status(400).json({
        success: false,
        error: "Invalid year or month provided",
      });
    }

    const [
      maintenanceRecords,
      maintenanceCostsByMonth,
      revenueByMonth,
      inventory,
    ] = await Promise.all([
      MaintenanceService.getMaintenanceByProperty(propertyId),
      MaintenanceService.getMaintenanceCostsByMonth(propertyId),
      BookingService.getRevenueByMonth(propertyId),
      InventoryService.getInventoryByProperty(propertyId, month),
    ]);

    // Filter revenue data to include only the specified month
    const filteredRevenue = revenueByMonth.filter(
      (booking) => booking.month === formattedMonth
    );

    // Group revenue by platform for the specified month and sum up total_revenue
    const revenueByPlatform = filteredRevenue.reduce((acc, booking) => {
      if (!acc[booking.platform]) acc[booking.platform] = [];
      acc[booking.platform].push({
        month: booking.month,
        booking_code: booking.booking_code,
        total_revenue: parseFloat(booking.total_revenue), // Ensure you have 'total_revenue' here
        booking_count: parseInt(booking.booking_count) || 0,
        total_cleaning_fees: parseFloat(booking.total_cleaning_fees) || 0,
      });
      return acc;
    }, {});

    // Calculate total revenue for the month across all platforms
    const totalRevenueForMonth = filteredRevenue.reduce(
      (sum, record) => sum + parseFloat(record.total_revenue),
      0
    );

    // Filter maintenance costs to match the specified month
    const maintenanceForMonth = maintenanceCostsByMonth.find(
      (m) => m.month === formattedMonth
    );

    const monthlyMetrics = [
      {
        month: formattedMonth,
        revenue: totalRevenueForMonth,
        cleaning_fees: filteredRevenue.reduce(
          (sum, record) => sum + parseFloat(record.total_cleaning_fees || 0),
          0
        ),
        booking_count: filteredRevenue.length,
      },
    ];

    res.json({
      success: true,
      property_id: propertyId,
      metrics: {
        monthly: monthlyMetrics,
        maintenance: {
          total_cost: maintenanceRecords.reduce(
            (sum, record) => sum + parseFloat(record.cost),
            0
          ),
          records: maintenanceRecords.map((record) => ({
            category: record.category,
            company: record.company,
            cost: parseFloat(record.cost),
            description: record.description,
            date: record.date,
            month: record.month,
          })),
        },
        revenue: {
          total: totalRevenueForMonth, // Summed total_revenue for the month
          by_platform: revenueByPlatform,
        },
        inventory: {
          products: inventory.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
          })),
          total_products: inventory.length,
          total_quantity: inventory.reduce(
            (sum, item) => sum + (item.quantity || 0),
            0
          ),
        },
      },
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
