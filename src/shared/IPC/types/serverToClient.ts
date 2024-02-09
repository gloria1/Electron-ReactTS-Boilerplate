/* eslint-disable prettier/prettier */
// Used to defined the ipc methods from server to client.

export interface IPC_PushNotification {
  'clock_status': {
    payload: null;
  };
  'error_message': {
    payload: null;
  };
}
