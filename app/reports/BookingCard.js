import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const BookingCard = ({ booking }) => {
  const formatAmount = (amount) =>
    amount ? Number(amount).toFixed(2) : "0.00";

  return (
    <Card
      sx={{
        backgroundColor: "#eccb34",
        border: "1px solid #eccb34",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        "&:hover": {
          transform: "scale(1.075)",
        },
        zIndex: 10,
      }}
    >
      <CardHeader
        title={booking.guestName || "Unknown Guest"}
        subheader={booking.platform}
        sx={{
          backgroundColor: "#eccb34",
          color: "#fafafa",
          "& .MuiCardHeader-title": { fontSize: "1.2rem" },
          "& .MuiCardHeader-subheader": {
            color: "#fafafa",
            textTransform: "capitalize",
          },
        }}
      />
      <CardContent>
        <Typography
          variant="body2"
          sx={{ color: "#fafafa", fontSize: "1.15rem" }}
        >
          Total Nights:{" "}
          <span style={{ color: "#fafafa" }}>
            {booking.totalNights || "N/A"}
          </span>
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "#fafafa", fontSize: "1.15rem" }}
        >
          Nightly Rate:{" "}
          <span style={{ color: "#fafafa" }}>
            ${booking.nightlyRate ? booking.nightlyRate.toFixed(2) : "0.00"}
          </span>
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "#fafafa", fontSize: "1.15rem" }}
        >
          Base Price:{" "}
          <span style={{ color: "#fafafa" }}>
            ${booking.rawPriceData?.price_total || "0.00"}
          </span>
        </Typography>
        <Accordion sx={{ mt: 1, backgroundColor: "#fafafa" }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: "#eccb34" }} />}
          >
            <Typography sx={{ color: "#eccb34" }}>Nights by Month</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {Object.entries(booking.nightsByMonth || {}).map(
              ([month, nights]) => (
                <Typography
                  key={month}
                  variant="body2"
                  sx={{ color: "#eccb34" }}
                >
                  {month}: {nights} nights
                </Typography>
              )
            )}
          </AccordionDetails>
        </Accordion>
        <Accordion sx={{ mt: 1, backgroundColor: "#fafafa" }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: "#eccb34" }} />}
          >
            <Typography sx={{ color: "#eccb34" }}>Revenue by Month</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {Object.entries(booking.revenueByMonth || {}).map(
              ([month, amount]) => (
                <Typography
                  key={month}
                  variant="body2"
                  sx={{ color: "#eccb34" }}
                >
                  {month}: ${formatAmount(amount)}
                </Typography>
              )
            )}
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default BookingCard;
