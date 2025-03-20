import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/pages/Home';
import UploadCV from './components/pages/UploadCV';
import SignUp from './components/pages/SignUp';
import InterviewLinkValidator from './components/pages/InterviewLinkValidator';
import IDVerification from './components/pages/IDVerification';
import InterviewQuestions from './components/pages/InterviewQuestions';
import InterviewLinkGenerator from './components/pages/InterviewLinkGenerator';
import InterviewReview from './components/pages/InterviewReview';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* Main application routes */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/upload-cv" element={<UploadCV />} />
        <Route path="/sign-up" element={<SignUp />} />

        {/* HR routes */}
        <Route path="/interview-generator" element={<InterviewLinkGenerator />} />
        <Route path="/interview-review/:interviewId" element={<InterviewReview />} />

        {/* Candidate interview routes */}
        <Route path="/interview/:interviewId/:linkCode" element={<InterviewLinkValidator />} />
        <Route path="/interview/:interviewId/:linkCode/id-verification" element={<IDVerification />} />
        <Route path="/interview/:interviewId/:linkCode/questions" element={<InterviewQuestions />} />
      </Routes>
    </Router>
  );
}

export default App;