import axios from "axios";
import dotenv from "dotenv";
import { pool } from "@/lib/database";
dotenv.config();

const IGMS_CONFIG = {
  baseUrl: "https://www.igms.com/api/v1",
  token: process.env.IGMS_API_TOKEN,
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate") || "2024-01-01";
    const toDate = searchParams.get("toDate") || "2024-12-31";

    // Always query the database for properties
    let allPropertyIds = [];

    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT DISTINCT property_uid FROM properties WHERE property_uid IS NOT NULL"
      );

      allPropertyIds = result.rows
        .map((row) => row.property_uid)
        .filter((id) => id !== null && id !== undefined);
    } finally {
      client.release();
    }

    console.log(
      `Processing ${allPropertyIds.length} properties:`,
      allPropertyIds
    );

    // Calculate date range for occupancy
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    const totalAvailableNights = totalDays * allPropertyIds.length;

    let totalBookings = 0;
    let totalGuests = 0;
    let totalNights = 0;
    let totalBookedNights = 0;
    const propertyStats = [];

    // Process each property
    for (const propertyId of allPropertyIds) {
      if (!propertyId) continue;

      console.log(`\n========== Processing property ${propertyId} ==========`);
      const startTime = Date.now();

      try {
        const { bookings } = await fetchBookingsForProperty(
          propertyId,
          fromDate,
          toDate
        );

        // Count total guests using number_of_guests field
        let propertyGuestCount = 0;
        let propertyNights = 0;
        let propertyBookedDays = 0;

        // Create a set of dates when the property is booked
        const bookedDates = new Set();

        bookings.forEach((booking) => {
          // Count guests
          propertyGuestCount += booking.number_of_guests || 0;

          // Calculate length of stay
          const checkIn = new Date(booking.local_checkin_dttm);
          const checkOut = new Date(booking.local_checkout_dttm);
          const stayNights = Math.floor(
            (checkOut - checkIn) / (1000 * 60 * 60 * 24)
          );
          propertyNights += stayNights;

          // Track all dates the property was occupied
          const currentDate = new Date(checkIn);
          while (currentDate < checkOut) {
            const dateString = currentDate.toISOString().split("T")[0];
            bookedDates.add(dateString);
            currentDate.setDate(currentDate.getDate() + 1);
          }
        });

        // Count unique days the property was booked
        propertyBookedDays = bookedDates.size;

        totalBookings += bookings.length;
        totalGuests += propertyGuestCount;
        totalNights += propertyNights;
        totalBookedNights += propertyBookedDays;

        // Calculate property-specific metrics
        const avgStayLength =
          bookings.length > 0 ? propertyNights / bookings.length : 0;
        const occupancyRate =
          totalDays > 0 ? (propertyBookedDays / totalDays) * 100 : 0;

        // Add stats for this property
        propertyStats.push({
          propertyId,
          bookings: bookings.length,
          guests: propertyGuestCount,
          nights: propertyNights,
          averageStayLength: avgStayLength.toFixed(2),
          occupancyRate: occupancyRate.toFixed(2) + "%",
          processingTimeMs: Date.now() - startTime,
        });

        console.log(
          `Property ${propertyId}: ${bookings.length} bookings, ${propertyGuestCount} total guests, ${propertyNights} nights`
        );
        console.log(
          `Avg. stay: ${avgStayLength.toFixed(
            2
          )} nights, Occupancy rate: ${occupancyRate.toFixed(2)}%`
        );
      } catch (error) {
        console.error(
          `Error processing property ${propertyId}:`,
          error.message
        );
        propertyStats.push({
          propertyId,
          error: error.message,
          processingTimeMs: Date.now() - startTime,
        });
      }
    }

    // Calculate overall metrics
    const overallAverageStayLength =
      totalBookings > 0 ? totalNights / totalBookings : 0;
    const overallOccupancyRate =
      totalAvailableNights > 0
        ? (totalBookedNights / totalAvailableNights) * 100
        : 0;

    console.log(`\n========== FINAL RESULTS ==========`);
    console.log(`Total bookings across all properties: ${totalBookings}`);
    console.log(`Total guests across all properties: ${totalGuests}`);
    console.log(
      `Overall average stay length: ${overallAverageStayLength.toFixed(
        2
      )} nights`
    );
    console.log(`Overall occupancy rate: ${overallOccupancyRate.toFixed(2)}%`);

    return new Response(
      JSON.stringify({
        success: true,
        totalBookings,
        totalGuests,
        totalNights,
        averageStayLength: overallAverageStayLength.toFixed(2),
        occupancyRate: overallOccupancyRate.toFixed(2) + "%",
        dateRange: { from: fromDate, to: toDate },
        propertyDetails: propertyStats,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error calculating booking stats:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Helper function to fetch all bookings for a property
async function fetchBookingsForProperty(propertyId, fromDate, toDate) {
  // The fetchBookingsForProperty function remains the same
  let allBookings = [];
  let currentPage = 1;
  let hasMorePages = true;

  console.log(`Fetching bookings for property ${propertyId}`);

  while (hasMorePages) {
    try {
      console.log(`Fetching page ${currentPage} for property ${propertyId}`);

      const queryParams = new URLSearchParams({
        access_token: IGMS_CONFIG.token,
        from_date: fromDate,
        to_date: toDate,
        property_uid: propertyId,
        page: currentPage,
      });

      const response = await axios.get(
        `${IGMS_CONFIG.baseUrl}/bookings?${queryParams}`
      );

      if (response.data.data?.length > 0) {
        console.log(
          `Got ${response.data.data.length} bookings on page ${currentPage}`
        );

        const filteredBookings = response.data.data.filter((booking) => {
          const checkOutDate = new Date(booking.local_checkout_dttm)
            .toISOString()
            .split("T")[0];
          return (
            checkOutDate !== fromDate &&
            booking.booking_status === "accepted" &&
            booking.property_uid === propertyId &&
            booking.platform_type !== "airgms"
          );
        });

        console.log(`Filtered to ${filteredBookings.length} valid bookings`);

        // Log guest numbers for each booking
        filteredBookings.forEach((booking) => {
          const checkIn = new Date(booking.local_checkin_dttm);
          const checkOut = new Date(booking.local_checkout_dttm);
          const nights = Math.floor(
            (checkOut - checkIn) / (1000 * 60 * 60 * 24)
          );

          console.log(
            `Booking ${booking.readable_reservation_code || "Unknown"}: ${
              booking.number_of_guests || 0
            } guests for ${nights} nights`
          );
        });

        allBookings = [...allBookings, ...filteredBookings];

        if (response.data.data.length < 25) {
          // Assuming 25 is the page size
          console.log(`Less than 25 results, assuming last page`);
          hasMorePages = false;
        } else {
          currentPage++;
        }
      } else {
        console.log(`No more bookings, stopping pagination`);
        hasMorePages = false;
      }
    } catch (error) {
      console.error(`Error on page ${currentPage}:`, error.message);
      hasMorePages = false; // Stop pagination on error
    }
  }

  return {
    bookings: allBookings,
  };
}
