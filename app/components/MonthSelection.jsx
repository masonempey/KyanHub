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
    <FormControl fullWidth className="border border-primary rounded-lg">
      <InputLabel id="month-select-label" className="text-dark">
        Month
      </InputLabel>

      <Select
        labelId="month-select-label"
        id="month-select"
        value={selectedOption}
        label="Month"
        onChange={handleChange}
        className="rounded-lg text-dark bg-white border-primary"
      >
        {months.map((month, index) => (
          <MenuItem key={index} value={month} className="text-dark">
            {month}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default MonthSelection;
