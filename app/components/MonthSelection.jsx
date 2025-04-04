"use client";

import { useState, useEffect } from "react";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import Box from "@mui/material/Box";

// Array of months for the dropdown
const months = [
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

const MonthSelection = ({ selectedMonth, onMonthChange, mobile = false }) => {
  const [selectedOption, setSelectedOption] = useState("January");

  useEffect(() => {
    if (selectedMonth) {
      setSelectedOption(selectedMonth);
    }
  }, [selectedMonth]);

  const handleChange = (event) => {
    const value = event.target.value;
    setSelectedOption(value);
    onMonthChange(value);
  };

  return (
    <Box sx={{ maxWidth: mobile ? "100%" : "200px" }}>
      <FormControl fullWidth size={mobile ? "small" : "medium"}>
        <InputLabel
          id="month-select-label"
          sx={{
            color: "#333333", // 'dark'
            "&.Mui-focused": { color: "#333333" }, // Keep 'dark' when focused
            "&:hover": { color: "#333333" }, // Keep 'dark' on hover
            fontSize: mobile ? "0.875rem" : "1rem",
          }}
        >
          Month
        </InputLabel>
        <Select
          labelId="month-select-label"
          id="month-select"
          value={selectedOption}
          label="Month"
          onChange={handleChange}
          sx={{
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#333333", // 'dark'
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#333333", // 'dark' on hover
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#333333", // 'dark' when focused
            },
            color: "#333333", // 'dark'
            backgroundColor: "white",
            borderRadius: "8px",
            fontSize: mobile ? "0.875rem" : "1rem",
          }}
        >
          {months.map((month, index) => (
            <MenuItem
              key={index}
              value={month}
              sx={{ color: "#333333" }} // 'dark'
            >
              {month}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default MonthSelection;
