/* eslint-disable no-undef */
import { IPCMethods } from '../../shared/IPC/types/clientToServer';

export default function WaitForUserResponse<T extends keyof IPCMethods>(
  method: T,
  ipcMain: Electron.IpcMain
): Promise<IPCMethods[T]['request']> {
  return new Promise((resolve) => {
    ipcMain.handleOnce(method, (event, request: IPCMethods[T]['request']) => {
      resolve(request);
    });
  });
}
