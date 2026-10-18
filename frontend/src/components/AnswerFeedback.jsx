import { feedbackForAnswer } from '../feedbackQuotes.js';

export default function AnswerFeedback({ correct, questionId }) {
  const item = feedbackForAnswer(correct, questionId);
  return <span className="answer-feedback">
    {item.text}
    {item.author && <> <a href={item.source} target="_blank" rel="noopener noreferrer">— {item.author}</a></>}
  </span>;
}
