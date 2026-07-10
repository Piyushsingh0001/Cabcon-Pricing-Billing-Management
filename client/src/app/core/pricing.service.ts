import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface PaginatedResult<T> {
  items: T[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface Category {
  id: number;
  name: string;
}

export interface Material {
  id: number;
  name: string;
  type: number; // 0 = Exchange, 1 = Direct
  lmeUsdPerMt?: number;
  premiumUsdPerMt?: number;
  fxRate?: number;
  freightInrPerMt?: number;
  directRateInrPerKg?: number;
  asOnDate: string;
  isPlaceholder: boolean;
  landedCost: number;
  updatedBy?: string;
}

export interface MaterialPriceHistory {
  id: number;
  lmeUsdPerMt?: number;
  premiumUsdPerMt?: number;
  fxRate?: number;
  freightInrPerMt?: number;
  directRateInrPerKg?: number;
  landedCostInrPerKg: number;
  effectiveDate: string;
  updatedBy?: string;
}

export interface Sku {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  spec: string;
  unit: string;
  conversionType: number; // 0 = Percentage, 1 = Amount
  conversionValue: number;
  gstRate: number;
  isPlaceholder: boolean;
  rawMaterialCost: number;
  manufacturingCost: number;
  totalWeight: number;
  updatedBy?: string;
  bomLines?: { materialId: number; materialName: string; weightKg: number }[];
}

export interface SkuBomLine {
  materialId: number;
  materialName: string;
  materialType: number;
  weightKg: number;
  materialLandedCost: number;
  lineOrder: number;
}

export interface SkuDetails extends Sku {
  bomLines: SkuBomLine[];
}

export interface CalculatedQuotationItem {
  skuId: number;
  categoryName: string;
  skuName: string;
  spec: string;
  unit: string;
  rmCost: number;
  mfgCost: number;
  offerExGst: number;
  gstPercent: number;
  gstAmount: number;
  grossRate: number;
}

export interface QuotationSummary {
  id: number;
  quotationNumber: string;
  quotationDate: string;
  partyName: string;
  validityDays: number;
  totalExGst: number;
  totalGst: number;
  totalGross: number;
  approvalStatus: number;
  createdBy?: string;
  isActive: boolean;
}

export interface QuotationLine {
  skuId: number;
  descriptionSnapshot: string;
  unit: string;
  rmCostSnapshot: number;
  mfgCostSnapshot: number;
  offerExGst: number;
  gstPercent: number;
  gstAmount: number;
  grossRate: number;
  lineOrder: number;
}

export interface QuotationDetails {
  id: number;
  quotationNumber: string;
  quotationDate: string;
  partyName: string;
  validityDays: number;
  priceBasisNote: string;
  totalExGst: number;
  totalGst: number;
  totalGross: number;
  approvalStatus: number;
  lines: QuotationLine[];
}

@Injectable({
  providedIn: 'root'
})
export class PricingService {
  private http = inject(HttpClient);
 private readonly apiBase = 'https://localhost:55027/api';
  public pendingApprovalUpdated = new Subject<void>();
  public refreshMaterials = new Subject<void>();
  public refreshSkus = new Subject<void>();
  public selectedSkuIds = new Set<number>();
  //private readonly apiBase = 'https://skuquotation.runasp.net/api';

  // --- Categories ---
  public getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiBase}/categories`);
  }

  public createCategory(name: string): Observable<number> {
    return this.http.post<number>(`${this.apiBase}/categories`, { name });
  }

  public updateCategory(id: number, name: string): Observable<void> {
    return this.http.put<void>(`${this.apiBase}/categories/${id}`, { name });
  }

  public deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/categories/${id}`);
  }

  // --- Materials ---
  public getMaterials(
    search?: string,
    type?: number,
    sortBy?: string,
    sortDesc: boolean = false,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PaginatedResult<Material>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString())
      .set('sortDesc', sortDesc.toString());

    if (search) params = params.set('search', search);
    if (type !== undefined && type !== null) params = params.set('type', type.toString());
    if (sortBy) params = params.set('sortBy', sortBy);

    return this.http.get<PaginatedResult<Material>>(`${this.apiBase}/materials`, { params });
  }

  public getMaterialHistory(materialId: number): Observable<MaterialPriceHistory[]> {
    return this.http.get<MaterialPriceHistory[]>(`${this.apiBase}/materials/${materialId}/history`);
  }

  public updateMaterialPrice(payload: {
    materialId: number;
    lmeUsdPerMt?: number;
    premiumUsdPerMt?: number;
    fxRate?: number;
    freightInrPerMt?: number;
    directRateInrPerKg?: number;
  }): Observable<void> {
    return this.http.put<void>(`${this.apiBase}/materials/price`, payload);
  }

  public createMaterial(payload: {
    name: string;
    type: number;
    lmeUsdPerMt?: number;
    premiumUsdPerMt?: number;
    fxRate?: number;
    freightInrPerMt?: number;
    directRateInrPerKg?: number;
  }): Observable<number> {
    return this.http.post<number>(`${this.apiBase}/materials`, payload);
  }

  public updateMaterial(id: number, payload: { name: string; type: number }): Observable<void> {
    return this.http.put<void>(`${this.apiBase}/materials/${id}`, payload);
  }

  public deleteMaterial(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/materials/${id}`);
  }

  // --- SKUs ---
  public getSkus(
    search?: string,
    categoryId?: number,
    sortBy?: string,
    sortDesc: boolean = false,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<PaginatedResult<Sku>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString())
      .set('sortDesc', sortDesc.toString());

    if (search) params = params.set('search', search);
    if (categoryId) params = params.set('categoryId', categoryId.toString());
    if (sortBy) params = params.set('sortBy', sortBy);

    return this.http.get<PaginatedResult<Sku>>(`${this.apiBase}/skus`, { params });
  }

  public getSku(id: number): Observable<SkuDetails> {
    return this.http.get<SkuDetails>(`${this.apiBase}/skus/${id}`);
  }

  public createSku(payload: {
    categoryId: number;
    name: string;
    spec: string;
    unit: string;
    conversionType: number;
    conversionValue: number;
    gstRate: number;
    bomLines: { materialId: number; weightKg: number }[];
  }): Observable<number> {
    return this.http.post<number>(`${this.apiBase}/skus`, payload);
  }

  public updateSku(id: number, payload: {
    id: number;
    categoryId: number;
    name: string;
    spec: string;
    unit: string;
    conversionType: number;
    conversionValue: number;
    gstRate: number;
    bomLines: { materialId: number; weightKg: number }[];
  }): Observable<void> {
    return this.http.put<void>(`${this.apiBase}/skus/${id}`, payload);
  }

  public deleteSku(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/skus/${id}`);
  }

  // --- Quotations ---
  public calculateQuotation(payload: {
    mode: number; // 0 = SimplePercentage, 1 = SimpleAmount, 2 = Itemised, 3 = RawCost
    globalPct: number;
    globalAmt: number;
    globalOverheadPct: number;
    globalMarginPct: number;
    globalPacking: number;
    globalFreight: number;
    items: {
      skuId: number;
      rowMfgOverride?: number;
      rowPctOverride?: number;
      rowAmtOverride?: number;
      rowOfferOverride?: number;
    }[];
  }): Observable<CalculatedQuotationItem[]> {
    return this.http.post<CalculatedQuotationItem[]>(`${this.apiBase}/quotations/calculate`, payload);
  }

  public saveQuotation(payload: {
    partyName: string;
    validityDays: number;
    priceBasisNote: string;
    lines: {
      skuId: number;
      rmCostSnapshot: number;
      mfgCostSnapshot: number;
      offerExGst: number;
      profit: number;
      gstPercent: number;
      gstAmount: number;
      grossRate: number;
    }[];
  }): Observable<{ id: number; quotationNumber: string }> {
    return this.http.post<{ id: number; quotationNumber: string }>(`${this.apiBase}/quotations`, payload);
  }

  public getQuotations(): Observable<QuotationSummary[]> {
    return this.http.get<QuotationSummary[]>(`${this.apiBase}/quotations`);
  }

  public deleteQuotation(id: number): Observable<number> {
    return this.http.delete<number>(`${this.apiBase}/quotations/${id}`);
  }

  public getQuotation(id: number): Observable<QuotationDetails> {
    return this.http.get<QuotationDetails>(`${this.apiBase}/quotations/${id}`);
  }

  public downloadQuotationPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiBase}/quotations/${id}/pdf`, { responseType: 'blob' });
  }

  public getPendingApprovalsCount(): Observable<number> {
    return this.http.get<number>(`${this.apiBase}/quotations/pending-count`);
  }

  public approveQuotation(id: number, status: number): Observable<number> {
    return this.http.post<number>(`${this.apiBase}/quotations/${id}/approve`, status);
  }

  // --- Admin User / Role management ---
  public getUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.apiBase}/users`);
  }

  public registerUser(payload: {
    fullName: string;
    email: string;
    userName: string;
    password?: string;
    roleName: string;
    clientVerifyUrlBase: string;
  }): Observable<{ userId: number }> {
    return this.http.post<{ userId: number }>(`${this.apiBase}/auth/register`, payload);
  }

  public assignRolesToUser(userId: number, roleIds: number[]): Observable<void> {
    return this.http.put<void>(`${this.apiBase}/roles/users/${userId}/roles`, { roleIds });
  }

  public getRoles(): Observable<RoleSummary[]> {
    return this.http.get<RoleSummary[]>(`${this.apiBase}/roles`);
  }

  public getRole(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/roles/${id}`);
  }

  public createRole(payload: { name: string; description?: string }): Observable<{ roleId: number }> {
    return this.http.post<{ roleId: number }>(`${this.apiBase}/roles`, payload);
  }

  public getPermissions(): Observable<PermissionDto[]> {
    return this.http.get<PermissionDto[]>(`${this.apiBase}/permissions`);
  }

  public assignPermissionsToRole(roleId: number, permissionIds: number[]): Observable<void> {
    return this.http.put<void>(`${this.apiBase}/roles/${roleId}/permissions`, { permissionIds });
  }
}

export interface UserDto {
  id: number;
  fullName: string;
  email: string;
  userName: string;
  isActive: boolean;
  lastLoginDate?: string;
  roles: string[];
}

export interface RoleSummary {
  id: number;
  name: string;
  description?: string;
}

export interface PermissionDto {
  id: number;
  code: string;
  name: string;
  module: string;
}
