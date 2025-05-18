import { useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const BookingCard = ({ booking }) => {
  const [showNights, setShowNights] = useState(false);
  const [showRevenue, setShowRevenue] = useState(false);

  const formatAmount = (amount) =>
    amount ? Number(amount).toFixed(2) : "0.00";

  return (
    <div className="bg-white rounded-lg border border-primary/30 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      {/* Header */}
      <div className="bg-primary/10 p-3">
        <h3 className="font-semibold text-dark">
          {booking.guestName || "Unknown Guest"}
        </h3>
        <div className="flex justify-between">
          <p className="text-sm text-dark/70 capitalize">{booking.platform}</p>
          {booking.propertyName && (
            <p className="text-sm text-dark/70 font-medium">
              {booking.propertyName}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="mb-2 flex justify-between">
          <span className="text-dark text-sm">Total Nights:</span>
          <span className="text-dark font-medium">
            {booking.totalNights || "N/A"}
          </span>
        </div>

        <div className="mb-2 flex justify-between">
          <span className="text-dark text-sm">Nightly Rate:</span>
          <span className="text-dark font-medium">
            ${booking.nightlyRate ? booking.nightlyRate.toFixed(2) : "0.00"}
          </span>
        </div>

        <div className="mb-3 flex justify-between">
          <span className="text-dark text-sm">Base Price:</span>
          <span className="text-dark font-medium">
            ${booking.rawPriceData?.price_total || "0.00"}
          </span>
        </div>

        {/* Nights by Month Dropdown */}
        <div className="mb-2 border-t border-primary/10 pt-2">
          <button
            onClick={() => setShowNights(!showNights)}
            className="w-full flex items-center justify-between p-2 bg-primary/5 rounded text-sm text-dark hover:bg-primary/10 transition-colors"
          >
            <span>Nights by Month</span>
            <ExpandMoreIcon
              className={`text-primary transition-transform ${
                showNights ? "rotate-180" : ""
              }`}
              fontSize="small"
            />
          </button>

          {showNights && (
            <div className="p-2 bg-white border border-primary/10 mt-1 rounded-lg">
              {Object.entries(booking.nightsByMonth || {}).map(
                ([month, nights]) => (
                  <div
                    key={month}
                    className="flex justify-between text-sm py-1"
                  >
                    <span className="text-dark">{month}:</span>
                    <span className="text-dark font-medium">
                      {nights} nights
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Revenue by Month Dropdown */}
        <div className="border-t border-primary/10 pt-2">
          <button
            onClick={() => setShowRevenue(!showRevenue)}
            className="w-full flex items-center justify-between p-2 bg-primary/5 rounded text-sm text-dark hover:bg-primary/10 transition-colors"
          >
            <span>Revenue by Month</span>
            <ExpandMoreIcon
              className={`text-primary transition-transform ${
                showRevenue ? "rotate-180" : ""
              }`}
              fontSize="small"
            />
          </button>

          {showRevenue && (
            <div className="p-2 bg-white border border-primary/10 mt-1 rounded-lg">
              {Object.entries(booking.revenueByMonth || {}).map(
                ([month, amount]) => (
                  <div
                    key={month}
                    className="flex justify-between text-sm py-1"
                  >
                    <span className="text-dark">{month}:</span>
                    <span className="text-dark font-medium">
                      ${formatAmount(amount)}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingCard;
