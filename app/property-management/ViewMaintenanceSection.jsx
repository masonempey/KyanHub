import { useState } from "react";
import { useMaintenanceData } from "@/hooks/useMaintenanceData";
import CircularProgress from "@mui/material/CircularProgress";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import fetchWithAuth from "@/lib/fetchWithAuth";

const ViewMaintenanceSection = ({ propertyId, selectedPropertyName }) => {
  const { maintenanceData, isLoading, error, mutate } =
    useMaintenanceData(propertyId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (id) => {
    const item = maintenanceData.find((item) => item.id === id);
    console.log("Item to delete:", item);
    console.log("Item ID to delete:", id);
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetchWithAuth(
        `/api/maintenance?id=${itemToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to delete maintenance item: ${await response.text()}`
        );
      }

      // Refresh the data
      await mutate();
    } catch (error) {
      console.error("Error deleting maintenance item:", error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-xl font-bold text-dark mb-4">
        Maintenance History for {selectedPropertyName || "Selected Property"}
      </h3>

      {maintenanceData.length === 0 ? (
        <p className="text-dark/70">No maintenance records found.</p>
      ) : (
        <div className="space-y-4">
          {maintenanceData.map((item, index) => (
            <div
              key={index}
              className="bg-white p-4 rounded-lg border border-primary/10 shadow-sm relative"
            >
              <div className="flex justify-between items-center">
                <span className="font-medium text-dark">{item.category}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-primary font-medium">
                    ${parseFloat(item.cost).toFixed(2)}
                  </span>
                  <IconButton
                    aria-label="delete"
                    size="small"
                    onClick={() => handleDelete(item.id)}
                    className="text-dark/70 hover:text-primary transition-colors"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </div>
              </div>
              <div className="text-sm text-dark/70">
                <div className="flex justify-between mt-2">
                  <span>{item.company}</span>
                  <span>{new Date(item.date).toLocaleDateString()}</span>
                </div>
                {item.description && (
                  <p className="mt-2 bg-primary/5 p-2 rounded-lg">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            color: "#333333",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
          },
        }}
      >
        <DialogTitle sx={{ color: "#333333" }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#333333" }}>
            Are you sure you want to delete this maintenance record
            {itemToDelete ? ` for ${itemToDelete.category}` : ""}? This action
            cannot be undone.
          </DialogContentText>

          {itemToDelete && (
            <div className="mt-4 p-3 bg-primary/5 rounded-lg text-sm">
              <p>
                <strong>Category:</strong> {itemToDelete.category}
              </p>
              <p>
                <strong>Company:</strong> {itemToDelete.company}
              </p>
              <p>
                <strong>Cost:</strong> $
                {parseFloat(itemToDelete.cost).toFixed(2)}
              </p>
              <p>
                <strong>Date:</strong>{" "}
                {new Date(itemToDelete.date).toLocaleDateString()}
              </p>
            </div>
          )}
        </DialogContent>
        <DialogTitle sx={{ color: "#333333" }}>
          Make sure to delete invoice from the drive if applicable
        </DialogTitle>
        <DialogActions>
          <Button
            onClick={handleDeleteCancel}
            className="text-dark hover:bg-primary/5 transition-colors"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            className="bg-primary text-dark hover:bg-primary/80 transition-colors"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ViewMaintenanceSection;
