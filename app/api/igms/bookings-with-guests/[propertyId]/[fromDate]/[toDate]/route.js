// app/api/igms/bookings-with-guests/[propertyId]/[fromDate]/[toDate]/route.js
import axios from "axios";
import bookingService from "@/lib/services/bookingService";
import PropertyService from "@/lib/services/propertyService";
import dotenv from "dotenv";
dotenv.config();

const IGMS_CONFIG = {
  baseUrl: "https://www.igms.com/api/v1",
  token: process.env.IGMS_API_TOKEN,
};

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { propertyId, fromDate, toDate } = resolvedParams;
    let allBookings = [];
    let currentPage = 1;
    let hasMorePages = true;

    console.log("Searching for bookings with propertyId:", propertyId);

    while (hasMorePages) {
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

      console.log(
        `Page ${currentPage} raw data count:`,
        response.data.data?.length || 0
      );

      if (response.data.data?.length > 0) {
        const filteredBookings = response.data.data.filter((booking) => {
          const checkOutDate = new Date(booking.local_checkout_dttm)
            .toISOString()
            .split("T")[0];
          return (
            checkOutDate !== fromDate &&
            booking.booking_status === "accepted" &&
            booking.property_uid === propertyId
          );
        });

        console.log(`Page ${currentPage}:`, {
          totalBookings: response.data.data.length,
          acceptedForProperty: filteredBookings.length,
        });

        allBookings = [...allBookings, ...filteredBookings];
        currentPage++;
      } else {
        hasMorePages = false;
      }
    }

    const guestIds = [
      ...new Set(allBookings.map((booking) => booking.guest_uid)),
    ];
    const guestQueryParams = new URLSearchParams({
      access_token: IGMS_CONFIG.token,
      guest_uids: guestIds.join(","),
    });

    const guestResponse = await axios.get(
      `${IGMS_CONFIG.baseUrl}/guests?${guestQueryParams}`
    );

    const guestMap = (guestResponse.data?.data || []).reduce((map, guest) => {
      map[guest.guest_uid] = guest;
      return map;
    }, {});

    const enrichedBookings = await Promise.all(
      allBookings.map(async (booking) => {
        const checkIn = new Date(booking.local_checkin_dttm);
        const checkOut = new Date(booking.local_checkout_dttm);
        const totalNights = Math.ceil(
          (checkOut - checkIn) / (1000 * 60 * 60 * 24)
        );

        const cleaningFee = await PropertyService.getCleaningFeeForProperty(
          propertyId
        );

        // Add safe handling for price data
        let baseTotal = 0;
        let nightlyRate = 0;

        // Only try to parse price if it exists and has a price_total
        if (booking.price && booking.price.price_total) {
          const priceTotal = parseFloat(booking.price.price_total);

          if (!isNaN(priceTotal)) {
            baseTotal = Math.max(0, priceTotal - cleaningFee);
            nightlyRate = totalNights > 0 ? baseTotal / totalNights : 0;
          }
        }

        // For airgms bookings with no price data, set a default price (owner bookings)
        if (
          booking.platform_type === "airgms" &&
          (!booking.price || !booking.price.price_total)
        ) {
          // For owner bookings, set base_total to 0 instead of null
          baseTotal = 0;
          nightlyRate = 0;
        }

        const nightsByMonth = {};
        let currentDate = new Date(checkIn);
        const lastNight = new Date(checkOut);
        lastNight.setDate(lastNight.getDate() - 1);
        for (let i = 0; i < totalNights; i++) {
          const monthKey = `${currentDate.getFullYear()}-${
            currentDate.getMonth() + 1
          }`;
          nightsByMonth[monthKey] = (nightsByMonth[monthKey] || 0) + 1;
          currentDate.setDate(currentDate.getDate() + 1);
        }

        const cleaningFeeMonth = `${lastNight.getFullYear()}-${
          lastNight.getMonth() + 1
        }`;

        // Calculate revenue by month, handling potential NaN values
        const revenueByMonth = Object.entries(nightsByMonth).reduce(
          (acc, [month, nights]) => {
            // Use the safely calculated nightlyRate (which will be 0 if there was an issue)
            acc[month] = nights * nightlyRate;
            if (month === cleaningFeeMonth && cleaningFee > 0) {
              acc[month] += cleaningFee;
            }
            return acc;
          },
          {}
        );

        const newBooking = {
          propertyId: booking.property_uid,
          bookingCode: booking.readable_reservation_code,
          guestUid: booking.guest_uid,
          guestName: booking.guest_name,
          checkIn: booking.local_checkin_dttm,
          checkOut: booking.local_checkout_dttm,
          cleaningFee,
          cleaningFeeMonth,
          platform: booking.platform_type,
          // Create a safe price object that always has price_total
          rawPriceData: {
            ...(booking.price || {}),
            price_total: booking.price?.price_total || baseTotal + cleaningFee,
          },
          guestName: guestMap[booking.guest_uid]?.name || "Unknown",
          totalNights,
          nightlyRate,
          nightsByMonth,
          revenueByMonth,
          baseTotal,
        };

        console.log("Processing booking:", {
          code: newBooking.bookingCode,
          platform: newBooking.platform,
          baseTotal: baseTotal,
          nightlyRate: nightlyRate,
        });

        try {
          await bookingService.insertBooking(newBooking);
        } catch (error) {
          console.error(
            `Error inserting booking ${newBooking.bookingCode}:`,
            error.message
          );
          // Continue with other bookings instead of failing the entire request
        }

        return newBooking;
      })
    );

    // Filter out bookings that failed to process properly
    const successfulBookings = enrichedBookings.filter((booking) => booking);

    // Sort by check-in date
    successfulBookings.sort(
      (a, b) => new Date(a.checkIn) - new Date(b.checkIn)
    );

    return new Response(
      JSON.stringify({
        success: true,
        propertyId,
        count: successfulBookings.length,
        bookings: successfulBookings,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("IGMS API Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
