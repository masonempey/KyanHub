"use client";

import styles from "./addPage.module.css";
import { useState, useEffect } from "react";
import BackgroundContainer from "../components/backgroundContainer";
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useProperties } from "../../contexts/PropertyContext";
import PdfSection from "./pdfSection";
import AddProduct from "./addProduct";
import dayjs from "dayjs";
import TopNav from "../components/topNav";
import OptionBar from "../components/optionBar";
import DatePicker from "../components/datePicker";

const AddPage = () => {
  const { properties: allProperties, loading } = useProperties();
  const [filteredProperties, setFilteredProperties] = useState({});
  const [currentMonth, setCurrentMonth] = useState(dayjs().format("MMMM"));
  const [selectedPropertyName, setSelectedPropertyName] = useState();
  const [products, setProducts] = useState([]);
  const [rates] = useState([]);
  const [amounts, setAmounts] = useState([]);
  const [ownersName] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [maintenanceCost, setMaintenanceCost] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    dayjs().format("YYYY-MM-DD")
  );

  const excludedProperties = [
    "London - 4",
    "Windsor 95/96 Combo",
    "Windsor 97/98 Combo",
  ];

  useEffect(() => {
    // Filter out excluded properties
    const filtered = Object.entries(allProperties)
      .filter(([_, name]) => !excludedProperties.includes(name))
      .reduce((acc, [uid, name]) => {
        acc[uid] = name;
        return acc;
      }, {});

    setFilteredProperties(filtered);
  }, [allProperties]);

  const handleAmountChange = (index, value) => {
    const newAmounts = [...amounts];
    const parsedValue = parseInt(value.replace(/^0+/, "")) || 0;
    newAmounts[index] = parsedValue;
    setAmounts(newAmounts);
  };

  const handlePropertyChange = (propertyId, propertyName) => {
    console.log("Property selected:", { id: propertyId, name: propertyName });
    setPropertyId(propertyId);
    setSelectedPropertyName(propertyName);
  };

  const handleButtonSubmit = () => async () => {
    try {
      console.log("Updating inventory:", amounts);
      console.log("Product ID:", products);

      const baseUrl = "http://localhost:5000";

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const quantity = amounts[i];

        if (quantity > 0) {
          const response = await fetch(
            `${baseUrl}/api/inventory/${propertyId}/${product.id}/${currentMonth}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                quantity,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(
              `Failed to update inventory for product ${product.name}`
            );
          }
        }
      }

      console.log("Inventory updated successfully");
    } catch (error) {
      console.error("Update error:", error);
    }
  };

  const handleMaintenanceSubmit = () => {
    console.log("Selected property:", selectedPropertyName);
    console.log("Selected category:", selectedCategory);
    console.log("Selected company:", selectedCompany);
    console.log("Selected date:", selectedDate);
    console.log("Maintenance cost:", maintenanceCost);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/inventory/products"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchAmounts = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/inventory/${propertyId}/${currentMonth}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch amounts");
        }

        const data = await response.json();
        setAmounts(data.map((item) => item.quantity));
      } catch (error) {
        console.error("Error fetching amounts:", error);
      }
    };

    if (propertyId) {
      fetchAmounts();
    }
  }, [propertyId, currentMonth]);

  const handleMonthChange = (newMonth) => {
    setCurrentMonth(newMonth);
  };

  const handleMaintenanceCostChange = (event) => {
    setMaintenanceCost(event.target.value);
  };

  const handleDateChange = (date) => {
    const formattedDate = dayjs(date).format("YYYY-MM-DD");
    setSelectedDate(formattedDate);
  };

  const VisuallyHiddenInput = styled("input")({
    clip: "rect(0 0 0 0)",
    clipPath: "inset(50%)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    bottom: 0,
    left: 0,
    whiteSpace: "nowrap",
    width: 1,
  });

  return (
    <div className={styles.addPageContainer}>
      <TopNav
        filteredProperties={filteredProperties}
        loading={loading}
        handlePropertyChange={handlePropertyChange}
        selectedMonth={currentMonth}
        currentPage="Analytics"
        onMonthChange={handleMonthChange}
      />
      <div className={styles.mainContainer}>
        <div className={styles.buttonContainer}>
          <PdfSection
            products={products}
            amounts={amounts}
            rates={rates}
            selectedPropertyName={selectedPropertyName}
            ownersName={ownersName}
          />
          <Button
            variant="outlined"
            sx={{ color: "#eccb34", borderColor: "#eccb34" }}
            onClick={handleButtonSubmit("update")}
          >
            Update Sheet
          </Button>
        </div>
        <div className={styles.contentContainer}>
          <div className={styles.leftContainer}>
            <BackgroundContainer width="100%" height="100%" />
            <div className={styles.productListContainer}>
              <div className={styles.header}>
                <span>Product</span>
                <span>Amount</span>
              </div>
              <div className={styles.listContainer}>
                {products.map((product, index) => (
                  <div key={index} className={styles.productRow}>
                    <span className={styles.productName}>{product.name}</span>
                    <input
                      type="text"
                      pattern="\d*"
                      inputMode="numeric"
                      value={amounts[index] || ""}
                      onChange={(e) =>
                        handleAmountChange(index, e.target.value)
                      }
                      className={styles.amountInput}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.rightContainer}>
            <div className={styles.backgroundWrapper}>
              <BackgroundContainer width="100%" height="100%" />
            </div>
            <div className={styles.rightHeader}>
              {selectedPropertyName || "Select a Property"}
            </div>
            <div className={styles.maintenanceContainer}>
              <OptionBar
                label={"Category"}
                placeholder="Maintenance Category"
                options={[
                  { label: "Repair", value: "Repair" },
                  { label: "Plumbing", value: "Plumbing" },
                  { label: "Locksmith", value: "Locksmith" },
                  { label: "Electrical", value: "Electrical" },
                ]}
                onSelect={setSelectedCategory}
              />
              <OptionBar
                label={"Company"}
                placeholder="Maintenance Company"
                options={[
                  { label: "Company1", value: "Company1" },
                  { label: "Company2", value: "Company1" },
                ]}
                onSelect={setSelectedCompany}
              />
              <input
                type="text"
                pattern="\d*"
                inputMode="numeric"
                value={maintenanceCost}
                onChange={handleMaintenanceCostChange}
                className={styles.maintenanceInput}
                placeholder="Maintenance Cost"
              />
              <DatePicker onDateChange={handleDateChange} />
              <Button
                component="label"
                role={undefined}
                variant="contained"
                tabIndex={-1}
                startIcon={<CloudUploadIcon />}
                sx={{
                  backgroundColor: "#eccb34",
                }}
              >
                Upload files
                <VisuallyHiddenInput
                  type="file"
                  onChange={(event) => console.log(event.target.files)}
                  multiple
                />
              </Button>
              <Button
                variant="outlined"
                sx={{ color: "#eccb34", borderColor: "#eccb34" }}
                onClick={handleMaintenanceSubmit}
              >
                Submit Maintenance
              </Button>
            </div>
          </div>
        </div>
      </div>
      <AddProduct />
    </div>
  );
};

export default AddPage;
