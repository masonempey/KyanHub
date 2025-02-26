// app/api/analytics/[propertyId]/[year]/[month]/route.js
import BookingService from "@/lib/services/bookingService"; // Adjust path to your services
import MaintenanceService from "@/lib/services/maintenanceService";
import InventoryService from "@/lib/services/inventoryService";

// Helper function remains the same
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

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { propertyId, year, month } = resolvedParams;
    const formattedMonth = formatMonthForDB(year, month);

    if (!formattedMonth) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid year or month provided",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
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

    const filteredRevenue = revenueByMonth.filter(
      (booking) => booking.month === formattedMonth
    );

    const revenueByPlatform = filteredRevenue.reduce((acc, booking) => {
      if (!acc[booking.platform]) acc[booking.platform] = [];
      acc[booking.platform].push({
        month: booking.month,
        booking_code: booking.booking_code,
        total_revenue: parseFloat(booking.total_revenue),
        booking_count: parseInt(booking.booking_count) || 0,
        total_cleaning_fees: parseFloat(booking.total_cleaning_fees) || 0,
      });
      return acc;
    }, {});

    const totalRevenueForMonth = filteredRevenue.reduce(
      (sum, record) => sum + parseFloat(record.total_revenue),
      0
    );

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

    return new Response(
      JSON.stringify({
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
            total: totalRevenueForMonth,
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
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analytics Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
