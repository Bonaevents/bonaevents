/**
 * Utility functions for ticket operations
 */

/**
 * Generates a random ticket code consisting of 8 alphanumeric characters
 * @returns {string} Ticket code
 */
export const generateTicketCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}; 