import React, { useEffect, useState } from 'react';
import { UserActionHandlers } from '../hooks/userActionHandlers.hook';
import '../Styles/Guess.css';
import GuessHeader from './GuessHeader';
import GuessFooter from './GuessFooter';
import GuessBody from './GuessBody';

interface GuessTheNumberProps {
  userActionHandlers: UserActionHandlers;
}

export default function GuessTheNumber({
  userActionHandlers,
}: GuessTheNumberProps) {
  const [guessNumber, setGuessNumber] = useState(-1);
  const [hint, setHint] = useState('');
  const [numberOfGuesses, setNumberOfGuesses] = useState(0);

  useEffect(() => {
    userActionHandlers.handleGenerateNumber();
  }, []);

  const handleGuessClick = async () => {
    if (!Number.isNaN(guessNumber)) {
      const hintMessage: string = await userActionHandlers.handleCheckGuess(
        guessNumber
      );
      if (hintMessage !== 'correct') setNumberOfGuesses((prev) => prev + 1);
      else setNumberOfGuesses(0);
      setHint(hintMessage);
    }
  };

  const guessNumberTxtChanged = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const guessedNumber: number = +event.target.value;
    setGuessNumber(guessedNumber);
  };

  return (
    <div className="guess-container">
      <GuessHeader />
      <GuessBody
        handleGuessClick={handleGuessClick}
        guessNumberTxtChanged={guessNumberTxtChanged}
      />
      <GuessFooter numberOfGuesses={numberOfGuesses} hint={hint} />
    </div>
  );
}
