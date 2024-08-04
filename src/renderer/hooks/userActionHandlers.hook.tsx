/* eslint-disable no-use-before-define */
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
import invokeServer from '../IPC/InvokeServer';

export type UserActionHandlers = {
  handleGenerateNumber: () => void;
  handleCheckGuess: (guessedNumber: number) => any;
};

export const useUserActionHandlers = (): UserActionHandlers => {
  const handleGenerateNumber = async () => {
    await invokeServer('generate-number', null);
  };

  const handleCheckGuess = async (guessedNumber: number) => {
    const hint = await invokeServer('check-guess', guessedNumber);
    return hint;
  };

  return {
    handleGenerateNumber,
    handleCheckGuess,
  };
};
