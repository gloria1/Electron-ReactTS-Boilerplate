import { BrowserWindow } from 'electron';
import emitToClient from '../IPC/EmitToClient';
import { ErrorMessage } from '../../shared/Types/ErrorMessage';

let randomNumber: number;

export function handleErrorMessage(
  browserWindow: BrowserWindow,
  data: ErrorMessage
): void {
  emitToClient(browserWindow, 'error_message', data);
}

export function handleGenerateNumber() {
  randomNumber = Math.floor(Math.random() * 100) + 1;
}

export function handleCheckGuess(guessedNumber: number): string {
  if (guessedNumber > randomNumber) {
    return 'go lower';
  }
  if (guessedNumber < randomNumber) {
    return 'go higher';
  }
  return 'correct';
}
