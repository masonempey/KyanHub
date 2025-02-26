// app/api/igms/guests/route.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const IGMS_CONFIG = {
  baseUrl: "https://www.igms.com/api/v1",
  token: process.env.IGMS_API_TOKEN,
};

export async function GET() {
  try {
    const queryParams = new URLSearchParams({
      access_token: IGMS_CONFIG.token,
      page: 1,
    });

    const response = await axios.get(
      `${IGMS_CONFIG.baseUrl}/guests?${queryParams}`
    );

    const filteredGuests =
      response.data?.data?.map((guest) => ({
        guest_uid: guest.guest_uid,
        platform_type: guest.platform_type,
        name: guest.name,
      })) || [];

    console.log("Filtered Guest Count:", filteredGuests.length);

    return new Response(
      JSON.stringify({
        success: true,
        guests: filteredGuests,
        pagination: response.data?.pagination,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Guest fetch error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
