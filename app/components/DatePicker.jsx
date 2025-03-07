"use client";

import React, { useState, memo } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import dayjs from "dayjs";

// eslint-disable-next-line react/display-name
const DatePicker = memo(({ value, onDateChange }) => {
  const [selectedDate, setSelectedDate] = useState(value || dayjs());

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
          backgroundColor: "#fafafa", // White background
          borderRadius: "8px",
          padding: "10px",
          color: "#333333", // Dark text
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          border: "1px solid rgba(236, 203, 52, 0.2)",

          // All days
          "& .MuiPickersDay-root": {
            color: "#333333",
            backgroundColor: "transparent",
            "&:hover": {
              backgroundColor: "rgba(236, 203, 52, 0.15)",
            },
          },
          "& .MuiPickersDay-root.Mui-selected": {
            backgroundColor: "#eccb34 !important", // Primary background for selected day
            color: "#333333 !important", // Dark text
            "&:hover": {
              backgroundColor: "#d4b62d !important", // Darker primary on hover
              color: "#333333 !important",
            },
          },
          "& .MuiPickersDay-root.Mui-selected:focus": {
            backgroundColor: "#eccb34 !important",
          },
          "& .MuiPickersDay-today": {
            border: "1px solid #eccb34 !important",
            color: "#333333",
            backgroundColor: "transparent",
          },

          // Calendar header (month/year)
          "& .MuiPickersCalendarHeader-root": {
            color: "#333333",
            "& .MuiPickersCalendarHeader-label": {
              color: "#333333",
              fontWeight: "bold",
            },
          },

          // Navigation arrows (left/right)
          "& .MuiPickersArrowSwitcher-root": {
            "& .MuiIconButton-root": {
              color: "#eccb34", // Primary color arrows
              "&:hover": {
                backgroundColor: "rgba(236, 203, 52, 0.15)",
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
            color: "#333333",
            "&:hover": {
              backgroundColor: "rgba(236, 203, 52, 0.15)",
            },
          },

          // Year dropdown menu (when visible)
          "& .MuiYearCalendar-root": {
            "& .MuiPickersYear-root": {
              "& .MuiPickersYear-yearButton": {
                color: "#333333", // Dark text for all years
                "&:hover": {
                  backgroundColor: "rgba(236, 203, 52, 0.15)",
                },
              },
              "& .MuiPickersYear-yearButton.Mui-selected": {
                backgroundColor: "#eccb34 !important", // Primary background for selected year
                color: "#333333 !important", // Dark text
                "&:hover": {
                  backgroundColor: "#d4b62d !important", // Darker primary on hover
                  color: "#333333 !important",
                },
              },
            },
          },

          // General text override
          "& .MuiTypography-root": {
            color: "#333333",
          },
        }}
      />
    </LocalizationProvider>
  );
});

export default DatePicker;
