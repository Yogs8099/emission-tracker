import { Component } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';

import {
  UserRole,
  EmissionRecord
} from './models/emission.model';

import { EmissionService } from './services/emission.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  calculateValidatedTotals(): void {
    const validatedRecords = this.records.filter(
      record => record.status === 'Validated'
    );
  
    this.totalElectricityConsumption =
      validatedRecords.reduce(
        (total, record) =>
          total + record.electricityConsumption,
        0
      );
  
    this.totalCo2Emission =
      validatedRecords.reduce(
        (total, record) =>
          total + record.co2Emission,
        0
      );
  }

  title = 'Electricity Emission Tracker';

  selectedRole: UserRole = 'Client';

  selectedOrganizationId = 1;

  organizations = [
    {
      id: 1,
      name: 'Neoliva Ltd'
    },
    {
      id: 2,
      name: 'Shri Pvt Ltd'
    }
  ];

  emissionForm: FormGroup;

  records: EmissionRecord[] = [];

  totalElectricityConsumption = 0;

  totalCo2Emission = 0;

  successMessage = '';

  errorMessage = '';

  isSubmitting = false;

  editingRecordId: number | null = null;

  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private emissionService: EmissionService
  ) {
    this.emissionForm = this.formBuilder.group({
      month: [
        '',
        Validators.required
      ],

      electricityConsumption: [
        '',
        [
          Validators.required,
          Validators.min(0.01)
        ]
      ]
    });

    this.emissionService.setUserContext(
      this.selectedRole,
      this.selectedOrganizationId
    );

    this.loadRecords();

    this.calculateValidatedTotals();
  }

  onRoleChange(): void {
    this.emissionService.setUserContext(
      this.selectedRole,
      this.selectedOrganizationId
    );

    this.successMessage = '';
    this.errorMessage = '';
  }

  onOrganizationChange(): void {
    this.emissionService.setUserContext(
      this.selectedRole,
      this.selectedOrganizationId
    );

    this.successMessage = '';
    this.errorMessage = '';

    this.loadRecords();
  }
  loadRecords(): void {
    this.isLoading = true;
  
    this.emissionService.getEmissions().subscribe({
      next: (response) => {
        this.records = response.data;
        this.isLoading = false;
  
        this.emissionService.getEmissionTotals().subscribe({
          next: (totals) => {
            this.totalElectricityConsumption =
              totals.data.totalElectricityConsumption;
          
            this.totalCo2Emission =
              totals.data.totalCo2Emission;
          },
          error: (error) => {
  
            this.totalElectricityConsumption = 0;
            this.totalCo2Emission = 0;
          }
        });
      },
      error: (error) => {
        console.error('Failed to load records:', error);
  
        this.errorMessage =
          error?.error?.message ||
          'Failed to load emission records.';
  
        this.isLoading = false;
      }
    });
  }

  deleteRecord(id: number): void {
    const confirmed = window.confirm(
      'Are you sure you want to delete this emission record?'
    );
  
    if (!confirmed) {
      return;
    }
  
  
    this.successMessage = '';
    this.errorMessage = '';
  
    this.emissionService.deleteEmission(id).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.loadRecords();
      },
      error: (error) => {
        console.error('Delete error:', error);
  
        this.errorMessage =
          error?.error?.message ||
          'Failed to delete emission record.';
      }
    });
  }

  editRecord(record: EmissionRecord): void {
    this.editingRecordId = record.id;

    this.emissionForm.patchValue({
      month: record.month.substring(0, 7),
      electricityConsumption: record.electricityConsumption
    });
  }

  validateRecord(id: number): void {
    this.successMessage = '';
    this.errorMessage = '';
  
    this.emissionService.updateEmissionStatus(
      id,
      'Validated'
    ).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.loadRecords();
      },
      error: (error) => {
        console.error('Validation error:', error);
  
        this.errorMessage =
          error?.error?.message ||
          'Failed to validate emission record.';
      }
    });
  }

  rejectRecord(id: number): void {
    this.successMessage = '';
    this.errorMessage = '';
  
    this.emissionService.updateEmissionStatus(
      id,
      'Rejected'
    ).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.loadRecords();
      },
      error: (error) => {
        console.error('Reject error:', error);
  
        this.errorMessage =
          error?.error?.message ||
          'Failed to reject emission record.';
      }
    });
  }

  viewRecord(record: EmissionRecord): void {
    window.alert(
      `Organization: ${record.organizationName}\n` +
      `Month: ${record.month.substring(0, 7)}\n` +
      `Electricity: ${record.electricityConsumption} kWh\n` +
      `CO₂ Emission: ${record.co2Emission} kg\n` +
      `Status: ${record.status}`
    );
  }

  cancelEdit(): void {
    this.editingRecordId = null;
    this.emissionForm.reset();
    this.successMessage = '';
    this.errorMessage = '';
  }

  submitEmission(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.emissionForm.invalid) {
      this.emissionForm.markAllAsTouched();
      return;
    }

    const electricityConsumption = Number(
      this.emissionForm.value.electricityConsumption
    );

    const request = {
      organizationId: this.selectedOrganizationId,
      month: `${this.emissionForm.value.month}-01`,
      electricityConsumption
    };

    this.isSubmitting = true;

    if (this.editingRecordId !== null) {
      const updateRequest = {
        month: `${this.emissionForm.value.month}-01`,
        electricityConsumption
      };
    
      this.emissionService.updateEmission(
        this.editingRecordId,
        updateRequest
      ).subscribe({
        next: (response) => {
          this.successMessage = response.message;
          this.editingRecordId = null;
          this.emissionForm.reset();
          this.loadRecords();
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Update error:', error);
    
          this.errorMessage =
            error?.error?.message ||
            'Failed to update emission record.';
    
          this.isSubmitting = false;
        }
      });
    
      return;
    }

    this.emissionService.createEmission(request).subscribe({
      next: (response) => {
        this.successMessage = response.message;

        this.loadRecords();

        this.emissionForm.reset();

        this.isSubmitting = false;
      },

      error: (error) => {
        console.error('API error:', error);

        this.errorMessage =
          error?.error?.message ||
          'Failed to save emission record.';

        this.isSubmitting = false;
      }
    });
  }
}