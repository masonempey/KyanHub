// app/api/maintenance/route.js
import MaintenanceService from "@/lib/services/maintenanceService";
import GoogleService from "@/lib/services/googleService";
import PropertyService from "@/lib/services/propertyService";

GoogleService.init().catch(console.error);

export async function POST(request) {
  try {
    const maintenanceData = await request.json();
    await MaintenanceService.insertMaintenance(maintenanceData);

    const sheetId = await PropertyService.getClientSheetID(
      maintenanceData.propertyId
    );

    if (!sheetId) {
      return new Response(
        JSON.stringify({
          success: true,
          message:
            "Maintenance data inserted, but no Google Sheet ID found for property",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    await GoogleService.insertInvoiceToSheet(maintenanceData, sheetId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Maintenance data inserted successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error inserting maintenance data:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const propertyId = url.searchParams.get("propertyId");

    if (!propertyId) {
      return new Response(
        JSON.stringify({ success: false, error: "Property ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const maintenanceData = await MaintenanceService.getMaintenanceByProperty(
      propertyId
    );

    return new Response(JSON.stringify(maintenanceData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching maintenance data:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const maintenanceId = url.searchParams.get("id");

    if (!maintenanceId) {
      return new Response(
        JSON.stringify({ success: false, error: "Maintenance ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await MaintenanceService.deleteMaintenance(maintenanceId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Maintenance data deleted successfully",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting maintenance data:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// lib/services/propertyService.js
static async getAllOwnersForProperty(propertyId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT op.*, p.name as property_name, o.name as owner_name, o.email, o.id, o.template_id,
        op.ownership_percentage
       FROM owner_properties op
       JOIN properties p ON op.property_uid = p.property_uid
       JOIN property_owners o ON op.owner_id = o.id
       WHERE op.property_uid = $1
       ORDER BY op.ownership_date DESC`,
      [propertyId]
    );

    // Map the results to a more usable format
    return result.rows.map(owner => ({
      id: owner.id,
      name: owner.owner_name,
      email: owner.email,
      template_id: owner.template_id,
      ownership_percentage: owner.ownership_percentage
    }));
  } finally {
    client.release();
  }
}
