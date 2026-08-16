import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';

@Injectable()
export class OrganizationManagementService {
  constructor(private readonly db: MongooseDatabaseService) {}

  private async assertCompany(auth: AuthContext, companyId: string) {
    const company = await this.db.company.findOne({ _id: companyId, tenantId: auth.tenantId }).lean();
    if (!company) throw new NotFoundException('Company not found');
    if (!auth.crossCompany && String(company._id) !== String(auth.companyId)) throw new ForbiddenException('Company out of scope for this user');
    return company;
  }

  async updateCompany(auth: AuthContext, companyId: string, name: string, code: string) {
    await this.assertCompany(auth, companyId);
    const normalizedName = name.trim(); const normalizedCode = code.trim().toUpperCase();
    const duplicate = await this.db.company.findOne({ tenantId: auth.tenantId, code: normalizedCode, _id: { $ne: companyId } }).lean();
    if (duplicate) throw new ConflictException('Company code already exists');
    const updated = await this.db.company.findOneAndUpdate({ _id: companyId, tenantId: auth.tenantId }, { $set: { name: normalizedName, code: normalizedCode, updatedAt: new Date() } }, { new: true }).lean();
    if (!updated) throw new NotFoundException('Company not found');
    return { id: String(updated._id), name: updated.name, code: updated.code };
  }

  async deleteCompany(auth: AuthContext, companyId: string) {
    await this.assertCompany(auth, companyId);
    const [sites, assets, users] = await Promise.all([
      this.db.plant.countDocuments({ companyId }),
      this.db.asset.countDocuments({ companyId }),
      this.db.user.countDocuments({ tenantId: auth.tenantId, companyId }),
    ]);
    if (sites || assets || users) throw new ConflictException('Company cannot be deleted while it contains sites, assets, or users. Remove or reassign them first.');
    const result = await this.db.company.deleteOne({ _id: companyId, tenantId: auth.tenantId });
    if (!result.deletedCount) throw new NotFoundException('Company not found');
    return { ok: true };
  }

  private async assertPlant(auth: AuthContext, plantId: string) {
    const plant = await this.db.plant.findById(plantId).lean();
    if (!plant) throw new NotFoundException('Site not found');
    await this.assertCompany(auth, String(plant.companyId));
    return plant;
  }

  async updatePlant(auth: AuthContext, plantId: string, name: string) {
    await this.assertPlant(auth, plantId);
    const updated = await this.db.plant.findByIdAndUpdate(plantId, { $set: { name: name.trim(), updatedAt: new Date() } }, { new: true }).lean();
    if (!updated) throw new NotFoundException('Site not found');
    return { id: String(updated._id), name: updated.name, type: updated.type };
  }

  async deletePlant(auth: AuthContext, plantId: string) {
    await this.assertPlant(auth, plantId);
    const locations = await this.db.location.countDocuments({ plantId });
    if (locations) throw new ConflictException('Site cannot be deleted while it contains locations.');
    await this.db.plant.deleteOne({ _id: plantId });
    return { ok: true };
  }

  private async assertLocation(auth: AuthContext, locationId: string) {
    const location = await this.db.location.findById(locationId).lean();
    if (!location) throw new NotFoundException('Location not found');
    const plant = await this.db.plant.findById(location.plantId).lean();
    if (!plant) throw new NotFoundException('Site not found');
    await this.assertCompany(auth, String(plant.companyId));
    return location;
  }

  async updateLocation(auth: AuthContext, locationId: string, name: string) {
    await this.assertLocation(auth, locationId);
    const updated = await this.db.location.findByIdAndUpdate(locationId, { $set: { name: name.trim(), updatedAt: new Date() } }, { new: true }).lean();
    if (!updated) throw new NotFoundException('Location not found');
    return { id: String(updated._id), name: updated.name };
  }

  async deleteLocation(auth: AuthContext, locationId: string) {
    await this.assertLocation(auth, locationId);
    const departments = await this.db.department.countDocuments({ locationId });
    if (departments) throw new ConflictException('Location cannot be deleted while it contains departments.');
    await this.db.location.deleteOne({ _id: locationId });
    return { ok: true };
  }

  private async assertDepartment(auth: AuthContext, departmentId: string) {
    const department = await this.db.department.findById(departmentId).lean();
    if (!department) throw new NotFoundException('Department not found');
    await this.assertLocation(auth, String(department.locationId));
    return department;
  }

  async updateDepartment(auth: AuthContext, departmentId: string, name: string) {
    await this.assertDepartment(auth, departmentId);
    const updated = await this.db.department.findByIdAndUpdate(departmentId, { $set: { name: name.trim(), updatedAt: new Date() } }, { new: true }).lean();
    if (!updated) throw new NotFoundException('Department not found');
    return { id: String(updated._id), name: updated.name };
  }

  async deleteDepartment(auth: AuthContext, departmentId: string) {
    await this.assertDepartment(auth, departmentId);
    const result = await this.db.department.deleteOne({ _id: departmentId });
    if (!result.deletedCount) throw new NotFoundException('Department not found');
    return { ok: true };
  }
}
