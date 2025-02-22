"use client";

import { useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";

const menuProps = {
  PaperProps: {
    sx: {
      backgroundColor: "#eccb34",
      color: "#fafafa",
      "& .MuiMenuItem-root": { color: "#fafafa" },
      "& .MuiMenuItem-root:hover": { backgroundColor: "#d9b51f" },
    },
  },
};

const OptionBar = ({ placeholder, options = [], onSelect, onDelete }) => {
  const [selectedOption, setSelectedOption] = useState("");

  const handleChange = (event) => {
    const value = event.target.value;
    setSelectedOption(value);
    if (onSelect) onSelect(value);
  };

  const handleDelete = (value) => (event) => {
    event.stopPropagation(); // Prevent dropdown selection when clicking delete
    if (onDelete) onDelete(value);
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
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "#fafafa" },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#fafafa",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#fafafa",
            },
            "& .MuiSvgIcon-root": { color: "#fafafa" },
          }}
          displayEmpty
          MenuProps={menuProps}
        >
          <MenuItem value="" disabled>
            {placeholder}
          </MenuItem>
          {options.map((option, index) => (
            <MenuItem
              key={index}
              value={option.value}
              sx={{ display: "flex", justifyContent: "space-between" }}
            >
              {option.label}
              <IconButton
                aria-label={`delete ${option.label}`}
                onClick={handleDelete(option.value)}
                sx={{ color: "#fafafa", "&:hover": { color: "#eccb34" } }}
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default OptionBar;
