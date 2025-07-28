import { pool } from "@/lib/database";

class MonthEndService {
  static async getMonthEndStatus(propertyId, year, monthNumber) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM property_month_end 
         WHERE property_id = $1 AND year = $2 AND month_number = $3`,
        [propertyId, year, monthNumber]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  static async updateInventoryStatus(
    propertyId,
    propertyName,
    year,
    month,
    monthNumber,
    invoiceId,
    totalAmount
  ) {
    const client = await pool.connect();
    try {
      // Check if record exists
      const existingRecord = await client.query(
        `SELECT id FROM property_month_end 
         WHERE property_id = $1 AND year = $2 AND month_number = $3`,
        [propertyId, year, monthNumber]
      );

      if (existingRecord.rows.length > 0) {
        // Update existing record
        const result = await client.query(
          `UPDATE property_month_end SET
            property_name = $1,
            inventory_invoice_generated = TRUE,
            inventory_invoice_date = CURRENT_TIMESTAMP,
            inventory_invoice_id = $2,
            inventory_total_amount = $3,
            updated_at = CURRENT_TIMESTAMP
           WHERE property_id = $4 AND year = $5 AND month_number = $6
           RETURNING *`,
          [propertyName, invoiceId, totalAmount, propertyId, year, monthNumber]
        );
        return result.rows[0];
      } else {
        // Insert new record
        const result = await client.query(
          `INSERT INTO property_month_end (
            property_id, property_name, year, month, month_number,
            inventory_invoice_generated, inventory_invoice_date, 
            inventory_invoice_id, inventory_total_amount
          ) VALUES (
            $1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP, $6, $7
          ) RETURNING *`,
          [
            propertyId,
            propertyName,
            year,
            month,
            monthNumber,
            invoiceId,
            totalAmount,
          ]
        );
        return result.rows[0];
      }
    } finally {
      client.release();
    }
  }

  static async updateRevenueStatus(
    propertyId,
    propertyName,
    year,
    month,
    monthNumber,
    revenueAmount,
    cleaningAmount,
    expensesAmount,
    netAmount,
    bookingsCount,
    sheetId,
    ownerPercentage // Keep this parameter for calculating owner_profit
  ) {
    const client = await pool.connect();
    try {
      // Calculate owner_profit based on net_amount and ownership percentage
      const ownerProfit = ownerPercentage
        ? (netAmount * ownerPercentage) / 100
        : null;

      // Check if record exists
      const existingRecord = await client.query(
        `SELECT id FROM property_month_end 
         WHERE property_id = $1 AND year = $2 AND month_number = $3`,
        [propertyId, year, monthNumber]
      );

      if (existingRecord.rows.length > 0) {
        // Update existing record - Add owner_percentage
        const result = await client.query(
          `UPDATE property_month_end SET
            property_name = $1,
            revenue_updated = TRUE,
            revenue_update_date = CURRENT_TIMESTAMP,
            revenue_amount = $2,
            cleaning_fees_amount = $3,
            expenses_amount = $4,
            net_amount = $5,
            bookings_count = $6,
            sheet_id = $7,
            owner_profit = $11,
            owner_percentage = $12,
            updated_at = CURRENT_TIMESTAMP
           WHERE property_id = $8 AND year = $9 AND month_number = $10
           RETURNING *`,
          [
            propertyName,
            revenueAmount,
            cleaningAmount,
            expensesAmount,
            netAmount,
            bookingsCount,
            sheetId,
            propertyId,
            year,
            monthNumber,
            ownerProfit, // Store the calculated owner_profit
            ownerPercentage, // Also store the owner_percentage
          ]
        );
        return result.rows[0];
      } else {
        // Insert new record - Add owner_percentage
        const result = await client.query(
          `INSERT INTO property_month_end (
            property_id, property_name, year, month, month_number,
            revenue_updated, revenue_update_date, revenue_amount, 
            cleaning_fees_amount, expenses_amount, net_amount,
            bookings_count, sheet_id, owner_profit, owner_percentage
          ) VALUES (
            $1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP, 
            $6, $7, $8, $9, $10, $11, $12, $13
          ) RETURNING *`,
          [
            propertyId,
            propertyName,
            year,
            month,
            monthNumber,
            revenueAmount,
            cleaningAmount,
            expensesAmount,
            netAmount,
            bookingsCount,
            sheetId,
            ownerProfit,
            ownerPercentage, // Also store the owner_percentage
          ]
        );
        return result.rows[0];
      }
    } finally {
      client.release();
    }
  }

  static async updateEmailStatus(
    propertyId,
    year,
    monthNumber,
    ownerId,
    ownerName,
    ownerProfit
  ) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE property_month_end SET
          owner_email_sent = TRUE,
          owner_email_date = CURRENT_TIMESTAMP,
          owner_id = $1,
          owner_name = $2,
          owner_profit = $3,
          updated_at = CURRENT_TIMESTAMP
         WHERE property_id = $4 AND year = $5 AND month_number = $6
         RETURNING *`,
        [ownerId, ownerName, ownerProfit, propertyId, year, monthNumber]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async validateRevenueUpdate(
    propertyId,
    year,
    monthNumber,
    autoCreateInventory = false
  ) {
    const client = await pool.connect();
    try {
      console.log(
        `Validating revenue update for property ${propertyId}, year ${year}, month ${monthNumber}`
      );

      // Check if inventory invoice has been generated
      const inventoryCheck = await client.query(
        `SELECT * FROM property_month_end 
         WHERE property_id = $1 AND year = $2 AND month_number = $3`,
        [propertyId, parseInt(year), parseInt(monthNumber)]
      );

      console.log(`Found ${inventoryCheck.rows.length} matching records`);

      if (inventoryCheck.rows.length > 0) {
        console.log("Property month end record:", {
          property_id: inventoryCheck.rows[0].property_id,
          invoice_generated: inventoryCheck.rows[0].inventory_invoice_generated,
          invoice_id: inventoryCheck.rows[0].inventory_invoice_id,
        });

        // Store the status data from the query result for later use
        const status = inventoryCheck.rows[0];

        const inventoryReady =
          status.inventory_invoice_generated === true &&
          status.inventory_invoice_id !== null;

        if (!inventoryReady) {
          const propertyName = status.property_name || `Property ${propertyId}`;
          return {
            canUpdate: false,
            inventoryReady: false,
            message: `Inventory invoice must be generated for ${propertyName} before updating revenue`,
            propertyName: propertyName,
          };
        }

        // Check if revenue has already been updated
        if (status.revenue_updated) {
          return {
            canUpdate: false,
            inventoryReady: true,
            message: `Revenue for ${status.month} ${
              status.year
            } has already been updated on ${new Date(
              status.revenue_update_date
            ).toLocaleDateString()}`,
          };
        }

        return {
          canUpdate: true,
          inventoryReady: true,
          message: "Ready to update revenue",
        };
      } else {
        // No record exists yet
        const propertyResult = await client.query(
          `SELECT name FROM properties WHERE property_uid = $1`,
          [propertyId]
        );

        const propertyName =
          propertyResult.rows.length > 0
            ? propertyResult.rows[0].name
            : `Property ${propertyId}`;

        return {
          canUpdate: false,
          inventoryReady: false,
          message: `Inventory invoice must be generated for ${propertyName} before updating revenue`,
          propertyName,
        };
      }
    } finally {
      client.release();
    }
  }

