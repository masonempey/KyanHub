const express = require("express");
const router = express.Router();
const BookingService = require("../services/bookingService");
const MaintenanceService = require("../services/maintenanceService");

// Get analytics data for a specific property
router.get("/:propertyId", async (req, res) => {
  try {
    const { propertyId } = req.params;

    const [maintenanceRecords, maintenanceCostsByMonth, revenueByMonth] =
      await Promise.all([
        MaintenanceService.getMaintenanceByProperty(propertyId),
        MaintenanceService.getMaintenanceCostsByMonth(propertyId),
        BookingService.getRevenueByMonth(propertyId),
      ]);

    const monthlyMetrics = revenueByMonth.map((month) => {
      const maintenanceForMonth = maintenanceCostsByMonth.find(
        (m) => m.month === month.month
      );

      return {
        month: month.month,
        revenue: parseFloat(month.total_revenue),
        maintenance_cost: maintenanceForMonth
          ? parseFloat(maintenanceForMonth.total_cost)
          : 0,
        cleaning_fees: parseFloat(month.total_cleaning_fees),
        booking_count: parseInt(month.booking_count),
        profit:
          parseFloat(month.total_revenue) -
          (maintenanceForMonth
            ? parseFloat(maintenanceForMonth.total_cost)
            : 0),
        maintenance_details: maintenanceForMonth
          ? maintenanceForMonth.maintenance_items
          : [],
      };
    });

    res.json({
      success: true,
      property_id: propertyId,
      metrics: {
        monthly: monthlyMetrics,
        maintenance: {
          total: maintenanceRecords.reduce(
            (sum, record) => sum + parseFloat(record.cost),
            0
          ),
          records: maintenanceRecords,
        },
        revenue: {
          total: revenueByMonth.reduce(
            (sum, record) => sum + parseFloat(record.total_revenue),
            0
          ),
          by_month: revenueByMonth,
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
