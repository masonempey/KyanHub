"use client";

import React, { useState, useEffect, memo } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import dayjs from "dayjs";

const DatePicker = memo(({ value, onDateChange }) => {
  const [selectedDate, setSelectedDate] = useState(value || dayjs());

  useEffect(() => {
    console.log("Selected date:", selectedDate);
  }, [selectedDate]);

  const handleChange = (newValue) => {
    setSelectedDate(newValue);
    if (onDateChange) onDateChange(newValue);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateCalendar
        value={selectedDate}
        onChange={handleChange}
        sx={{
          backgroundColor: "#eccb34", // Orange background
          borderRadius: "8px",
          padding: "10px",
          color: "#fafafa", // Default white text

          // All days
          "& .MuiPickersDay-root": {
            color: "#fafafa",
            backgroundColor: "transparent",
            "&:hover": {
              backgroundColor: "rgba(236, 203, 52, 0.3)",
            },
          },
          "& .MuiPickersDay-root.Mui-selected": {
            backgroundColor: "#fafafa !important", // White background for selected day
            color: "#eccb34 !important", // Orange text
            "&:hover": {
              backgroundColor: "#d4b62d !important", // Darker orange on hover
              color: "#fafafa !important", // White text on hover
            },
          },
          "& .MuiPickersDay-root.Mui-selected:focus": {
            backgroundColor: "#fafafa !important",
          },
          "& .MuiPickersDay-today": {
            border: "1px solid #eccb34 !important",
            color: "#fafafa",
            backgroundColor: "transparent",
          },

          // Calendar header (month/year)
          "& .MuiPickersCalendarHeader-root": {
            color: "#fafafa",
            "& .MuiPickersCalendarHeader-label": {
              color: "#fafafa",
              fontWeight: "bold",
            },
          },

          // Navigation arrows (left/right)
          "& .MuiPickersArrowSwitcher-root": {
            "& .MuiIconButton-root": {
              color: "#eccb34", // Orange arrows
              "&:hover": {
                backgroundColor: "rgba(236, 203, 52, 0.2)",
              },
            },
          },

          // Weekday headers (Mon, Tue, etc.)
          "& .MuiDayCalendar-weekDayLabel": {
            color: "#eccb34",
            fontWeight: "bold",
          },

          // Year dropdown button (the arrow)
          "& .MuiPickersCalendarHeader-switchViewButton": {
            color: "#fafafa", // White dropdown arrow
            "&:hover": {
              backgroundColor: "rgba(236, 203, 52, 0.2)",
            },
          },

          // Year dropdown menu (when visible)
          "& .MuiYearCalendar-root": {
            "& .MuiPickersYear-root": {
              "& .MuiPickersYear-yearButton": {
                color: "#fafafa", // White text for all years
                "&:hover": {
                  backgroundColor: "rgba(236, 203, 52, 0.3)",
                },
              },
              "& .MuiPickersYear-yearButton.Mui-selected": {
                backgroundColor: "#fafafa !important", // White background for selected year
                color: "#eccb34 !important", // Orange text
                "&:hover": {
                  backgroundColor: "#d4b62d !important", // Darker orange on hover
                  color: "#fafafa !important", // White text on hover
                },
              },
            },
          },

          // General text override
          "& .MuiTypography-root": {
            color: "#fafafa",
          },
        }}
      />
    </LocalizationProvider>
  );
});

export default DatePicker;
