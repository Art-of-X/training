# Artificial Artistic Thinking - Research Platform

A scientific research platform investigating artistic thinking patterns for AI development, built with React and Tailwind CSS for HFBK Hamburg.

## Features

### 🎯 **Core Functionality**
- **Multiple Question Types**: Text input, audio recording, single choice, multiple choice
- **Audio Recording**: Built-in microphone recording with playback controls
- **Progress Tracking**: Real-time progress bar and question navigation
- **Data Persistence**: Automatic saving with unique session and response IDs
- **Export Functionality**: Download questionnaire data as JSON

### 🎨 **Design Philosophy**
- **No Border Radius**: Clean, sharp-edged design aesthetic
- **High Contrast**: Black and white color scheme for maximum readability
- **Minimalist UI**: Focus on content and functionality
- **Scientific Approach**: Professional, research-oriented interface

### 🔧 **Technical Features**
- **Session Management**: Unique session IDs for each questionnaire attempt
- **Response Validation**: Required field validation and completion tracking
- **Audio Processing**: Browser-based audio recording with MediaRecorder API
- **Data Structure**: Comprehensive data storage with metadata
- **Scientific Rigor**: Timestamping, completion rates, and detailed analytics

## Research Context

This platform supports research at HFBK Hamburg (Hamburg University of Fine Arts) under Prof. Dr. Friedrich von Borries and doctoral student Alexander Doudkin, investigating how artists think and create to improve AI systems' understanding of creative processes.

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd artificial-artistic-thinking
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## Usage

### Starting a Study Session
1. Launch the application
2. Review the study information and consent details
3. Click "I HAVE READ AND UNDERSTOOD - START STUDY" to begin
4. Navigate through questions using NEXT/PREVIOUS buttons

### Question Types

#### **Text Questions**
- Type responses in the text area
- Character count displayed for questions with limits
- Auto-save as you type

#### **Audio Questions**
- Click "START RECORDING" to begin audio capture
- Speak clearly into your microphone
- Click "STOP RECORDING" when finished
- Review and re-record if needed

#### **Multiple Choice (Single)**
- Select one option from the available choices
- Radio button interface for clear selection

#### **Multiple Choice (Multiple)**
- Select multiple options by checking boxes
- Clear indication of selected items

### Data Export
- After completion, use "EXPORT YOUR DATA" to download responses
- JSON format includes all questionnaire data and metadata

## Project Structure

```
src/
├── components/
│   ├── AudioRecorder.jsx     # Audio recording component
│   └── Question.jsx          # Question rendering component
├── data/
│   └── questionnaire.json    # Research questionnaire data
├── hooks/
│   └── useAudioRecorder.js   # Audio recording hook
├── utils/
│   └── dataStorage.js        # Data persistence utilities
├── App.jsx                   # Main application component
├── main.jsx                  # React entry point
└── index.css                 # Global styles
```

## Questionnaire JSON Format

```json
{
  "id": "hfbk-ai-artist-study-001",
  "title": "Training AI to Think Like Artists: A Scientific Study",
  "subtitle": "Understanding Artistic Thinking Patterns for AI Development",
  "institution": "HFBK Hamburg (Hamburg University of Fine Arts)",
  "principal_investigator": "Prof. Dr. Friedrich von Borries",
  "researcher": "Alexander Doudkin (Doctoral Student)",
  "consent": {
    "purpose": "Study purpose description",
    "procedures": "What participants will do",
    "data_use": "How data will be used",
    "confidentiality": "Privacy protections",
    "voluntary": "Voluntary participation info",
    "contact": "Contact information",
    "rights": "Participant rights"
  },
  "questions": [
    {
      "id": "consent",
      "type": "multiple_choice_single",
      "question": "Consent question",
      "required": true,
      "options": [...]
    }
  ]
}
```

## Data Storage

### Response Structure
```json
{
  "responseId": "response_uuid",
  "questionnaireId": "hfbk-ai-artist-study-001",
  "timestamp": "ISO-8601-timestamp",
  "sessionData": {
    "sessionId": "session_timestamp_uuid",
    "startTime": "ISO-8601-timestamp",
    "endTime": "ISO-8601-timestamp",
    "totalTimeSpent": 300,
    "userAgent": "browser-info",
    "platform": "platform-info"
  },
  "responses": {
    "questionId": {
      "questionId": "consent",
      "type": "single_choice",
      "timestamp": "ISO-8601-timestamp",
      "data": {
        "selectedOptions": ["consent_yes"],
        "selectionCount": 1
      }
    }
  },
  "metadata": {
    "totalQuestions": 12,
    "audioQuestions": 4,
    "completionRate": 100.0
  }
}
```

## Development

### Building for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```

### Preview Production Build
```bash
npm run preview
```

## Browser Requirements

- **Modern Browser**: Chrome, Firefox, Safari, Edge (latest versions)
- **Microphone Access**: Required for audio questions
- **JavaScript Enabled**: Required for all functionality
- **Local Storage**: Used for data persistence

## Privacy & Security

- **Local Storage**: All data stored locally in browser
- **No Server**: No data transmitted to external servers
- **Microphone Permissions**: Requested only when needed
- **Data Export**: User-controlled data export functionality
- **Informed Consent**: Comprehensive consent process for research participation

## Research Ethics

This platform implements proper research ethics standards including:
- **Informed Consent**: Detailed consent process before participation
- **Voluntary Participation**: Clear withdrawal options
- **Data Protection**: Anonymization and participant rights
- **Contact Information**: Clear researcher contact details
- **Institutional Approval**: Ethics approval tracking

## Scientific Use

This application is designed for academic research with:
- **Unique Identifiers**: Every session and response has unique IDs
- **Timestamping**: All interactions are timestamped
- **Data Integrity**: Comprehensive validation and error handling
- **Reproducible Results**: Consistent data structure and export format
- **Analytics**: Built-in completion rates and response metrics

## Contact

For questions about this research platform or the study:
- **Alexander Doudkin**: alexander.doudkin@hfbk-hamburg.de
- **Prof. Dr. Friedrich von Borries**: friedrich.vonborries@hfbk-hamburg.de
- **Institution**: HFBK Hamburg (Hamburg University of Fine Arts)

## License

MIT License - for research and educational purposes. 