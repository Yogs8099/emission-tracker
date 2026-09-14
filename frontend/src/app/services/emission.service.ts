import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  UserRole,
  CreateEmissionRequest,
  UpdateEmissionRequest,
  EmissionRecord,
  EmissionTotals
} from '../models/emission.model';

@Injectable({
  providedIn: 'root'
})
export class EmissionService {

  private readonly apiUrl = 'http://localhost:3000/api/emissions';

  private role: UserRole = 'Client';
  private organizationId = 1;

  constructor(private http: HttpClient) {}

  setUserContext(
    role: UserRole,
    organizationId: number
  ): void {
    this.role = role;
    this.organizationId = organizationId;
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders();

    headers = headers.set('x-user-role', this.role);

    if (this.role === 'Client') {
      headers = headers.set(
        'x-organization-id',
        this.organizationId.toString()
      );
    }

    return headers;
  }

  getEmissions(): Observable<{
    success: boolean;
    data: EmissionRecord[];
  }> {
      let url = this.apiUrl;
    
      if (this.role === 'Admin') {
        url = `${this.apiUrl}?organizationId=${this.organizationId}`;
      }
    return this.http.get<{
      success: boolean;
      data: EmissionRecord[];
    }>(
      url,
      {
        headers: this.getHeaders()
      }
    );
  }

  createEmission(
    request: CreateEmissionRequest
  ): Observable<{
    success: boolean;
    message: string;
    data: EmissionRecord;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      data: EmissionRecord;
    }>(
      this.apiUrl,
      request,
      {
        headers: this.getHeaders()
      }
    );
  }

  updateEmission(
    id: number,
    request: UpdateEmissionRequest
  ): Observable<{
    success: boolean;
    message: string;
    data: EmissionRecord;
  }> {
    return this.http.patch<{
      success: boolean;
      message: string;
      data: EmissionRecord;
    }>(
      `${this.apiUrl}/${id}`,
      request,
      {
        headers: this.getHeaders()
      }
    );
  }

  deleteEmission(
    id: number
  ): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.delete<{
      success: boolean;
      message: string;
    }>(
      `${this.apiUrl}/${id}`,
      {
        headers: this.getHeaders()
      }
    );
  }

  updateEmissionStatus(
    id: number,
    status: 'Validated' | 'Rejected'
  ): Observable<{
    success: boolean;
    message: string;
    data: EmissionRecord;
  }> {
    return this.http.patch<{
      success: boolean;
      message: string;
      data: EmissionRecord;
    }>(
      `${this.apiUrl}/${id}/status`,
      { status },
      {
        headers: this.getHeaders()
      }
    );
  }

  getEmissionTotals(): Observable<{
    success: boolean;
    data: EmissionTotals;
  }> {
    const url =
      `${this.apiUrl}/totals?organizationId=${this.organizationId}`;
  
    return this.http.get<{
      success: boolean;
      data: EmissionTotals;
    }>(
      url,
      { headers: this.getHeaders() }
    );
  }
}