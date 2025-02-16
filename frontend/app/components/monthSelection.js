import { React, useEffect, useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";

const MonthSelection = ({ selectedMonth, onMonthChange }) => {
  const [selectedOption, setSelectedOption] = useState(selectedMonth);

  // on load set selected option to current month
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
      <InputLabel id="label">Month</InputLabel>
      <Select
        labelId="label"
        id="Month-select"
        value={selectedOption}
        label="Month"
        onChange={handleChange}
        sx={{ borderRadius: "8px", color: "#2b2b2b", opacity: 0.9 }}
      >
        {months.map((month, index) => (
          <MenuItem key={index} value={month}>
            {month}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default MonthSelection;
