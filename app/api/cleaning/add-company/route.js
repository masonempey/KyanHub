// app/api/cleaning/add-company/route.js

import CleaningService from "@/lib/services/cleaningService";

export async function POST(request, { params }) {
  try {
    const { companyName, googleFolderId } = await request.json();

    await CleaningService.insertCompany(companyName, googleFolderId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Company data inserted successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error inserting company data:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const { companyName, googleFolderId } = await request.json();

    await CleaningService.editCompany(companyName, googleFolderId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Company data updated successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error updating company data:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
