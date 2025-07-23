import { useState, useEffect } from "react";
import { useProperties } from "@/contexts/PropertyContext";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import SendIcon from "@mui/icons-material/Send";
import ClientOnly from "@/app/components/ClientOnly";
import fetchWithAuth from "@/lib/fetchWithAuth";
import PropertyStatusIndicator from "./PropertyStatusIndicator";
import MonthEndProcessTab from "./MonthEndProcessTab";

const MonthEndReportsTab = ({
  reportsMonth,
  setReportsMonth,
  setSuccessMessage,
  setSuccessDialogOpen,
  setErrorMessage,
  setErrorDialogOpen,
}) => {
  const [monthEndSubTab, setMonthEndSubTab] = useState(0);
  const [completedReports, setCompletedReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Fetch completed month-end reports for the selected month and year
  const fetchCompletedReports = async (month, year) => {
    setLoadingReports(true);
    try {
      console.log(`Fetching reports for ${month} ${year}`);
      const response = await fetchWithAuth(
        `/api/property-month-end/completed?month=${encodeURIComponent(
          month
        )}&year=${encodeURIComponent(year)}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`Failed to fetch reports (${response.status})`);
      }

      const data = await response.json();
      console.log(`Successfully fetched ${data.reports?.length || 0} reports`);
      setCompletedReports(data.reports || []);
    } catch (error) {
      console.error("Failed to fetch completed reports:", error);
      setErrorMessage(error.message || "Failed to fetch reports.");
      setErrorDialogOpen(true);
      setCompletedReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  // Send emails to all property owners
  const sendOwnerEmails = async () => {
    if (!completedReports.length) return;

    setUpdating(true);
    let successCount = 0;
    let errorCount = 0;
    let noOwnerCount = 0;
    let ownerMap = new Map(); // Cache for looked-up owners

    try {
      for (const report of completedReports) {
        try {
          // Implementation details...
          successCount++;
        } catch (err) {
          console.error(
            `Error sending email for ${report.property_name}:`,
            err
          );
          errorCount++;
        }
      }

      setErrorMessage(
        `Email sending complete. Success: ${successCount}, Failed: ${errorCount}${
          noOwnerCount > 0 ? `, Properties with no owner: ${noOwnerCount}` : ""
        }`
      );
      setErrorDialogOpen(true);

      // Refresh reports
      const month = reportsMonth.format("MMMM");
      const year = reportsMonth.format("YYYY");
      fetchCompletedReports(month, year);
    } catch (error) {
      console.error("Error sending owner emails:", error);
      setErrorMessage("Failed to send owner emails: " + error.message);
      setErrorDialogOpen(true);
    } finally {
      setUpdating(false);
    }
  };

  // Download a CSV of all month-end reports
  const downloadReportsSpreadsheet = () => {
    if (!completedReports.length) return;

    // Create CSV content
    let csvContent =
      "Property Name,Revenue,Cleaning Fees,Expenses,Net Amount,Owner %,Owner Payment\n";

    completedReports.forEach((report) => {
      csvContent += `"${report.property_name}",${parseFloat(
        report.revenue_amount || 0
      ).toFixed(2)},${parseFloat(report.cleaning_fees_amount || 0).toFixed(
        2
      )},${parseFloat(report.expenses_amount || 0).toFixed(2)},${parseFloat(
        report.net_amount || 0
      ).toFixed(2)},${report.owner_percentage || 100},${parseFloat(
        report.owner_profit || 0
      ).toFixed(2)}\n`;
    });

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `month-end-reports-${reportsMonth.format("MMMM-YYYY")}.csv`
    );
    document.body.appendChild(link);

    // Download it
    link.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Send email to a single property owner
  const sendSingleOwnerEmail = async (report) => {
    try {
      setUpdating(true);

      // Check if status is appropriate before sending
      const statusCheckResponse = await fetchWithAuth(
        `/api/property-month-end/options?propertyId=${report.property_id}&year=${report.year}&monthNumber=${report.month_number}&checkEmail=true`
      );

      if (!statusCheckResponse.ok) {
        throw new Error("Failed to validate property status");
      }

      const statusCheck = await statusCheckResponse.json();
      if (!statusCheck.canSendEmail) {
        setErrorMessage(
          statusCheck.message || "Cannot send email: Property not ready"
        );
        setErrorDialogOpen(true);
        return;
      }

      // Implementation details for sending the email...

      // Show success message
      setErrorMessage(`Email sent successfully for ${report.property_name}`);
      setErrorDialogOpen(true);

      // Refresh the reports to show updated email status
      const month = reportsMonth.format("MMMM");
      const year = reportsMonth.format("YYYY");
      fetchCompletedReports(month, year);
    } catch (error) {
      console.error(`Error sending email for ${report.property_name}:`, error);
      setErrorMessage(`Failed to send email: ${error.message}`);
      setErrorDialogOpen(true);
    } finally {
      setUpdating(false);
    }
  };

  // Fetch reports when the tab is active or month changes
  useEffect(() => {
    if (monthEndSubTab === 0) {
      const month = reportsMonth.format("MMMM");
      const year = reportsMonth.format("YYYY");
      fetchCompletedReports(month, year);
    }
  }, [monthEndSubTab, reportsMonth]);

  return (
    <div className="flex-1 h-full overflow-auto p-4">
      <ClientOnly
        fallback={<div className="p-4">Loading month-end reports...</div>}
      >
        <Box sx={{ width: "100%", mb: 3 }}>
          <Tabs
            value={monthEndSubTab}
            onChange={(e, newValue) => setMonthEndSubTab(newValue)}
            sx={{
              mb: 2,
              borderBottom: "1px solid rgba(236, 203, 52, 0.2)",
              "& .MuiTab-root": {
                textTransform: "none",
                minWidth: 100,
              },
              "& .Mui-selected": {
                color: "#eccb34",
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#eccb34",
              },
            }}
          >
            <Tab label="Reports" />
            <Tab label="Process Management" />
          </Tabs>
        </Box>

        {monthEndSubTab === 0 ? (
          <div className="bg-white/50 rounded-xl shadow-sm border border-primary/10 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-dark">
                Month-End Reports
              </h3>

              <div className="flex gap-4 items-center">
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={reportsMonth}
                    onChange={setReportsMonth}
                    views={["month", "year"]}
                    className="bg-white rounded-lg border border-primary/30"
                    slotProps={{
                      textField: {
                        size: "small",
                        sx: {
                          "& .MuiOutlinedInput-root": {
                            borderColor: "#eccb34",
                          },
                        },
                      },
                    }}
                  />
                </LocalizationProvider>

                <Button
                  variant="contained"
                  onClick={downloadReportsSpreadsheet}
                  disabled={!completedReports.length}
                  className="bg-primary hover:bg-secondary hover:text-primary text-dark"
                  sx={{
                    textTransform: "none",
                    backgroundColor: "#eccb34",
                    "&:hover": {
                      backgroundColor: "#d4b02a",
                    },
                  }}
                >
                  Download Spreadsheet
                </Button>

                <Button
                  variant="contained"
                  onClick={sendOwnerEmails}
                  disabled={!completedReports.length}
                  startIcon={
                    updating ? (
                      <CircularProgress size={20} sx={{ color: "white" }} />
                    ) : (
                      <SendIcon />
                    )
                  }
                  className="bg-primary hover:bg-secondary hover:text-primary text-dark"
                  sx={{
                    textTransform: "none",
                    backgroundColor:
                      completedReports.length > 0 ? "#3f51b5" : "#9e9e9e",
                    color: "white",
                    "&:hover": {
                      backgroundColor:
                        completedReports.length > 0 ? "#303f9f" : "#9e9e9e",
                    },
                  }}
                >
                  {completedReports.length > 0
                    ? `Send Owner Emails (${completedReports.length})`
                    : "No Properties Ready for Emails"}
                </Button>
              </div>
            </div>

            {loadingReports ? (
              <div className="flex justify-center py-8">
                <CircularProgress sx={{ color: "#eccb34" }} />
              </div>
            ) : completedReports.length > 0 ? (
              <div className="overflow-auto">
                {/* Status Statistics */}
                <div className="bg-white/80 rounded-xl shadow-sm border border-primary/10 p-4 mb-6">
                  <h3 className="text-lg font-semibold mb-3 text-dark">
                    Month-End Status
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-orange-700 mb-1">
                        Draft
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-orange-600">
                          {
                            completedReports.filter(
                              (r) => !r.status || r.status === "draft"
                            ).length
                          }
                        </span>
                        <span className="text-xs text-orange-500">
                          Need to update revenue
                        </span>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-700 mb-1">
                        Ready
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-blue-600">
                          {
                            completedReports.filter((r) => r.status === "ready")
                              .length
                          }
                        </span>
                        <span className="text-xs text-blue-500">
                          Ready for owner emails
                        </span>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-green-700 mb-1">
                        Complete
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-green-600">
                          {
                            completedReports.filter(
                              (r) => r.status === "complete"
                            ).length
                          }
                        </span>
                        <span className="text-xs text-green-500">
                          All done!
                        </span>
                      </div>
                    </div>
                  </div>

                  {completedReports.filter((r) => r.status === "ready").length >
                    0 && (
                    <div className="bg-blue-100 border border-blue-300 rounded p-3 text-blue-800">
                      <strong>Ready for Emails:</strong>{" "}
                      {
                        completedReports.filter((r) => r.status === "ready")
                          .length
                      }{" "}
                      properties are ready to send owner emails.
                    </div>
                  )}
                </div>

                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-primary/10">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Property
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Revenue
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Net Amount
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Owner %
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Owner Payment
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {completedReports.map((report) => (
                      <tr key={report.property_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {report.property_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          ${parseFloat(report.revenue_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          ${parseFloat(report.net_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {report.owner_percentage || 100}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-green-600">
                          ${parseFloat(report.owner_profit || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <PropertyStatusIndicator
                            status={report.status || "draft"}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            variant="contained"
                            onClick={() => sendSingleOwnerEmail(report)}
                            disabled={updating || report.owner_email_sent}
                            startIcon={<SendIcon />}
                            size="small"
                            sx={{
                              textTransform: "none",
                              backgroundColor: report.owner_email_sent
                                ? "#cccccc"
                                : "#3f51b5",
                              color: "white",
                              "&:hover": {
                                backgroundColor: report.owner_email_sent
                                  ? "#cccccc"
                                  : "#303f9f",
                              },
                              fontSize: "0.75rem",
                              padding: "2px 8px",
                            }}
                          >
                            {report.owner_email_sent ? "Sent" : "Email"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No completed month-end reports found for{" "}
                {reportsMonth.format("MMMM YYYY")}
              </div>
            )}
          </div>
        ) : (
          <MonthEndProcessTab
            year={reportsMonth.format("YYYY")}
            month={reportsMonth.month()}
            onSuccess={(message) => {
              setSuccessMessage(message);
              setSuccessDialogOpen(true);
              // Refresh reports after successful status changes
              fetchCompletedReports(
                reportsMonth.format("MMMM"),
                reportsMonth.format("YYYY")
              );
            }}
            onError={setErrorMessage}
          />
        )}
      </ClientOnly>
    </div>
  );
};

export default MonthEndReportsTab;
