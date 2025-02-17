const { pool } = require("../../database/initDatabase");

class BookingService {
  static async insertBooking(bookingData) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if guest exists
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

      console.log("Inserting booking data:", bookingData);

      // Insert booking
      await client.query(
        `INSERT INTO bookings (
          booking_code, guest_name, guest_uid, property_uid, platform, check_in, check_out, 
          total_nights, nightly_rate, total, base_total, cleaning_fee, cleaning_fee_month
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
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
          bookingData.total,
          bookingData.baseTotal,
          bookingData.cleaningFee,
          bookingData.cleaningFeeMonth,
        ]
      );

      // Insert nights_by_month
      for (const [month, nights] of Object.entries(bookingData.nightsByMonth)) {
        await client.query(
          `INSERT INTO nights_by_month (booking_code, month, nights) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (booking_code, month) DO UPDATE SET nights = EXCLUDED.nights`,
          [bookingData.bookingCode, month, nights]
        );
      }

      // Insert revenue_by_month
      for (const [month, revenue] of Object.entries(
        bookingData.revenueByMonth
      )) {
        await client.query(
          `INSERT INTO revenue_by_month (booking_code, month, revenue) 
           VALUES ($1, $2, $3) 
           ON CONFLICT (booking_code, month) DO UPDATE SET revenue = EXCLUDED.revenue`,
          [bookingData.bookingCode, month, revenue]
        );
      }

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
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          r.month,
          SUM(r.revenue) as total_revenue,
          COUNT(DISTINCT b.booking_code) as booking_count,
          SUM(b.cleaning_fee) as total_cleaning_fees
        FROM revenue_by_month r
        JOIN bookings b ON r.booking_code = b.booking_code
        WHERE b.property_uid = $1
        GROUP BY r.month
        ORDER BY r.month DESC`,
        [propertyId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
}

module.exports = BookingService;
