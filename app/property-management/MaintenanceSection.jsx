"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@mui/material/Button";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import OptionBar from "../components/OptionBar";
import DatePicker from "../components/DatePicker";
import AddCompanyDialog from "../components/AddCompanyDialog";
import AddCategoryDialog from "../components/AddCategoryDialog";
import EditCompanyDialog from "../components/EditCompanyDialog";
import dayjs from "dayjs";
import { useUser } from "@/contexts/UserContext";
import fetchWithAuth from "@/lib/fetchWithAuth";

const MaintenanceSection = ({
  propertyId,
  selectedPropertyName,
  onDateChange,
}) => {
  const { user, loading } = useUser();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [maintenanceCost, setMaintenanceCost] = useState("");
  const [maintenanceDescription, setMaintenanceDescription] = useState("");
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isFileAttached, setIsFileAttached] = useState(false);
  const [fileAttached, setFileAttached] = useState(null);
  const [deleteCompanyDialogOpen, setDeleteCompanyDialogOpen] = useState(false);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] =
    useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [errors, setErrors] = useState({});
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [confirmSubmitDialogOpen, setConfirmSubmitDialogOpen] = useState(false);
  const [editCompanyDialogOpen, setEditCompanyDialogOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState(null);

  const handleDateChange = useCallback(
    (newDate) => {
      setSelectedDate(newDate);
      if (onDateChange) onDateChange(newDate);
      const newErrors = { ...errors };
      if (!dayjs(newDate).isValid()) {
        newErrors.selectedDate = "Please select a valid date.";
      } else {
        delete newErrors.selectedDate;
      }
      setErrors(newErrors);
    },
    [errors, onDateChange]
  );

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetchWithAuth("/api/maintenance/companies");
        if (!response.ok) {
          throw new Error(
            `Failed to fetch companies: ${await response.text()}`
          );
        }
        const data = await response.json();
        setCompanies(
          data.companies.map((company) => ({
            label: company.company_name,
            value: company.company_name,
            id: company.id,
            googleFolderId: company.google_folder_id || "",
          }))
        );
      } catch (error) {
        console.error("Error fetching companies:", error);
        setErrorMessage("Failed to load companies");
        setErrorDialogOpen(true);
      }
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          Loading...
        </div>
      );
    }

    if (!user) {
      return (
        <div className="flex items-center justify-center h-full text-dark">
          Please log in to access this section.
        </div>
      );
    }

    const fetchCategories = async () => {
      try {
        const response = await fetchWithAuth("/api/maintenance/categories");
        if (!response.ok) {
          throw new Error(
            `Failed to fetch categories: ${await response.text()}`
          );
        }
        const data = await response.json();
        setCategories(
          data.categories.map((category) => ({
            label: category.category,
            value: category.category,
            id: category.id,
          }))
        );
      } catch (error) {
        console.error("Error fetching categories:", error);
        setErrorMessage("Failed to load categories");
        setErrorDialogOpen(true);
      }
    };

    if (user) {
      fetchCompanies();
      fetchCategories();
    }
  }, [loading, user]);

  const validateInputs = () => {
    const newErrors = {};
    if (!selectedPropertyName)
      newErrors.selectedPropertyName = "Property is required.";
    if (!selectedCategory) newErrors.selectedCategory = "Category is required.";
    if (!selectedCompany) newErrors.selectedCompany = "Company is required.";
    if (!maintenanceCost) {
      newErrors.maintenanceCost = "Cost is required.";
    } else if (isNaN(maintenanceCost) || Number(maintenanceCost) <= 0) {
      newErrors.maintenanceCost = "Cost must be a positive number.";
    }
    if (!dayjs(selectedDate).isValid())
      newErrors.selectedDate = "Please select a valid date.";
    return newErrors;
  };

  const handleMaintenanceSubmit = async () => {
    const newErrors = validateInputs();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const maintenanceMonthYear = dayjs(selectedDate).format("MMMMYYYY");
      const maintenanceDate = dayjs(selectedDate).format("YYYY-MM-DD");

      if (isFileAttached && fileAttached) {
        const fileBase64 = await convertFileToBase64(fileAttached);
        const uploadRes = await fetchWithAuth("/api/upload/invoice", {
          method: "POST",
          body: JSON.stringify({
            propertyName: selectedPropertyName,
            monthYear: maintenanceMonthYear,
            file: fileBase64,
            fileName: fileAttached.name,
          }),
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload file: ${await uploadRes.text()}`);
        }
      }

      const maintenanceRes = await fetchWithAuth("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({
          propertyId,
          category: selectedCategory,
          company: selectedCompany,
          cost: Number(maintenanceCost),
          description: maintenanceDescription || "",
          date: maintenanceDate,
        }),
      });

      if (!maintenanceRes.ok) {
        throw new Error(
          `Failed to submit maintenance request: ${await maintenanceRes.text()}`
        );
      }

      setSuccessDialogOpen(true);
      setSelectedCategory("");
      setSelectedCompany("");
      setMaintenanceCost("");
      setMaintenanceDescription("");
      setIsFileAttached(false);
      setFileAttached(null);
      setErrors({});
    } catch (error) {
      console.error("Error submitting maintenance request:", error);
      setErrorMessage(error.message || "An error occurred. Please try again.");
      setErrorDialogOpen(true);
    }
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleMaintenanceCostChange = (event) => {
    const value = event.target.value;
    setMaintenanceCost(value);
    const newErrors = { ...errors };
    if (!value) {
      newErrors.maintenanceCost = "Cost is required.";
    } else if (isNaN(value) || Number(value) <= 0) {
      newErrors.maintenanceCost = "Cost must be a positive number.";
    } else {
      delete newErrors.maintenanceCost;
    }
    setErrors(newErrors);
  };

  const handleMaintenanceDescriptionChange = (event) => {
    setMaintenanceDescription(event.target.value);
  };

  const handleAddCompany = (newCompanyName, googleFolderId) => {
    const newCompany = {
      label: newCompanyName,
      value: newCompanyName,
      googleFolderId: googleFolderId || "",
    };
    setCompanies((prev) => [...prev, newCompany]);
  };

  const handleAddCategory = (newCategoryName) => {
    const newCategory = { label: newCategoryName, value: newCategoryName };
    setCategories((prev) => [...prev, newCategory]);
  };

  const handleDeleteCompanyClick = (companyName) => {
    setCompanyToDelete(companyName);
    setDeleteCompanyDialogOpen(true);
  };

  const handleDeleteCompanyConfirm = async () => {
    if (!companyToDelete) return;
    try {
      const response = await fetchWithAuth(
        `/api/maintenance/delete-company/${encodeURIComponent(
          companyToDelete
        )}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to delete company ${companyToDelete}: ${await response.text()}`
        );
      }

      setCompanies(companies.filter((c) => c.value !== companyToDelete));
      if (selectedCompany === companyToDelete) setSelectedCompany("");
      setDeleteCompanyDialogOpen(false);
      setCompanyToDelete(null);
    } catch (error) {
      console.error("Error deleting company:", error);
      setErrorMessage("Failed to delete company");
      setErrorDialogOpen(true);
    }
  };

  const handleDeleteCompanyCancel = () => {
    setDeleteCompanyDialogOpen(false);
    setCompanyToDelete(null);
  };

  const handleDeleteCategoryClick = (categoryName) => {
    setCategoryToDelete(categoryName);
    setDeleteCategoryDialogOpen(true);
  };

  const handleDeleteCategoryConfirm = async () => {
    if (!categoryToDelete) return;
    try {
      const response = await fetchWithAuth(
        `/api/maintenance/delete-category/${encodeURIComponent(
          categoryToDelete
        )}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        throw new Error(
          `Failed to delete category ${categoryToDelete}: ${await response.text()}`
        );
      }
      setCategories(categories.filter((c) => c.value !== categoryToDelete));
      if (selectedCategory === categoryToDelete) setSelectedCategory("");
      setDeleteCategoryDialogOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error("Error deleting category:", error);
      setErrorMessage("Failed to delete category.");
      setErrorDialogOpen(true);
    }
  };

  const handleDeleteCategoryCancel = () => {
    setDeleteCategoryDialogOpen(false);
    setCategoryToDelete(null);
  };

  const handleEditCompanyClick = (company) => {
    setCompanyToEdit(company);
    setEditCompanyDialogOpen(true);
  };

  const handleEditCompanySuccess = (companyName, googleFolderId) => {
    setCompanies((prev) =>
      prev.map((c) => (c.value === companyName ? { ...c, googleFolderId } : c))
    );
  };

  return (
    <div className="p-6 flex flex-col h-full">
      <h2 className="text-2xl font-bold text-dark mb-4">
        Maintenance Management
      </h2>

      <div className="text-dark font-semibold mb-4 grid grid-cols-2 py-3 px-4 bg-primary/10 rounded-t-lg mt-2">
        {selectedPropertyName || "Select a Property"}
      </div>

      {errors.selectedPropertyName && (
        <p className="text-primary mb-2 text-sm">
          {errors.selectedPropertyName}
        </p>
      )}

      {/* Main content area - arranged in two columns */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column */}
        <div>
          {/* Category with Add button closer */}
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <OptionBar
                  label="Company"
                  placeholder="Maintenance Company"
                  options={companies}
                  onSelect={(value) => {
                    setSelectedCompany(value);
                    const newErrors = { ...errors };
                    if (!value)
                      newErrors.selectedCompany = "Company is required.";
                    else delete newErrors.selectedCompany;
                    setErrors(newErrors);
                  }}
                  onDelete={handleDeleteCompanyClick}
                  onEdit={handleEditCompanyClick}
                />
              </div>
              <Button
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium px-2 py-1 rounded-lg shadow-md transition-colors duration-300"
                sx={{
                  textTransform: "none",
                  fontSize: "0.8rem",
                  minWidth: "auto",
                  marginTop: "1rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  "&:hover": {
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  },
                }}
                onClick={() => setCategoryDialogOpen(true)}
              >
                Add
              </Button>
            </div>
            {errors.selectedCategory && (
              <p className="text-primary text-sm mt-1">
                {errors.selectedCategory}
              </p>
            )}
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <OptionBar
                  label="Category"
                  placeholder="Maintenance Category"
                  options={categories}
                  onSelect={(value) => {
                    setSelectedCategory(value);
                    const newErrors = { ...errors };
                    if (!value)
                      newErrors.selectedCategory = "Category is required.";
                    else delete newErrors.selectedCategory;
                    setErrors(newErrors);
                  }}
                  onDelete={handleDeleteCategoryClick}
                />
              </div>
              <Button
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium px-2 py-1 rounded-lg shadow-md transition-colors duration-300"
                sx={{
                  textTransform: "none",
                  fontSize: "0.8rem",
                  minWidth: "auto",
                  marginTop: "1rem",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  "&:hover": {
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  },
                }}
                onClick={() => setCategoryDialogOpen(true)}
              >
                Add
              </Button>
            </div>
            {errors.selectedCompany && (
              <p className="text-primary text-sm mt-1">
                {errors.selectedCompany}
              </p>
            )}
          </div>

          {/* Maintenance Cost */}
          <div className="mb-4">
            <TextField
              type="text"
              inputMode="numeric"
              value={maintenanceCost}
              onChange={handleMaintenanceCostChange}
              fullWidth
              placeholder="Maintenance Cost"
              error={!!errors.maintenanceCost}
              helperText={errors.maintenanceCost}
              className="bg-white rounded-lg"
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#eccb34" },
                  "&:hover fieldset": { borderColor: "#eccb34" },
                  "&.Mui-focused fieldset": { borderColor: "#eccb34" },
                },
                "& .MuiInputBase-input": { color: "#333333" },
                "& .MuiFormHelperText-root": { color: "#eccb34", marginTop: 0 },
              }}
            />
          </div>

          {/* Maintenance Description */}
          <div>
            <TextField
              type="text"
              value={maintenanceDescription}
              onChange={handleMaintenanceDescriptionChange}
              multiline
              rows={8}
              fullWidth
              placeholder="Maintenance Description"
              className="bg-white rounded-lg"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#eccb34" },
                  "&:hover fieldset": { borderColor: "#eccb34" },
                  "&.Mui-focused fieldset": { borderColor: "#eccb34" },
                },
                "& .MuiInputBase-input": { color: "#333333" },
              }}
            />
          </div>
        </div>

        {/* Right Column */}
        <div>
          {/* Date Picker */}
          <div className="mb-6">
            <DatePicker value={selectedDate} onDateChange={handleDateChange} />
            {errors.selectedDate && (
              <p className="text-primary text-sm mt-1">{errors.selectedDate}</p>
            )}
          </div>

          {/* Upload Files Button - Centered under calendar */}
          <div className="flex justify-center mb-6">
            <Button
              component="label"
              variant="contained"
              startIcon={<CloudUploadIcon />}
              className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium rounded-lg shadow-md transition-colors duration-300"
              sx={{
                textTransform: "none",
                fontSize: "1rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                "&:hover": {
                  boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                },
                padding: "8px 16px",
              }}
            >
              {isFileAttached ? "File Attached" : "Upload Files"}
              <input
                type="file"
                hidden
                onChange={(event) => {
                  setFileAttached(event.target.files[0]);
                  setIsFileAttached(true);
                }}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Submit Maintenance Button - Centered at bottom */}
      <div className="flex justify-center py-6">
        <Button
          variant="contained"
          className="bg-primary hover:bg-secondary hover:text-primary text-dark font-medium px-8 py-3 rounded-lg shadow-md transition-colors duration-300"
          sx={{
            textTransform: "none",
            fontSize: "1.1rem",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            "&:hover": {
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            },
            minWidth: "200px",
          }}
          onClick={() => {
            const newErrors = validateInputs();
            if (Object.keys(newErrors).length > 0) {
              setErrors(newErrors);
              return;
            }
            setConfirmSubmitDialogOpen(true);
          }}
        >
          Submit Maintenance
        </Button>
      </div>

      <AddCompanyDialog
        open={companyDialogOpen}
        onClose={() => setCompanyDialogOpen(false)}
        onAddCompany={handleAddCompany}
        endpoint="/api/maintenance/add-company"
      />

      <AddCategoryDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        onAddCategory={handleAddCategory}
      />

      <EditCompanyDialog
        open={editCompanyDialogOpen}
        onClose={() => setEditCompanyDialogOpen(false)}
        company={companyToEdit}
        onEditSuccess={handleEditCompanySuccess}
        endpoint="/api/maintenance/add-company"
      />

      <Dialog
        open={deleteCompanyDialogOpen}
        onClose={handleDeleteCompanyCancel}
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
            Are you sure you want to delete the company &quot;{companyToDelete}
            &quot;? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteCompanyCancel}
            className="text-dark hover:bg-primary/5 transition-colors"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteCompanyConfirm}
            className="bg-primary text-dark hover:bg-primary/80 transition-colors"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteCategoryDialogOpen}
        onClose={handleDeleteCategoryCancel}
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
            Are you sure you want to delete the category &quot;
            {categoryToDelete}&quot;? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteCategoryCancel}
            className="text-dark hover:bg-primary/5 transition-colors"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteCategoryConfirm}
            className="bg-primary text-dark hover:bg-primary/80 transition-colors"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={successDialogOpen}
        onClose={() => setSuccessDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            color: "#333333",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
          },
        }}
      >
        <DialogTitle sx={{ color: "#333333" }}>
          <span className="flex items-center">
            <span className="text-primary mr-2">✓</span> Success
          </span>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#333333" }}>
            Maintenance request submitted successfully!
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSuccessDialogOpen(false)}
            className="bg-primary text-dark hover:bg-primary/80 transition-colors"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            color: "#333333",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
          },
        }}
      >
        <DialogTitle sx={{ color: "#333333" }}>Error</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#333333" }}>
            {errorMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setErrorDialogOpen(false)}
            className="bg-primary text-dark hover:bg-primary/80 transition-colors"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmSubmitDialogOpen}
        onClose={() => setConfirmSubmitDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: "#fafafa",
            color: "#333333",
            borderRadius: "12px",
            border: "1px solid rgba(236, 203, 52, 0.2)",
          },
        }}
      >
        <DialogTitle sx={{ color: "#333333" }}>Confirm Submission</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#333333" }}>
            Please confirm you want to submit the following maintenance request:
          </DialogContentText>
          <div className="mt-4 space-y-2 text-dark">
            <p>
              <strong>Property:</strong> {selectedPropertyName}
            </p>
            <p>
              <strong>Category:</strong> {selectedCategory}
            </p>
            <p>
              <strong>Company:</strong> {selectedCompany}
            </p>
            <p>
              <strong>Cost:</strong> ${Number(maintenanceCost).toFixed(2)}
            </p>
            <p>
              <strong>Date:</strong>{" "}
              {dayjs(selectedDate).format("MMMM D, YYYY")}
            </p>
            <p>
              <strong>Description:</strong>{" "}
              {maintenanceDescription || "None provided"}
            </p>
            <p>
              <strong>File:</strong>{" "}
              {fileAttached ? fileAttached.name : "None attached"}
            </p>
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmSubmitDialogOpen(false)}
            className="text-dark hover:bg-primary/5 transition-colors"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setConfirmSubmitDialogOpen(false);
              handleMaintenanceSubmit();
            }}
            className="bg-primary text-dark hover:bg-primary/80 transition-colors"
          >
            Confirm Submission
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default MaintenanceSection;
