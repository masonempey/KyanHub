import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
} from "@mui/material";

const BookingComparison = ({ igmsBookings, databaseBookings }) => {
  // Create maps for quick lookup
  const igmsBookingsMap = new Map(
    igmsBookings.map((booking) => [booking.bookingCode, booking])
  );

  const dbBookingsMap = new Map(
    databaseBookings.map((booking) => [booking.bookingCode, booking])
  );

  // Find bookings that exist in both sources
  const commonBookingCodes = [...igmsBookingsMap.keys()].filter((code) =>
    dbBookingsMap.has(code)
  );

  // Find bookings only in IGMS
  const igmsOnlyBookings = [...igmsBookingsMap.keys()].filter(
    (code) => !dbBookingsMap.has(code)
  );

  // Find bookings only in database (e.g., manual bookings)
  const dbOnlyBookings = [...dbBookingsMap.keys()].filter(
    (code) => !igmsBookingsMap.has(code)
  );

  // Find differences in common bookings
  const changedBookings = commonBookingCodes.filter((code) => {
    const igmsBooking = igmsBookingsMap.get(code);
    const dbBooking = dbBookingsMap.get(code);

    // Compare relevant fields
    return (
      igmsBooking.guestName !== dbBooking.guestName ||
      igmsBooking.checkIn !== dbBooking.checkIn ||
      igmsBooking.checkOut !== dbBooking.checkOut ||
      igmsBooking.totalAmount !== dbBooking.totalAmount ||
      igmsBooking.platform !== dbBooking.platform
    );
  });

  return (
    <div>
      <Typography variant="h6" gutterBottom>
        Booking Comparison
      </Typography>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <Typography variant="subtitle2" color="success.main" gutterBottom>
            Matching Bookings
          </Typography>
          <Typography variant="h5" fontWeight="bold">
            {commonBookingCodes.length - changedBookings.length}
          </Typography>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Typography variant="subtitle2" color="warning.main" gutterBottom>
            Changed Bookings
          </Typography>
          <Typography variant="h5" fontWeight="bold">
            {changedBookings.length}
          </Typography>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Typography variant="subtitle2" color="info.main" gutterBottom>
            Manual / Custom Bookings
          </Typography>
          <Typography variant="h5" fontWeight="bold">
            {dbOnlyBookings.length}
          </Typography>
        </div>
      </div>

      {changedBookings.length > 0 && (
        <div className="mb-4">
          <Typography variant="subtitle1" gutterBottom>
            Modified Bookings
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Booking Code</TableCell>
                  <TableCell>Guest Name</TableCell>
                  <TableCell>Check In</TableCell>
                  <TableCell>Check Out</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {changedBookings.map((code) => {
                  const igmsBooking = igmsBookingsMap.get(code);
                  const dbBooking = dbBookingsMap.get(code);

                  return (
                    <TableRow key={code}>
                      <TableCell>{code}</TableCell>
                      <TableCell>
                        {igmsBooking.guestName !== dbBooking.guestName ? (
                          <div className="text-amber-700">
                            <div>{dbBooking.guestName}</div>
                            <div className="text-xs text-gray-500">
                              (IGMS: {igmsBooking.guestName})
                            </div>
                          </div>
                        ) : (
                          dbBooking.guestName
                        )}
                      </TableCell>
                      <TableCell>
                        {igmsBooking.checkIn !== dbBooking.checkIn ? (
                          <div className="text-amber-700">
                            <div>
                              {new Date(dbBooking.checkIn).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              (IGMS:{" "}
                              {new Date(
                                igmsBooking.checkIn
                              ).toLocaleDateString()}
                              )
                            </div>
                          </div>
                        ) : (
                          new Date(dbBooking.checkIn).toLocaleDateString()
                        )}
                      </TableCell>
                      <TableCell>
                        {igmsBooking.checkOut !== dbBooking.checkOut ? (
                          <div className="text-amber-700">
                            <div>
                              {new Date(
                                dbBooking.checkOut
                              ).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              (IGMS:{" "}
                              {new Date(
                                igmsBooking.checkOut
                              ).toLocaleDateString()}
                              )
                            </div>
                          </div>
                        ) : (
                          new Date(dbBooking.checkOut).toLocaleDateString()
                        )}
                      </TableCell>
                      <TableCell>
                        {parseFloat(igmsBooking.totalAmount) !==
                        parseFloat(dbBooking.totalAmount) ? (
                          <div className="text-amber-700">
                            <div>
                              ${parseFloat(dbBooking.totalAmount).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              (IGMS: $
                              {parseFloat(igmsBooking.totalAmount).toFixed(2)})
                            </div>
                          </div>
                        ) : (
                          `$${parseFloat(dbBooking.totalAmount).toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label="Modified"
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}
    </div>
  );
};

export default BookingComparison;
