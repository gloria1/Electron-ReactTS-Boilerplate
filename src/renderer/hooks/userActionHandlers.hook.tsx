import invokeServer from '../IPC/InvokeServer';
// Used to defined handlers to user request

export type UserActionHandlers = {
  handleStartMonitor: () => void;
};

export const useUserActionHandlers = (): UserActionHandlers => {
  const handleStartMonitor = () => {
    invokeServer('start_monitor', null);
  };

  return {
    handleStartMonitor,
  };
};
