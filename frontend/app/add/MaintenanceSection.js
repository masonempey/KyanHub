"use client";

import styles from "./addPage.module.css";
import { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import OptionBar from "../components/optionBar";
import DatePicker from "../components/datePicker";
import AddCompanyDialog from "../components/AddCompanyDialog";
import AddCategoryDialog from "../components/AddCategoryDialog";
import BackgroundContainer from "../components/backgroundContainer";
import dayjs from "dayjs";
import { useUser } from "../../contexts/UserContext";
import fetchWithAuth from "../utils/fetchWithAuth";

const MaintenanceSection = ({
  propertyId,
  selectedPropertyName,
  selectedDate,
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

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in to access this section.</div>;

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/maintenance/companies`
        );
        if (!response.ok)
          throw new Error(`Failed to fetch companies: ${response.statusText}`);
        const data = await response.json();
        if (!data.companies)
          throw new Error("No companies property in response");
        setCompanies(
          data.companies.map((company) => ({
            label: company.company_name,
            value: company.company_name,
            id: company.id,
          }))
        );
      } catch (error) {
        console.error("Error fetching companies:", error.message);
        alert("Failed to load companies. Please try again.");
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/maintenance/categories`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.categories) {
          throw new Error("No categories property in response");
        }
        setCategories(
          data.categories.map((category) => ({
            label: category.category,
            value: category.category,
            id: category.id,
          }))
        );
      } catch (error) {
        console.error("Error fetching categories:", error.message);
        alert("Failed to load categories. Please try again.");
      }
    };

    fetchCompanies();
    fetchCategories();
  }, []);

  const handleMaintenanceSubmit = async () => {
    const currentYear = dayjs().year();
    const formattedDate = dayjs(`${selectedDate} ${currentYear}`, "MMMM YYYY");
    const maintenanceMonthYear = formattedDate.isValid()
      ? formattedDate.format("MMMMYYYY")
      : "InvalidDate";

    console.log("Maintenance Month/Year:", maintenanceMonthYear);
    if (
      !selectedPropertyName ||
      !selectedCategory ||
      !selectedCompany ||
      !maintenanceCost
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      if (isFileAttached && fileAttached) {
        const fileBase64 = await convertFileToBase64(fileAttached);
        const fileResponse = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload/maintenance`,
          {
            method: "POST",
            body: JSON.stringify({
              propertyName: selectedPropertyName,
              monthYear: maintenanceMonthYear,
              file: fileBase64,
              fileName: fileAttached.name,
              fileType: fileAttached.type,
            }),
          }
        );
        if (!fileResponse.ok) {
          throw new Error("Failed to upload file");
        }
        alert("File uploaded successfully");
      }

      const maintenanceResponse = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/maintenance`,
        {
          method: "POST",
          body: JSON.stringify({
            propertyId,
            category: selectedCategory,
            company: selectedCompany,
            cost: maintenanceCost,
            description: maintenanceDescription || "",
            date: selectedDate,
          }),
        }
      );
      if (!maintenanceResponse.ok) {
        throw new Error("Failed to submit maintenance request");
      }
      alert("Maintenance request submitted successfully");
      setSelectedCategory("");
      setSelectedCompany("");
      setMaintenanceCost("");
      setMaintenanceDescription("");
      setIsFileAttached(false);
      setFileAttached(null);
    } catch (error) {
      console.error("Error submitting maintenance request:", error);
      alert("An error occurred. Please try again.");
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

  const handleMaintenanceCostChange = (event) =>
    setMaintenanceCost(event.target.value);

  const handleMaintenanceDescriptionChange = (event) =>
    setMaintenanceDescription(event.target.value);

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
        `${
          process.env.NEXT_PUBLIC_BACKEND_URL
        }/api/maintenance/delete-company/${encodeURIComponent(
          companyToDelete
        )}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to delete company ${companyToDelete}`);
      }
      setCompanies(companies.filter((c) => c.value !== companyToDelete));
      if (selectedCompany === companyToDelete) setSelectedCompany("");
      alert(`Company "${companyToDelete}" deleted successfully`);
      setDeleteCompanyDialogOpen(false);
      setCompanyToDelete(null);
    } catch (error) {
      console.error("Error deleting company:", error);
      alert("Failed to delete company");
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
        `${
          process.env.NEXT_PUBLIC_BACKEND_URL
        }/api/maintenance/delete-category/${encodeURIComponent(
          categoryToDelete
        )}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to delete category ${categoryToDelete}`);
      }
      setCategories(categories.filter((c) => c.value !== categoryToDelete));
      if (selectedCategory === categoryToDelete) setSelectedCategory("");
      alert(`Category "${categoryToDelete}" deleted successfully`);
      setDeleteCategoryDialogOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category");
    }
  };

  const handleDeleteCategoryCancel = () => {
    setDeleteCategoryDialogOpen(false);
    setCategoryToDelete(null);
  };

  return (
    <div className={styles.rightContainer}>
      <BackgroundContainer width="100%" height="100%" />
      <div className={styles.maintenanceContainer}>
        <div className={styles.rightHeader}>
          {selectedPropertyName || "Select a Property"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <OptionBar
            label="Category"
            placeholder="Maintenance Category"
            options={categories}
            onSelect={setSelectedCategory}
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <OptionBar
            label="Company"
            placeholder="Maintenance Company"
            options={companies}
            onSelect={setSelectedCompany}
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
        <input
          type="text"
          pattern="\d*"
          inputMode="numeric"
          value={maintenanceCost}
          onChange={handleMaintenanceCostChange}
          className={styles.maintenanceInput}
          placeholder="Maintenance Cost"
        />
        <input
          type="text"
          pattern="\d*"
          inputMode="numeric"
          value={maintenanceDescription}
          onChange={handleMaintenanceDescriptionChange}
          className={styles.maintenanceInput}
          placeholder="Maintenance Description"
        />
        <DatePicker onDateChange={onDateChange} />
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
    </div>
  );
};

export default MaintenanceSection;
