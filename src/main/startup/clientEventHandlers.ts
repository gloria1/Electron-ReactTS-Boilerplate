import { BrowserWindow } from 'electron';
import emitToClient from '../IPC/EmitToClient';
import { ErrorMessage } from '../../shared/Types/ErrorMessage';
import { ClockStatus } from '../../shared/Types/ClockStatus';
import SerialPortManager from '../Serial/SerialManager';
// Functions to invoke when arrived ipc request for client or or when need to emit to client
export function handleClientRequestStarting(
  browserWindow: BrowserWindow,
): void {
  SerialPortManager.getInstance({ browserWindow }).detectClock();
}

export function handleStatusReport(
  browserWindow: BrowserWindow,
  status: ClockStatus,
): void {
  emitToClient(browserWindow, 'clock_status', status);
}

export function handleErrorMessage(
  browserWindow: BrowserWindow,
  data: ErrorMessage,
): void {
  emitToClient(browserWindow, 'error_message', data);
}
