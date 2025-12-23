export interface StorageOptions {
  dataDir?: string;
  prettyPrint?: boolean;
}

export interface Storage<T, ID = string> {
  /**
   * Get a single record by ID
   */
  getById(id: ID): Promise<T | null>;

  /**
   * List all records matching optional filter
   */
  list(filter?: Partial<T>): Promise<T[]>;

  /**
   * Create a new record
   */
  create(data: T): Promise<T>;

  /**
   * Update an existing record
   */
  update(id: ID, patch: Partial<T>): Promise<T>;

  /**
   * Delete a record
   */
  delete(id: ID): Promise<void>;

  /**
   * Get all records (no filtering)
   */
  getAll(): Promise<T[]>;
}
