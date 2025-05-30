"use client";

import { useState, useEffect } from "react";
import {
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Box,
  Chip,
  Button,
  Divider,
} from "@mui/material";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
      backgroundColor: "#fafafa",
      color: "#333333",
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
      border: "1px solid rgba(236, 203, 52, 0.3)",
      borderRadius: "8px",
    },
  },
};

const MultiPropertySelector = ({
  properties = {},
  selectedProperties = [],
  onChange,
  loading = false,
  label = "Select Properties",
  mobile = false,
}) => {
  // Convert the properties object to an array for easier rendering
  const propertyArray = Object.entries(properties).map(([id, property]) => ({
    id,
    name: typeof property === "object" ? property.name : property,
  }));

  const handleChange = (event) => {
    const { value } = event.target;
    if (onChange) {
      onChange(value);
    }
  };

  // Add select all functionality
  const handleSelectAll = (event) => {
    if (event) {
      event.stopPropagation(); // Prevent dropdown from closing
    }
    if (onChange) {
      // Get all property IDs
      const allPropertyIds = propertyArray.map((property) => property.id);
      onChange(allPropertyIds);
    }
  };

  // Add clear all functionality
  const handleClearAll = (event) => {
    if (event) {
      event.stopPropagation(); // Prevent dropdown from closing
    }
    if (onChange) {
      onChange([]);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <FormControl fullWidth size={mobile ? "small" : "medium"}>
        <InputLabel
          id="multi-property-selector-label"
          sx={{
            color: "#333333",
            "&.Mui-focused": { color: "#eccb34" },
          }}
        >
          {label}
        </InputLabel>
        <Select
          labelId="multi-property-selector-label"
          id="multi-property-selector"
          multiple
          value={selectedProperties}
          onChange={handleChange}
          input={<OutlinedInput label={label} />}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.map((propertyId) => {
                const property = propertyArray.find((p) => p.id === propertyId);
                return (
                  <Chip
                    key={propertyId}
                    label={property ? property.name : propertyId}
                    sx={{
                      backgroundColor: "rgba(236, 203, 52, 0.1)",
                      borderColor: "rgba(236, 203, 52, 0.3)",
                      color: "#333",
                      "& .MuiChip-deleteIcon": {
                        color: "#333",
                        "&:hover": {
                          color: "rgba(51, 51, 51, 0.7)",
                        },
                      },
                    }}
                  />
                );
              })}
            </Box>
          )}
          MenuProps={MenuProps}
          disabled={loading || Object.keys(properties).length === 0}
          sx={{
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(236, 203, 52, 0.5)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#eccb34",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#eccb34",
            },
            ".MuiSvgIcon-root": {
              color: "#eccb34",
            },
          }}
        >
          {/* Add Select All/Clear All buttons at the top of the dropdown */}
          <MenuItem
            key="buttons-container"
            sx={{
              display: "flex",
              justifyContent: "space-between",
              p: 1,
              borderBottom: "1px solid rgba(0,0,0,0.1)",
              "&:hover": {
                backgroundColor: "transparent",
              },
            }}
            disableRipple
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="small"
              onClick={handleSelectAll}
              sx={{
                color: "#eccb34",
                textTransform: "none",
                "&:hover": { bgcolor: "rgba(236, 203, 52, 0.1)" },
              }}
            >
              Select All
            </Button>
            <Button
              size="small"
              onClick={handleClearAll}
              sx={{
                color: "#eccb34",
                textTransform: "none",
                "&:hover": { bgcolor: "rgba(236, 203, 52, 0.1)" },
              }}
            >
              Clear All
            </Button>
          </MenuItem>
          <Divider />

          {/* Original property items */}
          {propertyArray.map((property) => (
            <MenuItem key={property.id} value={property.id}>
              <Checkbox
                checked={selectedProperties.indexOf(property.id) > -1}
                sx={{
                  color: "rgba(236, 203, 52, 0.5)",
                  "&.Mui-checked": {
                    color: "#eccb34",
                  },
                }}
              />
              <ListItemText primary={property.name} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default MultiPropertySelector;
