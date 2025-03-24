import { pool } from "@/lib/database";

class EmailTemplateService {
  /**
   * Get all email templates
   * @returns {Promise<Array>} Array of template objects
   */
  static async getAllTemplates() {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM email_templates ORDER BY created_at DESC"
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get a single template by ID
   * @param {string|number} id - Template ID
   * @returns {Promise<Object>} Template object
   */
  static async getTemplateById(id) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM email_templates WHERE id = $1",
        [id]
      );

      if (result.rowCount === 0) {
        return null;
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Create a new email template
   * @param {Object} templateData - Template data
   * @param {string} userId - User ID of creator
   * @returns {Promise<Object>} Created template
   */
  static async createTemplate(templateData, userId) {
    const { name, subject, message, buttonText, buttonUrl } = templateData;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO email_templates 
         (name, subject, message, button_text, button_url, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, subject, message, buttonText, buttonUrl, userId]
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing email template
   * @param {Object} templateData - Template data
   * @returns {Promise<Object>} Updated template or null if not found
   */
  static async updateTemplate(templateData) {
    const { id, name, subject, message, buttonText, buttonUrl } = templateData;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE email_templates 
         SET name = $1, subject = $2, message = $3, 
             button_text = $4, button_url = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [name, subject, message, buttonText, buttonUrl, id]
      );

      if (result.rowCount === 0) {
        return null;
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Delete an email template
   * @param {string|number} id - Template ID
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  static async deleteTemplate(id) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "DELETE FROM email_templates WHERE id = $1 RETURNING id",
        [id]
      );

      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }
}

export default EmailTemplateService;
