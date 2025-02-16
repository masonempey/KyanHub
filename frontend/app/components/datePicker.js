import React, { useState } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import dayjs from "dayjs";

const DatePicker = ({ onDateChange }) => {
  const [selectedDate, setSelectedDate] = useState(dayjs());

  const handleChange = (newValue) => {
    setSelectedDate(newValue);
    if (onDateChange) {
      onDateChange(newValue);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateCalendar
        value={selectedDate}
        onChange={handleChange}
        sx={{
          ".MuiPickersDay-root.Mui-selected": {
            backgroundColor: "#eccb34 !important",
            color: "#2b2b2b",
            "&:hover": {
              backgroundColor: "#d4b62d !important",
            },
          },
          ".MuiPickersDay-root.Mui-selected:focus": {
            backgroundColor: "#eccb34 !important",
          },
        }}
      />
    </LocalizationProvider>
  );
};

export default DatePicker;
