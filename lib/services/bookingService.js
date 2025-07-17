import { pool, query } from "@/lib/database";

class BookingService {
  static async insertBooking(bookingData) {
    const client = await pool.connect();
    try {
      // Start transaction
      await client.query("BEGIN");

      // Check if guest exists - use the client directly for transaction
      const guestExists = await client.query(
        "SELECT 1 FROM guests WHERE guest_uid = $1",
        [bookingData.guestUid]
      );

      if (guestExists.rowCount === 0) {
        await client.query(
          `INSERT INTO guests (guest_uid, name, platform_type) VALUES ($1, $2, $3)`,
          [bookingData.guestUid, bookingData.guestName, bookingData.platform]
        );
      }

      // Check if booking exists
      const bookingExists = await client.query(
        "SELECT 1 FROM bookings WHERE booking_code = $1",
        [bookingData.bookingCode]
      );

      if (bookingExists.rowCount > 0) {
        console.log("Booking already exists. Skipping insert.");
        await client.query("ROLLBACK");
        return;
      }

      // Insert booking
      await client.query(
        `INSERT INTO bookings (
          booking_code, guest_name, guest_uid, property_uid, platform, check_in, check_out, 
          total_nights, nightly_rate, base_total, cleaning_fee, cleaning_fee_month
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          bookingData.bookingCode,
          bookingData.guestName,
          bookingData.guestUid,
          bookingData.propertyId,
          bookingData.platform,
          bookingData.checkIn,
          bookingData.checkOut,
          bookingData.totalNights,
          bookingData.nightlyRate,
          bookingData.rawPriceData.price_total,
          bookingData.cleaningFee,
          bookingData.cleaningFeeMonth,
        ]
      );

      // Insert nights_by_month - optimize with Promise.all for parallel execution
      const nightPromises = Object.entries(bookingData.nightsByMonth).map(
        ([month, nights]) =>
          client.query(
            `INSERT INTO nights_by_month (booking_code, month, nights) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (booking_code, month) DO UPDATE SET nights = EXCLUDED.nights`,
            [bookingData.bookingCode, month, nights]
          )
      );

      await Promise.all(nightPromises);

      // Insert revenue_by_month - optimize with Promise.all for parallel execution
      const revenuePromises = Object.entries(bookingData.revenueByMonth).map(
        ([month, revenue]) =>
          client.query(
            `INSERT INTO revenue_by_month (booking_code, month, revenue) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (booking_code, month) DO UPDATE SET revenue = EXCLUDED.revenue`,
            [bookingData.bookingCode, month, revenue]
          )
      );

      await Promise.all(revenuePromises);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error inserting or updating booking:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getRevenueByMonth(propertyId) {
    // Use the optimized query helper instead of manual connection management
    try {
      const result = await query(
        `SELECT 
          r.month,
          r.booking_code,
          b.platform,
          SUM(r.revenue) as total_revenue,
          COUNT(DISTINCT b.booking_code) as booking_count,
          SUM(b.cleaning_fee) as total_cleaning_fees
        FROM revenue_by_month r
        JOIN bookings b ON r.booking_code = b.booking_code
        WHERE b.property_uid = $1
        GROUP BY r.month, r.booking_code, b.platform
        ORDER BY r.month DESC`,
        [propertyId]
      );
      return result.rows;
    } catch (error) {
      console.error("Error fetching revenue by month:", error);
      throw error;
    }
  }

  static async getBookingByCode(bookingCode) {
    const client = await pool.connect();
    try {
      // Get booking details
      const bookingResult = await client.query(
        `SELECT 
          booking_code as "bookingCode", 
          property_uid as "propertyId", 
          guest_name as "guestName", 
          guest_uid as "guestUid", 
          platform, 
          check_in as "checkIn", 
          check_out as "checkOut", 
          total_nights as "totalNights", 
          nightly_rate as "nightlyRate",
          base_total as "baseTotal", 
          cleaning_fee as "cleaningFee",
          cleaning_fee_month as "cleaningFeeMonth",
          (base_total + COALESCE(cleaning_fee, 0)) as "totalAmount"
        FROM bookings
        WHERE booking_code = $1`,
        [bookingCode]
      );

      if (bookingResult.rows.length === 0) {
        return null;
      }

      const booking = bookingResult.rows[0];

      // Get nights by month
      const nightsResult = await client.query(
        `SELECT month, nights FROM nights_by_month WHERE booking_code = $1`,
        [bookingCode]
      );

      const nightsByMonth = nightsResult.rows.reduce((acc, row) => {
        acc[row.month] = row.nights;
        return acc;
      }, {});

      // Get revenue by month
      const revenueResult = await client.query(
        `SELECT month, revenue FROM revenue_by_month WHERE booking_code = $1`,
        [bookingCode]
      );

      const revenueByMonth = revenueResult.rows.reduce((acc, row) => {
        acc[row.month] = row.revenue;
        return acc;
      }, {});

      return {
        ...booking,
        nightsByMonth,
        revenueByMonth,
      };
    } finally {
      client.release();
    }
  }

  static async updateBooking(bookingCode, data) {
    const client = await pool.connect();
    try {
      // Start transaction
      await client.query("BEGIN");

      // Update booking record
      await client.query(
        `UPDATE bookings SET
          property_uid = $1,
          guest_name = $2,
          platform = $3,
          check_in = $4,
          check_out = $5,
          total_nights = $6,
          nightly_rate = $7,
          base_total = $8,
          cleaning_fee = $9,
          cleaning_fee_month = $10
        WHERE booking_code = $11`,
        [
          data.propertyId,
          data.guestName,
          data.platform,
          data.checkIn,
          data.checkOut,
          data.totalNights,
          data.nightlyRate,
          data.totalAmount - data.cleaningFee,
          data.cleaningFee,
          data.cleaningFeeMonth,
          bookingCode,
        ]
      );

      // Update nights_by_month
      // First delete existing records
      await client.query(
        "DELETE FROM nights_by_month WHERE booking_code = $1",
        [bookingCode]
      );

      // Insert new nights_by_month records
      const nightPromises = Object.entries(data.nightsByMonth).map(
        ([month, nights]) =>
          client.query(
            `INSERT INTO nights_by_month (booking_code, month, nights) VALUES ($1, $2, $3)`,
            [bookingCode, month, nights]
          )
      );

      await Promise.all(nightPromises);

      // Update revenue_by_month
      // First delete existing records
      await client.query(
        "DELETE FROM revenue_by_month WHERE booking_code = $1",
        [bookingCode]
      );

      // Insert new revenue_by_month records
      const revenuePromises = Object.entries(data.revenueByMonth).map(
        ([month, revenue]) =>
          client.query(
            `INSERT INTO revenue_by_month (booking_code, month, revenue) VALUES ($1, $2, $3)`,
            [bookingCode, month, revenue]
          )
      );

      await Promise.all(revenuePromises);

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error updating booking:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async searchBookings(filters) {
    const {
      propertyId,
      startDate,
      endDate,
      bookingCode,
      guestName,
      page = 1,
      pageSize = 10,
    } = filters;

    // Construct base query for counting total results
    let countQuery = `
      SELECT COUNT(*) as total
      FROM bookings b
      WHERE 1=1
    `;

    // Construct base query for fetching paginated results
    let query = `
      SELECT 
        b.booking_code as "bookingCode", 
        b.property_uid as "propertyId", 
        b.guest_name as "guestName", 
        b.guest_uid as "guestUid", 
        b.platform, 
        b.check_in as "checkIn", 
        b.check_out as "checkOut", 
        b.total_nights as "totalNights", 
        b.nightly_rate as "nightlyRate",
        b.base_total as "baseTotal", 
        b.cleaning_fee as "cleaningFee",
        b.cleaning_fee_month as "cleaningFeeMonth",
        (b.base_total + COALESCE(b.cleaning_fee, 0)) as "totalAmount"
      FROM bookings b
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];

    // Add filters to both queries
    if (propertyId) {
      params.push(propertyId);
      countParams.push(propertyId);
      const condition = ` AND b.property_uid = $${params.length}`;
      query += condition;
      countQuery += condition;
    }

    if (startDate) {
      params.push(startDate);
      countParams.push(startDate);
      const condition = ` AND b.check_in >= $${params.length}`;
      query += condition;
      countQuery += condition;
    }

    if (endDate) {
      params.push(endDate);
      countParams.push(endDate);
      const condition = ` AND b.check_in <= $${params.length}`;
      query += condition;
      countQuery += condition;
    }

    if (bookingCode) {
      params.push(`%${bookingCode}%`);
      countParams.push(`%${bookingCode}%`);
      const condition = ` AND b.booking_code ILIKE $${params.length}`;
      query += condition;
      countQuery += condition;
    }

    if (guestName) {
      params.push(`%${guestName}%`);
      countParams.push(`%${guestName}%`);
      const condition = ` AND b.guest_name ILIKE $${params.length}`;
      query += condition;
      countQuery += condition;
    }

    // Add order by
    query += ` ORDER BY b.check_in DESC`;

    // Add pagination
    const offset = (page - 1) * pageSize;
    params.push(pageSize);
    params.push(offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    // Execute queries
    const client = await pool.connect();
    try {
      // Get total count first
      const countResult = await client.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].total, 10);

      // Then get paginated results
      const result = await client.query(query, params);

      // Get additional data for this page of bookings only
      const bookings = await Promise.all(
        result.rows.map(async (booking) => {
          // Get nights by month
          const nightsResult = await client.query(
            `SELECT month, nights FROM nights_by_month WHERE booking_code = $1`,
            [booking.bookingCode] // Using the aliased column name
          );

          const nightsByMonth = nightsResult.rows.reduce((acc, row) => {
            acc[row.month] = row.nights;
            return acc;
          }, {});

          // Get revenue by month
          const revenueResult = await client.query(
            `SELECT month, revenue FROM revenue_by_month WHERE booking_code = $1`,
            [booking.bookingCode] // Using the aliased column name
          );

          const revenueByMonth = revenueResult.rows.reduce((acc, row) => {
            acc[row.month] = row.revenue;
            return acc;
          }, {});

          return {
            ...booking,
            nightsByMonth,
            revenueByMonth,
          };
        })
      );

      return { bookings, totalCount };
    } finally {
      client.release();
    }
  }

  static async deleteBooking(bookingCode) {
    const client = await pool.connect();
    try {
      // Start transaction
      await client.query("BEGIN");

      // Delete related nights_by_month records
      await client.query(
        "DELETE FROM nights_by_month WHERE booking_code = $1",
        [bookingCode]
      );

      // Delete related revenue_by_month records
      await client.query(
        "DELETE FROM revenue_by_month WHERE booking_code = $1",
        [bookingCode]
      );

      // Delete the booking record
      const result = await client.query(
        "DELETE FROM bookings WHERE booking_code = $1 RETURNING booking_code",
        [bookingCode]
      );

      // Check if the booking was found and deleted
      if (result.rows.length === 0) {
        throw new Error(`Booking with code ${bookingCode} not found`);
      }

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error deleting booking:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = BookingService;
