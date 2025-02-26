import { useState, useEffect } from "react";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";

// Custom styles for the dropdown menu (Paper component)
const menuProps = {
  PaperProps: {
    sx: {
      backgroundColor: "#eccb34", // Yellow background for the dropdown menu
      color: "#fafafa", // White text for the dropdown menu items
      "& .MuiMenuItem-root": {
        color: "#fafafa", // Ensure menu items have white text
      },
      "& .MuiMenuItem-root:hover": {
        backgroundColor: "#d9b51f", // Optional: Slightly darker yellow on hover for better UX
      },
    },
  },
};

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
      <InputLabel
        id="label"
        sx={{
          color: "#fafafa", // White label
          opacity: 0.9,
          "&:hover": {
            color: "#fafafa", // Keep white on hover
            backgroundColor: "transparent", // Remove any background hover effect
          },
          "&.Mui-focused": {
            color: "#fafafa", // Keep white when focused
            backgroundColor: "transparent", // Remove any background focus effect
          },
        }}
      >
        Month
      </InputLabel>
      <Select
        labelId="label"
        id="Month-select"
        value={selectedOption}
        label="Month"
        onChange={handleChange}
        sx={{
          borderRadius: "8px",
          color: "#fafafa", // White text for selected option
          backgroundColor: "#eccb34", // Yellow background
          borderColor: "#fafafa", // White border
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#fafafa", // White border outline
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#fafafa", // White border on hover
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#fafafa", // White border when focused
          },
          "& .MuiSvgIcon-root": {
            color: "#fafafa", // White dropdown arrow
          },
        }}
        MenuProps={menuProps} // Apply custom styles to the dropdown menu
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