  static async getCompletedReports(year, month, monthNumber) {
    const client = await pool.connect();
    try {
      console.log(
        `Searching for reports: year=${year}, month=${month}, monthNumber=${monthNumber}`
      );

      // Just retrieve the records as-is without trying to calculate owner_profit
      const result = await client.query(
        `SELECT * FROM property_month_end 
         WHERE year = $1 AND month_number = $2
         AND revenue_updated = TRUE
         ORDER BY property_name ASC`,
        [year, monthNumber]
      );

      console.log(`Found ${result.rows.length} completed reports`);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get all property statuses for a specific month and year
   * @param {number} year - The year
   * @param {number} monthNumber - The month number (1-12)
   * @returns {Promise<Array>} Array of property status objects
   */
  static async getAllPropertyStatuses(year, monthNumber) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        SELECT 
          p.property_uid as id, 
          p.name, 
          o.id as "ownerId",
          o.name as "ownerName",
          o.email as "ownerEmail",
          pme.status,
          pme.updated_at as "lastUpdated",
          pme.revenue_amount as "revenue",
          pme.bookings_count as "bookingCount"
        FROM 
          properties p
        LEFT JOIN 
          owner_properties op ON p.property_uid = op.property_uid
        LEFT JOIN 
          property_owners o ON op.owner_id = o.id
        LEFT JOIN 
          property_month_end pme ON p.property_uid = pme.property_id 
          AND pme.year = $1 AND pme.month_number = $2
        ORDER BY 
          p.name ASC
      `,
        [year, monthNumber]
      );

      // Format the response - Keep this part the same
      return result.rows.map((prop) => {
        return {
          propertyId: prop.id,
          name: prop.name,
          owner: prop.ownerId
            ? {
                id: prop.ownerId,
                name: prop.ownerName,
                email: prop.ownerEmail,
              }
            : null,
          status: prop.status || "draft",
          lastUpdated: prop.lastUpdated || null,
          revenue: prop.revenue || 0,
          bookingCount: prop.bookingCount || 0,
        };
      });
    } finally {
      client.release();
    }
  }

  /**
   * Update the status of a property's month-end record
   * @param {string} propertyId - The property ID
   * @param {number} year - The year
   * @param {number} monthNumber - The month number (1-12)
   * @param {string} status - The status to set ('draft', 'ready', or 'complete')
   * @returns {Promise<Object>} The updated property month-end record
   */
  static async updateMonthEndStatus(propertyId, year, monthNumber, status) {
    if (!["draft", "ready", "complete"].includes(status)) {
      throw new Error(
        `Invalid status: ${status}. Must be 'draft', 'ready', or 'complete'`
      );
    }

    // Validate monthNumber is provided and is a valid number
    if (
      monthNumber === undefined ||
      monthNumber === null ||
      isNaN(parseInt(monthNumber))
    ) {
      throw new Error(
        `Month number is required and must be a valid number between 1-12, got: ${monthNumber}`
      );
    }

    // Convert to integer if it's a string
    const monthNum = parseInt(monthNumber, 10);

    // Validate month number range
    if (monthNum < 1 || monthNum > 12) {
      throw new Error(
        `Month number must be between 1 and 12, got: ${monthNum}`
      );
    }

    const client = await pool.connect();
    try {
      // Check if record exists
      const existingRecord = await client.query(
        `SELECT id FROM property_month_end 
         WHERE property_id = $1 AND year = $2 AND month_number = $3`,
        [propertyId, year, monthNum]
      );

      if (existingRecord.rows.length > 0) {
        // Update existing record
        const result = await client.query(
          `UPDATE property_month_end SET
            status = $1,
            updated_at = CURRENT_TIMESTAMP
           WHERE property_id = $2 AND year = $3 AND month_number = $4
           RETURNING *`,
          [status, propertyId, year, monthNum]
        );
        return result.rows[0];
      } else {
        // First get the property name from the properties table
        const propertyQuery = await client.query(
          `SELECT name FROM properties WHERE property_uid = $1`,
          [propertyId]
        );

        const propertyName =
          propertyQuery.rows.length > 0
            ? propertyQuery.rows[0].name
            : `Property ${propertyId}`; // Fallback name

        // Get month name based on month number
        const monthNames = [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];
        const monthName = monthNames[monthNum - 1];

        console.log(
          `Creating new month-end record for ${propertyName} (${propertyId}), ${monthName} ${year}, month #${monthNum}`
        );

        // Insert new record with all required fields
        const result = await client.query(
          `INSERT INTO property_month_end (
            property_id, property_name, year, month, month_number, status, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP
          ) RETURNING *`,
          [propertyId, propertyName, year, monthName, monthNum, status]
        );
        return result.rows[0];
      }
    } catch (error) {
      console.error("Error updating month-end status:", error, {
        propertyId,
        year,
        monthNumber: monthNum,
        status,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Safely updates a property's revenue sheet and sets status
   * @param {object} params - Update parameters
   * @param {string} params.propertyId - The property ID
   * @param {string} params.propertyName - The property name
   * @param {number} params.year - The year
   * @param {string} params.month - The month name
   * @param {number} params.monthNumber - The month number (1-12)
   * @param {number} params.revenueAmount - The revenue amount
   * @param {number} params.cleaningAmount - The cleaning fees amount
   * @param {number} params.expensesAmount - The expenses amount
   * @param {number} params.netAmount - The net amount
   * @param {number} params.bookingsCount - The number of bookings
   * @param {string} params.sheetId - The Google Sheet ID
   * @param {number} params.ownerPercentage - The owner's percentage
   * @param {string} params.status - The status to set ('ready' or 'complete')
   * @returns {Promise<Object>} The updated property month-end record
   */
  static async updateRevenueAndStatus(params) {
    const {
      propertyId,
      propertyName,
      year,
      month,
      monthNumber,
      revenueAmount,
      cleaningAmount,
      expensesAmount,
      netAmount,
      bookingsCount,
      sheetId,
      ownerPercentage,
      status,
    } = params;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Calculate owner profit based on net amount and ownership percentage
      const ownerProfit = ownerPercentage
        ? (netAmount * ownerPercentage) / 100
        : null;

      // Always update the record, ignoring existing data
      const query = `
        INSERT INTO property_month_end (
          property_id, property_name, year, month, month_number,
          revenue_updated, revenue_update_date, revenue_amount, 
          cleaning_fees_amount, expenses_amount, net_amount,
          bookings_count, sheet_id, owner_profit, owner_percentage, status
        ) VALUES (
          $1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP, 
          $6, $7, $8, $9, $10, $11, $12, $13, $14
        )
        ON CONFLICT (property_id, year, month_number)
        DO UPDATE SET
          property_name = EXCLUDED.property_name,
          revenue_updated = TRUE,
          revenue_update_date = CURRENT_TIMESTAMP,
          revenue_amount = EXCLUDED.revenue_amount,
          cleaning_fees_amount = EXCLUDED.cleaning_fees_amount,
          expenses_amount = EXCLUDED.expenses_amount,
          net_amount = EXCLUDED.net_amount,
          bookings_count = EXCLUDED.bookings_count,
          sheet_id = EXCLUDED.sheet_id,
          owner_profit = EXCLUDED.owner_profit,
          owner_percentage = EXCLUDED.owner_percentage,
          status = EXCLUDED.status,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const values = [
        propertyId,
        propertyName,
        year,
        month,
        monthNumber,
        revenueAmount,
        cleaningAmount,
        expensesAmount,
        netAmount,
        bookingsCount,
        sheetId,
        ownerProfit,
        ownerPercentage,
        status,
      ];

      const result = await client.query(query, values);

      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error updating revenue and status:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default MonthEndService;
