import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MongooseDatabaseService } from '../mongoose-database.service';
import { UserAccountType } from '../../models/user.schemas';

@Injectable()
export class CompanyAssignmentMigration implements OnModuleInit {
  private readonly logger = new Logger(CompanyAssignmentMigration.name);

  constructor(private readonly db: MongooseDatabaseService) {}

  async onModuleInit() {
    const tenants = await this.db.tenant.find({}).select({ _id: 1 }).lean();
    let repaired = 0;
    let ambiguous = 0;

    for (const tenant of tenants) {
      const tenantId = String(tenant._id);
      const companies = await this.db.company.find({ tenantId }).select({ _id: 1 }).lean();
      if (companies.length !== 1) continue;

      const companyId = String(companies[0]._id);
      const result = await this.db.user.updateMany(
        {
          tenantId,
          accountType: UserAccountType.TENANT,
          companyId: { $nin: [companyId] },
        },
        { $set: { companyId } },
      );

      if (result.modifiedCount > 0) {
        repaired += result.modifiedCount;
        this.logger.warn(`Repaired ${result.modifiedCount} tenant user company assignment(s) for tenant ${tenantId}.`);
      }
    }

    const invalidUsers = await this.db.user.find({ accountType: UserAccountType.TENANT }).select({ _id: 1, tenantId: 1, companyId: 1 }).lean();
    for (const user of invalidUsers) {
      const company = await this.db.company.findOne({ _id: user.companyId, tenantId: user.tenantId }).select({ _id: 1 }).lean();
      if (!company) ambiguous += 1;
    }

    if (repaired > 0) this.logger.log(`Company assignment migration repaired ${repaired} tenant user(s).`);
    if (ambiguous > 0) this.logger.warn(`${ambiguous} tenant user(s) still have an invalid company assignment; these require explicit administrator correction.`);
  }
}
