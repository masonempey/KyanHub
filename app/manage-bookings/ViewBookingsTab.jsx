import { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  IconButton,
  InputAdornment,
  TablePagination,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import dayjs from "dayjs";
import fetchWithAuth from "@/lib/fetchWithAuth";
import MultiPropertySelector from "@/app/components/MultiPropertySelector";
import EditBookingForm from "./EditBookingForm";

const ViewBookingsTab = ({ properties, onSuccess, onError }) => {
  // State for search filters
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [startDate, setStartDate] = useState(dayjs().subtract(30, "day"));
  const [endDate, setEndDate] = useState(dayjs());
  const [bookingCode, setBookingCode] = useState("");
  const [guestName, setGuestName] = useState("");

  // State for results
  const [bookings, setBookings] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // State for editing
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);

  // Load bookings on initial render
  useEffect(() => {
    searchBookings();
  }, []); // Empty dependency array for initial load

  const handlePropertyChange = (selectedProps) => {
    if (selectedProps.length > 0) {
      setSelectedProperty(selectedProps[0]);
    } else {
      setSelectedProperty(null);
    }
  };

  const searchBookings = async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams();
      if (selectedProperty) params.append("propertyId", selectedProperty);
      if (startDate) params.append("startDate", startDate.format("YYYY-MM-DD"));
      if (endDate) params.append("endDate", endDate.format("YYYY-MM-DD"));
      if (bookingCode) params.append("bookingCode", bookingCode);
      if (guestName) params.append("guestName", guestName);

      // Add pagination params
      params.append("page", page + 1); // API uses 1-based indexing
      params.append("pageSize", rowsPerPage);

      const response = await fetchWithAuth(
        `/api/bookings?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${await response.text()}`);
      }

      const data = await response.json();
      setBookings(data.bookings || []);
      setTotalCount(data.totalCount || 0);
    } catch (error) {
      console.error("Error searching bookings:", error);
      if (onError) onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBooking = (booking) => {
    setSelectedBooking(booking);
    setEditModalOpen(true);
  };

  const handleSaveBooking = async (updatedBooking) => {
    try {
      const response = await fetchWithAuth(
        `/api/bookings/${updatedBooking.bookingCode}`,
        {
          method: "PUT",
          body: JSON.stringify(updatedBooking),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update booking: ${await response.text()}`);
      }

      // Update the local list of bookings
      setBookings(
        bookings.map((b) =>
          b.bookingCode === updatedBooking.bookingCode ? updatedBooking : b
        )
      );

      setEditModalOpen(false);
      if (onSuccess) onSuccess("Booking updated successfully");
    } catch (error) {
      console.error("Error updating booking:", error);
      if (onError) onError(error.message);
    }
  };

  const handleDeleteBooking = (booking) => {
    setBookingToDelete(booking);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteBooking = async () => {
    if (!bookingToDelete) return;

    try {
      const response = await fetchWithAuth(
        `/api/bookings/${bookingToDelete.bookingCode}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete booking: ${await response.text()}`);
      }

      // Remove the booking from the list
      setBookings(
        bookings.filter((b) => b.bookingCode !== bookingToDelete.bookingCode)
      );

      // Close the dialog
      setDeleteDialogOpen(false);
      setBookingToDelete(null);

      // If we just deleted the last item on a page, go back one page
      if (bookings.length === 1 && page > 0) {
        setPage(page - 1);
      }

      // Refresh the data
      searchBookings();

      if (onSuccess) onSuccess("Booking deleted successfully");
    } catch (error) {
      console.error("Error deleting booking:", error);
      if (onError) onError(error.message);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    // Re-fetch data when page changes
    searchBookings();
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    // Re-fetch data when rows per page changes
    searchBookings();
  };

  return (
    <div className="p-6">
      {/* Search Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-xl font-semibold mb-4">Search Bookings</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <MultiPropertySelector
              properties={properties}
              selectedProperties={selectedProperty ? [selectedProperty] : []}
              onChange={handlePropertyChange}
              loading={loading}
              label="Select Property"
              singleSelection={true}
            />
          </div>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="From Date"
              value={startDate}
              onChange={setStartDate}
              disabled={loading}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "small",
                  sx: {
                    "& .MuiOutlinedInput-root": {
                      borderColor: "#eccb34",
                    },
                  },
                },
              }}
            />
          </LocalizationProvider>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="To Date"
              value={endDate}
              onChange={setEndDate}
              disabled={loading}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "small",
                  sx: {
                    "& .MuiOutlinedInput-root": {
                      borderColor: "#eccb34",
                    },
                  },
                },
              }}
            />
          </LocalizationProvider>

          <TextField
            label="Booking Code"
            value={bookingCode}
            onChange={(e) => setBookingCode(e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label="Guest Name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
        </div>

        <div className="flex justify-end">
          <Button
            variant="contained"
            onClick={searchBookings}
            disabled={loading}
            sx={{
              bgcolor: "#eccb34",
              color: "#333",
              "&:hover": { bgcolor: "#d4b02a" },
              textTransform: "none",
            }}
          >
            {loading ? <CircularProgress size={24} /> : "Search Bookings"}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 650 }} size="small">
            <TableHead sx={{ backgroundColor: "rgba(236, 203, 52, 0.1)" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold" }}>Booking Code</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Property</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Guest</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Check In</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Check Out</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Platform</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Total</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow key="loading-row">
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <CircularProgress sx={{ color: "#eccb34" }} />
                  </TableCell>
                </TableRow>
              ) : bookings.length === 0 ? (
                <TableRow key="no-bookings-row">
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    No bookings found
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <TableRow key={booking.bookingCode} hover>
                    <TableCell>{booking.bookingCode}</TableCell>
                    <TableCell>
                      {properties[booking.propertyId]?.name ||
                        booking.propertyId}
                    </TableCell>
                    <TableCell>{booking.guestName}</TableCell>
                    <TableCell>
                      {new Date(booking.checkIn).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(booking.checkOut).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={booking.platform}
                        size="small"
                        sx={{
                          bgcolor:
                            booking.platform === "airbnb"
                              ? "#FF5A5F20"
                              : booking.platform === "vrbo"
                              ? "#3D5CAE20"
                              : booking.platform === "booking.com"
                              ? "#00358020"
                              : booking.platform === "expedia"
                              ? "#00355F20"
                              : booking.platform === "direct"
                              ? "#28A74520"
                              : "#EEEEEE",
                          color:
                            booking.platform === "airbnb"
                              ? "#FF5A5F"
                              : booking.platform === "vrbo"
                              ? "#3D5CAE"
                              : booking.platform === "booking.com"
                              ? "#003580"
                              : booking.platform === "expedia"
                              ? "#00355F"
                              : booking.platform === "direct"
                              ? "#28A745"
                              : "#666666",
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      ${parseFloat(booking.totalAmount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex">
                        <IconButton
                          size="small"
                          onClick={() => handleEditBooking(booking)}
                          sx={{ color: "#eccb34", mr: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>

                        <IconButton
                          size="small"
                          onClick={() => handleDeleteBooking(booking)}
                          sx={{ color: "#d32f2f" }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </TableContainer>
      </div>

      {/* Edit Booking Modal */}
      <Dialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
          },
        }}
      >
        <DialogTitle sx={{ borderBottom: "1px solid #eee" }}>
          Edit Booking
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedBooking && (
            <EditBookingForm
              booking={selectedBooking}
              properties={properties}
              onSave={handleSaveBooking}
              onCancel={() => setEditModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title" sx={{ color: "#d32f2f" }}>
          Delete Booking
        </DialogTitle>
        <DialogContent>
          <div className="py-2">
            <p id="delete-dialog-description">
              Are you sure you want to delete this booking?
            </p>
            {bookingToDelete && (
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="font-medium">Booking Details:</p>
                <p>
                  Code:{" "}
                  <span className="font-medium">
                    {bookingToDelete.bookingCode}
                  </span>
                </p>
                <p>Guest: {bookingToDelete.guestName}</p>
                <p>
                  Property:{" "}
                  {properties[bookingToDelete.propertyId]?.name ||
                    bookingToDelete.propertyId}
                </p>
                <p>
                  Dates:{" "}
                  {new Date(bookingToDelete.checkIn).toLocaleDateString()} to{" "}
                  {new Date(bookingToDelete.checkOut).toLocaleDateString()}
                </p>
              </div>
            )}
            <p className="mt-4 text-red-600 text-sm">
              Warning: This action cannot be undone.
            </p>
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{ borderColor: "#999", color: "#333" }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteBooking}
            variant="contained"
            sx={{
              bgcolor: "#d32f2f",
              color: "white",
              "&:hover": { bgcolor: "#b71c1c" },
            }}
          >
            Delete Booking
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ViewBookingsTab;
