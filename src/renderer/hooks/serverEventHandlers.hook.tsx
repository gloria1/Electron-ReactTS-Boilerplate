/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, useContext, useEffect } from 'react';
import { IpcRendererEvent } from 'electron';
import { ErrorMessage } from '../../shared/Types/ErrorMessage';
import { offServerEvent, onServerEvent } from '../IPC/OnServerEvent';

export default function useServerEventHandlers() {
  const errorMessageHandler = useCallback(
    (_event: IpcRendererEvent, err: ErrorMessage) => {
      console.error(`Error from server: ${err.stringMessage}`);
    },
    []
  );

  useEffect(() => {
    onServerEvent('error_message', errorMessageHandler, false);

    return () => {
      offServerEvent('error_message', errorMessageHandler);
    };
  }, [errorMessageHandler]);
}
