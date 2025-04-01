# EqualLens - AI-Powered Recruitment Platform

## Overview
This repository hosts the code and documentation for the EqualLens Project, an AI-powered hiring platform designed to promote fair and unbiased recruitment by anonymizing candidate information and evaluating applicants based on merit. Built with React and FastAPI, the platform integrates Google Cloud AI services, including Vision API, Document AI, Natural Language API, and Vertex AI, to extract, analyze, and rank candidate resumes objectively. The platform also automates email notifications, schedules interviews, and conducts AI-driven interviews with facial verification, speech-to-text transcription, and voice anonymization.

## Team Members
1. Lim Hong Yu
2. Ooi Rui Zhe
3. Khor Rui Zhe
4. Vanness Liu Chuen Wei

EqualLens is a comprehensive recruitment platform that leverages Google's AI technologies to create a fairer, more efficient hiring process. The platform automates resume analysis, candidate ranking, and interviewing, while ensuring bias reduction through anonymized screening.

![EqualLens Logo](public/equallens.png)

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Google Technologies Used](#google-technologies-used)
- [System Architecture](#system-architecture)
- [Installation & Setup](#installation--setup)
- [Key Workflows](#key-workflows)
- [Screenshots](#screenshots)
- [Future Roadmap](#future-roadmap)
- [Contributing](#contributing)
- [License](#license)

## 🔍 Overview

EqualLens is designed to streamline the recruitment process by automating candidate screening, evaluation, and interviewing. The platform emphasizes fairness by anonymizing candidates during initial screening phases and applies AI-powered ranking based on customizable criteria. The end-to-end solution covers everything from resume ingestion to final interview reviews.

## ✨ Key Features

### Resume Management
- **Bulk CV Upload**: Upload multiple resumes at once for a job position
- **Document Parsing**: Extract structured information from PDF/DOCX resumes
- **Data Organization**: Automatic organization of candidate data by job position

### Anonymized Candidate Screening
- **Bias Reduction**: Initial screening without revealing candidate names, photos, gender, or race
- **AI-Powered Analysis**: Automated extraction of skills, experience, and education
- **Customizable Ranking**: Configurable weighting system for different criteria (experience, skills, education)

### AI-Driven Candidate Ranking
- **Scoring Engine**: Algorithmic ranking based on job requirements 
- **Customizable Weights**: Adjust importance of different factors using natural language prompts
- **Visual Results**: Clear visualization of candidate scores and rankings

### Automated Interview System
- **Dynamic Question Generation**: AI-generated interview questions based on job requirements and candidate resumes
- **Self-Service Interviews**: Candidates can complete interviews remotely on their own schedule
- **Identity Verification**: Secure verification using face comparison with ID documents
- **Video Recording**: Automatic recording and secure storage of interview responses

### Interview Review and Management
- **Centralized Dashboard**: Single view of all candidates and their progress
- **Video Playback**: Review recorded interview responses with transcripts
- **Feedback System**: Rate and comment on candidate responses
- **Automated Emails**: Send interview invitations and rejections with templated emails

## 🚀 Google Technologies Used

EqualLens leverages multiple Google Cloud services for its AI capabilities:

### Document Processing
- **Google Document AI**: Extracts structured text and information from resumes (PDF/DOCX)
- **Google Natural Language API**: Analyzes extracted text to identify skills, experience, and education

### Candidate Analysis
- **Google Generative AI (Gemini)**: Powers the customizable ranking system and interview question generation
- **Vertex AI**: Calculates the interview response scoring and provides AI feedback

### Identity Verification
- **Google Cloud Vision API**: Performs face detection and verification when comparing ID photos with video
- **Google Video Intelligence API**: Processes video data for identity verification

### Speech & Audio Processing
- **Google Cloud Speech-to-Text API**: Transcribes interview responses for text-based analysis

### Infrastructure & Integration
- **Firebase Firestore**: Unstructured database for storing candidate, job, and application data
- **Firebase Cloud Storage**: Stores resumes, videos, and processed audio
- **Gmail API**: Automates email communication with candidates
- **Google Calendar API**: Manages interview scheduling

## 🏗️ System Architecture

The EqualLens platform consists of several interconnected components:

### Frontend
- **React-based SPA**: Modern, responsive UI built with React
- **Component-based Design**: Modular architecture for maintainability
- **Tailwind CSS**: Utility-first CSS framework for styling

### Backend
- **Python FastAPI**: High-performance API server
- **Firebase Integration**: Direct interaction with Firestore and Storage
- **Google API Clients**: Interfaces with various Google Cloud services

### Database Design
- **Collections Structure**:
  - `jobs`: Job listings and requirements
  - `candidates`: Candidate information and extracted resume data
  - `applications`: Links between candidates and jobs
  - `interviewQuestionSet`: Interview question templates
  - `interviewQuestionActual`: Actual questions presented to candidates
  - `interviewResponses`: Recorded video responses
  - `interviewLinks`: Scheduled link for interview
  - `emailNotifications`: Email tracking and status

## 💻 Installation & Setup

### Prerequisites
- Node.js (v16+)
- Python (v3.8+)
- Firebase account
- Google Cloud Platform account with the following APIs enabled:
  - Document AI
  - Natural Language
  - Cloud Vision
  - Speech-to-Text
  - Video Intelligence
  - Generative AI Studio (Gemini)

### Backend Setup
1. Clone the repository
```bash
git clone https://github.com/your-org/equallens.git
cd equallens/backend
```

2. Create a virtual environment and install dependencies
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up Firebase credentials
```bash
# Create a firebase_config.json file with your Firebase service account key
touch firebase_config.json
# Add your Firebase configuration
```

4. Configure environment variables
```bash
# Create .env file
touch .env

# Add the following variables to .env
DOCUMENTAI_PROJECT_ID=your-project-id
DOCUMENTAI_LOCATION=us
DOCUMENTAI_PROCESSOR_ID=your-processor-id
DOCUMENTAI_PROCESSOR_VERSION=your-processor-version
GEMINI_API_KEY=your-gemini-api-key
FIREBASE_STORAGE_BUCKET=your-storage-bucket
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

5. Start the backend server
```bash
uvicorn main:app --reload
```

### Frontend Setup
1. Navigate to the frontend directory
```bash
cd ../frontend
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
# Create .env file
touch .env

# Add the following variables
REACT_APP_API_URL=http://localhost:8000
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
REACT_APP_FIREBASE_PROJECT_ID=your-firebase-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-firebase-app-id
```

4. Start the frontend development server
```bash
npm start
```

## 🔄 Key Workflows

### 1. Job Creation & Resume Upload
1. HR creates a new job with title, description, requirements
2. Upload multiple resumes for the position
3. System automatically extracts and structures resume data
4. Candidates are categorized under the job position

### 2. Candidate Scoring & Ranking
1. HR enters natural language prompt describing ranking criteria
2. System converts the prompt into numerical weights for skills, education, and experience
3. AI scores each candidate based on the criteria
4. Candidates are displayed in ranked order

### 3. Interview Process
1. HR can generate interview questions automatically or customize them
2. System sends interview links to selected candidates
3. Candidates verify identity by taking photo with ID card
4. Candidates answer recorded interview questions
5. HR reviews and rates interview responses

### 4. Candidate Management
1. View all candidates for a position
2. Access detailed candidate profiles with AI-generated summaries
3. Track candidate progress through the pipeline
4. Send automated emails for interview invitations or rejections

## 📸 Screenshots

*[Insert screenshots of key interfaces here]*

## 🔮 Future Roadmap

- **Enhanced Analytics**: Detailed reporting on recruitment metrics
- **Advanced Bias Detection**: More sophisticated algorithms to identify potential bias in job descriptions and evaluation
- **Multi-language Support**: Expand language capabilities for global recruiting
- **Talent Pool Management**: Long-term candidate tracking across multiple positions
- **Integration with ATS Systems**: Connect with existing Applicant Tracking Systems

## 🤝 Contributing

We welcome contributions to the EqualLens project! Please see our [Contributing Guidelines](CONTRIBUTING.md) for more information.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ by the EqualLens Team
