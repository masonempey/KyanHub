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
}

module.exports = BookingService;
