import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const IGMS_CONFIG = {
  baseUrl: "https://www.igms.com/api/v1",
  token: process.env.IGMS_API_TOKEN,
};

export async function GET(request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const guestName = searchParams.get("guestName");
    const fromDate = searchParams.get("fromDate") || "2020-01-01"; // Default start date
    const toDate = searchParams.get("toDate") || "2030-12-31"; // Default end date

    if (!guestName || guestName.trim().length < 2) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Guest name must be at least 2 characters",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(
      `Searching IGMS for guest: "${guestName}" from ${fromDate} to ${toDate}`
    );

    // Step 1: Find guest by name - stop as soon as we find a match
    console.log("PROGRESS: Starting guest search...");
    const startTime = Date.now();
    const matchingGuest = await findFirstGuestByName(guestName);

    if (!matchingGuest) {
      return new Response(
        JSON.stringify({
          success: true,
          count: 0,
          message: "No guest found with that name",
          bookings: [],
          searchStats: {
            timeElapsed: (Date.now() - startTime) / 1000,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(
      `PROGRESS: Found guest "${matchingGuest.name}" with ID ${
        matchingGuest.guest_uid
      } in ${(Date.now() - startTime) / 1000}s`
    );

    // Step 2: Search for bookings by this guest ID
    console.log(
      `PROGRESS: Searching bookings for guest ${matchingGuest.guest_uid}...`
    );
    const bookingStartTime = Date.now();

    const guestBookings = await fetchBookingsByGuestId(
      matchingGuest.guest_uid,
      matchingGuest.name,
      fromDate,
      toDate
    );

    console.log(
      `PROGRESS: Found ${guestBookings.length} bookings in ${
        (Date.now() - bookingStartTime) / 1000
      }s`
    );

    if (guestBookings.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          count: 0,
          guestName: matchingGuest.name,
          message:
            "No bookings found for this guest in the specified date range",
          bookings: [],
          searchStats: {
            timeElapsed: (Date.now() - startTime) / 1000,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 3: Get property details for the found bookings
    const propertyIds = [...new Set(guestBookings.map((b) => b.property_uid))];
    console.log(
      `PROGRESS: Fetching details for ${propertyIds.length} unique properties...`
    );
    const properties = await fetchPropertiesByIds(propertyIds);

    // Process and format the bookings for a nice response
    const formattedBookings = guestBookings.map((booking) => {
      const checkIn = new Date(booking.local_checkin_dttm);
      const checkOut = new Date(booking.local_checkout_dttm);
      const totalNights = Math.ceil(
        (checkOut - checkIn) / (1000 * 60 * 60 * 24)
      );

      return {
        bookingCode: booking.readable_reservation_code,
        propertyId: booking.property_uid,
        propertyName:
          properties[booking.property_uid] ||
          `Property ${booking.property_uid}`,
        guestName: booking.guestName,
        platform: booking.platform_type,
        checkIn: booking.local_checkin_dttm,
        checkOut: booking.local_checkout_dttm,
        formattedCheckIn: checkIn.toISOString().split("T")[0],
        formattedCheckOut: checkOut.toISOString().split("T")[0],
        totalNights: totalNights,
        amount: booking.price?.price_total || "N/A",
        status: booking.booking_status,
      };
    });

    // Sort by check-in date (most recent first)
    formattedBookings.sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(
      `PROGRESS: Search complete. Found ${formattedBookings.length} bookings for "${matchingGuest.name}" in ${totalTime}s`
    );

    return new Response(
      JSON.stringify({
        success: true,
        guestName: matchingGuest.name,
        guestId: matchingGuest.guest_uid,
        count: formattedBookings.length,
        bookings: formattedBookings,
        searchStats: {
          uniqueProperties: propertyIds.length,
          timeElapsed: totalTime,
          fromDate,
          toDate,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error searching for guest bookings:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Error searching for guest bookings",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Helper function to find first guest matching a name
async function findFirstGuestByName(name) {
  let currentPage = 1;
  let hasMorePages = true;

  try {
    // Stop searching as soon as we find a matching guest
    while (hasMorePages) {
      console.log(`PROGRESS: Fetching guests page ${currentPage}...`);
      const response = await axios.get(`${IGMS_CONFIG.baseUrl}/guests`, {
        params: {
          access_token: IGMS_CONFIG.token,
          page: currentPage,
        },
        timeout: 15000, // 15 second timeout
      });

      if (response.data.data?.length > 0) {
        // Find first guest with matching name
        const match = response.data.data.find(
          (g) => g.name && g.name.toLowerCase().includes(name.toLowerCase())
        );

        if (match) {
          console.log(`PROGRESS: Found matching guest on page ${currentPage}`);
          return match; // Return immediately when found
        }

        // Check if there are more pages
        if (response.data.meta?.has_next_page) {
          currentPage++;
        } else {
          hasMorePages = false;
        }
      } else {
        hasMorePages = false;
      }
    }

    return null; // No matching guest found
  } catch (error) {
    console.error("Error fetching guests:", error.message);
    return null;
  }
}

// Helper function to fetch bookings for a specific guest ID
async function fetchBookingsByGuestId(guestId, guestName, fromDate, toDate) {
  let allBookings = [];
  let currentPage = 1;
  let hasMorePages = true;

  try {
    // Search through all bookings and filter by guest ID
    while (hasMorePages) {
      console.log(`PROGRESS: Fetching bookings page ${currentPage}...`);
      const response = await axios.get(`${IGMS_CONFIG.baseUrl}/bookings`, {
        params: {
          access_token: IGMS_CONFIG.token,
          from_date: fromDate,
          to_date: toDate,
          page: currentPage,
        },
        timeout: 15000,
      });

      if (response.data.data?.length > 0) {
        // Filter bookings by guest ID
        const matchingBookings = response.data.data.filter(
          (booking) =>
            booking.guest_uid === guestId &&
            (booking.booking_status === "accepted" ||
              booking.booking_status === "confirmed")
        );

        if (matchingBookings.length > 0) {
          // Add guest name to each booking
          const enrichedBookings = matchingBookings.map((booking) => ({
            ...booking,
            guestName: guestName || booking.guest_name || "Unknown Guest",
          }));

          console.log(
            `PROGRESS: Found ${enrichedBookings.length} bookings on page ${currentPage}`
          );
          allBookings = [...allBookings, ...enrichedBookings];
        }

        // Check for more pages
        if (response.data.meta?.has_next_page) {
          currentPage++;
        } else {
          hasMorePages = false;
        }
      } else {
        hasMorePages = false;
      }
    }

    return allBookings;
  } catch (error) {
    console.error("Error fetching bookings:", error.message);
    return allBookings;
  }
}

// Helper function to fetch property details by IDs
async function fetchPropertiesByIds(propertyIds) {
  const propertyMap = {};

  try {
    // Since we can't query properties by ID directly,
    // we'll fetch properties and filter by the IDs we need
    let currentPage = 1;
    let hasMorePages = true;
    let remainingIds = new Set(propertyIds);

    while (hasMorePages && remainingIds.size > 0) {
      console.log(`PROGRESS: Fetching properties page ${currentPage}...`);
      const response = await axios.get(`${IGMS_CONFIG.baseUrl}/property`, {
        params: {
          access_token: IGMS_CONFIG.token,
          page: currentPage,
        },
        timeout: 10000,
      });

      if (response.data.data?.length > 0) {
        // Filter to only the properties we need
        response.data.data.forEach((property) => {
          if (remainingIds.has(property.property_uid)) {
            propertyMap[property.property_uid] =
              property.name || `Property ${property.property_uid}`;
            remainingIds.delete(property.property_uid);
          }
        });

        console.log(
          `PROGRESS: Found ${Object.keys(propertyMap).length}/${
            propertyIds.length
          } property names`
        );

        // Stop if we found all properties or no more pages
        if (remainingIds.size === 0 || !response.data.meta?.has_next_page) {
          hasMorePages = false;
        } else {
          currentPage++;
        }
      } else {
        hasMorePages = false;
      }
    }

    return propertyMap;
  } catch (error) {
    console.error("Error fetching properties:", error.message);
    return propertyMap;
  }
}
