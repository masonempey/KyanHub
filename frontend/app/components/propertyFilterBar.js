"use client";

import { useState, useEffect } from "react";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import Box from "@mui/material/Box";

const menuProps = {
  PaperProps: {
    sx: {
      backgroundColor: "#eccb34",
      color: "#fafafa",
      "& .MuiMenuItem-root": {
        color: "#fafafa",
      },
      "& .MuiMenuItem-root:hover": {
        backgroundColor: "#d9b51f",
      },
    },
  },
};

const PropertyFilterBar = ({
  properties = {},
  loading = false,
  onPropertySelect,
}) => {
  const [property, setProperty] = useState("");
  const [label, setLabel] = useState("Search All Properties");

  useEffect(() => {
    if (!loading && Object.keys(properties).length > 0 && !property) {
      const firstPropertyId = Object.keys(properties)[0];
      const firstPropertyName = properties[firstPropertyId];
      setProperty(firstPropertyId);
      setLabel("Properties");
      if (typeof onPropertySelect === "function") {
        onPropertySelect(firstPropertyId, firstPropertyName);
      }
    }
  }, [properties, loading, onPropertySelect]);

  const handleChange = (event) => {
    const selectedId = event.target.value;
    const propertyName = properties[selectedId];
    console.log("Selected in PropertyFilterBar:", {
      id: selectedId,
      name: propertyName,
    });

    setProperty(selectedId);
    if (typeof onPropertySelect === "function") {
      onPropertySelect(selectedId, propertyName);
    }
  };

  const handleFocus = () => {
    setLabel("Properties");
  };

  const handleBlur = () => {
    if (!property) {
      setLabel("Search All Properties");
    }
  };

  return (
    <Box>
      <FormControl
        sx={{
          m: 1,
          minWidth: 300,
          backgroundColor: "#eccb34", // Yellow background
          color: "#fafafa", // White text
          borderColor: "#fafafa", // White border
          borderRadius: "8px", // Match OptionBar's border radius
          opacity: 0.9,
        }}
        size="large"
      >
        <InputLabel
          id="property-select-label"
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
          {label}
        </InputLabel>
        <Select
          labelId="property-select-label"
          id="property-select"
          value={property}
          label="Property"
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={loading}
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
          {Object.entries(properties).map(([uid, name]) => (
            <MenuItem key={uid} value={uid}>
              {name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default PropertyFilterBar;
