import logging
import json
import uuid
import random
import google.generativeai as genai
import os
from typing import Dict, Any, List, Optional
from core.firebase import firebase_client

logger = logging.getLogger(__name__)

class GeminiIVQuestionService:
    """Service for generating interview questions using Google's Gemini model."""
    
    def __init__(self):
        """Initialize the Gemini IV Question Service with API key."""
        try:
            # Get API key from environment variable
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.error("GEMINI_API_KEY environment variable not set")
                raise ValueError("GEMINI_API_KEY environment variable not set")
            
            # Configure the Gemini API
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
            logger.info("GeminiIVQuestionService initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing GeminiIVQuestionService: {e}")
            raise
    
    async def generate_interview_questions(self, candidate_id: str, job_id: str) -> Dict[str, Any]:
        """Generate interview questions for a specific candidate and job."""
        try:
            # Fetch candidate and job data
            candidate_data = self._get_candidate_data(candidate_id)
            job_data = self._get_job_data(job_id)
            
            if not candidate_data or not job_data:
                raise ValueError("Could not retrieve candidate or job data")
            
            # Create the prompt for Gemini
            prompt = self._create_interview_questions_prompt(candidate_data, job_data)
            
            # Generate response from Gemini
            response = await self._generate_gemini_response(prompt)
            
            # Process and format the response
            formatted_response = self._process_gemini_response(response)
            
            logger.info(f"Successfully generated interview questions for candidate {candidate_id}")
            return formatted_response
        except Exception as e:
            logger.error(f"Error generating interview questions: {e}")
            raise
    
    def _get_candidate_data(self, candidate_id: str) -> Dict[str, Any]:
        """Fetch candidate data from Firebase."""
        try:
            candidate = firebase_client.get_document('candidates', candidate_id)
            if not candidate:
                logger.error(f"No candidate found with ID: {candidate_id}")
                return {}
            
            logger.info(f"Retrieved candidate data for {candidate_id}")
            return candidate
        except Exception as e:
            logger.error(f"Error fetching candidate data: {e}")
            return {}
    
    def _get_job_data(self, job_id: str) -> Dict[str, Any]:
        """Fetch job data from Firebase."""
        try:
            job = firebase_client.get_document('jobs', job_id)
            if not job:
                logger.error(f"No job found with ID: {job_id}")
                return {}
            
            logger.info(f"Retrieved job data for {job_id}")
            return job
        except Exception as e:
            logger.error(f"Error fetching job data: {e}")
            return {}
    
    def _create_interview_questions_prompt(self, candidate_data: Dict[str, Any], job_data: Dict[str, Any]) -> str:
        """Create a prompt for Gemini to generate interview questions."""
        # Extract resume text from candidate data
        resume_text = candidate_data.get('extractedText', {})
        
        # Extract job details
        job_title = job_data.get('jobTitle', 'Unknown Position')
        job_description = job_data.get('jobDescription', '')
        required_skills = job_data.get('requiredSkills', [])
        departments = job_data.get('departments', [])
        
        # Create the structured prompt for Gemini
        prompt = f"""
        As an expert interviewer, create a comprehensive set of interview questions for a candidate applying for the position of {job_title}.

        CANDIDATE RESUME INFORMATION:
        {json.dumps(resume_text, indent=2)}

        JOB DETAILS:
        Title: {job_title}
        Department(s): {', '.join(departments)}
        Required Skills: {', '.join(required_skills)}
        Description: {job_description}

        Create a structured interview plan with the following 7 sections:

        SECTION 1: GENERAL QUESTIONS (COMPULSORY)
        - Include an introduction question that asks the candidate to introduce themselves
        - Ask about strengths and weaknesses relevant to the job
        - Reference specific details from the candidate's resume but don't clash with section 3
        - Make all these questions compulsory with appropriate time limits
        - Total 3 compulsory questions without any optional questions

        SECTION 2: JOB-SPECIFIC QUESTIONS
        - Ask why they applied for this specific position
        - Question their fit for the role based on job requirements
        - Include technical questions directly related to the required skills
        - Include questions related to the job description
        - Mix compulsory and optional questions with varying time limits

        SECTION 3: RESUME-BASED QUESTIONS
        - Test technical skills mentioned in their resume
        - Ask about work experiences listed
        - Question certifications/achievements they've included
        - Explore soft skills evident in their background
        - Include questions about co-curricular activities if relevant
        - Set appropriate compulsory/optional status and time limits
        - Reference specific details from the candidate's resume and job description
        - Mix compulsory and optional questions with varying time limits

        SECTION 4: BEHAVIORAL QUESTIONS
        - Include problem-solving scenarios relevant to the role reference to the job description
        - Ask about past work challenges and their resolution reference to candidate's resume
        - Explore team collaboration experiences to specific details from the candidate's resume and job description
        - Include conflict resolution scenarios 
        - Ask about leadership and initiative examples reference to specific details from the candidate's resume and job description
        - Make 8 optional questions without any compulsory questions

        SECTION 5: FUTURE OUTLOOK AND CAREER ASPIRATIONS
        - Ask about career development expectations
        - Explore professional growth plans
        - Question learning and skill enhancement objectives
        - Discuss long-term career trajectory
        - Assess willingness to adapt and learn
        - Set appropriate time limits and compulsory status

        SECTION 6: COMPENSATION AND LOGISTICS
        - Ask about salary expectations
        - Inquire about availability for joining
        - Question notice period from current employer
        - Discuss relocation willingness if relevant
        - Ask about work schedule preferences
        - Explore remote/hybrid work adaptability
        - Make most questions optional with appropriate time limits

        SECTION 7: CLOSING AND CANDIDATE QUESTIONS
        - Allow candidate to ask questions about the role
        - Ask question related to clarifications about job responsibilities
        - Provide a final opportunity for candidate self-promotion
        - Create exactly 3 optional questions with no compulsory questions
        - Set random selection to pick exactly 1 question from these 3 options

        FORMATTING REQUIREMENTS:
        - For each section, provide 5-8 relevant questions (instead of just 3-5)
        - For each question, specify a time limit between 30-140 seconds
        - Mark approximately 40% of the questions as compulsory (true) and 60% as optional (false)
        - For each section, enable random selection by default
        - Set random selection to pick at least 2 non-compulsory questions, but not all of them
        - For SECTION 7, make sure to set random selection to pick exactly 1 question
        - Format your response as a valid JSON object with the following structure:

        {{
          "sections": [
            {{
              "title": "Section Title",
              "questions": [
                {{
                  "text": "Question text",
                  "timeLimit": 60,
                  "isCompulsory": true
                }}
              ],
              "randomSettings": {{
                "enabled": true,
                "count": 2
              }}
            }}
          ]
        }}

        IMPORTANT GUIDELINES:
        - Ensure each question is specifically tailored to both the candidate's experience and job requirements
        - Don't include generic questions that could apply to any job
        - Assign reasonable time limits based on question complexity (30-150 seconds)
        - Only enable random selection for sections with at least 3 non-compulsory questions
        - Set random selection counts to at least 2 questions, but not more than 70% of the available non-compulsory questions
        - For SECTION 7, create exactly 3 optional questions with random selection enabled to pick exactly 1 question
        - Include a balanced mix of compulsory and optional questions
        - Ensure the interview duration is reasonable (typically 20-40 minutes total)
        - Make sure the response is a valid JSON object with no additional text

        Now, create a comprehensive, personalized interview question set following these guidelines.
        """
        
        return prompt
    
    async def _generate_gemini_response(self, prompt: str) -> str:
        """Generate a response from Gemini model."""
        try:
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Error generating content with Gemini: {e}")
            raise
    
    def _process_gemini_response(self, response: str) -> Dict[str, Any]:
        """Process and format the Gemini response to ensure it's valid and properly structured."""
        try:
            # Clean up response to extract only the JSON part
            clean_response = response.strip()
            
            # Check if response contains a code block
            if "```json" in clean_response:
                json_start = clean_response.find("```json") + 7
                json_end = clean_response.rfind("```")
                clean_response = clean_response[json_start:json_end].strip()
            elif "```" in clean_response:
                json_start = clean_response.find("```") + 3
                json_end = clean_response.rfind("```")
                clean_response = clean_response[json_start:json_end].strip()
            
            # Parse JSON
            question_data = json.loads(clean_response)
            
            # Add IDs and additional metadata to each section and question
            for section in question_data.get("sections", []):
                section["sectionId"] = f"sect-{uuid.uuid4()}"
                section["isAIGenerated"] = True
                
                # Ensure randomSettings exist with proper defaults
                if "randomSettings" not in section:
                    section["randomSettings"] = {"enabled": False, "count": 0}
                elif not isinstance(section["randomSettings"], dict):
                    section["randomSettings"] = {"enabled": False, "count": 0}
                else:
                    # Ensure randomSettings has all required fields
                    if "enabled" not in section["randomSettings"]:
                        section["randomSettings"]["enabled"] = False
                    if "count" not in section["randomSettings"]:
                        section["randomSettings"]["count"] = 0
                
                for question in section.get("questions", []):
                    question["questionId"] = f"ques-{uuid.uuid4()}"
                    question["isAIGenerated"] = True
                    
                    # Ensure all required question fields exist with defaults
                    if "text" not in question or not question["text"]:
                        question["text"] = "Please answer this question."
                    else:
                        # Remove "(Optional)" text from the question text
                        question["text"] = question["text"].replace(" (Optional)", "").replace("(Optional) ", "").replace("(Optional)", "")
                    
                    # Ensure timeLimit is present and is a valid number
                    if "timeLimit" not in question or not isinstance(question["timeLimit"], (int, float)) or question["timeLimit"] <= 0:
                        question["timeLimit"] = 60  # Default to 60 seconds
                    else:
                        # Clamp timeLimit to reasonable bounds (30-180 seconds)
                        question["timeLimit"] = max(30, min(180, question["timeLimit"]))
                    
                    # Ensure isCompulsory is present and is a boolean
                    if "isCompulsory" not in question or not isinstance(question["isCompulsory"], bool):
                        question["isCompulsory"] = True  # Default to compulsory
                    
                    # Store original values for tracking modifications
                    question["originalText"] = question["text"]
                    question["originalTimeLimit"] = question["timeLimit"]
                    question["originalCompulsory"] = question["isCompulsory"]
                    
                    # Add isAIModified flag (initially false)
                    question["isAIModified"] = False
                
                # Special handling for Section 7 (Closing Questions)
                if "closing" in section["title"].lower() or "candidate questions" in section["title"].lower():
                    # Make all questions non-compulsory
                    for question in section.get("questions", []):
                        question["isCompulsory"] = False
                        question["originalCompulsory"] = False
                    
                    # IMPORTANT: Force random selection to exactly 1 question for Section 7
                    section["randomSettings"]["enabled"] = True
                    section["randomSettings"]["count"] = 1
                # Normal validation for other sections
                elif "randomSettings" in section:
                    non_compulsory_count = sum(1 for q in section["questions"] if not q.get("isCompulsory", True))
                    
                    # Ensure random selection is only enabled when there are at least 2 non-compulsory questions
                    if non_compulsory_count < 2:
                        section["randomSettings"]["enabled"] = False
                        section["randomSettings"]["count"] = 0
                    elif section["randomSettings"].get("enabled", False):
                        # Ensure count is at least 2 but less than the number of non-compulsory questions
                        max_count = non_compulsory_count - 1
                        current_count = section["randomSettings"].get("count", 0)
                        
                        # Set the count to be at least 2, but not more than the max allowed
                        if current_count < 2 or current_count > max_count:
                            # Target around 50% of non-compulsory questions, but minimum 2
                            target_count = max(2, min(max_count, round(non_compulsory_count * 0.5)))
                            section["randomSettings"]["count"] = 2
            
            # Add metadata for tracking
            question_data["aiGenerationUsed"] = True
            
            return question_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing Gemini response as JSON: {e}")
            logger.error(f"Raw response: {response}")
            # Fall back to a basic structure if parsing fails
            return self._create_fallback_questions()
        except Exception as e:
            logger.error(f"Error processing Gemini response: {e}")
            return self._create_fallback_questions()
    
    def _create_fallback_questions(self) -> Dict[str, Any]:
        """Create a fallback set of basic interview questions if Gemini fails."""
        sections = [
            {
                "title": "General Questions",
                "sectionId": f"sect-{uuid.uuid4()}",
                "isAIGenerated": True,
                "questions": [
                    {
                        "text": "Please introduce yourself and tell us about your professional background.",
                        "timeLimit": 60,
                        "isCompulsory": True,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "Please introduce yourself and tell us about your professional background.",
                        "originalTimeLimit": 60,
                        "originalCompulsory": True,
                        "isAIModified": False
                    },
                    {
                        "text": "What are your key strengths as they relate to this position?",
                        "timeLimit": 60,
                        "isCompulsory": True,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "What are your key strengths as they relate to this position?",
                        "originalTimeLimit": 60,
                        "originalCompulsory": True,
                        "isAIModified": False
                    },
                    {
                        "text": "What areas of improvement are you currently working on?",
                        "timeLimit": 60,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "What areas of improvement are you currently working on?",
                        "originalTimeLimit": 60,
                        "originalCompulsory": False,
                        "isAIModified": False
                    },
                    {
                        "text": "How would your colleagues describe your work style?",
                        "timeLimit": 45,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "How would your colleagues describe your work style?",
                        "originalTimeLimit": 45,
                        "originalCompulsory": False,
                        "isAIModified": False
                    },
                    {
                        "text": "What motivates you professionally?",
                        "timeLimit": 45,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "What motivates you professionally?",
                        "originalTimeLimit": 45,
                        "originalCompulsory": False,
                        "isAIModified": False
                    }
                ],
                "randomSettings": {
                    "enabled": True,
                    "count": 2
                }
            },
            {
                "title": "Job-Specific Questions",
                "sectionId": f"sect-{uuid.uuid4()}",
                "isAIGenerated": True,
                "questions": [
                    {
                        "text": "Why did you apply for this position?",
                        "timeLimit": 60,
                        "isCompulsory": True,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "Why did you apply for this position?",
                        "originalTimeLimit": 60,
                        "originalCompulsory": True,
                        "isAIModified": False
                    },
                    {
                        "text": "What skills do you have that make you a good fit for this role?",
                        "timeLimit": 90,
                        "isCompulsory": True,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "What skills do you have that make you a good fit for this role?",
                        "originalTimeLimit": 90,
                        "originalCompulsory": True,
                        "isAIModified": False
                    },
                    {
                        "text": "What do you know about our company and the position you're applying for?",
                        "timeLimit": 60,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "What do you know about our company and the position you're applying for?",
                        "originalTimeLimit": 60,
                        "originalCompulsory": False,
                        "isAIModified": False
                    },
                    {
                        "text": "How do you stay updated with the latest trends and developments in your field?",
                        "timeLimit": 60,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "How do you stay updated with the latest trends and developments in your field?",
                        "originalTimeLimit": 60,
                        "originalCompulsory": False,
                        "isAIModified": False
                    },
                    {
                        "text": "What aspects of this job do you think would be most challenging for you?",
                        "timeLimit": 60,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "What aspects of this job do you think would be most challenging for you?",
                        "originalTimeLimit": 60,
                        "originalCompulsory": False,
                        "isAIModified": False
                    }
                ],
                "randomSettings": {
                    "enabled": True,
                    "count": 2
                }
            },
            {
                "title": "Resume-Based Questions",
                "sectionId": f"sect-{uuid.uuid4()}",
                "isAIGenerated": True,
                "questions": [
                    {
                        "text": "Can you elaborate on your experience at your most recent position?",
                        "timeLimit": 90,
                        "isCompulsory": True,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "Can you elaborate on your experience at your most recent position?",
                        "originalTimeLimit": 90,
                        "originalCompulsory": True,
                        "isAIModified": False
                    },
                    {
                        "text": "How have your previous roles prepared you for this position?",
                        "timeLimit": 90,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "How have your previous roles prepared you for this position?",
                        "originalTimeLimit": 90,
                        "originalCompulsory": False,
                        "isAIModified": False
                    },
                    {
                        "text": "Tell us about your educational background and how it relates to this role.",
                        "timeLimit": 60,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "Tell us about your educational background and how it relates to this role.",
                        "originalTimeLimit": 60,
                        "originalCompulsory": False,
                        "isAIModified": False
                    },
                    {
                        "text": "What technical skills from your resume are you most confident about applying in this role?",
                        "timeLimit": 60,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "What technical skills from your resume are you most confident about applying in this role?",
                        "originalTimeLimit": 60,
                        "originalCompulsory": False,
                        "isAIModified": False
                    },
                    {
                        "text": "I notice there's a gap in your employment history. Can you explain what you were doing during that time?",
                        "timeLimit": 60,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "I notice there's a gap in your employment history. Can you explain what you were doing during that time?",
                        "originalTimeLimit": 60,
                        "originalCompulsory": False,
                        "isAIModified": False
                    }
                ],
                "randomSettings": {
                    "enabled": True,
                    "count": 2
                }
            },
            {
                "title": "Behavioral Questions",
                "sectionId": f"sect-{uuid.uuid4()}",
                "isAIGenerated": True,
                "questions": [
                    {
                        "text": "Describe a challenging situation you faced at work and how you resolved it.",
                        "timeLimit": 120,
                        "isCompulsory": True,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "Describe a challenging situation you faced at work and how you resolved it.",
                        "originalTimeLimit": 120,
                        "originalCompulsory": True,
                        "isAIModified": False
                    },
                    {
                        "text": "Tell us about a time when you had to work with a difficult team member or client.",
                        "timeLimit": 90,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "Tell us about a time when you had to work with a difficult team member or client.",
                        "originalTimeLimit": 90,
                        "originalCompulsory": False,
                        "isAIModified": False
                    },
                    {
                        "text": "Give an example of when you showed leadership or took initiative.",
                        "timeLimit": 90,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "Give an example of when you showed leadership or took initiative.",
                        "originalTimeLimit": 90,
                        "originalCompulsory": False,
                        "isAIModified": False
                    },
                    {
                        "text": "Describe a time when you had to meet a tight deadline. How did you manage it?",
                        "timeLimit": 90,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "Describe a time when you had to meet a tight deadline. How did you manage it?",
                        "originalTimeLimit": 90,
                        "originalCompulsory": False,
                        "isAIModified": False
                    },
                    {
                        "text": "Tell me about a situation where you had to learn something new quickly. How did you approach it?",
                        "timeLimit": 90,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "Tell me about a situation where you had to learn something new quickly. How did you approach it?",
                        "originalTimeLimit": 90,
                        "originalCompulsory": False,
                        "isAIModified": False
                    }
                ],
                "randomSettings": {
                    "enabled": True,
                    "count": 2
                }
            },
            {
                "title": "Future Outlook",
                "sectionId": f"sect-{uuid.uuid4()}",
                "isAIGenerated": True,
                "questions": [
                    {
                        "text": "Where do you see yourself professionally in the next 3-5 years?",
                        "timeLimit": 60,
                        "isCompulsory": True,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "Where do you see yourself professionally in the next 3-5 years?",
                        "originalTimeLimit": 60,
                        "originalCompulsory": True,
                        "isAIModified": False
                    },
                    {
                        "text": "What skills are you looking to develop in your next role?",
                        "timeLimit": 60,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "What skills are you looking to develop in your next role?",
                        "originalTimeLimit": 60,
                        "originalCompulsory": False,
                        "isAIModified": False
                    },
                    {
                        "text": "How do you plan to contribute to our company's growth?",
                        "timeLimit": 60,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "How do you plan to contribute to our company's growth?",
                        "originalTimeLimit": 60,
                        "originalCompulsory": False,
                        "isAIModified": False
                    },
                    {
                        "text": "What aspects of company culture are important to you for your career development?",
                        "timeLimit": 60,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "What aspects of company culture are important to you for your career development?",
                        "originalTimeLimit": 60,
                        "originalCompulsory": False,
                        "isAIModified": False
                    }
                ],
                "randomSettings": {
                    "enabled": True,
                    "count": 2
                }
            },
            {
                "title": "Compensation and Logistics",
                "sectionId": f"sect-{uuid.uuid4()}",
                "isAIGenerated": True,
                "questions": [
                    {
                        "text": "What are your salary expectations for this position?",
                        "timeLimit": 45,
                        "isCompulsory": True,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "What are your salary expectations for this position?",
                        "originalTimeLimit": 45,
                        "originalCompulsory": True,
                        "isAIModified": False
                    },
                    {
                        "text": "When would you be available to start if offered the position?",
                        "timeLimit": 30,
                        "isCompulsory": True,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "When would you be available to start if offered the position?",
                        "originalTimeLimit": 30,
                        "originalCompulsory": True,
                        "isAIModified": False
                    },
                    {
                        "text": "Do you have any preferences or requirements regarding work schedule or remote work?",
                        "timeLimit": 45,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "Do you have any preferences or requirements regarding work schedule or remote work?",
                        "originalTimeLimit": 45,
                        "originalCompulsory": False,
                        "isAIModified": False
                    },
                    {
                        "text": "Are you willing to relocate if the position requires it?",
                        "timeLimit": 30,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "Are you willing to relocate if the position requires it?",
                        "originalTimeLimit": 30,
                        "originalCompulsory": False,
                        "isAIModified": False
                    },
                    {
                        "text": "What is your notice period at your current job?",
                        "timeLimit": 30,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "What is your notice period at your current job?",
                        "originalTimeLimit": 30,
                        "originalCompulsory": False,
                        "isAIModified": False
                    }
                ],
                "randomSettings": {
                    "enabled": True,
                    "count": 2
                }
            },
            {
                "title": "Closing Questions",
                "sectionId": f"sect-{uuid.uuid4()}",
                "isAIGenerated": True,
                "questions": [
                    {
                        "text": "Do you have any questions about the role or our company?",
                        "timeLimit": 90,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "Do you have any questions about the role or our company?",
                        "originalTimeLimit": 90,
                        "originalCompulsory": False,
                        "isAIModified": False
                    },
                    {
                        "text": "Is there anything else you'd like to share that we haven't covered?",
                        "timeLimit": 60,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "Is there anything else you'd like to share that we haven't covered?",
                        "originalTimeLimit": 60,
                        "originalCompulsory": False,
                        "isAIModified": False
                    },
                    {
                        "text": "What questions do you have about the next steps in our interview process?",
                        "timeLimit": 45,
                        "isCompulsory": False,
                        "questionId": f"ques-{uuid.uuid4()}",
                        "isAIGenerated": True,
                        "originalText": "What questions do you have about the next steps in our interview process?",
                        "originalTimeLimit": 45,
                        "originalCompulsory": False,
                        "isAIModified": False
                    }
                ],
                "randomSettings": {
                    "enabled": True,
                    "count": 1  
                }
            }
        ]
        
        return {
            "sections": sections,
            "aiGenerationUsed": True
        }
