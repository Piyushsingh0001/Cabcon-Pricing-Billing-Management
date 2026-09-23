import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PricingService, MaterialType } from '../../../core/pricing.service';
import { ConfirmDialogService } from '../../../shared/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'app-material-type-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './material-type-dialog.component.html',
  styleUrls: ['./material-type-dialog.component.scss']
})
export class MaterialTypeDialogComponent implements OnInit {
  private pricingService = inject(PricingService);
  private confirmDialog = inject(ConfirmDialogService);
  private snackBar = inject(MatSnackBar);
  public dialogRef = inject(MatDialogRef<MaterialTypeDialogComponent>);

  public materialTypes: MaterialType[] = [];
  public loading = signal(false);
  public saving = signal(false);

  // Edit / Add form model
  public editingId: number | null = null;
  public typeName = '';
  public typeDescription = '';
  public typeColor = '#3B82F6';

  public presetColors: string[] = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#64748B'  // Slate
  ];

  ngOnInit(): void {
    this.loadMaterialTypes();
  }

  public loadMaterialTypes(): void {
    this.loading.set(true);
    this.pricingService.getMaterialTypes().subscribe({
      next: (types) => {
        this.materialTypes = types || [];
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load material types.', 'Close', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  public selectPresetColor(color: string): void {
    this.typeColor = color;
  }

  public editType(item: MaterialType): void {
    this.editingId = item.id;
    this.typeName = item.name;
    this.typeDescription = item.description || '';
    this.typeColor = item.colorCode || '#3B82F6';
  }

  public cancelEdit(): void {
    this.editingId = null;
    this.typeName = '';
    this.typeDescription = '';
    this.typeColor = '#3B82F6';
  }

  public saveType(): void {
    const cleanName = this.typeName.trim();
    if (!cleanName) {
      this.snackBar.open('Please enter a Material Type name.', 'Close', { duration: 2500 });
      return;
    }

    const cleanDesc = this.typeDescription.trim();
    const cleanColor = this.typeColor.trim();

    this.saving.set(true);

    if (this.editingId) {
      this.pricingService.updateMaterialType(this.editingId, cleanName, cleanDesc, cleanColor, true).subscribe({
        next: () => {
          this.saving.set(false);
          this.snackBar.open(`Material Type "${cleanName}" updated successfully.`, 'Close', { duration: 3000 });
          this.cancelEdit();
          this.loadMaterialTypes();
        },
        error: (err: any) => {
          this.saving.set(false);
          const msg = err.error?.message || err.error?.errors?.[0] || 'Failed to update material type.';
          this.snackBar.open(msg, 'Close', { duration: 3500 });
        }
      });
    } else {
      this.pricingService.createMaterialType(cleanName, cleanDesc, cleanColor).subscribe({
        next: () => {
          this.saving.set(false);
          this.snackBar.open(`Material Type "${cleanName}" created successfully.`, 'Close', { duration: 3000 });
          this.cancelEdit();
          this.loadMaterialTypes();
        },
        error: (err: any) => {
          this.saving.set(false);
          const msg = err.error?.message || err.error?.errors?.[0] || 'Failed to create material type.';
          this.snackBar.open(msg, 'Close', { duration: 3500 });
        }
      });
    }
  }

  public deleteType(item: MaterialType): void {
    this.confirmDialog.open({
      title: 'Delete Material Type',
      message: `Are you sure you want to delete material type "${item.name}"? This cannot be undone if no materials are using it.`,
      type: 'confirm',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    }).subscribe(confirmed => {
      if (confirmed) {
        this.pricingService.deleteMaterialType(item.id).subscribe({
          next: () => {
            this.snackBar.open(`Deleted "${item.name}".`, 'Close', { duration: 2500 });
            if (this.editingId === item.id) {
              this.cancelEdit();
            }
            this.loadMaterialTypes();
          },
          error: (err: any) => {
            const msg = err.error?.message || err.error?.errors?.[0] || 'Failed to delete material type. Ensure no materials are assigned to it.';
            this.snackBar.open(msg, 'Close', { duration: 4000 });
          }
        });
      }
    });
  }

  public close(): void {
    this.dialogRef.close(true);
  }
}
