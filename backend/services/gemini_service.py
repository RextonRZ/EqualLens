import os
import json
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from functools import lru_cache
import google.generativeai as genai
from google.cloud import firestore
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Configure Gemini API
def configure_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    genai.configure(api_key=api_key)

class GeminiService:
    def __init__(self):
        configure_gemini()
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        self.db = firestore.Client()
    
    async def score_applicant(self, applicant: Dict[str, Any], job_description: str, criteria: str) -> Dict[str, Any]:
        """
        Score an individual applicant based on their data, job description, and selected criteria.

        Args:
            applicant: Dictionary containing applicant data with extractedText.
            job_description: String describing the job's requirements and responsibilities.
            criteria: String specifying the criteria to evaluate (e.g., "skills, experience").

        Returns:
            Dictionary with rank_score and reasoning for each evaluated criterion.
        """
        extracted_text = applicant.get("extractedText", {})

        # Define the system prompt for Gemini
        system_prompt = f"""
        You are an expert resume analyzer. Evaluate the candidate's resume information based on the job description 
        and the selected criteria: {criteria}. For each criterion, score the candidate from 0 to 10 and provide reasoning.

        Criteria details:
        - Skills:
            1. Relevance: Evaluate how well the candidate's skills match the job description.
            2. Proficiency: Assess the candidate's level of skill proficiency which would benefit the job description.
            3. AdditionalSkill: Identify additional skills the candidate has that are not listed in the job description.
        - Experience:
            1. JobExp: Evaluate the alignment of the candidate's previous job experience with the job description.
            2. ProjectCocurricularExp: Assess the relevance of the candidate's projects and co-curricular activities that relates to the job.
            3. Certification: Evaluate the certifications and training the candidate has complete which would benefit the job description.
        - Education:
            1. StudyLevel: Assess the candidate's level of study and education.
            2. Awards: Evaluate the candidate's awards and achievements which would benefit the job description.
            3. CourseworkResearch: Assess the relevance of the candidate's coursework and research that relates to the job.

        VERY IMPORTANT:
        - Base all evaluations on the job description and the candidate's profile details at all times.
        - Provide a score from 0 to 10 for each criterion, where 0 means "not at all relevant" and 10 means "extremely relevant".
        - Respond ONLY with a valid JSON object in the following format and nothing else (no explanation, no markdown formatting, no text before or after):

        {{
            "rank_score": {{
                "relevance": <integer 0-10>,
                "proficiency": <integer 0-10>,
                "additionalSkill": <integer 0-10>,
                "jobExp": <integer 0-10>,
                "projectCocurricularExp": <integer 0-10>,
                "certification": <integer 0-10>,
                "studyLevel": <integer 0-10>,
                "awards": <integer 0-10>,
                "courseworkResearch": <integer 0-10>
            }},
            "reasoning": {{
                "relevance": "<brief explanation>",
                "proficiency": "<brief explanation>",
                "additionalSkill": "<brief explanation>",
                "jobExp": "<brief explanation>",
                "projectCocurricularExp": "<brief explanation>",
                "certification": "<brief explanation>",
                "studyLevel": "<brief explanation>",
                "awards": "<brief explanation>",
                "courseworkResearch": "<brief explanation>"
            }}
        }}
        """

        try:
            # Format the input for Gemini
            formatted_text = f"Job Description:\n{job_description}\n\nResume Information:\n"
            for key, value in extracted_text.items():
                formatted_text += f"{key}: {value}\n\n"

            # Send the prompt to Gemini
            response = await self.model.generate_content_async(
                [system_prompt, formatted_text]
            )

            # Extract the JSON from the response text
            response_text = response.text
            logger.info(f"Gemini response text in score_applicant: {response_text}")
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1

            if start_idx != -1 and end_idx != -1:
                json_str = response_text[start_idx:end_idx]
                scores = json.loads(json_str)

                # Validate and clean up scores
                rank_score = scores.get("rank_score", {})
                reasoning = scores.get("reasoning", {})

                # Ensure all criteria in the selected categories are present
                required_criteria = []
                if "skills" in criteria.lower():
                    required_criteria.extend(["relevance", "proficiency", "additionalSkill"])
                if "experience" in criteria.lower():
                    required_criteria.extend(["jobExp", "projectCocurricularExp", "certification"])
                if "education" in criteria.lower():
                    required_criteria.extend(["studyLevel", "awards", "courseworkResearch"])

                # Filter rank_score and reasoning to include only relevant criteria
                rank_score = {key: rank_score[key] for key in required_criteria if key in rank_score}
                reasoning = {key: reasoning[key] for key in required_criteria if key in reasoning}

                # Prepare the result
                result = {
                    "rank_score": rank_score,
                    "reasoning": reasoning
                }

                logger.info(f"Applicant scored: {result}")
                return result
            else:
                raise ValueError("Failed to extract JSON from Gemini response")

        except Exception as e:
            logger.error(f"Error scoring applicant: {str(e)}")
            raise HTTPException(status_code=500, detail="An error occurred while scoring the applicant. Please try again later.")
    async def rank_applicants(self, prompt: str, applicants: List[Dict[str, Any]], job_document: Dict[str, Any]) -> Dict[str, Any]:
        """
        Rank applicants based on job requirements and user prompt.
        
        Args:
            prompt: User input describing ranking criteria
            applicants: List of applicant data
            job_document: Job document containing job description
            
        Returns:
            Dictionary with ranked applicants
        """
        try:
            # Validate inputs
            if not prompt:
                raise ValueError("Prompt cannot be empty")
            if not applicants:
                return {"applicants": [], "message": "No applicants to rank"}
            if not job_document or "jobDescription" not in job_document:
                raise ValueError("Job document must contain jobDescription")
                
            job_description = job_document.get("jobDescription", "")
            
            # Extract criteria from prompt
            criteria = prompt
            
            # Score each applicant
            scored_applicants = []
            for applicant in applicants:
                try:
                    # Use the score_applicant function with job description and criteria
                    scores = await self.score_applicant(applicant, job_description, criteria)
                    
                    # Calculate final score as average of all score components
                    rank_scores = scores.get("rank_score", {})
                    if rank_scores:
                        # Calculate final score as percentage (sum of all scores divided by max possible score)
                        total_score = sum(rank_scores.values())
                        max_possible_score = len(rank_scores) * 10.0  # Each score is on a scale of 0-10
                        final_score = (total_score / max_possible_score) * 100.0  # Convert to percentage
                    else:
                        final_score = 0
                        
                    # Add final score to rank_score
                    scores["rank_score"]["final_score"] = round(final_score, 2)
                    
                    # Combine applicant data with scores
                    applicant_with_score = {**applicant, **scores}
                    scored_applicants.append(applicant_with_score)
                    
                except Exception as e:
                    # Log error but continue with other applicants
                    logger.error(f"Error scoring applicant {applicant.get('id', 'unknown')}: {str(e)}")
                    applicant_with_error = {
                        **applicant, 
                        "rank_score": {"final_score": 0},
                        "reasoning": {"error": f"Failed to score: {str(e)}"}
                    }
                    scored_applicants.append(applicant_with_error)
            
            # Sort applicants by final score (descending)
            ranked_applicants = sorted(
                scored_applicants, 
                key=lambda x: x.get("rank_score", {}).get("final_score", 0), 
                reverse=True
            )
            
            return {
                "applicants": ranked_applicants
            }
        except Exception as e:
            logger.error(f"Error ranking applicants: {str(e)}")
            raise HTTPException(status_code=500, detail="An error occurred while ranking the applicants. Please try again later.")
    
    async def generate_candidate_profile(self, applicant: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a summary profile for a candidate based on their resume data.
        
        Args:
            applicant: Dictionary containing applicant data with extractedText
            
        Returns:
            Dictionary with summary, skills, education, and experience sections
        """
        extracted_text = applicant.get("extractedText", {})
        
        system_prompt = """
        You are an expert resume analyzer. Review the candidate's resume information and generate:

        1. A **concise summary paragraph** highlighting the candidate's strengths and weaknesses. 
        - Consider all potential attributes: awards_paragraph, bio, certifications_paragraph, co-curricular_activities_paragraph, education_paragraph, languages, projects_paragraph, soft_skills, technical_skills, and work_experience_paragraph.
        - The summary should focus on key achievements, skills, and areas for improvement.

        2. Categorized information in these areas (if available):
        - **Soft Skills**: List of soft skills.
        - **Technical Skills**: List of technical skills.
        - **Languages**: List of languages known.
        - **Education**: Key points from education_paragraph.
        - **Certifications**: Key points from certifications_paragraph.
        - **Awards**: Key points from awards_paragraph.
        - **Work Experience**: Key points from work_experience_paragraph.
        - **Projects**: Key points from projects_paragraph.
        - **Co-Curricular Activities**: Key points from co-curricular_activities_paragraph.

        VERY IMPORTANT:
        - Do NOT include any personal identifying information such as applicant_contactNum, applicant_mail, applicant_name, or bio.
        - If a category is not present in the resume, exclude it from the output.
        - Respond ONLY with a valid JSON object in the following format and nothing else (no explanation, no markdown formatting, no text before or after):

        {
            "summary": "A concise summary of the candidate's profile with <strong>important points</strong> emphasized...",
            "soft_skills": ["Soft Skill 1", "Soft Skill 2", ...],
            "technical_skills": ["Technical Skill 1", "Technical Skill 2", ...],
            "languages": ["Language 1", "Language 2", ...],
            "education": ["Education point 1", "Education point 2", ...],
            "certifications": ["Certification 1", "Certification 2", ...],
            "awards": ["Award 1", "Award 2", ...],
            "work_experience": ["Work Experience point 1", "Work Experience point 2", ...],
            "projects": ["Project 1", "Project 2", ...],
            "co_curricular_activities": ["Activity 1", "Activity 2", ...]
        }
        """
        
        try:
            # Format extracted text for Gemini
            formatted_text = "Resume Information:\n"
            for key, value in extracted_text.items():
                formatted_text += f"{key}: {value}\n\n"
            
            response = await self.model.generate_content_async(
                [system_prompt, formatted_text]
            )
            
            # Extract the JSON from the response text
            response_text = response.text
            logger.info(f"Gemini response text in generate_candidate_profile: {response_text}")
            
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            
            if start_idx != -1 and end_idx != -1:
                json_str = response_text[start_idx:end_idx]
                profile_data = json.loads(json_str)
                
                # Validate required fields
                if 'summary' not in profile_data:
                    profile_data['summary'] = "Information not available"
                
                # Clean up any empty fields if they exist
                for field in list(profile_data.keys()):
                    if not profile_data[field]:  # Remove if empty
                        del profile_data[field]
                
                return profile_data
            else:
                raise ValueError("Failed to extract JSON from Gemini response")
                
        except Exception as e:
            logger.error(f"Error generating candidate profile: {str(e)}")
            raise HTTPException(status_code=500, detail="An error occurred while generating the candidate profile. Please try again later.")