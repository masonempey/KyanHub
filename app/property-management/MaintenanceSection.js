"use client";

import styles from "./addPage.module.css";
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
import OptionBar from "../components/optionBar";
import DatePicker from "../components/datePicker";
import AddCompanyDialog from "../components/AddCompanyDialog";
import AddCategoryDialog from "../components/AddCategoryDialog";
import BackgroundContainer from "../components/backgroundContainer";
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

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in to access this section.</div>;

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
          }))
        );
      } catch (error) {
        console.error("Error fetching companies:", error);
        setErrorMessage("Failed to load companies");
        setErrorDialogOpen(true);
      }
    };

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
  }, [user]);

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
        const uploadRes = await fetchWithAuth("/api/upload/maintenance", {
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

  const handleAddCompany = (newCompanyName) => {
    const newCompany = { label: newCompanyName, value: newCompanyName };
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

  // Rest of the JSX remains unchanged
  return (
    <div className={styles.rightContainer}>
      <BackgroundContainer width="100%" height="100%" />
      <div className={styles.maintenanceContainer}>
        <div className={styles.rightHeader}>
          {selectedPropertyName || "Select a Property"}
        </div>
        {errors.selectedPropertyName && (
          <div style={{ color: "#eccb34", marginBottom: "10px" }}>
            {errors.selectedPropertyName}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <OptionBar
            label="Category"
            placeholder="Maintenance Category"
            options={categories}
            onSelect={(value) => {
              setSelectedCategory(value);
              const newErrors = { ...errors };
              if (!value) newErrors.selectedCategory = "Category is required.";
              else delete newErrors.selectedCategory;
              setErrors(newErrors);
            }}
            onDelete={handleDeleteCategoryClick}
          />
          <Button
            variant="outlined"
            startIcon={<AddCircleOutlineIcon />}
            sx={{
              color: "#eccb34",
              borderColor: "#eccb34",
              "&:hover": { borderColor: "#eccb34" },
            }}
            onClick={() => setCategoryDialogOpen(true)}
          >
            Add Category
          </Button>
        </div>
        {errors.selectedCategory && (
          <div style={{ color: "#eccb34", marginBottom: "10px" }}>
            {errors.selectedCategory}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <OptionBar
            label="Company"
            placeholder="Maintenance Company"
            options={companies}
            onSelect={(value) => {
              setSelectedCompany(value);
              const newErrors = { ...errors };
              if (!value) newErrors.selectedCompany = "Company is required.";
              else delete newErrors.selectedCompany;
              setErrors(newErrors);
            }}
            onDelete={handleDeleteCompanyClick}
          />
          <Button
            variant="outlined"
            startIcon={<AddCircleOutlineIcon />}
            sx={{
              color: "#eccb34",
              borderColor: "#eccb34",
              "&:hover": { borderColor: "#eccb34" },
            }}
            onClick={() => setCompanyDialogOpen(true)}
          >
            Add Company
          </Button>
        </div>
        {errors.selectedCompany && (
          <div style={{ color: "#eccb34", marginBottom: "10px" }}>
            {errors.selectedCompany}
          </div>
        )}
        <TextField
          type="text"
          inputMode="numeric"
          value={maintenanceCost}
          onChange={handleMaintenanceCostChange}
          className={styles.maintenanceInput}
          placeholder="Maintenance Cost"
          error={!!errors.maintenanceCost}
          helperText={errors.maintenanceCost}
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#eccb34" },
              "&:hover fieldset": { borderColor: "#eccb34" },
              "&.Mui-focused fieldset": { borderColor: "#eccb34" },
            },
            "& .MuiInputBase-input": { color: "#fafafa" },
            "& .MuiFormHelperText-root": { color: "#eccb34" },
          }}
        />
        <TextField
          type="text"
          value={maintenanceDescription}
          onChange={handleMaintenanceDescriptionChange}
          className={styles.maintenanceInput}
          placeholder="Maintenance Description"
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#eccb34" },
              "&:hover fieldset": { borderColor: "#eccb34" },
              "&.Mui-focused fieldset": { borderColor: "#eccb34" },
            },
            "& .MuiInputBase-input": { color: "#fafafa" },
          }}
        />
        <DatePicker value={selectedDate} onDateChange={handleDateChange} />
        {errors.selectedDate && (
          <div style={{ color: "#eccb34", marginBottom: "10px" }}>
            {errors.selectedDate}
          </div>
        )}
        <Button
          component="label"
          variant="contained"
          startIcon={<CloudUploadIcon />}
          sx={{
            color: "#fafafa",
            borderColor: "#fafafa",
            backgroundColor: "#eccb34",
            "&:hover": { backgroundColor: "#eccb34", borderColor: "#fafafa" },
          }}
        >
          Upload files
          <input
            type="file"
            hidden
            onChange={(event) => {
              setFileAttached(event.target.files[0]);
              setIsFileAttached(true);
            }}
          />
        </Button>
        <Button
          variant="outlined"
          sx={{
            color: "#fafafa",
            borderColor: "#fafafa",
            backgroundColor: "#eccb34",
            "&:hover": { backgroundColor: "#eccb34", borderColor: "#fafafa" },
          }}
          onClick={handleMaintenanceSubmit}
        >
          Submit Maintenance
        </Button>
      </div>
      <AddCompanyDialog
        open={companyDialogOpen}
        onClose={() => setCompanyDialogOpen(false)}
        onAddCompany={handleAddCompany}
      />
      <AddCategoryDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        onAddCategory={handleAddCategory}
      />
      <Dialog
        open={deleteCompanyDialogOpen}
        onClose={handleDeleteCompanyCancel}
        PaperProps={{
          sx: {
            backgroundColor: "#eccb34",
            color: "#fafafa",
            borderRadius: "8px",
          },
        }}
      >
        <DialogTitle sx={{ color: "#fafafa" }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#fafafa" }}>
            Are you sure you want to delete the company "{companyToDelete}"?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteCompanyCancel}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(250, 250, 250, 0.1)" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteCompanyConfirm}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(236, 203, 52, 0.1)" },
            }}
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
            backgroundColor: "#eccb34",
            color: "#fafafa",
            borderRadius: "8px",
          },
        }}
      >
        <DialogTitle sx={{ color: "#fafafa" }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#fafafa" }}>
            Are you sure you want to delete the category "{categoryToDelete}"?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteCategoryCancel}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(250, 250, 250, 0.1)" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteCategoryConfirm}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(236, 203, 52, 0.1)" },
            }}
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
            backgroundColor: "#eccb34",
            color: "#fafafa",
            borderRadius: "8px",
          },
        }}
      >
        <DialogTitle sx={{ color: "#fafafa" }}>Success</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#fafafa" }}>
            Maintenance request submitted successfully!
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSuccessDialogOpen(false)}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(250, 250, 250, 0.1)" },
            }}
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
            backgroundColor: "#eccb34",
            color: "#fafafa",
            borderRadius: "8px",
          },
        }}
      >
        <DialogTitle sx={{ color: "#fafafa" }}>Error</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#fafafa" }}>
            {errorMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setErrorDialogOpen(false)}
            sx={{
              color: "#fafafa",
              "&:hover": { backgroundColor: "rgba(250, 250, 250, 0.1)" },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default MaintenanceSection;
