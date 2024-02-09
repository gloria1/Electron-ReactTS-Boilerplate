import { useCallback, useContext, useEffect } from 'react';
import { IpcRendererEvent } from 'electron';
import { offServerEvent, onServerEvent } from '../IPC/OnServerEvent';
// Used to defined callback to server push notifications
// For example, I defined here 2 callbacks, and attached it to the IPC_PushNotifications
export default function useServerEventHandlers() {
  const clockContext = useContext<StatusContextType>(StatusContext);

  const statusFromClock = useCallback(
    (_event: IpcRendererEvent, statusData: ClockStatus) => {
      clockContext.setStatus(statusData);
    },
    [clockContext]
  );

  const errorMessageHandler = useCallback(
    (_event: IpcRendererEvent, err: ErrorMessage) => {
      console.error(`Error from server: ${err.stringMessage}`);
    },
    []
  );

  useEffect(() => {
    onServerEvent('clock_status', statusFromClock, false);
    onServerEvent('error_message', errorMessageHandler, false);
    return () => {
      offServerEvent('clock_status', statusFromClock);
      offServerEvent('error_message', errorMessageHandler);
    };
  }, [statusFromClock, errorMessageHandler]);
}
