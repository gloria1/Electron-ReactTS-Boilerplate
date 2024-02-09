/* eslint-disable prettier/prettier */
// Used to defined the ipc methods from client to server.
// The request means the payload type, the response mean the response type
export interface IPCMethods {
  'start_monitor': {
    request: null;
    response: null;
  };
}
