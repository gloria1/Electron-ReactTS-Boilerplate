import React from 'react';
import '../Styles/GuessHeader.css';

export default function GuessHeader() {
  let keys: number = 0;
  const messages: string[] = [
    'I am thinking of a number between 1-100.',
    'Can you guess it?',
  ];
  return (
    <>
      {messages.map((message) => {
        return (
          // eslint-disable-next-line no-plusplus
          <h3 key={keys++} className="header">
            {message}
          </h3>
        );
      })}
    </>
  );
}
