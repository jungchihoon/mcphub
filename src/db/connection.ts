import 'reflect-metadata'; // Ensure reflect-metadata is imported here too
import { DataSource, DataSourceOptions } from 'typeorm';
import entities from './entities/index.js';
import { registerPostgresVectorType } from './types/postgresVectorType.js';
// Vector embedding subscriber removed
import { getSmartRoutingConfig } from '../utils/smartRouting.js';

// Helper function to create required PostgreSQL extensions
const createRequiredExtensions = async (dataSource: DataSource): Promise<void> => {
  try {
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('UUID extension created or already exists.');
  } catch (err: any) {
    console.warn('Failed to create uuid-ossp extension:', err.message);
    console.warn('UUID generation functionality may not be available.');
  }

  // Vector extension removed (Smart Routing feature removed)
};

// Get database URL from smart routing config or fallback to environment variable
const getDatabaseUrl = (): string => {
  return getSmartRoutingConfig().dbUrl;
};

// Default database configuration
const defaultConfig: DataSourceOptions = {
  type: 'postgres',
  url: getDatabaseUrl(),
  synchronize: true,
  entities: entities,
      subscribers: [], // Vector embedding subscriber removed
};

// AppDataSource is the TypeORM data source
let appDataSource = new DataSource(defaultConfig);

// Global promise to track initialization status
let initializationPromise: Promise<DataSource> | null = null;

// Function to create a new DataSource with updated configuration
export const updateDataSourceConfig = (): DataSource => {
  const newConfig: DataSourceOptions = {
    ...defaultConfig,
    url: getDatabaseUrl(),
  };

  // If the configuration has changed, we need to create a new DataSource
  const currentUrl = (appDataSource.options as any).url;
  if (currentUrl !== newConfig.url) {
    console.log('Database URL configuration changed, updating DataSource...');
    appDataSource = new DataSource(newConfig);
    // Reset initialization promise when configuration changes
    initializationPromise = null;
  }

  return appDataSource;
};

// Get the current AppDataSource instance
export const getAppDataSource = (): DataSource => {
  return appDataSource;
};

// Reconnect database with updated configuration
export const reconnectDatabase = async (): Promise<DataSource> => {
  try {
    // Close existing connection if it exists
    if (appDataSource.isInitialized) {
      console.log('Closing existing database connection...');
      await appDataSource.destroy();
    }

    // Reset initialization promise to allow fresh initialization
    initializationPromise = null;

    // Update configuration and reconnect
    appDataSource = updateDataSourceConfig();
    return await initializeDatabase();
  } catch (error) {
    console.error('Error during database reconnection:', error);
    throw error;
  }
};

// Initialize database connection with concurrency control
export const initializeDatabase = async (): Promise<DataSource> => {
  // If initialization is already in progress, wait for it to complete
  if (initializationPromise) {
    console.log('Database initialization already in progress, waiting for completion...');
    return initializationPromise;
  }

  // If already initialized, return the existing instance
  if (appDataSource.isInitialized) {
    console.log('Database already initialized, returning existing instance');
    return Promise.resolve(appDataSource);
  }

  // Create a new initialization promise
  initializationPromise = performDatabaseInitialization();

  try {
    const result = await initializationPromise;
    console.log('Database initialization completed successfully');
    return result;
  } catch (error) {
    // Reset the promise on error so initialization can be retried
    initializationPromise = null;
    console.error('Database initialization failed:', error);
    throw error;
  }
};

// Internal function to perform the actual database initialization
const performDatabaseInitialization = async (): Promise<DataSource> => {
  try {
    // Update configuration before initializing
    appDataSource = updateDataSourceConfig();

    if (!appDataSource.isInitialized) {
      console.log('Initializing database connection...');
      // Register the vector type with TypeORM
      await appDataSource.initialize();
      registerPostgresVectorType(appDataSource);

      // Create required PostgreSQL extensions
      await createRequiredExtensions(appDataSource);

      // Vector embeddings support removed (Smart Routing feature removed)
      console.log('Database connection established successfully.');
    }
    return appDataSource;
  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  }
};

// Get database connection status
export const isDatabaseConnected = (): boolean => {
  return appDataSource.isInitialized;
};

// Close database connection
export const closeDatabase = async (): Promise<void> => {
  if (appDataSource.isInitialized) {
    await appDataSource.destroy();
    console.log('Database connection closed.');
  }
};

// Export AppDataSource for backward compatibility
export const AppDataSource = appDataSource;

export default getAppDataSource;
