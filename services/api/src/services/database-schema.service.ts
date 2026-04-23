import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@soundx/db';

type SqliteColumnInfo = {
  name: string;
};

@Injectable()
export class DatabaseSchemaService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSchemaService.name);
  private readonly prisma: PrismaClient;
  private ensurePromise: Promise<void> | null = null;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async onModuleInit() {
    await this.ensureTrackSortColumns();
  }

  async ensureTrackSortColumns() {
    if (!this.ensurePromise) {
      this.ensurePromise = this.ensureTrackSortColumnsInternal().catch((error) => {
        this.ensurePromise = null;
        throw error;
      });
    }

    return this.ensurePromise;
  }

  private async ensureTrackSortColumnsInternal() {
    const rows = await this.prisma.$queryRawUnsafe<SqliteColumnInfo[]>(
      'PRAGMA table_info("Track")',
    );
    const existingColumns = new Set(rows.map((row) => row.name));

    const requiredColumns: Array<{ name: string; sql: string }> = [
      { name: 'fileName', sql: 'ALTER TABLE "Track" ADD COLUMN "fileName" TEXT' },
      { name: 'relativePath', sql: 'ALTER TABLE "Track" ADD COLUMN "relativePath" TEXT' },
      { name: 'fileCreatedAt', sql: 'ALTER TABLE "Track" ADD COLUMN "fileCreatedAt" DATETIME' },
      { name: 'scanOrder', sql: 'ALTER TABLE "Track" ADD COLUMN "scanOrder" INTEGER' },
    ];

    for (const column of requiredColumns) {
      if (existingColumns.has(column.name)) {
        continue;
      }

      this.logger.warn(`Track.${column.name} is missing in SQLite. Applying compatibility ALTER TABLE...`);
      await this.prisma.$executeRawUnsafe(column.sql);
      this.logger.log(`Added missing column Track.${column.name}`);
    }
  }
}
