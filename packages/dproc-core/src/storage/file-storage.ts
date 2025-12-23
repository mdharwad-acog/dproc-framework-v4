import { promises as fs } from "fs";
import path from "path";
import { Storage } from "./interface.js";

export class FileStorage<T extends Record<string, any>> implements Storage<T> {
  private filePath: string;
  private prettyPrint: boolean;
  private idField: keyof T;

  constructor(
    filename: string,
    idField: keyof T,
    dataDir: string = "./data",
    prettyPrint = true
  ) {
    this.filePath = path.join(dataDir, filename);
    this.idField = idField;
    this.prettyPrint = prettyPrint;
  }

  private async readAll(): Promise<T[]> {
    try {
      const data = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(data) as T[];
    } catch (err: any) {
      if (err.code === "ENOENT") return [];
      throw new Error(`Failed to read storage file: ${err.message}`);
    }
  }

  private async writeAll(items: T[]): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      const content = this.prettyPrint
        ? JSON.stringify(items, null, 2)
        : JSON.stringify(items);
      await fs.writeFile(this.filePath, content, "utf8");
    } catch (err: any) {
      throw new Error(`Failed to write storage file: ${err.message}`);
    }
  }

  async getById(id: string): Promise<T | null> {
    const items = await this.readAll();
    return items.find((item) => item[this.idField] === id) ?? null;
  }

  async list(filter?: Partial<T>): Promise<T[]> {
    const items = await this.readAll();
    if (!filter) return items;

    return items.filter((item) =>
      Object.entries(filter).every(([key, value]) => {
        if (value === undefined) return true;
        return item[key] === value;
      })
    );
  }

  async getAll(): Promise<T[]> {
    return this.readAll();
  }

  async create(data: T): Promise<T> {
    const items = await this.readAll();

    const id = data[this.idField];

    // Check for duplicate ID
    if (items.some((item) => item[this.idField] === id)) {
      throw new Error(
        `Record with ${String(this.idField)} ${id} already exists`
      );
    }

    items.push(data);
    await this.writeAll(items);
    return data;
  }

  async update(id: string, patch: Partial<T>): Promise<T> {
    const items = await this.readAll();
    const index = items.findIndex((item) => item[this.idField] === id);

    if (index === -1) {
      throw new Error(`Record with ${String(this.idField)} ${id} not found`);
    }

    // Merge the patch into the existing item
    const updated = { ...items[index], ...patch } as T;
    items[index] = updated;
    await this.writeAll(items);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const items = await this.readAll();
    const filtered = items.filter((item) => item[this.idField] !== id);

    if (filtered.length === items.length) {
      throw new Error(`Record with ${String(this.idField)} ${id} not found`);
    }

    await this.writeAll(filtered);
  }
}
