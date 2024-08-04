/* eslint-disable prettier/prettier */
export type UserResponse = {
  response: boolean;
};

export interface IPCMethods {
  'generate-number': {
    request: null;
    response: null;
  };

  'check-guess': {
    request: number;
    response: string;
  };
}
