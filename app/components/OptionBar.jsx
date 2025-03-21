"use client";

import { useState } from "react";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

const menuProps = {
  PaperProps: {
    sx: {
      backgroundColor: "#fafafa",
      color: "#333333",
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
      border: "1px solid rgba(236, 203, 52, 0.3)",
      borderRadius: "8px",
      marginTop: "4px",
      "& .MuiMenuItem-root": { color: "#333333" },
      "& .MuiMenuItem-root:hover": {
        backgroundColor: "rgba(236, 203, 52, 0.15)",
      },
    },
  },
};

const OptionBar = ({
  label,
  placeholder,
  options = [],
  onSelect,
  onDelete,
  onEdit, // Add onEdit prop
}) => {
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

  // Add handler for edit button
  const handleEdit = (option) => (event) => {
    event.stopPropagation(); // Prevent dropdown selection when clicking edit
    if (onEdit) onEdit(option);
  };

  return (
    <Box>
      <FormControl sx={{ m: 1, minWidth: 300, opacity: 1 }} size="small">
        {label && (
          <div className="text-xs text-dark font-medium mb-1 ml-1">{label}</div>
        )}
        <Select
          id="option-select"
          value={selectedOption}
          onChange={handleChange}
          sx={{
            borderRadius: "8px",
            color: "#333333",
            backgroundColor: "#ffffff",
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "#eccb34" },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#eccb34",
              borderWidth: "2px",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#eccb34",
              borderWidth: "2px",
            },
            "& .MuiSvgIcon-root": { color: "#eccb34" },
          }}
          displayEmpty
          MenuProps={menuProps}
        >
          <MenuItem value="" disabled>
            <span className="text-gray-500">{placeholder}</span>
          </MenuItem>
          {options.map((option, index) => (
            <MenuItem
              key={index}
              value={option.value}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 16px",
              }}
            >
              {option.label}
              <div className="flex">
                {/* Add Edit button */}
                {onEdit && (
                  <IconButton
                    aria-label={`edit ${option.label}`}
                    onClick={handleEdit(option)}
                    sx={{
                      color: "#333333",
                      marginRight: "4px",
                      "&:hover": {
                        color: "#eccb34",
                        backgroundColor: "rgba(236, 203, 52, 0.1)",
                      },
                    }}
                    size="small"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                {/* Existing Delete button */}
                <IconButton
                  aria-label={`delete ${option.label}`}
                  onClick={handleDelete(option.value)}
                  sx={{
                    color: "#333333",
                    "&:hover": {
                      color: "#eccb34",
                      backgroundColor: "rgba(236, 203, 52, 0.1)",
                    },
                  }}
                  size="small"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </div>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default OptionBar;
