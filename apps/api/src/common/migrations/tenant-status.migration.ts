import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MongooseDatabaseService } from '../mongoose-database.service';
import { TenantStatus } from '../../models/tenancy.schemas';

@Injectable()
export class TenantStatusMigration implements OnModuleInit {
  private readonly logger = new Logger(TenantStatusMigration.name);
  constructor(private readonly db: MongooseDatabaseService) {}

  async onModuleInit() {
    const result = await this.db.tenant.updateMany(
      { status: { $exists: false } },
      { $set: { status: TenantStatus.ACTIVE } },
    );
    if (result.modifiedCount > 0) {
      this.logger.log(`Normalized ${result.modifiedCount} legacy tenant record(s) to active status.`);
    }
  }
}
