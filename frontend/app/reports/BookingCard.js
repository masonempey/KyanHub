import styles from "./BookingCard.module.css";

const BookingCard = ({ booking }) => {
  const formatAmount = (amount) =>
    amount ? Number(amount).toFixed(2) : "0.00";

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3>{booking.guestName}</h3>
        <span className={styles.platform}>{booking.platform}</span>
      </div>
      <div className={styles.details}>
        <div className={styles.row}>
          <span>Total Nights:</span>
          <span>{booking.totalNights}</span>
        </div>
        <div className={styles.row}>
          <span>Nightly Rate:</span>
          <span>
            ${booking.nightlyRate ? booking.nightlyRate.toFixed(2) : "0.00"}
          </span>
        </div>
        <div className={styles.row}>
          <span>Base Price:</span>
          <span>
            $
            {booking.rawPriceData?.price_base
              ? booking.rawPriceData.price_base
              : "0.00"}
          </span>
        </div>
        <div className={styles.nights}>
          <span>Nights by Month:</span>
          {Object.entries(booking.nightsByMonth || {}).map(
            ([month, nights]) => (
              <div key={month} className={styles.monthRow}>
                <span>{month}:</span>
                <span>{nights} nights</span>
              </div>
            )
          )}
        </div>
        <div className={styles.revenue}>
          <span>Revenue by Month:</span>
          {Object.entries(booking.revenueByMonth || {}).map(
            ([month, amount]) => (
              <div key={month} className={styles.monthRow}>
                <span>{month}:</span>
                <span>${formatAmount(amount)}</span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingCard;
