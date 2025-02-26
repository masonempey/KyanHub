// app/api/igms/property/route.js
import axios from "axios";
import PropertyService from "@/lib/services/propertyService";
import dotenv from "dotenv";
dotenv.config();

const IGMS_CONFIG = {
  baseUrl: "https://www.igms.com/api/v1",
  token: process.env.IGMS_API_TOKEN,
};

export async function GET() {
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
        const filteredProperties = response.data.data.filter(
          (property) => property.is_active !== 0 && property.name !== ""
        );
        allProperties = [...allProperties, ...filteredProperties];
        currentPage++;
      } else {
        hasMorePages = false;
      }
    }

    allProperties.sort((a, b) => a.name.localeCompare(b.name));
    await PropertyService.upsertProperties(allProperties);

    return new Response(
      JSON.stringify({ success: true, properties: allProperties }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("IGMS API Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
