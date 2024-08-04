import React from 'react';
import '../Styles/GuessBody.css';

interface GuessBodyProps {
  handleGuessClick: React.MouseEventHandler<HTMLButtonElement>;
  guessNumberTxtChanged: React.ChangeEventHandler<HTMLInputElement>;
}

export default function GuessBody({
  handleGuessClick,
  guessNumberTxtChanged,
}: GuessBodyProps) {
  return (
    <>
      <input className="input-number" onChange={guessNumberTxtChanged} />
      <button className="guess-btn" type="button" onClick={handleGuessClick}>
        Guess!
      </button>
    </>
  );
}
