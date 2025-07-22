import { initializeDatabase, closeDatabase, isDatabaseConnected } from './connection.js';
import * as repositories from './repositories/index.js';

/**
 * Initialize the database module
 */
export async function initializeDbModule(): Promise<boolean> {
  try {
    // Connect to the database
    await initializeDatabase();
    return true;
  } catch (error) {
    console.error('Failed to initialize database module:', error);
    return false;
  }
}

// Vector repository factory removed (Smart Routing feature removed)

// Re-export everything from the database module
export { initializeDatabase, closeDatabase, isDatabaseConnected, repositories };
