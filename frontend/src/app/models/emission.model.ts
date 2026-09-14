export type UserRole = 'Client' | 'Admin';

export type EmissionStatus = 'Pending' | 'Validated' | 'Rejected';

export interface CreateEmissionRequest {
  organizationId: number;
  month: string;
  electricityConsumption: number;
}

export interface UpdateEmissionRequest {
  month?: string;
  electricityConsumption?: number;
}

export interface EmissionRecord {
  id: number;
  organizationId: number;
  organizationName: string;
  month: string;
  electricityConsumption: number;
  emissionFactor: number;
  co2Emission: number;
  createdDate: string;
  status: EmissionStatus;
}

export interface EmissionTotals {
  organizationId: number;
  organizationName: string;
  totalElectricityConsumption: number;
  totalCo2Emission: number;
}