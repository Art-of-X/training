import React, { useState } from 'react';
import AudioRecorder from './AudioRecorder';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';

const Question = ({ question, answer, onAnswerChange, getQuestionText, getOptionText }) => {
  const { t } = useLanguage();
  const [textAnswer, setTextAnswer] = useState(answer?.text || '');
  const [selectedOptions, setSelectedOptions] = useState(answer?.selectedOptions || []);
  const [audioBlob, setAudioBlob] = useState(answer?.audio || null);

  const handleTextChange = (e) => {
    const value = e.target.value;
    setTextAnswer(value);
    onAnswerChange({
      type: 'text',
      text: value,
      questionId: question.id
    });
  };

  const handleAudioChange = (blob) => {
    setAudioBlob(blob);
    onAnswerChange({
      type: 'audio',
      audio: blob,
      questionId: question.id
    });
  };

  const handleSingleChoice = (optionId) => {
    setSelectedOptions([optionId]);
    onAnswerChange({
      type: 'single_choice',
      selectedOptions: [optionId],
      questionId: question.id
    });
  };

  const handleMultipleChoice = (optionId) => {
    const newSelection = selectedOptions.includes(optionId)
      ? selectedOptions.filter(id => id !== optionId)
      : [...selectedOptions, optionId];
    
    setSelectedOptions(newSelection);
    onAnswerChange({
      type: 'multiple_choice',
      selectedOptions: newSelection,
      questionId: question.id
    });
  };

  const renderQuestion = () => {
    switch (question.type) {
      case 'text':
      case 'open_text':
        return (
          <div className="space-y-4">
            <textarea
              value={textAnswer}
              onChange={handleTextChange}
              className="input-field min-h-32 resize-vertical"
              placeholder={t(translations.typeAnswerHere) || "Type your answer here..."}
              maxLength={question.maxLength}
            />
            {question.maxLength && (
              <div className="text-sm text-hfbk-subtitle text-right">
                {textAnswer.length} / {question.maxLength} characters
              </div>
            )}
          </div>
        );

      case 'audio':
      case 'open_audio':
        return (
          <AudioRecorder
            onAudioChange={handleAudioChange}
            maxDuration={question.maxDuration || 300}
          />
        );

      case 'multiple_choice_single':
        return (
          <div className="space-y-3">
            {question.options.map((option) => (
              <label
                key={option.id}
                className="flex items-center space-x-3 p-3 border-2 border-hfbk-fg-secondary hover:border-hfbk-primary cursor-pointer transition-colors bg-hfbk-bg-dark"
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.id}
                  checked={selectedOptions.includes(option.id)}
                  onChange={() => handleSingleChoice(option.id)}
                  className="w-4 h-4 text-hfbk-primary bg-hfbk-bg-dark border-hfbk-primary focus:ring-hfbk-primary"
                />
                <span className="text-base font-medium text-hfbk-fg-primary">
                  {getOptionText ? getOptionText(option) : option.text}
                </span>
              </label>
            ))}
          </div>
        );

      case 'multiple_choice_multiple':
        return (
          <div className="space-y-3">
            {question.options.map((option) => (
              <label
                key={option.id}
                className="flex items-center space-x-3 p-3 border-2 border-hfbk-fg-secondary hover:border-hfbk-primary cursor-pointer transition-colors bg-hfbk-bg-dark"
              >
                <input
                  type="checkbox"
                  value={option.id}
                  checked={selectedOptions.includes(option.id)}
                  onChange={() => handleMultipleChoice(option.id)}
                  className="w-4 h-4 text-hfbk-primary bg-hfbk-bg-dark border-hfbk-primary focus:ring-hfbk-primary"
                />
                <span className="text-base font-medium text-hfbk-fg-primary">
                  {getOptionText ? getOptionText(option) : option.text}
                </span>
              </label>
            ))}
          </div>
        );

      default:
        return <div className="text-hfbk-fg-primary">Unknown question type</div>;
    }
  };

  return (
    <div className="card space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-hfbk-title">
          {getQuestionText ? getQuestionText(question) : question.question}
        </h2>
        {question.required && (
          <span className="text-red-400 font-bold text-sm">
            * {t(translations.required) || "REQUIRED"}
          </span>
        )}
      </div>

      {renderQuestion()}

      <div className="text-xs text-hfbk-subtitle space-y-1">
        <div>Question ID: {question.id}</div>
        <div>Type: {question.type.replace('_', ' ').toUpperCase()}</div>
      </div>
    </div>
  );
};

export default Question; 