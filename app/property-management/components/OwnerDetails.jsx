"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CircularProgress,
  Typography,
  TextField,
  Button,
  Divider,
  Grid,
  Box,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import fetchWithAuth from "@/lib/fetchWithAuth";

const OwnerDetails = ({ ownerId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchOwnerDetails = async () => {
      try {
        setLoading(true);
        const response = await fetchWithAuth(`/api/owners/${ownerId}`);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch owner details: ${await response.text()}`
          );
        }

        const data = await response.json();
        setOwner(data.owner);
      } catch (err) {
        console.error("Error fetching owner details:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOwnerDetails();
  }, [ownerId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOwner((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetchWithAuth(`/api/owners/${ownerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(owner),
      });

      if (!response.ok) {
        throw new Error(`Failed to update owner: ${await response.text()}`);
      }

      setSuccess("Owner details updated successfully");

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err) {
      console.error("Error updating owner:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg">
        Error: Owner not found
      </div>
    );
  }

  return (
    <div className="w-full max-w-full sm:max-w-4xl mx-auto px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
        <Typography
          variant={isMobile ? "h5" : "h4"}
          component="h2"
          sx={{
            fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2rem" },
            wordBreak: "break-word",
          }}
        >
          {owner.name}
        </Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{
            bgcolor: "#eccb34",
            color: "#333333",
            "&:hover": { bgcolor: "#d9b92f" },
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            py: { xs: 1, sm: 1.5 },
            width: { xs: "100%", sm: "auto" },
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {error && (
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            mb: 2,
            bgcolor: "#fdeded",
            color: "#5f2120",
            borderRadius: 1,
            fontSize: { xs: "0.875rem", sm: "1rem" },
          }}
        >
          {error}
        </Box>
      )}

      {success && (
        <Box
          sx={{
            p: { xs: 1.5, sm: 2 },
            mb: 2,
            bgcolor: "#edf7ed",
            color: "#1e4620",
            borderRadius: 1,
            fontSize: { xs: "0.875rem", sm: "1rem" },
          }}
        >
          {success}
        </Box>
      )}

      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
          >
            Owner Information
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Owner Name"
                name="name"
                value={owner.name || ""}
                onChange={handleInputChange}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                    {
                      borderColor: "#eccb34",
                    },
                  "& .MuiInputLabel-root.Mui-focused": {
                    color: "#eccb34",
                  },
                  mb: 2,
                  "& .MuiInputBase-input": {
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                name="email"
                type="email"
                value={owner.email || ""}
                onChange={handleInputChange}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                    {
                      borderColor: "#eccb34",
                    },
                  "& .MuiInputLabel-root.Mui-focused": {
                    color: "#eccb34",
                  },
                  mb: 2,
                  "& .MuiInputBase-input": {
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Date Added"
                name="date_added"
                type="date"
                value={
                  owner.date_added || new Date().toISOString().split("T")[0]
                }
                onChange={handleInputChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={{
                  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                    {
                      borderColor: "#eccb34",
                    },
                  "& .MuiInputLabel-root.Mui-focused": {
                    color: "#eccb34",
                  },
                  mb: 2,
                  "& .MuiInputBase-input": {
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                name="notes"
                value={owner.notes || ""}
                onChange={handleInputChange}
                multiline
                rows={isMobile ? 3 : 4}
                fullWidth
                sx={{
                  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                    {
                      borderColor: "#eccb34",
                    },
                  "& .MuiInputLabel-root.Mui-focused": {
                    color: "#eccb34",
                  },
                  "& .MuiInputBase-input": {
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  },
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerDetails;
