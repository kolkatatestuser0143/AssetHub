import { CustomFieldsService } from './custom-fields.service';
declare class CustomFieldDefinitionDto {
    key: string;
    label: string;
    fieldType: string;
}
declare class UpdateCustomFieldDefinitionDto {
    label?: string;
    fieldType?: string;
}
declare class CustomFieldValuesDto {
    values: Record<string, unknown>;
}
export declare class CustomFieldsController {
    private readonly fields;
    constructor(fields: CustomFieldsService);
    listDefinitions(req: any): Promise<any[]>;
    createDefinition(dto: CustomFieldDefinitionDto, req: any): Promise<any>;
    updateDefinition(key: string, dto: UpdateCustomFieldDefinitionDto, req: any): Promise<any>;
    deleteDefinition(key: string, req: any): Promise<{
        ok: boolean;
    }>;
    getValues(assetId: string, req: any): Promise<import("mongoose").FlattenMaps<{
        [x: string]: string;
    }>>;
    setValues(assetId: string, dto: CustomFieldValuesDto, req: any): Promise<import("mongoose").FlattenMaps<{
        [x: string]: string;
    }>>;
    clearValue(assetId: string, key: string, req: any): Promise<import("mongoose").FlattenMaps<{
        [x: string]: string;
    }>>;
}
export {};
