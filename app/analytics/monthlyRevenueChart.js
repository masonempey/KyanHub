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
} from "recharts";
import styles from "../styles/monthlyRevenueChart.module.css";
import { useUser } from "@/contexts/UserContext";
import CircularProgress from "@mui/material/CircularProgress";
import fetchWithAuth from "@/lib/fetchWithAuth"; // Import fetchWithAuth

const MonthlyRevenueChart = ({ propertyId, month }) => {
  const { user, loading: userLoading } = useUser();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!propertyId || !month || !user) {
      return;
    }

    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const response = await fetchWithAuth(
          `/api/analytics/${propertyId}/2025/${month}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch analytics data: ${await response.text()}`
          );
        }

        const result = await response.json();
        if (result.success) {
          const platformRevenue = Object.entries(
            result.metrics.revenue.by_platform
          ).map(([platform, bookings]) => ({
            name: platform,
            value: parseFloat(
              bookings.reduce(
                (total, booking) => total + booking.total_revenue,
                0
              )
            ),
          }));
          setData(platformRevenue);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [propertyId, month, user]);

  const COLORS = ["#ECCB34", "#FF8042", "#00C49F", "#8884d8"];

  if (userLoading || isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress sx={{ color: "#eccb34" }} />
      </div>
    );
  }
  if (!user) return <div>Please log in to view revenue.</div>;
  if (!data.length) return <div>No data available</div>;

  const totalRevenue = data.reduce((sum, entry) => sum + entry.value, 0);

  const renderLegend = (value) => {
    return (
      <span style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{value}</span>
    );
  };

  return (
    <div className={styles.smallRevenueContainer}>
      <span>Monthly Revenue</span>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2.5}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: "1.25rem",
              fontWeight: "bold",
              color: "#ECCB34",
              fill: "#ECCB34",
            }}
          >
            ${totalRevenue.toFixed(2)}
          </text>
          <Tooltip />
          <Legend
            layout="vertical"
            verticalAlign="middle"
            align="middle"
            iconType="circle"
            iconSize={15}
            formatter={renderLegend}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default dynamic(() => Promise.resolve(MonthlyRevenueChart), {
  ssr: false,
});
