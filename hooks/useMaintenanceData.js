import { useState, useEffect, useCallback } from "react";
import fetchWithAuth from "@/lib/fetchWithAuth";

export const useMaintenanceData = (propertyId) => {
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!propertyId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(
        `/api/maintenance?propertyId=${propertyId}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch maintenance data: ${response.status}`);
      }

      const data = await response.json();
      setMaintenanceData(data);
      return data;
    } catch (err) {
      setError(err.message);
      console.error("Error fetching maintenance data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add the mutate function
  const mutate = useCallback(async () => {
    return await fetchData();
  }, [fetchData]);

  return { maintenanceData, isLoading, error, mutate };
};
