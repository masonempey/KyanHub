import React, { useState } from "react";
import {
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import fetchWithAuth from "@/lib/fetchWithAuth";
import MultiPropertySelector from "@/app/components/MultiPropertySelector";

const ManualBookingEntry = ({ allProperties, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    propertyId: "",
    bookingCode: "",
    guestName: "",
    checkIn: dayjs(),
    checkOut: dayjs().add(1, "day"),
    platform: "manual",
    totalAmount: "",
    cleaningFee: "",
    notes: "",
  });

  const [propertiesError, setPropertiesError] = useState(null);
  const [errors, setErrors] = useState({
    bookingCode: "",
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    const newErrors = {};
    if (!formData.propertyId) {
      newErrors.propertyId = "Property is required";
    }
    if (!formData.guestName) {
      newErrors.guestName = "Guest name is required";
    }
    if (!formData.bookingCode || formData.bookingCode.trim() === "") {
      newErrors.bookingCode = "Booking code is required";
    }

    // Check if there are any validation errors
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return; // Prevent form submission
    }

    setLoading(true);

    try {
      const checkIn = formData.checkIn.toDate();
      const checkOut = formData.checkOut.toDate();
      const totalNights = Math.ceil(
        (checkOut - checkIn) / (1000 * 60 * 60 * 24)
      );

      // Calculate base total and nightly rate
      const totalAmount = parseFloat(formData.totalAmount);
      const cleaningFee = parseFloat(formData.cleaningFee) || 0;

      // CHANGED: totalAmount is the final amount, so base total should exclude cleaning fee
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
      const bookingData = {
        propertyId: formData.propertyId,
        guestName: formData.guestName,
        bookingCode: formData.bookingCode.trim() || `MANUAL-${Date.now()}`,
        guestUid: `manual-${Date.now()}`,
        checkIn: formData.checkIn.format("YYYY-MM-DD"),
        checkOut: formData.checkOut.format("YYYY-MM-DD"),
        platform: formData.platform,
        totalAmount: baseTotal, // CHANGED: Only store the base total as totalAmount
        cleaningFee,
        cleaningFeeMonth,
        totalNights,
        nightlyRate,
        nightsByMonth,
        revenueByMonth,
        notes: formData.notes,
      };

      // Send to API
      const response = await fetchWithAuth("/api/bookings/manual", {
        method: "POST",
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create booking: ${await response.text()}`);
      }

      const result = await response.json();

      // Reset form
      setFormData({
        propertyId: "",
        bookingCode: "", // Reset booking code field
        guestName: "",
        checkIn: dayjs(),
        checkOut: dayjs().add(1, "day"),
        platform: "manual",
        totalAmount: "",
        cleaningFee: "",
        notes: "",
      });

      if (onSuccess) onSuccess("Booking created successfully");
    } catch (error) {
      console.error("Error creating booking:", error);
      if (onError) onError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {propertiesError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p>Error loading properties: {propertiesError}</p>
          <p>
            You can try refreshing the page or contact support if the issue
            persists.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Manual Booking Entry</h2>

        <div className="mb-4">
          {Object.keys(allProperties).length === 0 && !loading ? (
            <div className="text-amber-700 bg-amber-50 p-3 rounded-md">
              No properties available. Please ensure properties are configured
              in the system.
            </div>
          ) : (
            <MultiPropertySelector
              properties={allProperties}
              selectedProperties={
                formData.propertyId ? [formData.propertyId] : []
              }
              onChange={handlePropertyChange}
              loading={loading}
              label="Select Property"
              singleSelection={true}
            />
          )}
        </div>

        {/* Updated Booking Code field without InputAdornment */}
        <TextField
          label="Booking Code"
          name="bookingCode"
          value={formData.bookingCode}
          onChange={handleChange}
          fullWidth
          required
          variant="outlined"
          disabled={loading}
          error={!!errors.bookingCode}
          helperText={
            errors.bookingCode || "Enter a unique identifier for this booking"
          }
        />

        <TextField
          label="Guest Name"
          name="guestName"
          value={formData.guestName}
          onChange={handleChange}
          fullWidth
          required
          variant="outlined"
          disabled={loading}
        />

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker
              label="Check-in Date"
              value={formData.checkIn}
              onChange={(date) => handleDateChange("checkIn", date)}
              disabled={loading}
              slotProps={{
                textField: { fullWidth: true, required: true },
              }}
            />

            <DatePicker
              label="Check-out Date"
              value={formData.checkOut}
              onChange={(date) => handleDateChange("checkOut", date)}
              disabled={loading}
              slotProps={{
                textField: { fullWidth: true, required: true },
              }}
            />
          </div>
        </LocalizationProvider>

        <FormControl fullWidth variant="outlined">
          <InputLabel id="platform-label">Platform</InputLabel>
          <Select
            labelId="platform-label"
            name="platform"
            value={formData.platform}
            onChange={handleChange}
            label="Platform"
            disabled={loading}
          >
            <MenuItem value="manual">Manual Entry</MenuItem>
            <MenuItem value="airbnb">Airbnb</MenuItem>
            <MenuItem value="vrbo">VRBO</MenuItem>
            <MenuItem value="booking.com">Booking.com</MenuItem>
            <MenuItem value="expedia">Expedia</MenuItem>
            <MenuItem value="direct">Direct Booking</MenuItem>
          </Select>
        </FormControl>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            disabled={loading}
          />

          <TextField
            label="Cleaning Fee"
            name="cleaningFee"
            value={formData.cleaningFee}
            onChange={handleChange}
            type="number"
            inputProps={{ min: "0", step: "0.01" }}
            fullWidth
            variant="outlined"
            disabled={loading}
          />
        </div>

        <TextField
          label="Notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          disabled={loading}
        />

        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          fullWidth
          sx={{
            bgcolor: "#eccb34",
            color: "#333",
            "&:hover": { bgcolor: "#d4b02a" },
          }}
        >
          {loading ? <CircularProgress size={24} /> : "Create Booking"}
        </Button>
      </form>
    </>
  );
};

export default ManualBookingEntry;
