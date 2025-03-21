const { pool } = require("@/lib/database");

const NotificationService = {
  createNotification: async ({ title, message, type, data }) => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO notifications 
         (title, message, type, data, is_read, created_at) 
         VALUES ($1, $2, $3, $4, false, NOW())
         RETURNING *`,
        [
          title,
          message,
          type,
          typeof data === "object" ? JSON.stringify(data) : data,
        ]
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  },

  getUnreadCount: async () => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT COUNT(*) as count
         FROM notifications
         WHERE is_read = false`
      );

      return parseInt(result.rows[0].count || "0", 10);
    } finally {
      client.release();
    }
  },

  markAsRead: async (notificationId) => {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE notifications
         SET is_read = true
         WHERE id = $1`,
        [notificationId]
      );

      return { success: true };
    } finally {
      client.release();
    }
  },

  deleteNotification: async (notificationId) => {
    const client = await pool.connect();
    try {
      await client.query(
        `DELETE FROM notifications
         WHERE id = $1`,
        [notificationId]
      );

      return { success: true };
    } finally {
      client.release();
    }
  },

  getNotifications: async (limit = 20) => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM notifications 
         ORDER BY created_at DESC 
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } finally {
      client.release();
    }
  },
};

module.exports = NotificationService;
