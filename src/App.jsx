import React, { useState, useEffect } from 'react';
import Question from './components/Question';
import LanguageSwitcher from './components/LanguageSwitcher';
import { storage } from './utils/dataStorage';
import { useLanguage } from './contexts/LanguageContext';
import { translations } from './utils/translations';
import { 
  logicalReasoningTranslations, 
  logicalOptionsTranslations,
  mfqTranslations,
  experimentalTranslations 
} from './utils/questionTranslations';
import questionnaireData from './data/questionnaire.json';

function App() {
  const { language, t } = useLanguage();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [savedResponseId, setSavedResponseId] = useState(null);

  const questions = questionnaireData.questions;
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Helper function to get translated question text
  const getQuestionText = (question) => {
    if (question.question && typeof question.question === 'object') {
      return t(question.question);
    }
    
    // Check for translations in our translation files
    const questionId = question.id;
    if (logicalReasoningTranslations[questionId]) {
      return t(logicalReasoningTranslations[questionId]);
    }
    if (mfqTranslations[questionId]) {
      return t(mfqTranslations[questionId]);
    }
    if (experimentalTranslations[questionId]) {
      return t(experimentalTranslations[questionId]);
    }
    
    // For artistic questions, they are already in German, show as-is for German, 
    // provide English translation for English mode
    if (question.section === 'artistic_practice' && language === 'en') {
      // Add English translations for artistic questions here if needed
      return question.question; // For now, keeping German
    }
    
    return question.question;
  };

  // Helper function to get translated option text
  const getOptionText = (option) => {
    if (option.text && typeof option.text === 'object') {
      return t(option.text);
    }
    
    // Check for translations in our translation files
    if (logicalOptionsTranslations[option.id]) {
      return t(logicalOptionsTranslations[option.id]);
    }
    
    return option.text;
  };

  // Helper function to get section title in German
  const getSectionTitle = (sectionId) => {
    const titles = {
      'logical_reasoning': 'Logisches Denken',
      'societal_opinions': 'Gesellschaftliche Fragen & Meinungen',
      'everyday_questions': 'Alltägliche Fragen',
      'artistic_practice': 'Künstlerische Praxis'
    };
    return titles[sectionId] || sectionId;
  };

  // Helper function to get section description in German
  const getSectionDescription = (sectionId) => {
    const descriptions = {
      'logical_reasoning': 'Fragen zur Erforschung logischer Denkstrukturen und Problemlösungsansätze',
      'societal_opinions': 'Fragen zu sozialen Perspektiven und Standpunkten zu verschiedenen Themen',
      'everyday_questions': 'Fragen über das tägliche Leben, Vorlieben und routinemäßige Entscheidungsfindung',
      'artistic_practice': 'Fragen speziell über künstlerisches Denken, kreative Prozesse und professionelle Praxis'
    };
    return descriptions[sectionId] || sectionId;
  };

  // Get current section info
  const getCurrentSection = () => {
    if (!currentQuestion) return null;
    if (currentQuestion.section === 'consent') return null;
    return questionnaireData.sections?.find(section => section.id === currentQuestion.section);
  };

  const currentSection = getCurrentSection();

  useEffect(() => {
    // Initialize session when component mounts
    const newSessionId = storage.generateSessionId();
    setSessionId(newSessionId);
  }, []);

  const startQuestionnaire = () => {
    setIsStarted(true);
    setStartTime(new Date().toISOString());
  };

  const handleAnswerChange = (answer) => {
    setAnswers(prev => ({
      ...prev,
      [answer.questionId]: answer
    }));
  };

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      completeQuestionnaire();
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const completeQuestionnaire = async () => {
    const endTime = new Date().toISOString();
    
    const sessionData = {
      sessionId,
      startTime,
      endTime,
      totalTimeSpent: Math.round((new Date(endTime) - new Date(startTime)) / 1000), // seconds
      questionsAnswered: Object.keys(answers).length,
      totalQuestions: questions.length
    };

    const responseId = await storage.saveResponse(
      questionnaireData.id,
      answers,
      sessionData
    );

    setSavedResponseId(responseId);
    setIsCompleted(true);
  };

  const isCurrentQuestionAnswered = () => {
    const answer = answers[currentQuestion?.id];
    if (!answer) return false;

    switch (answer.type) {
      case 'text':
        return answer.text && answer.text.trim().length > 0;
      case 'audio':
        return answer.audio && answer.audio.size > 0;
      case 'single_choice':
      case 'multiple_choice':
        return answer.selectedOptions && answer.selectedOptions.length > 0;
      default:
        return false;
    }
  };

  const canProceed = () => {
    if (!currentQuestion) return false;
    if (currentQuestion.required) {
      return isCurrentQuestionAnswered();
    }
    return true;
  };

  const exportData = () => {
    storage.exportData();
  };

  const restartQuestionnaire = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setIsStarted(false);
    setIsCompleted(false);
    setSavedResponseId(null);
    const newSessionId = storage.generateSessionId();
    setSessionId(newSessionId);
  };

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-hfbk-bg-dark p-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header with Language Switcher */}
          <div className="flex justify-between items-start">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold text-hfbk-primary tracking-wider">
                ARTIFICIAL ARTISTIC THINKING
              </h1>
              <p className="text-lg text-hfbk-fg-secondary">
                SCIENTIFIC RESEARCH PLATFORM
              </p>
            </div>
            <LanguageSwitcher />
          </div>

          {/* Study Information */}
          <div className="card space-y-6">
            <div className="border-b-2 border-hfbk-primary pb-4">
              <h2 className="text-2xl font-bold text-hfbk-title mb-2">
                {t(questionnaireData.title)}
              </h2>
              <p className="text-lg text-hfbk-fg-secondary italic">
                {t(questionnaireData.subtitle)}
              </p>
            </div>
            
            <div className="space-y-4">
              <p className="text-hfbk-fg-primary leading-relaxed">
                {t(questionnaireData.description)}
              </p>

              {/* Study Sections */}
              {questionnaireData.sections && (
                <div className="bg-hfbk-bg-extra p-4 border-2 border-hfbk-fg-secondary space-y-3">
                  <h3 className="font-bold text-hfbk-primary">{t(translations.studySections)}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {questionnaireData.sections.map((section, index) => (
                      <div key={section.id} className="space-y-1">
                        <p className="text-hfbk-fg-secondary font-semibold">
                          {index + 1}. {t(section.title)}
                        </p>
                        <p className="text-sm text-hfbk-fg-primary">
                          {t(section.description)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Institutional Information */}
              <div className="bg-hfbk-bg-extra p-4 border-2 border-hfbk-fg-secondary space-y-2">
                <h3 className="font-bold text-hfbk-primary">{t(translations.researchTeam)}</h3>
                <div className="space-y-1 text-sm">
                  <p><strong className="text-hfbk-fg-secondary">{t(translations.institution)}</strong> <span className="text-hfbk-fg-primary">{questionnaireData.institution}</span></p>
                  <p><strong className="text-hfbk-fg-secondary">{t(translations.principalInvestigator)}</strong> <span className="text-hfbk-fg-primary">{questionnaireData.principal_investigator}</span></p>
                  <p><strong className="text-hfbk-fg-secondary">{t(translations.researcher)}</strong> <span className="text-hfbk-fg-primary">{questionnaireData.researcher}</span></p>
                  <p><strong className="text-hfbk-fg-secondary">{t(translations.ethicsApproval)}</strong> <span className="text-hfbk-fg-primary">{questionnaireData.ethics_approval}</span></p>
                </div>
              </div>

              {/* Study Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p><strong className="text-hfbk-fg-secondary">{t(translations.estimatedDuration)}</strong> <span className="text-hfbk-fg-primary">{t(questionnaireData.estimated_duration)}</span></p>
                  <p><strong className="text-hfbk-fg-secondary">{t(translations.totalQuestions)}</strong> <span className="text-hfbk-fg-primary">{questions.length}</span></p>
                  <p><strong className="text-hfbk-fg-secondary">{t(translations.version)}</strong> <span className="text-hfbk-fg-primary">{questionnaireData.version}</span></p>
                </div>
                <div className="space-y-2">
                  <p><strong className="text-hfbk-fg-secondary">{t(translations.sessionId)}</strong> <span className="text-hfbk-fg-primary font-mono">{sessionId}</span></p>
                  <p><strong className="text-hfbk-fg-secondary">{t(translations.studyDate)}</strong> <span className="text-hfbk-fg-primary">{questionnaireData.created}</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Consent Information */}
          <div className="card space-y-6">
            <h3 className="text-xl font-bold text-hfbk-primary border-b-2 border-hfbk-primary pb-2">
              {t(translations.informedConsent)}
            </h3>
            
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-bold text-hfbk-primary mb-2">{t(translations.purposeOfStudy)}</h4>
                <p className="text-hfbk-fg-primary">{t(questionnaireData.consent.purpose)}</p>
              </div>

              <div>
                <h4 className="font-bold text-hfbk-primary mb-2">{t(translations.procedures)}</h4>
                <p className="text-hfbk-fg-primary">{t(questionnaireData.consent.procedures)}</p>
              </div>

              <div>
                <h4 className="font-bold text-hfbk-primary mb-2">{t(translations.dataUse)}</h4>
                <p className="text-hfbk-fg-primary">{t(questionnaireData.consent.data_use)}</p>
              </div>

              <div>
                <h4 className="font-bold text-hfbk-primary mb-2">{t(translations.confidentiality)}</h4>
                <p className="text-hfbk-fg-primary">{t(questionnaireData.consent.confidentiality)}</p>
              </div>

              <div>
                <h4 className="font-bold text-hfbk-primary mb-2">{t(translations.voluntaryParticipation)}</h4>
                <p className="text-hfbk-fg-primary">{t(questionnaireData.consent.voluntary)}</p>
              </div>

              <div>
                <h4 className="font-bold text-hfbk-primary mb-2">{t(translations.yourRights)}</h4>
                <p className="text-hfbk-fg-primary">{t(questionnaireData.consent.rights)}</p>
              </div>

              <div>
                <h4 className="font-bold text-hfbk-primary mb-2">{t(translations.contactInformation)}</h4>
                <p className="text-hfbk-fg-primary">{t(questionnaireData.consent.contact)}</p>
              </div>
            </div>

            <div className="bg-hfbk-bg-extra p-4 border-2 border-hfbk-fg-secondary">
              <h4 className="font-bold text-hfbk-primary mb-2">{t(translations.instructions)}</h4>
              <p className="text-hfbk-fg-primary">{t(questionnaireData.instructions)}</p>
            </div>

            <button
              onClick={startQuestionnaire}
              className="btn-primary w-full py-4 text-xl"
            >
              {t(translations.startStudy)}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-hfbk-bg-dark flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-4">
            <div className="text-6xl text-hfbk-primary">✓</div>
            <h1 className="text-3xl font-bold text-hfbk-title">
              {t(translations.studyCompleted)}
            </h1>
            <p className="text-xl text-hfbk-fg-secondary">
              {t(translations.thankYou)}
            </p>
          </div>

          <div className="card space-y-6">
            <h2 className="text-xl font-bold text-hfbk-primary">{t(translations.submissionDetails)}</h2>
            
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="font-bold text-hfbk-fg-secondary">{t(translations.responseId)}</span>
                <span className="font-mono text-hfbk-fg-primary">{savedResponseId}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-hfbk-fg-secondary">{t(translations.sessionId)}</span>
                <span className="font-mono text-hfbk-fg-primary">{sessionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-hfbk-fg-secondary">{t(translations.questionsAnswered)}</span>
                <span className="text-hfbk-fg-primary">{Object.keys(answers).length} / {questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-hfbk-fg-secondary">{t(translations.completionRate)}</span>
                <span className="text-hfbk-fg-primary">{Math.round(storage.calculateCompletionRate(answers))}%</span>
              </div>
            </div>

            <div className="bg-hfbk-bg-extra p-4 border-2 border-hfbk-fg-secondary">
              <p className="text-hfbk-fg-primary">
                <strong className="text-hfbk-primary">{language === 'en' ? 'Thank you!' : 'Vielen Dank!'}</strong> {language === 'en' ? 'Your responses will help advance our understanding of artistic thinking and improve AI systems. Your contribution to this research is greatly appreciated.' : 'Ihre Antworten werden dazu beitragen, unser Verständnis des künstlerischen Denkens zu erweitern und KI-Systeme zu verbessern. Ihr Beitrag zu dieser Forschung wird sehr geschätzt.'}
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={exportData}
                className="btn-secondary w-full"
              >
                {t(translations.exportData)}
              </button>
              
              <button
                onClick={restartQuestionnaire}
                className="btn-primary w-full"
              >
                {t(translations.startNewSession)}
              </button>
            </div>

            <div className="text-xs text-hfbk-subtitle text-center">
              <p>{language === 'en' ? 'Questions about this research? Contact:' : 'Fragen zu dieser Forschung? Kontakt:'}</p>
              <p className="text-hfbk-fg-secondary">Alexander Doudkin (alexander.doudkin@hfbk-hamburg.de)</p>
              <p className="text-hfbk-fg-secondary">HFBK Hamburg - Prof. Dr. Friedrich von Borries</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hfbk-bg-dark">
      {/* Header */}
      <div className="border-b-2 border-hfbk-primary bg-hfbk-bg-dark">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-hfbk-primary">ARTIFICIAL ARTISTIC THINKING</h1>
              <p className="text-xs text-hfbk-subtitle">HFBK Hamburg - {language === 'en' ? 'AI & Artistic Thinking Study' : 'KI & Künstlerisches Denken Studie'}</p>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <div className="text-sm font-mono text-hfbk-fg-secondary">
                SESSION: {sessionId}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Info & Progress Bar */}
      <div className="border-b-2 border-hfbk-primary bg-hfbk-bg-extra">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {currentSection && (
            <div className="mb-3">
              <h2 className="text-lg font-bold text-hfbk-primary">
                {t(currentSection.title)}
              </h2>
              <p className="text-sm text-hfbk-fg-secondary">
                {t(currentSection.description)}
              </p>
            </div>
          )}
          
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-hfbk-fg-primary">
              {t(translations.questionOf).replace('{current}', currentQuestionIndex + 1).replace('{total}', questions.length)}
            </span>
            <span className="text-sm font-bold text-hfbk-fg-primary">
              {t(translations.complete_percent).replace('{percent}', Math.round(progress))}
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <Question
            question={currentQuestion}
            answer={answers[currentQuestion.id]}
            onAnswerChange={handleAnswerChange}
            getQuestionText={getQuestionText}
            getOptionText={getOptionText}
          />

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={goToPrevious}
              disabled={currentQuestionIndex === 0}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t(translations.previous)}
            </button>

            <div className="flex items-center space-x-4">
              {currentQuestion.required && !isCurrentQuestionAnswered() && (
                <span className="text-red-400 font-bold text-sm">
                  {t(translations.requiredQuestion)}
                </span>
              )}
              
              <button
                onClick={goToNext}
                disabled={!canProceed()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentQuestionIndex === questions.length - 1 ? t(translations.complete) : t(translations.next)}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-hfbk-primary bg-hfbk-bg-extra">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center text-sm text-hfbk-subtitle">
            <div>HFBK Hamburg - Artificial Artistic Thinking v{questionnaireData.version}</div>
            <div>Study ID: {questionnaireData.id}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 