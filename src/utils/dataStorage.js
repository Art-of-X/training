import { v4 as uuidv4 } from 'uuid';

export class QuestionnaireStorage {
  constructor() {
    this.storageKey = 'fragenhagel_questionnaires';
  }

  // Generate unique response ID
  generateResponseId() {
    return `response_${uuidv4()}`;
  }

  // Generate session ID
  generateSessionId() {
    return `session_${Date.now()}_${uuidv4().slice(0, 8)}`;
  }

  // Save questionnaire response
  saveResponse(questionnaireId, responses, sessionData = {}) {
    const responseId = this.generateResponseId();
    const timestamp = new Date().toISOString();
    
    const responseData = {
      responseId,
      questionnaireId,
      timestamp,
      sessionData: {
        sessionId: sessionData.sessionId || this.generateSessionId(),
        startTime: sessionData.startTime || timestamp,
        endTime: timestamp,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        ...sessionData
      },
      responses: this.processResponses(responses),
      metadata: {
        totalQuestions: Object.keys(responses).length,
        audioQuestions: this.countAudioQuestions(responses),
        completionRate: this.calculateCompletionRate(responses)
      }
    };

    // Store in localStorage (for demo - in production use proper backend)
    const existingData = this.getAllResponses();
    existingData.push(responseData);
    localStorage.setItem(this.storageKey, JSON.stringify(existingData));

    // Also create downloadable backup
    this.createDownloadableBackup(responseData);

    return responseId;
  }

  // Process responses to handle different data types
  processResponses(responses) {
    const processed = {};
    
    Object.entries(responses).forEach(([questionId, answer]) => {
      processed[questionId] = {
        questionId,
        type: answer.type,
        timestamp: new Date().toISOString(),
        data: this.processAnswerData(answer)
      };
    });

    return processed;
  }

  // Process individual answer data
  processAnswerData(answer) {
    switch (answer.type) {
      case 'text':
        return {
          text: answer.text,
          length: answer.text.length
        };
      
      case 'audio':
        return {
          hasAudio: !!answer.audio,
          audioSize: answer.audio ? answer.audio.size : 0,
          audioType: answer.audio ? answer.audio.type : null,
          // Store audio as base64 for demo purposes
          audioData: answer.audio ? this.blobToBase64(answer.audio) : null
        };
      
      case 'single_choice':
      case 'multiple_choice':
        return {
          selectedOptions: answer.selectedOptions,
          selectionCount: answer.selectedOptions.length
        };
      
      default:
        return answer;
    }
  }

  // Convert blob to base64 for storage
  async blobToBase64(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  // Count audio questions in responses
  countAudioQuestions(responses) {
    return Object.values(responses).filter(answer => answer.type === 'audio').length;
  }

  // Calculate completion rate
  calculateCompletionRate(responses) {
    const totalAnswers = Object.keys(responses).length;
    const completedAnswers = Object.values(responses).filter(answer => {
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
    }).length;

    return totalAnswers > 0 ? (completedAnswers / totalAnswers) * 100 : 0;
  }

  // Get all stored responses
  getAllResponses() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error retrieving stored responses:', error);
      return [];
    }
  }

  // Get response by ID
  getResponseById(responseId) {
    const allResponses = this.getAllResponses();
    return allResponses.find(response => response.responseId === responseId);
  }

  // Export data as JSON
  exportData() {
    const data = {
      exportTimestamp: new Date().toISOString(),
      version: '1.0',
      responses: this.getAllResponses()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fragenhagel_data_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Create downloadable backup for individual response
  createDownloadableBackup(responseData) {
    const blob = new Blob([JSON.stringify(responseData, null, 2)], { 
      type: 'application/json' 
    });
    
    // Store reference for potential download
    const url = URL.createObjectURL(blob);
    console.log(`Response backup created: ${responseData.responseId}`);
    
    // Cleanup after 5 minutes
    setTimeout(() => URL.revokeObjectURL(url), 300000);
  }

  // Clear all stored data
  clearAllData() {
    localStorage.removeItem(this.storageKey);
    console.log('All questionnaire data cleared');
  }

  // Get storage statistics
  getStorageStats() {
    const responses = this.getAllResponses();
    const totalSize = JSON.stringify(responses).length;
    
    return {
      totalResponses: responses.length,
      totalStorageSize: totalSize,
      storageSizeFormatted: this.formatBytes(totalSize),
      lastResponse: responses.length > 0 ? responses[responses.length - 1].timestamp : null
    };
  }

  // Format bytes for display
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const storage = new QuestionnaireStorage(); 