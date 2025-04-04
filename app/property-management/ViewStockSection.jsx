"use client";

import { useState, useEffect } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import fetchWithAuth from "@/lib/fetchWithAuth";
import { useUser } from "@/contexts/UserContext";
import AdminProtected from "@/app/components/AdminProtected";
import SearchIcon from "@mui/icons-material/Search";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";

const ViewStockSection = () => {
  const { user, loading: userLoading } = useUser();
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch inventory data from the levels endpoint
        const response = await fetchWithAuth("/api/inventory/levels");
        if (!response.ok) {
          throw new Error(
            `Failed to fetch inventory data: ${await response.text()}`
          );
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to load inventory data");
        }

        // Use the products array directly from the API response
        setProducts(data.products || []);
        setTotalProducts(data.totalProducts || 0);
      } catch (err) {
        console.error("Error fetching inventory data:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Filter products based on search term
  const filteredProducts = products.filter((product) => {
    // Default to empty string if name is undefined or null
    const productName = (product.name || "").toLowerCase();
    return productName.includes(searchTerm.toLowerCase());
  });

  // Sort products based on selected criteria
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "name") {
      // Default to empty strings for undefined names
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    } else if (sortBy === "stock") {
      return (b.quantity || 0) - (a.quantity || 0);
    } else if (sortBy === "low") {
      return (a.quantity || 0) - (b.quantity || 0);
    }
    return 0;
  });

  const getStockLevelClass = (stockLevel) => {
    if (stockLevel === 0) return "text-red-600 font-bold";
    if (stockLevel < 5) return "text-orange-500 font-semibold";
    return "text-green-600";
  };

  if (userLoading || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <h3 className="text-xl font-bold mb-2">Error Loading Stock Data</h3>
        <p>{error}</p>
      </div>
    );
  }

  // Calculate totals for the summary section
  const totalItemsInStock = products.reduce(
    (sum, product) => sum + (product.quantity || 0),
    0
  );

  const lowStockItemsCount = products.filter(
    (product) => (product.quantity || 0) > 0 && (product.quantity || 0) < 5
  ).length;

  return (
    <AdminProtected>
      <div className="p-4 flex flex-col h-full">
        <h2 className="text-2xl font-bold text-dark mb-4">
          Current Inventory Levels
        </h2>

        {/* Search and filter controls */}
        <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 justify-between">
          <TextField
            placeholder="Search products..."
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#999" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: "100%",
              maxWidth: "350px",
              "& .MuiOutlinedInput-root": {
                backgroundColor: "#ffffff",
                "& fieldset": { borderColor: "#eccb34" },
                "&:hover fieldset": { borderColor: "#eccb34" },
                "&.Mui-focused fieldset": { borderColor: "#eccb34" },
              },
              "& .MuiInputBase-input": { color: "#333333" },
            }}
          />

          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
            <Button
              variant={sortBy === "name" ? "contained" : "outlined"}
              onClick={() => setSortBy("name")}
              sx={{
                textTransform: "none",
                bgcolor: sortBy === "name" ? "#eccb34" : "transparent",
                color: sortBy === "name" ? "#333333" : "#eccb34",
                borderColor: "#eccb34",
                "&:hover": {
                  bgcolor:
                    sortBy === "name" ? "#d9b92f" : "rgba(236, 203, 52, 0.1)",
                  borderColor: "#eccb34",
                },
              }}
            >
              Sort by Name
            </Button>
            <Button
              variant={sortBy === "stock" ? "contained" : "outlined"}
              onClick={() => setSortBy("stock")}
              sx={{
                textTransform: "none",
                bgcolor: sortBy === "stock" ? "#eccb34" : "transparent",
                color: sortBy === "stock" ? "#333333" : "#eccb34",
                borderColor: "#eccb34",
                "&:hover": {
                  bgcolor:
                    sortBy === "stock" ? "#d9b92f" : "rgba(236, 203, 52, 0.1)",
                  borderColor: "#eccb34",
                },
              }}
            >
              Highest Stock
            </Button>
            <Button
              variant={sortBy === "low" ? "contained" : "outlined"}
              onClick={() => setSortBy("low")}
              sx={{
                textTransform: "none",
                bgcolor: sortBy === "low" ? "#eccb34" : "transparent",
                color: sortBy === "low" ? "#333333" : "#eccb34",
                borderColor: "#eccb34",
                "&:hover": {
                  bgcolor:
                    sortBy === "low" ? "#d9b92f" : "rgba(236, 203, 52, 0.1)",
                  borderColor: "#eccb34",
                },
              }}
            >
              Low Stock First
            </Button>
          </div>
        </div>

        {/* Header row */}
        <div className="grid grid-cols-[1fr_auto] py-3 px-4 bg-primary/10 rounded-t-lg text-dark font-semibold">
          <span>Product</span>
          <span className="text-right pr-8">Stock Level</span>
        </div>

        {/* Products list */}
        <div className="flex-1 overflow-y-auto bg-secondary/80 rounded-b-lg mb-6 border border-primary/10">
          {sortedProducts.length === 0 ? (
            <div className="p-8 text-center text-dark/70">
              {searchTerm
                ? "No products match your search"
                : "No products found"}
            </div>
          ) : (
            sortedProducts.map((product, index) => (
              <div
                key={product.id || `item-${index}`}
                className="grid grid-cols-[auto_1fr_auto] py-3 px-2 sm:px-4 border-b border-primary/10 items-center hover:bg-primary/5 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="text-dark">
                    {product.name || "Unnamed Product"}
                  </span>
                </div>
                <div className="flex items-center justify-end pr-6">
                  <span
                    className={`text-lg font-medium ${getStockLevelClass(
                      product.quantity || 0
                    )}`}
                  >
                    {product.quantity || 0}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-primary/10">
          <h3 className="text-lg font-semibold text-dark mb-2">
            Inventory Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-primary/5 p-3 rounded-lg">
              <div className="text-sm text-dark/70">Total Products</div>
              <div className="text-2xl font-bold text-dark">
                {totalProducts}
              </div>
            </div>
            <div className="bg-primary/5 p-3 rounded-lg">
              <div className="text-sm text-dark/70">Total Items in Stock</div>
              <div className="text-2xl font-bold text-dark">
                {totalItemsInStock}
              </div>
            </div>
            <div className="bg-primary/5 p-3 rounded-lg">
              <div className="text-sm text-dark/70">Low Stock Items</div>
              <div className="text-2xl font-bold text-orange-500">
                {lowStockItemsCount}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminProtected>
  );
};

export default ViewStockSection;
