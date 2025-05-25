"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  CircularProgress,
} from "@mui/material";
import fetchWithAuth from "@/lib/fetchWithAuth";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { useRouter } from "next/navigation";

const OwnerList = ({ onSelectOwner, showAddDialog, onCloseAddDialog }) => {
  const router = useRouter();
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [newOwner, setNewOwner] = useState({
    name: "",
    email: "",
    notes: "",
  });

  useEffect(() => {
    if (showAddDialog) {
      setAddDialogOpen(true);
    }
  }, [showAddDialog]);

  const handleCloseAddDialog = () => {
    setAddDialogOpen(false);
    if (onCloseAddDialog) onCloseAddDialog();
  };

  // Fetch owners
  useEffect(() => {
    const fetchOwners = async () => {
      try {
        const response = await fetchWithAuth("/api/owners");
        if (!response.ok) {
          throw new Error(`Failed to fetch owners: ${await response.text()}`);
        }
        const data = await response.json();
        setOwners(data.owners);
      } catch (err) {
        console.error("Error fetching owners:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOwners();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewOwner((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddOwner = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth("/api/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOwner),
      });

      if (!response.ok) {
        throw new Error(`Failed to add owner: ${await response.text()}`);
      }

      const data = await response.json();
      setOwners((prev) => [...prev, data.owner]);
      setNewOwner({
        name: "",
        email: "",
        notes: "",
      });
      handleCloseAddDialog();
    } catch (err) {
      console.error("Error adding owner:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (ownerId, e) => {
    if (e) e.stopPropagation();

    try {
      setLoading(true);
      const response = await fetchWithAuth(`/api/owners/${ownerId}`);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch owner details: ${await response.text()}`
        );
      }

      const data = await response.json();
      setSelectedOwner(data.owner);
      setDetailsDialogOpen(true);
    } catch (err) {
      console.error("Error fetching owner details:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && owners.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 bg-red-50 rounded-lg">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="h-full">
      <TableContainer component={Paper} className="h-full">
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold", bgcolor: "#eccb34" }}>
                Name
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", bgcolor: "#eccb34" }}>
                Email
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", bgcolor: "#eccb34" }}>
                Date Added
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", bgcolor: "#eccb34" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {owners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No owners found. Add your first owner to get started.
                </TableCell>
              </TableRow>
            ) : (
              owners.map((owner) => (
                <TableRow
                  key={owner.id}
                  hover
                  onClick={(e) => handleViewDetails(owner.id, e)}
                >
                  <TableCell>{owner.name}</TableCell>
                  <TableCell>{owner.email}</TableCell>
                  <TableCell>
                    {new Date(owner.date_added).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(owner.id, e);
                      }}
                      sx={{
                        color: "#eccb34",
                        "&:hover": { bgcolor: "rgba(236, 203, 52, 0.1)" },
                      }}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Owner Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={handleCloseAddDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            bgcolor: "#fafafa",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
          },
        }}
      >
        <DialogTitle>Add New Owner</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            name="name"
            label="Owner Name"
            fullWidth
            required
            value={newOwner.name}
            onChange={handleInputChange}
            sx={{
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: "#eccb34",
                },
              "& .MuiInputLabel-root.Mui-focused": {
                color: "#eccb34",
              },
              mb: 2,
              mt: 1,
            }}
          />
          <TextField
            margin="dense"
            name="email"
            label="Email"
            type="email"
            fullWidth
            value={newOwner.email}
            onChange={handleInputChange}
            sx={{
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: "#eccb34",
                },
              "& .MuiInputLabel-root.Mui-focused": {
                color: "#eccb34",
              },
              mb: 2,
            }}
          />
          <TextField
            margin="dense"
            name="notes"
            label="Notes"
            multiline
            rows={3}
            fullWidth
            value={newOwner.notes}
            onChange={handleInputChange}
            sx={{
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: "#eccb34",
                },
              "& .MuiInputLabel-root.Mui-focused": {
                color: "#eccb34",
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog} sx={{ color: "#333" }}>
            Cancel
          </Button>
          <Button
            onClick={handleAddOwner}
            disabled={!newOwner.name}
            sx={{
              bgcolor: "#eccb34",
              color: "#333",
              "&:hover": { bgcolor: "#d9b92f" },
              "&.Mui-disabled": { bgcolor: "#f0f0f0", color: "#999" },
            }}
          >
            Add Owner
          </Button>
        </DialogActions>
      </Dialog>

      {/* Owner Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            bgcolor: "#fafafa",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
          },
        }}
      >
        {selectedOwner && (
          <>
            <DialogTitle
              sx={{ borderBottom: "1px solid rgba(236, 203, 52, 0.2)", pb: 2 }}
            >
              {selectedOwner.name || "Owner Details"}
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card
                    elevation={0}
                    sx={{ bgcolor: "rgba(236, 203, 52, 0.05)" }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Owner Information
                      </Typography>
                      <Divider sx={{ mb: 2 }} />

                      <div className="mb-4">
                        <Typography variant="subtitle2" color="text.secondary">
                          Email
                        </Typography>
                        <Typography variant="body1">
                          {selectedOwner.email || "Not provided"}
                        </Typography>
                      </div>

                      <div className="mb-4">
                        <Typography variant="subtitle2" color="text.secondary">
                          Date Added
                        </Typography>
                        <Typography variant="body1">
                          {selectedOwner.date_added
                            ? new Date(
                                selectedOwner.date_added
                              ).toLocaleDateString()
                            : "Unknown"}
                        </Typography>
                      </div>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card
                    elevation={0}
                    sx={{ bgcolor: "rgba(236, 203, 52, 0.05)" }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Notes
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="body1">
                        {selectedOwner.notes || "No notes available"}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  onSelectOwner(selectedOwner.id);
                  setDetailsDialogOpen(false);
                }}
                sx={{ color: "#eccb34" }}
              >
                Edit Owner
              </Button>
              <Button
                onClick={() => setDetailsDialogOpen(false)}
                sx={{ color: "#333" }}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  );
};

export default OwnerList;
