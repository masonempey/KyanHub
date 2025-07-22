import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
} from "@mui/material";
import fetchWithAuth from "@/lib/fetchWithAuth";
import StatusBadge from "./StatusBadge";

const StatusAuditLog = ({ propertyId, year, monthNumber }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAuditLogs = async () => {
      setLoading(true);
      try {
        const response = await fetchWithAuth(
          `/api/property-month-end/audit?propertyId=${propertyId}&year=${year}&monthNumber=${monthNumber}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch audit logs");
        }

        const data = await response.json();
        setLogs(data.data || []);
      } catch (error) {
        console.error("Error fetching audit logs:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, [propertyId, year, monthNumber]);

  if (loading) {
    return <CircularProgress size={24} />;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (logs.length === 0) {
    return (
      <Typography color="textSecondary">No status changes recorded.</Typography>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>From</TableCell>
            <TableCell>To</TableCell>
            <TableCell>Changed By</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell>{new Date(log.changed_at).toLocaleString()}</TableCell>
              <TableCell>
                {log.previous_status ? (
                  <StatusBadge status={log.previous_status} />
                ) : (
                  <Typography variant="caption">Initial</Typography>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={log.new_status} />
              </TableCell>
              <TableCell>{log.changed_by_name || log.changed_by}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default StatusAuditLog;
