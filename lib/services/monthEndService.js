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
    const status = await this.getMonthEndStatus(propertyId, year, monthNumber);

    // If no status exists yet or inventory hasn't been generated
    if (!status || !status.inventory_invoice_generated) {
      if (autoCreateInventory) {
        // Auto-generate inventory
        console.log(`Auto-generating inventory for property ${propertyId}`);
        return {
          canUpdate: true,
          needsInventory: true,
          message: "Inventory will be auto-generated",
        };
      } else {
        return {
          canUpdate: false,
          message:
            "Inventory invoice must be generated before updating revenue",
        };
      }
    }

    // Check if revenue has already been updated
    if (status.revenue_updated) {
      return {
        canUpdate: false,
        message: `Revenue for ${status.month} ${
          status.year
        } has already been updated on ${new Date(
          status.revenue_update_date
        ).toLocaleDateString()}`,
      };
    }

    return {
      canUpdate: true,
      message: "Ready to update revenue",
    };
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
}

export default MonthEndService;
