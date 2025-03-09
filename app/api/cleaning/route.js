// app/api/Cleaning/route.js
import CleaningService from "@/lib/services/cleaningService";

export async function POST(request) {
  try {
    const cleaningData = await request.json();
    await CleaningService.insertCleaning(cleaningData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Cleaning data inserted successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error inserting cleaning data:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
