// app/api/cleaning/companies/route.js
import CleaningService from "@/lib/services/cleaningService";

export async function GET() {
  try {
    const companies = await CleaningService.getCompanies();
    return new Response(JSON.stringify({ success: true, companies }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
