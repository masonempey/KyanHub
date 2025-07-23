import { useState } from "react";
import {
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
  Paper,
  Typography,
  Divider,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import MultiPropertySelector from "@/app/components/MultiPropertySelector";

const EditBookingForm = ({ booking, properties, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    bookingCode: booking.bookingCode,
    propertyId: booking.propertyId,
    guestName: booking.guestName,
    checkIn: dayjs(booking.checkIn),
    checkOut: dayjs(booking.checkOut),
    platform: booking.platform,
    totalAmount: booking.totalAmount.toString(),
    cleaningFee: (booking.cleaningFee || "0").toString(),
    notes: booking.notes || "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePropertyChange = (selectedProps) => {
    if (selectedProps.length > 0) {
      setFormData((prev) => ({ ...prev, propertyId: selectedProps[0] }));
    }
  };

  const handleDateChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // Calculate nights
    const checkIn = formData.checkIn.toDate();
    const checkOut = formData.checkOut.toDate();
    const totalNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    // Calculate nightly rate
    const totalAmount = parseFloat(formData.totalAmount);
    const cleaningFee = parseFloat(formData.cleaningFee) || 0;
    const baseTotal = totalAmount - cleaningFee;
    const nightlyRate = baseTotal / totalNights;

    // Calculate nights by month and revenue by month
    const nightsByMonth = {};
    const revenueByMonth = {};

    let currentDate = new Date(checkIn);
    const lastNight = new Date(checkOut);
    lastNight.setDate(lastNight.getDate() - 1);

    // Distribute nights across months
    for (let i = 0; i < totalNights; i++) {
      const monthKey = `${currentDate.getFullYear()}-${
        currentDate.getMonth() + 1
      }`;
      nightsByMonth[monthKey] = (nightsByMonth[monthKey] || 0) + 1;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate revenue per month based on nights
    const cleaningFeeMonth = `${lastNight.getFullYear()}-${
      lastNight.getMonth() + 1
    }`;
    Object.entries(nightsByMonth).forEach(([month, nights]) => {
      revenueByMonth[month] = nights * nightlyRate;
      if (month === cleaningFeeMonth) {
        revenueByMonth[month] += cleaningFee;
      }
    });

    // Format data for API
    const updatedBooking = {
      ...booking,
      propertyId: formData.propertyId,
      guestName: formData.guestName,
      bookingCode: formData.bookingCode,
      checkIn: formData.checkIn.format("YYYY-MM-DD"),
      checkOut: formData.checkOut.format("YYYY-MM-DD"),
      platform: formData.platform,
      totalAmount: parseFloat(formData.totalAmount),
      cleaningFee: parseFloat(formData.cleaningFee) || 0,
      cleaningFeeMonth,
      totalNights,
      nightlyRate,
      nightsByMonth,
      revenueByMonth,
      notes: formData.notes,
    };

    onSave(updatedBooking);
  };

  return (
    <Box component={Paper} elevation={0} sx={{ p: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight="medium">
            Booking Details
          </Typography>
          <Divider sx={{ my: 1 }} />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Booking Code"
            name="bookingCode"
            value={formData.bookingCode}
            onChange={handleChange}
            fullWidth
            required
            variant="outlined"
            disabled // Booking code shouldn't be editable
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <MultiPropertySelector
            properties={properties}
            selectedProperties={[formData.propertyId]}
            onChange={handlePropertyChange}
            label="Property"
            singleSelection={true}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Guest Name"
            name="guestName"
            value={formData.guestName}
            onChange={handleChange}
            fullWidth
            required
            variant="outlined"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth variant="outlined">
            <InputLabel id="platform-label">Platform</InputLabel>
            <Select
              labelId="platform-label"
              name="platform"
              value={formData.platform}
              onChange={handleChange}
              label="Platform"
            >
              <MenuItem value="manual">Manual Entry</MenuItem>
              <MenuItem value="airbnb">Airbnb</MenuItem>
              <MenuItem value="vrbo">VRBO</MenuItem>
              <MenuItem value="booking.com">Booking.com</MenuItem>
              <MenuItem value="expedia">Expedia</MenuItem>
              <MenuItem value="direct">Direct Booking</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight="medium">
            Date and Financial Information
          </Typography>
          <Divider sx={{ my: 1 }} />
        </Grid>

        <Grid item xs={12} md={6}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Check-in Date"
              value={formData.checkIn}
              onChange={(date) => handleDateChange("checkIn", date)}
              slotProps={{
                textField: { fullWidth: true, required: true },
              }}
            />
          </LocalizationProvider>
        </Grid>

        <Grid item xs={12} md={6}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Check-out Date"
              value={formData.checkOut}
              onChange={(date) => handleDateChange("checkOut", date)}
              slotProps={{
                textField: { fullWidth: true, required: true },
              }}
            />
          </LocalizationProvider>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Total Amount"
            name="totalAmount"
            value={formData.totalAmount}
            onChange={handleChange}
            type="number"
            inputProps={{ min: "0", step: "0.01" }}
            fullWidth
            required
            variant="outlined"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            label="Cleaning Fee"
            name="cleaningFee"
            value={formData.cleaningFee}
            onChange={handleChange}
            type="number"
            inputProps={{ min: "0", step: "0.01" }}
            fullWidth
            variant="outlined"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            fullWidth
            multiline
            rows={3}
            variant="outlined"
          />
        </Grid>

        <Grid item xs={12}>
          <Box
            sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}
          >
            <Button
              variant="outlined"
              onClick={onCancel}
              sx={{
                borderColor: "#999",
                color: "#333",
                "&:hover": { borderColor: "#666", bgcolor: "#f5f5f5" },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              sx={{
                bgcolor: "#eccb34",
                color: "#333",
                "&:hover": { bgcolor: "#d4b02a" },
              }}
            >
              Save Changes
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default EditBookingForm;
