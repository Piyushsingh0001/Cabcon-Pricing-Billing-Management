import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  type?: 'confirm' | 'error' | 'info' | 'warning';
  confirmText?: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  private dialog = inject(MatDialog);

  /**
   * Opens a standardized confirmation or alert dialog with reasonable width (440px)
   * and uniform styling across all pages.
   */
  public open(options: ConfirmDialogOptions): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      panelClass: 'dialog-tier-sm',
      width: '440px',
      maxWidth: 'min(440px, calc(100vw - 32px))',
      autoFocus: false,
      restoreFocus: true,
      data: {
        type: options.type || 'confirm',
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || (options.type === 'confirm' ? 'Confirm' : 'OK'),
        cancelText: options.cancelText || 'Cancel'
      } as ConfirmDialogData
    });

    return dialogRef.afterClosed().pipe(
      map(result => !!result)
    );
  }

  /**
   * Helper shortcut for standard two-button confirmation (Confirm / Cancel)
   */
  public confirm(
    title: string,
    message: string,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  ): Observable<boolean> {
    return this.open({
      title,
      message,
      type: 'confirm',
      confirmText,
      cancelText
    });
  }

  /**
   * Helper shortcut for warning confirmation or alert
   */
  public warning(
    title: string,
    message: string,
    confirmText = 'OK'
  ): Observable<boolean> {
    return this.open({
      title,
      message,
      type: 'warning',
      confirmText
    });
  }

  /**
   * Helper shortcut for error alerts
   */
  public error(
    title: string,
    message: string,
    confirmText = 'OK'
  ): Observable<boolean> {
    return this.open({
      title,
      message,
      type: 'error',
      confirmText
    });
  }

  /**
   * Helper shortcut for informative alerts
   */
  public info(
    title: string,
    message: string,
    confirmText = 'OK'
  ): Observable<boolean> {
    return this.open({
      title,
      message,
      type: 'info',
      confirmText
    });
  }
}
