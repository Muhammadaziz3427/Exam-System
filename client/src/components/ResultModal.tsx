import React from 'react';

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  band: number;
  resultsData: Array<{
    question: number;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>;
}

export function ResultModal({ isOpen, onClose, score, band, resultsData }: ResultModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ display: 'flex' }}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Your Results</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p className="score-summary">You scored <strong>{score}</strong> out of 40 (Band <strong>{band.toFixed(1)}</strong>).</p>
          <div className="results-details-container">
            <table>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Your Answer</th>
                  <th>Correct Answer</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {resultsData.map((item) => (
                  <tr key={item.question} className={item.isCorrect ? 'correct' : 'incorrect'}>
                    <td>{item.question}</td>
                    <td>{item.userAnswer}</td>
                    <td>{item.correctAnswer}</td>
                    <td>{item.isCorrect ? '✔ Correct' : '✖ Incorrect'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}