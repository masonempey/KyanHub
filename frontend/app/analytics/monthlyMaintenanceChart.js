"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Text,
} from "recharts";
import styles from "../styles/monthlyRevenueChart.module.css";
import { useUser } from "../../contexts/UserContext";
import fetchWithAuth from "../../utils/fetchWithAuth";

const MonthlyMaintenance = ({ propertyId, month }) => {
  const { user, loading: userLoading } = useUser();
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!propertyId || !month || !user) return;

    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const response = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/analytics/${propertyId}/2025/${month}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch analytics data");
        }

        const result = await response.json();
        if (result.success) {
          const maintenanceByCategory =
            result.metrics.maintenance.records.reduce((acc, record) => {
              const category = record.category;
              if (!acc[category]) {
                acc[category] = {
                  name: category,
                  value: 0,
                };
              }
              acc[category].value += parseFloat(record.cost);
              return acc;
            }, {});

          const maintenanceData = Object.values(maintenanceByCategory);
          const inventory = result.metrics.inventory.products.map(
            (product) => ({
              name: product.product_name,
              value: product.quantity,
            })
          );

          setMaintenanceData(maintenanceData);
          setInventoryData(inventory);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
        alert("Failed to load analytics data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [propertyId, month, user]);

  const COLORS = ["#ECCB34", "#FF8042", "#00C49F", "#8884d8"];
  const INVENTORY_COLORS = [
    "#82ca9d",
    "#8884d8",
    "#ECCB34",
    "#ffc658",
    "#ff7300",
    "#FF8042",
    "#00C49F",
    "#0088FE",
    "#FFBB28",
    "#FF8042",
  ];

  if (userLoading || isLoading) return <div>Loading...</div>;
  if (!user) return <div>Please log in to view analytics.</div>;
  if (!maintenanceData.length && !inventoryData.length)
    return <div>No data available</div>;

  const totalMaintenance = maintenanceData.reduce(
    (sum, entry) => sum + entry.value,
    0
  );
  const totalInventory = inventoryData.reduce(
    (sum, entry) => sum + entry.value,
    0
  );

  const renderLegend = (value) => {
    return (
      <span style={{ fontSize: "1rem", fontWeight: "bold" }}>{value}</span>
    );
  };

  return (
    <div className={styles.smallRevenueContainer}>
      <span>Monthly Maintenance & Inventory</span>
      <div style={{ display: "flex", width: "100%", height: "85%" }}>
        <div style={{ width: "90%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ left: 0, right: 0 }}>
              <Pie
                data={maintenanceData}
                cx="45%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2.5}
                dataKey="value"
                nameKey="name"
              >
                {maintenanceData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Pie
                data={inventoryData}
                cx="75%"
                cy="30%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2.5}
                dataKey="value"
                nameKey="name"
              >
                {inventoryData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={INVENTORY_COLORS[index % INVENTORY_COLORS.length]}
                  />
                ))}
              </Pie>
              <text
                x="55%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  fill: "#ECCB34",
                }}
              >
                ${totalMaintenance.toFixed(2)}
              </text>
              <Tooltip />
              <Legend
                layout="vertical"
                align="left"
                verticalAlign="middle"
                iconType="circle"
                iconSize={10}
                wrapperStyle={{
                  paddingLeft: "10px",
                }}
                formatter={(value) => (
                  <span style={{ fontSize: "0.8rem", color: "#ECCB34" }}>
                    {value}
                  </span>
                )}
                payload={maintenanceData.map((entry, index) => ({
                  value: entry.name,
                  type: "circle",
                  color: COLORS[index % COLORS.length],
                  payload: entry,
                }))}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default dynamic(() => Promise.resolve(MonthlyMaintenance), {
  ssr: false,
});
