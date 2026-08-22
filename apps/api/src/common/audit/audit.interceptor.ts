import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';
import { NotificationService } from '../../modules/enterprise-ux/notification.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService, private readonly notifications: NotificationService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp(); const req = http.getRequest<any>(); const res = http.getResponse<any>();
    const method = String(req.method ?? 'GET').toUpperCase(); const route = String(req.route?.path ?? req.originalUrl ?? req.url ?? 'unknown');
    const ignored = method === 'OPTIONS' || route.includes('/api/docs') || route.includes('/health') || route.includes('/audit');
    const auth = req.authContext; const systemAuth = req.systemAuth;
    if (ignored) return next.handle();
    const shouldRecord = ['POST','PUT','PATCH','DELETE'].includes(method); if (!shouldRecord) return next.handle();

    if (!auth?.tenantId && systemAuth?.sub) {
      const systemUserId = String(systemAuth.sub);
      return next.handle().pipe(
        tap((value) => { void this.notifications.fromSystemAction(systemUserId, `${method.toLowerCase()}.${this.normalizeRoute(route)}`, this.safeMetadata(value)).catch(()=>undefined); }),
        catchError((error) => { void this.notifications.fromSystemAction(systemUserId, `${method.toLowerCase()}.${this.normalizeRoute(route)}.failed`, { result:'failure', error:String(error?.message??'Request failed').slice(0,500) }).catch(()=>undefined); throw error; })
      );
    }
    if (!auth?.tenantId) return next.handle();

    const targetId = req.params?.assetId ?? req.params?.userId ?? req.params?.companyId ?? req.params?.vendorId ?? req.params?.roleId ?? req.params?.idpConfigId ?? req.params?.tokenId ?? req.params?.assetTypeId ?? req.params?.transferId ?? req.params?.acknowledgementId ?? req.params?.templateId ?? req.params?.documentId;
    const targetType = this.inferTargetType(route, req.params ?? {});
    const base = { tenantId:auth.tenantId, companyId:auth.companyId, actorUserId:auth.userId, targetType, targetId:targetId?String(targetId):undefined, route, method, ipAddress:req.ip, userAgent:String(req.headers?.['user-agent']??'').slice(0,500), requestId:req.requestId };
    return next.handle().pipe(
      tap((value) => { void this.audit.record({...base,action:`${method.toLowerCase()}.${this.normalizeRoute(route)}`,metadata:{result:'success',statusCode:res.statusCode,...this.safeMetadata(value)}}).catch(()=>undefined); }),
      catchError((error)=>{ void this.audit.record({...base,action:`${method.toLowerCase()}.${this.normalizeRoute(route)}.failed`,metadata:{result:'failure',statusCode:error?.status??500,error:String(error?.message??'Request failed').slice(0,1000)}}).catch(()=>undefined); throw error; })
    );
  }
  private safeMetadata(value: unknown){if(!value||typeof value!=='object')return{};const record=value as Record<string,unknown>;const keys=['id','assetNumber','status','condition','templateName','documentId','acknowledgementId','imported','updated','deletedCount'];const out:Record<string,unknown>={};for(const key of keys)if(record[key]!==undefined)out[key]=record[key];return out;}
  private normalizeRoute(route:string){return route.replace(/^\/+/, '').replace(/^api\/v1\//,'').replace(/[:/]+/g,'.').replace(/\.\.+/g,'.').replace(/\.+$/g,'').toLowerCase();}
  private inferTargetType(route:string,params:Record<string,unknown>):string|undefined{if(params.assetId||route.includes('/assets'))return'asset';if(params.userId||route.includes('/users'))return'user';if(params.roleId||route.includes('/roles'))return'role';if(params.vendorId||route.includes('/vendors'))return'vendor';if(params.companyId||route.includes('/companies'))return'company';if(params.idpConfigId||route.includes('/identity'))return'identity_provider';if(params.tokenId||route.includes('/scim'))return'scim';if(params.assetTypeId||route.includes('/asset-templates')||route.includes('/assets/types'))return'asset_type';if(params.transferId||route.includes('/transfers'))return'asset_transfer';if(params.acknowledgementId||route.includes('/asset-acknowledgements'))return'asset_acknowledgement';if(params.templateId||route.includes('/templates'))return'template';if(params.documentId||route.includes('/documents'))return'asset_document';return undefined;}
}
