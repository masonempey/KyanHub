import { useState, useEffect, useCallback } from "react";
import fetchWithAuth from "@/lib/fetchWithAuth";

export const useCleaningData = (propertyId) => {
  const [cleaningData, setCleaningData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!propertyId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(
        `/api/cleaning?propertyId=${propertyId}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch cleaning data: ${response.status}`);
      }

      const data = await response.json();
      setCleaningData(data);
      return data;
    } catch (err) {
      setError(err.message);
      console.error("Error fetching cleaning data:", err);
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

  return { cleaningData, isLoading, error, mutate };
};
