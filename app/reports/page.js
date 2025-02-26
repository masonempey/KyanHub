"use client";

import { useProperties } from "@/contexts/PropertyContext";
import styles from "./Reports.module.css";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Alert from "@mui/material/Alert";
import BookingCard from "./BookingCard";
import fetchWithAuth from "@/lib/fetchWithAuth";
import BackgroundContainer from "../components/backgroundContainer";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useUser } from "@/contexts/UserContext";

// Define monthNames array
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

const ReportsPage = () => {
  const { user, loading: userLoading } = useUser();
  const {
    properties: allProperties,
    loading: propertiesLoading,
    propertyId,
    selectedPropertyName,
  } = useProperties();
  const [startDate, setStartDate] = useState(dayjs());
  const [endDate, setEndDate] = useState(dayjs());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && propertyId) {
      fetchBookings(propertyId);
    }
  }, [user, propertyId, startDate, endDate]);

  const handleStartDateChange = (newValue) => {
    setStartDate(newValue);
    const newErrors = { ...errors };
    if (newValue && endDate && endDate.isBefore(newValue)) {
      newErrors.dateRange = "End date must be after start date.";
    } else {
      delete newErrors.dateRange;
    }
    setErrors(newErrors);
  };

  const handleEndDateChange = (newValue) => {
    setEndDate(newValue);
    const newErrors = { ...errors };
    if (startDate && newValue && newValue.isBefore(startDate)) {
      newErrors.dateRange = "End date must be after start date.";
    } else {
      delete newErrors.dateRange;
    }
    setErrors(newErrors);
  };

  const fetchBookings = async (propertyId) => {
    setLoading(true);
    setIsLoading(true);
    try {
      if (!startDate || !endDate || endDate.isBefore(startDate)) {
        throw new Error("Invalid date range.");
      }
      if (!propertyId) {
        throw new Error("No property selected.");
      }
      const response = await fetchWithAuth(
        `/api/igms/bookings-with-guests/${propertyId}/${startDate.format(
          "YYYY-MM-DD"
        )}/${endDate.format("YYYY-MM-DD")}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${await response.text()}`);
      }
      const data = await response.json();
      if (data.success && data.bookings) {
        setBookings(data.bookings);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
      setErrorMessage(error.message || "Failed to fetch bookings.");
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const handleUpdateRevenue = () => {
    setConfirmDialogOpen(true);
  };

  const handleConfirmUpdate = async () => {
    if (!propertyId || !selectedPropertyName || !bookings.length) {
      setErrorMessage("No property or bookings selected.");
      setErrorDialogOpen(true);
      return;
    }

    setUpdating(true);
    setIsLoading(true);
    setConfirmDialogOpen(false);
    try {
      const monthIndex = startDate.month();
      const monthName = monthNames[monthIndex]; // Now defined
      const year = startDate.format("YYYY");

      const propertyName = selectedPropertyName;

      const response = await fetchWithAuth(`/api/sheets/revenue`, {
        method: "PUT",
        body: JSON.stringify({
          propertyName,
          bookings,
          year,
          monthName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update revenue: ${await response.text()}`);
      }
      const data = await response.json();
      if (data.success) {
        setUpdateStatus("Revenue sheet updated successfully");
      } else {
        throw new Error(data.error || "Failed to update revenue sheet.");
      }
    } catch (error) {
      console.error("Failed to update revenue sheet:", error);
      setErrorMessage(error.message || "Failed to update revenue sheet.");
      setErrorDialogOpen(true);
    } finally {
      setUpdating(false);
      setIsLoading(false);
    }
  };

  if (userLoading || propertiesLoading || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  if (!user) {
    return <div>Please log in to access this page.</div>;
  }

  return (
    <div className={styles.DashboardContainer}>
      <BackgroundContainer width="100%" height="100%" zIndex={0} />
      <div className={styles.topNav}>
        <Typography variant="h4" sx={{ color: "#eccb34", mb: 2, zIndex: 10 }}>
          Search for Bookings
        </Typography>
        <div className={styles.filterBarContainer}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div style={{ display: "flex", gap: "16px", zIndex: 10 }}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={handleStartDateChange}
                sx={{
                  "& .MuiInputBase-root": {
                    color: "#eccb34",
                    backgroundColor: "#fafafa",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#eccb34",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#eccb34",
                  },
                  "& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline":
                    {
                      borderColor: "#eccb34",
                    },
                  "& .MuiInputLabel-root": { color: "#eccb34" },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#eccb34" },
                  "& .MuiSvgIcon-root": {
                    color: "#eccb34",
                  },
                  "& .MuiPickersPopper-root": {
                    "& .MuiPaper-root": {
                      backgroundColor: "#eccb34",
                      "& .MuiPickersCalendar-root": {
                        "& .MuiTypography-root": { color: "#fafafa" },
                        "& .Mui-selected": {
                          color: "#eccb34",
                          backgroundColor: "#fafafa",
                        },
                        "& .MuiPickersDay-root": {
                          color: "#fafafa",
                          "&:hover": {
                            backgroundColor: "rgba(250, 250, 250, 0.2)",
                          },
                        },
                      },
                    },
                  },
                  zIndex: 10,
                }}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={handleEndDateChange}
                sx={{
                  "& .MuiInputBase-root": {
                    color: "#eccb34",
                    backgroundColor: "#fafafa",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#eccb34",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#eccb34",
                  },
                  "& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline":
                    {
                      borderColor: "#eccb34",
                    },
                  "& .MuiInputLabel-root": { color: "#eccb34" },
                  "& .MuiInputLabel-root.Mui-focused": { color: "#eccb34" },
                  "& .MuiSvgIcon-root": {
                    color: "#eccb34",
                  },
                  "& .MuiPickersPopper-root": {
                    "& .MuiPaper-root": {
                      backgroundColor: "#eccb34",
                      "& .MuiPickersCalendar-root": {
                        "& .MuiTypography-root": { color: "#fafafa" },
                        "& .Mui-selected": {
                          color: "#eccb34",
                          backgroundColor: "#fafafa",
                        },
                        "& .MuiPickersDay-root": {
                          color: "#fafafa",
                          "&:hover": {
                            backgroundColor: "rgba(250, 250, 250, 0.2)",
                          },
                        },
                      },
                    },
                  },
                  zIndex: 10,
                }}
                renderInput={(params) => <TextField {...params} />}
              />
            </div>
          </LocalizationProvider>
          {errors.dateRange && (
            <Typography sx={{ color: "#eccb34", mt: 1, zIndex: 10 }}>
              {errors.dateRange}
            </Typography>
          )}
        </div>
      </div>
      <div className={styles.viewContainer}>
        <div className={styles.smallRevenueContainer}>
          {loading ? (
            <CircularProgress sx={{ color: "#eccb34", zIndex: 10 }} />
          ) : bookings.length > 0 ? (
            <>
              <Button
                variant="contained"
                onClick={handleUpdateRevenue}
                disabled={updating}
                sx={{
                  backgroundColor: "#eccb34",
                  color: "#fafafa",
                  "&:hover": { backgroundColor: "#fafafa", color: "#eccb34" },
                  mt: 2,
                  mb: 2,
                  width: "200px",
                  zIndex: 10,
                }}
              >
                {updating ? (
                  <CircularProgress size={24} sx={{ color: "#eccb34" }} />
                ) : (
                  "Update Revenue Sheet"
                )}
              </Button>
              {updateStatus && (
                <Alert
                  severity={
                    updateStatus.includes("Error") ? "error" : "success"
                  }
                  sx={{
                    backgroundColor: updateStatus.includes("Error")
                      ? "#ffebee"
                      : "#fff8e1",
                    color: updateStatus.includes("Error")
                      ? "#d32f2f"
                      : "#eccb34",
                    mb: 2,
                    zIndex: 10,
                  }}
                >
                  {updateStatus}
                </Alert>
              )}
              <div className={styles.bookingsGrid}>
                {bookings.map((booking) => (
                  <BookingCard
                    key={`${booking.bookingCode}-${booking.guestUid}`}
                    booking={booking}
                  />
                ))}
              </div>
            </>
          ) : (
            <Typography sx={{ color: "#eccb34", zIndex: 10 }}>
              No bookings found
            </Typography>
          )}
        </div>
      </div>
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#eccb34",
            color: "#fafafa",
            borderRadius: "8px",
            zIndex: 20,
          },
        }}
      >
        <DialogTitle sx={{ color: "#fafafa" }}>Confirm Update</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#fafafa" }}>
            Are you sure you want to update the revenue sheet?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(250, 250, 250, 0.1)" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmUpdate}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(236, 203, 52, 0.1)" },
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#eccb34",
            color: "#fafafa",
            borderRadius: "8px",
            zIndex: 20,
          },
        }}
      >
        <DialogTitle sx={{ color: "#fafafa" }}>Error</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#fafafa" }}>
            {errorMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setErrorDialogOpen(false)}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(250, 250, 250, 0.1)" },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ReportsPage;
