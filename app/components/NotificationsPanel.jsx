import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Divider,
  Paper,
  Popper,
  ClickAwayListener,
  CircularProgress,
} from "@mui/material";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ImageIcon from "@mui/icons-material/Image";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import fetchWithAuth from "@/lib/fetchWithAuth";

const CACHE_EXPIRY = 60000;
let notificationsCache = {
  data: null,
  timestamp: 0,
};

const NotificationsPanel = ({ open, anchorEl, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const now = Date.now();
      if (
        notificationsCache.data &&
        now - notificationsCache.timestamp < CACHE_EXPIRY
      ) {
        setNotifications(notificationsCache.data);
        setLoading(false);
        return;
      }

      const response = await fetchWithAuth("/api/notifications");

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const notifications = data.notifications || [];

      // Update cache
      notificationsCache = {
        data: notifications,
        timestamp: now,
      };

      setNotifications(notifications);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const invalidateCache = () => {
    notificationsCache.timestamp = 0;
  };

  const handleOpenFile = async (notification) => {
    try {
      // Mark as read first
      await fetchWithAuth(`/api/notifications/${notification.id}/read`, {
        method: "POST",
      });

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true } : n
        )
      );

      invalidateCache();

      // Open the file in a new tab
      if (notification.type === "google_drive" && notification.data) {
        const data =
          typeof notification.data === "string"
            ? JSON.parse(notification.data)
            : notification.data;

        if (data.webViewLink) {
          window.open(data.webViewLink, "_blank");
        }
      }
    } catch (err) {
      console.error("Error opening file:", err);
    }
  };

  const handleDeleteNotification = async (notification, event) => {
    event.stopPropagation();
    try {
      const response = await fetchWithAuth(
        `/api/notifications/${notification.id}/delete`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      // Remove from local state
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      invalidateCache();
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const getFileIcon = (notification) => {
    if (!notification.data) return <InsertDriveFileIcon />;

    const data =
      typeof notification.data === "string"
        ? JSON.parse(notification.data)
        : notification.data;

    if (data.mimeType?.includes("pdf")) {
      return <PictureAsPdfIcon sx={{ color: "#e74c3c" }} />;
    } else if (data.mimeType?.includes("image")) {
      return <ImageIcon sx={{ color: "#3498db" }} />;
    }

    return <InsertDriveFileIcon sx={{ color: "#95a5a6" }} />;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (!open) return null;

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="bottom-end"
      sx={{ zIndex: 1300 }}
    >
      <ClickAwayListener onClickAway={onClose}>
        <Paper
          elevation={4}
          sx={{
            width: 320,
            maxHeight: 450,
            overflow: "hidden",
            borderRadius: 2,
            mt: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Notifications
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ overflow: "auto", maxHeight: "calc(450px - 60px)" }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress size={24} sx={{ color: "#eccb34" }} />
              </Box>
            ) : error ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography color="error">{error}</Typography>
              </Box>
            ) : notifications.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography color="textSecondary">No notifications</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {notifications.map((notification) => (
                  <React.Fragment key={notification.id}>
                    <ListItem
                      alignItems="flex-start"
                      sx={{
                        backgroundColor: notification.is_read
                          ? "transparent"
                          : "rgba(236, 203, 52, 0.05)",
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: "rgba(236, 203, 52, 0.1)",
                        },
                      }}
                      onClick={() => handleOpenFile(notification)}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={(e) =>
                            handleDeleteNotification(notification, e)
                          }
                          sx={{ color: "#888" }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: notification.is_read
                              ? "#e0e0e0"
                              : "#eccb34",
                          }}
                        >
                          {getFileIcon(notification)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography
                            component="span" // Change from default p to span
                            variant="body2"
                            sx={{
                              fontWeight: notification.is_read
                                ? "normal"
                                : "bold",
                              display: "flex",
                              justifyContent: "space-between",
                              pr: 4,
                            }}
                          >
                            <span>{notification.title}</span>
                            {!notification.is_read && (
                              <Box
                                component="span"
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  bgcolor: "#eccb34",
                                  alignSelf: "center",
                                  display: "inline-block",
                                }}
                              />
                            )}
                          </Typography>
                        }
                        secondary={
                          <React.Fragment>
                            <Typography
                              component="span"
                              variant="body2"
                              color="textSecondary"
                              display="block"
                            >
                              {notification.message}
                            </Typography>
                            <Typography
                              component="span"
                              variant="caption"
                              color="textSecondary"
                              display="block"
                            >
                              {formatDate(notification.created_at)}
                            </Typography>
                          </React.Fragment>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        </Paper>
      </ClickAwayListener>
    </Popper>
  );
};

export default NotificationsPanel;
