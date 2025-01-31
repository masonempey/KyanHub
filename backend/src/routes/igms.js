const express = require("express");
const router = express.Router();
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const IGMS_CONFIG = {
  baseUrl: "https://www.igms.com/api/v1",
  token: process.env.IGMS_API_TOKEN,
};

router.get("/property", async (req, res) => {
  try {
    let allProperties = [];
    let currentPage = 1;
    let hasMorePages = true;

    console.log("IGMS Token:", {
      exists: !!IGMS_CONFIG.token,
      length: IGMS_CONFIG.token?.length,
    });

    while (hasMorePages) {
      const queryParams = new URLSearchParams({
        access_token: IGMS_CONFIG.token,
        page: currentPage,
      });

      const response = await axios.get(
        `${IGMS_CONFIG.baseUrl}/property?${queryParams}`
      );

      if (response.data.data && response.data.data.length > 0) {
        allProperties = [...allProperties, ...response.data.data];
        currentPage++;
      } else {
        hasMorePages = false;
      }
    }

    res.json({
      success: true,
      properties: allProperties,
    });
  } catch (error) {
    console.error("IGMS API Error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// fetch bookings with guests attached by property Id and date range
router.get(
  "/bookings-with-guests/:propertyId/:fromDate/:toDate",
  async (req, res) => {
    try {
      const { propertyId, fromDate, toDate } = req.params;
      let allBookings = [];
      let currentPage = 1;
      let hasMorePages = true;

      console.log("Searching for bookings with propertyId:", propertyId);

      while (hasMorePages) {
        const queryParams = new URLSearchParams({
          access_token: IGMS_CONFIG.token,
          from_date: fromDate,
          to_date: toDate,
          property_uid: propertyId, // This should filter server-side
          page: currentPage,
        });

        const response = await axios.get(
          `${IGMS_CONFIG.baseUrl}/bookings?${queryParams}`
        );

        if (response.data.data?.length > 0) {
          // Double check property filtering
          const filteredBookings = response.data.data.filter((booking) => {
            const checkOutDate = new Date(booking.local_checkout_dttm)
              .toISOString()
              .split("T")[0];

            console.log("Comparing dates:", {
              checkOut: checkOutDate,
              fromDate: fromDate,
              matches: checkOutDate !== fromDate,
            });

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

      // 3. Get guest IDs only from these specific bookings
      const guestIds = [
        ...new Set(allBookings.map((booking) => booking.guest_uid)),
      ];

      // 4. Fetch only needed guests
      const guestQueryParams = new URLSearchParams({
        access_token: IGMS_CONFIG.token,
        guest_uids: guestIds.join(","),
      });

      const guestResponse = await axios.get(
        `${IGMS_CONFIG.baseUrl}/guests?${guestQueryParams}`
      );

      // 5. Create guest map for quick lookup
      const guestMap = (guestResponse.data?.data || []).reduce((map, guest) => {
        map[guest.guest_uid] = guest;
        return map;
      }, {});

      // 6. Combine booking and guest data
      const enrichedBookings = allBookings
        .map((booking) => {
          const checkIn = new Date(booking.local_checkin_dttm);
          const checkOut = new Date(booking.local_checkout_dttm);
          const totalNights = Math.ceil(
            (checkOut - checkIn) / (1000 * 60 * 60 * 24)
          );

          // Calculate base rate without cleaning fee
          const cleaningFee = parseFloat(booking.price.price_extras) || 0;
          const baseTotal = parseFloat(booking.price.price_total) - cleaningFee;
          const nightlyRate = baseTotal / totalNights;

          // Calculate nights per month
          const nightsByMonth = {};
          let currentDate = new Date(checkIn);

          while (currentDate < checkOut) {
            const monthKey = `${currentDate.getFullYear()}-${
              currentDate.getMonth() + 1
            }`;
            nightsByMonth[monthKey] = (nightsByMonth[monthKey] || 0) + 1;
            currentDate.setDate(currentDate.getDate() + 1);
          }

          // Get checkout month key for cleaning fee
          const checkoutMonthKey = `${checkOut.getFullYear()}-${
            checkOut.getMonth() + 1
          }`;

          // Calculate revenue per month and track cleaning fee
          let cleaningFeeMonth = checkoutMonthKey;
          const revenueByMonth = Object.entries(nightsByMonth).reduce(
            (acc, [month, nights]) => {
              acc[month] = nights * nightlyRate;
              if (month === checkoutMonthKey) {
                acc[month] += cleaningFee;
              }
              return acc;
            },
            {}
          );

          return {
            propertyId: booking.property_uid,
            bookingCode: booking.readable_reservation_code,
            checkIn: booking.local_checkin_dttm,
            checkOut: booking.local_checkout_dttm,
            total: booking.price.price_total,
            cleaningFee,
            cleaningFeeMonth,
            baseTotal,
            platform: booking.platform_type,
            rawPriceData: booking.price,
            guestName: guestMap[booking.guest_uid]?.name || "Unknown",
            totalNights,
            nightlyRate,
            nightsByMonth,
            revenueByMonth,
          };
        })
        .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

      res.json({
        success: true,
        propertyId,
        count: enrichedBookings.length,
        bookings: enrichedBookings,
      });
    } catch (error) {
      console.error("IGMS API Error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

router.get("/guests", async (req, res) => {
  try {
    const queryParams = new URLSearchParams({
      access_token: IGMS_CONFIG.token,
      page: 1,
    });

    const response = await axios.get(
      `${IGMS_CONFIG.baseUrl}/guests?${queryParams}`
    );

    // Filter response to only include needed fields
    const filteredGuests =
      response.data?.data?.map((guest) => ({
        guest_uid: guest.guest_uid,
        platform_type: guest.platform_type,
        name: guest.name,
      })) || [];

    console.log("Filtered Guest Count:", filteredGuests.length);

    res.json({
      success: true,
      guests: filteredGuests,
      pagination: response.data?.pagination,
    });
  } catch (error) {
    console.error("Guest fetch error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
