"use client";

import { useProperties } from "../../contexts/PropertyContext";
import styles from "./Reports.module.css";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import FilterBar from "../components/propertyFilterBar";
import { useState } from "react";
import * as React from "react";
import dayjs from "dayjs";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import BookingCard from "./BookingCard";
import {
  property_to_spreadsheet,
  property_to_sheet,
  findSpreadsheetId,
} from "../config/spreadSheetId's";

const ReportsPage = () => {
  const { properties, loading: propertiesLoading } = useProperties();
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [startDate, setStartDate] = useState(dayjs());
  const [endDate, setEndDate] = useState(dayjs());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  const handlePropertySelect = async (propertyId, propertyName) => {
    if (!propertyId) return;
    setSelectedProperty({ property_uid: propertyId, name: propertyName });
    await fetchBookings(propertyId);
  };

  const handleStartDateChange = (newValue) => {
    setStartDate(newValue);
    if (selectedProperty) {
      fetchBookings(selectedProperty.property_uid);
    }
  };

  const handleEndDateChange = (newValue) => {
    setEndDate(newValue);
    if (selectedProperty) {
      fetchBookings(selectedProperty.property_uid);
    }
  };

  const fetchBookings = async (propertyId) => {
    setLoading(true);
    try {
      const baseUrl = "http://localhost:5000";
      const response = await fetch(
        `${baseUrl}/api/igms/bookings-with-guests/${propertyId}/${startDate.format(
          "YYYY-MM-DD"
        )}/${endDate.format("YYYY-MM-DD")}`
      );
      console.log(
        `${baseUrl}/api/igms/bookings-with-guests/${propertyId}/${startDate.format(
          "YYYY-MM-DD"
        )}/${endDate.format("YYYY-MM-DD")}`
      );
      const data = await response.json();
      console.log("Response data:", data);
      if (data.success && data.bookings) {
        setBookings(data.bookings);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRevenue = async () => {
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

    if (!selectedProperty || !bookings.length) return;

    setUpdating(true);
    try {
      const monthIndex = startDate.month();
      const monthName = monthNames[monthIndex];
      const year = startDate.format("YYYY");

      // Get spreadsheet ID from mapping
      const spreadsheetId = findSpreadsheetId(selectedProperty.name);
      if (!spreadsheetId) {
        console.error(
          "Available properties:",
          Object.keys(property_to_spreadsheet)
        );
        throw new Error(
          `No spreadsheet found for property: ${selectedProperty.name}`
        );
      }

      // Get sheet name (use property_to_sheet mapping or default to "Revenue")
      const sheetName = property_to_sheet[selectedProperty.name] || "Revenue";

      const response = await fetch(
        `http://localhost:5000/api/sheets/${spreadsheetId}/${sheetName}/${year}/${monthName}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookings,
            propertyName: selectedProperty.name,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setUpdateStatus("Revenue sheet updated successfully");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Failed to update revenue sheet:", error);
      setUpdateStatus(`Error: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={styles.DashboardContainer}>
      <div className={styles.topNav}>
        <h1>Reports</h1>
        <div className={styles.filterBarContainer}>
          <FilterBar
            properties={properties}
            loading={propertiesLoading || loading}
            onPropertySelect={handlePropertySelect}
            selectedProperty={selectedProperty}
          />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DemoContainer components={["DatePicker"]}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={handleStartDateChange}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={handleEndDateChange}
              />
            </DemoContainer>
          </LocalizationProvider>
        </div>
      </div>
      <div className={styles.topLine}></div>
      <div className={styles.viewContainer}>
        <div className={styles.smallRevenueContainer}>
          {loading ? (
            <div>Loading bookings...</div>
          ) : bookings.length > 0 ? (
            <>
              <Button
                variant="contained"
                onClick={handleUpdateRevenue}
                disabled={updating}
                className={styles.updateButton}
                color="primary"
              >
                {updating ? (
                  <CircularProgress size={24} />
                ) : (
                  "Update Revenue Sheet"
                )}
              </Button>
              {updateStatus && (
                <div className={styles.statusMessage}>{updateStatus}</div>
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
            <div>No bookings found</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
