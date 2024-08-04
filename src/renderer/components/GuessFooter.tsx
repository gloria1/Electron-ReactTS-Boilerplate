import React from 'react';
import '../Styles/GuessFooter.css';

interface GuessFooterProps {
  numberOfGuesses: number;
  hint: string;
}

export default function GuessFooter({
  numberOfGuesses,
  hint,
}: GuessFooterProps) {
  return (
    <>
      <p className="guessed-number">Guessed Numbers are: {numberOfGuesses}</p>
      <p className="hint-card">{hint !== '' && hint}</p>
    </>
  );
}
