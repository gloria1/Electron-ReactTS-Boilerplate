// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer } from 'electron';
import { ChannelsClientToServer } from 'shared/src/ipc/clientToServer';
import { ChannelsServerToClient } from "shared/src/ipc/serverToClient";

const electronHandler = {
  ipcRenderer: {
    invoke(channel: ChannelsClientToServer, arg: string): Promise<string> {
      return ipcRenderer.invoke(channel, arg);
    },
    onNotification(channel: ChannelsServerToClient, func: (event: Electron.IpcRendererEvent, ...args: any[]) => void) {
      ipcRenderer.on(channel, func);
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
