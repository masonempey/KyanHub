import { useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import Box from "@mui/material/Box";

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

const OptionBar = ({ placeholder, options, onSelect }) => {
  const [selectedOption, setSelectedOption] = useState("");

  const handleChange = (event) => {
    setSelectedOption(event.target.value);
    if (onSelect) {
      onSelect(event.target.value);
    }
  };

  return (
    <Box>
      <FormControl sx={{ m: 1, minWidth: 300, opacity: 0.9 }} size="large">
        <Select
          id="option-select"
          value={selectedOption}
          onChange={handleChange}
          sx={{
            borderRadius: "8px",
            color: "#fafafa",
            backgroundColor: "#eccb34",
            borderColor: "#fafafa", // Default border color set to dark gray
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#fafafa", // Default outline color set to dark gray
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#fafafa", // Hover state outline color
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#fafafa", // Focused state outline color (when clicked)
            },
            "& .MuiSvgIcon-root": {
              color: "#fafafa", // White dropdown arrow
            },
          }}
          displayEmpty
          MenuProps={menuProps} // Apply custom styles to the dropdown menu
        >
          <MenuItem value="" disabled>
            {placeholder}
          </MenuItem>
          {options.map((option, index) => (
            <MenuItem
              key={index}
              value={option.value}
              sx={{ color: "#fafafa" }} // Ensure menu items have white text
            >
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default OptionBar;
