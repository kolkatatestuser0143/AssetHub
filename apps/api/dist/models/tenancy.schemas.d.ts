import { HydratedDocument } from 'mongoose';
export declare const TenantModelName = "Tenant";
export type TenantDocument = HydratedDocument<Tenant>;
export declare class Tenant {
    name: string;
    slug: string;
}
export declare const TenantSchema: import("mongoose").Schema<Tenant, import("mongoose").Model<Tenant, any, any, any, import("mongoose").Document<unknown, any, Tenant, any, {}> & Tenant & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Tenant, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Tenant>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Tenant> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const CompanyModelName = "Company";
export type CompanyDocument = HydratedDocument<Company>;
export declare class Company {
    tenantId: string;
    name: string;
    code: string;
}
export declare const CompanySchema: import("mongoose").Schema<Company, import("mongoose").Model<Company, any, any, any, import("mongoose").Document<unknown, any, Company, any, {}> & Company & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Company, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Company>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Company> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const BusinessUnitModelName = "BusinessUnit";
export type BusinessUnitDocument = HydratedDocument<BusinessUnit>;
export declare class BusinessUnit {
    companyId: string;
    name: string;
}
export declare const BusinessUnitSchema: import("mongoose").Schema<BusinessUnit, import("mongoose").Model<BusinessUnit, any, any, any, import("mongoose").Document<unknown, any, BusinessUnit, any, {}> & BusinessUnit & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, BusinessUnit, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<BusinessUnit>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<BusinessUnit> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const PlantModelName = "Plant";
export type PlantDocument = HydratedDocument<Plant>;
export declare class Plant {
    businessUnitId: string;
    name: string;
}
export declare const PlantSchema: import("mongoose").Schema<Plant, import("mongoose").Model<Plant, any, any, any, import("mongoose").Document<unknown, any, Plant, any, {}> & Plant & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Plant, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Plant>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Plant> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const LocationModelName = "Location";
export type LocationDocument = HydratedDocument<Location>;
export declare class Location {
    plantId: string;
    name: string;
}
export declare const LocationSchema: import("mongoose").Schema<Location, import("mongoose").Model<Location, any, any, any, import("mongoose").Document<unknown, any, Location, any, {}> & Location & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Location, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Location>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Location> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare const DepartmentModelName = "Department";
export type DepartmentDocument = HydratedDocument<Department>;
export declare class Department {
    locationId: string;
    name: string;
}
export declare const DepartmentSchema: import("mongoose").Schema<Department, import("mongoose").Model<Department, any, any, any, import("mongoose").Document<unknown, any, Department, any, {}> & Department & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Department, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Department>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Department> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
