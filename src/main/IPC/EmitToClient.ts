/* eslint-disable camelcase */
import { BrowserWindow } from 'electron';
import { IPC_PushNotification } from '../../shared/IPC/types/serverToClient';
// Generic function that emit to client
export default function emitToClient<T extends keyof IPC_PushNotification>(
  window: BrowserWindow,
  method: T,
  payload: IPC_PushNotification[T]['payload']
): void {
  window.webContents.send(method, payload);
}
