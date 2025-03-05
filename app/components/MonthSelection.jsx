"use client";

import { useState, useEffect } from "react";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";

const MonthSelection = ({ selectedMonth, onMonthChange }) => {
  const [selectedOption, setSelectedOption] = useState(selectedMonth);

  useEffect(() => {
    setSelectedOption(selectedMonth);
  }, [selectedMonth]);

  const handleChange = (event) => {
    const newMonth = event.target.value;
    setSelectedOption(newMonth);
    onMonthChange(newMonth);
  };

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

  return (
    <FormControl fullWidth>
      <InputLabel
        id="month-select-label"
        sx={{
          color: "#333333", // 'dark'
          "&.Mui-focused": { color: "#333333" }, // Keep 'dark' when focused
          "&:hover": { color: "#333333" }, // Keep 'dark' on hover
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
  );
};

export default MonthSelection;
