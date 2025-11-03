const { pool } = require("@/lib/database");

const notificationsService = {
  createNotification: async (
    userId,
    type,
    message,
    link = null,
    metadata = null
  ) => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO notifications (user_id, type, message, link, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, type, message, link, metadata]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  getUnreadCount: async (userId) => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT COUNT(*) as count
         FROM notifications
         WHERE user_id = $1 AND read = false`,
        [userId]
      );
      return parseInt(result.rows[0].count);
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

  getNotifications: async (userId, limit = 20) => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM notifications 
         WHERE user_id = $1
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } finally {
      client.release();
    }
  },
};

export default notificationsService;
