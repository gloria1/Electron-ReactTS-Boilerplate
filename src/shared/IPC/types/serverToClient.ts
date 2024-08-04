/* eslint-disable prettier/prettier */
import { ErrorMessage } from 'shared/Types/ErrorMessage';

export interface IPC_PushNotification {
  error_message: {
    payload: ErrorMessage;
  };
}
