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
    
    async def analyze_prompt_for_weights(self, prompt: str) -> Dict[str, int]:
        """Extract weights for skills, education, and experience from the user prompt."""
        system_prompt = """
            You are an AI assistant that analyzes job requirements. From the given prompt, 
            extract the importance weights for three factors on a scale from 1 to 10:

            1. Skills: Includes technical_skills, soft_skills, and languages.
            2. Education: Includes education_paragraph, certifications_paragraph, and awards_paragraph.
            3. Experience: Includes work_experience_paragraph, projects_paragraph, and co-curricular_activities_paragraph.

            VERY IMPORTANT:
            - Ignore any personal identifiable information such as applicant_contactNum, applicant_mail, applicant_name, and bio.
            - Respond ONLY with a valid JSON object in the following format and nothing else (no explanation, no markdown formatting, no text before or after):

            {
                "skill_weight": <integer 1-10>,
                "education_weight": <integer 1-10>,
                "experience_weight": <integer 1-10>
            }
            """
        
        try:
            response = await self.model.generate_content_async(
                [system_prompt, prompt]
            )
            
            # Extract the JSON from the response text
            response_text = response.text
            logger.info(f"Gemini response text in analyze_prompt_for_weights: {response_text}")
            
            # Try to parse the response directly first
            try:
                weights = json.loads(response_text.strip())
            except json.JSONDecodeError:
                # If direct parsing fails, try to extract JSON from the text
                start_idx = response_text.find('{')
                end_idx = response_text.rfind('}') + 1
                
                if start_idx != -1 and end_idx != -1:
                    json_str = response_text[start_idx:end_idx]
                    weights = json.loads(json_str)
                else:
                    # If JSON can't be found, create default weights
                    logger.warning("Could not extract JSON from response, using default weights")
                    weights = {
                        "skill_weight": 5,
                        "education_weight": 5,
                        "experience_weight": 5
                    }
                
                # Ensure all weights are present and within valid range
                for key in ['skill_weight', 'education_weight', 'experience_weight']:
                    if key not in weights:
                        weights[key] = 5  # Default to medium importance
                    else:
                        weights[key] = max(1, min(10, int(weights[key])))  # Ensure between 1-10
                
                return weights
            else:
                raise ValueError("Failed to extract JSON from Gemini response")
                
        except Exception as e:
            logger.error(f"Error analyzing prompt: {str(e)}")
            raise HTTPException(status_code=500, detail="An error occurred while analyzing the prompt. Please try again later.")
    
    async def score_applicant(self, applicant: Dict[str, Any], weights: Dict[str, int]) -> Dict[str, Any]:
        """Score an individual applicant based on their data and the weights."""
        extracted_text = applicant.get("extractedText", {})
        
        system_prompt = """
        You are an expert resume analyzer. Evaluate the candidate's resume information and score them 
        in three categories on a scale from 1 to 10:

        1. Skills: Includes technical_skills, soft_skills, and languages.
        2. Education: Includes education_paragraph, certifications_paragraph, and awards_paragraph.
        3. Experience: Includes work_experience_paragraph, projects_paragraph, and co-curricular_activities_paragraph.

        VERY IMPORTANT:
        - Ignore any personal identifiable information such as applicant_contactNum, applicant_mail, applicant_name, and bio.
        - Respond ONLY with a valid JSON object in the following format and nothing else (no explanation, no markdown formatting, no text before or after):

        {
            "skill_score": <integer 1-10>,
            "education_score": <integer 1-10>,
            "experience_score": <integer 1-10>,
            "reasoning": {
                "skill_reasoning": "<brief explanation>",
                "education_reasoning": "<brief explanation>",
                "experience_reasoning": "<brief explanation>"
            }
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
            logger.info(f"Gemini response text in score_applicant: {response_text}")
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            
            if start_idx != -1 and end_idx != -1:
                json_str = response_text[start_idx:end_idx]
                scores = json.loads(json_str)
                
                # Ensure all scores are present and within valid range
                for key in ['skill_score', 'education_score', 'experience_score']:
                    if key not in scores:
                        scores[key] = 5  # Default to medium score
                    else:
                        scores[key] = max(1, min(10, int(scores[key])))  # Ensure between 1-10
                
                # Calculate final score using the formula
                skill_term = (scores['skill_score'] * weights['skill_weight']) / 10.0
                education_term = scores['education_score'] * weights['education_weight'] / 10.0
                experience_term = (scores['experience_score'] * weights['experience_weight']) / 10.0
                
                outcome = skill_term + education_term + experience_term
                total_weight = weights['skill_weight'] + weights['education_weight'] + weights['experience_weight']
                final_score = (outcome / total_weight) * 100
                
                # Round to 2 decimal places
                final_score = round(final_score, 2)
                
                # Prepare result
                result = {
                    "rank_score": {
                        "skill_score": scores['skill_score'],
                        "education_score": scores['education_score'],
                        "experience_score": scores['experience_score'],
                        "final_score": final_score
                    },
                    "reasoning": scores.get('reasoning', {})
                }

                logger.info(f"Applicant scored: {result}")
                
                return result
            else:
                raise ValueError("Failed to extract JSON from Gemini response")
                
        except Exception as e:
            logger.error(f"Error scoring applicant: {str(e)}")
            raise HTTPException(status_code=500, detail="An error occurred while scoring the applicant. Please try again later.")
    
    async def rank_applicants(self, prompt: str, applicants: List[Dict[str, Any]], job_document: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Rank applicants based on job requirements, user prompt and calculate scores.
        
        Args:
            prompt: User input describing ranking preferences
            applicants: List of applicant data
            job_document: Job document containing existing weights if available
            
        Returns:
            Dictionary with weights, applicant scores, and ranked applicants
        """
        try:
            # Validate inputs
            if not prompt:
                raise ValueError("Prompt cannot be empty")
            if not applicants:
                return {"weights": {}, "applicants": [], "message": "No applicants to rank"}
                
            # Analyze the prompt to get weights
            weights = await self.analyze_prompt_for_weights(prompt)
            
            # Check if weights match existing job document (if provided)
            if job_document and "rank_weight" in job_document:
                existing_weights = job_document["rank_weight"]
                if (existing_weights.get("skill_weight") == weights["skill_weight"] and
                    existing_weights.get("education_weight") == weights["education_weight"] and
                    existing_weights.get("experience_weight") == weights["experience_weight"]):
                    # Weights haven't changed, return existing rankings
                    return {
                        "weights": weights,
                        "message": "Weights unchanged, using existing rankings",
                        "applicants": applicants
                    }
            
            # Score each applicant
            scored_applicants = []
            for applicant in applicants:
                try:
                    scores = await self.score_applicant(applicant, weights)
                    applicant_with_score = {**applicant, **scores}
                    scored_applicants.append(applicant_with_score)
                    
                except Exception as e:
                    # Log error but continue with other applicants
                    applicant_with_error = {
                        **applicant, 
                        "rank_score": {"final_score": 0},
                        "error": f"Failed to score: {str(e)}"
                    }
                    scored_applicants.append(applicant_with_error)
            
            # Sort applicants by final score (descending)
            ranked_applicants = sorted(
                scored_applicants, 
                key=lambda x: x.get("rank_score", {}).get("final_score", 0), 
                reverse=True
            )
            
            return {
                "weights": weights,
                "applicants": ranked_applicants
            }
        except Exception as e:
            logger.error(f"Error ranking applicants: {str(e)}")
            raise HTTPException(status_code=500, detail="An error occurred while ranking the applicants. Please try again later.")
        
    async def rank_applicants_with_weights(self, weights: Dict[str, int], applicants: List[Dict[str, Any]], job_document: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Rank applicants based on job requirements and provided weights.

        Args:
            weights: Dictionary containing weights for skills, education, and experience.
            applicants: List of applicant data.
            job_document: Job document containing existing weights if available.

        Returns:
            Dictionary with weights, applicant scores, and ranked applicants.
        """
        try:
            # Validate inputs
            if not weights:
                raise ValueError("Weights cannot be empty")
            if not applicants:
                return {"weights": weights, "applicants": [], "message": "No applicants to rank"}
            
            # Ensure weights have the required keys with valid values
            for key in ['skill_weight', 'education_weight', 'experience_weight']:
                if key not in weights:
                    weights[key] = 5  # Default to medium importance
                else:
                    # Ensure weights are integers between 1-10
                    weights[key] = max(1, min(10, int(weights[key])))

            # Score each applicant
            scored_applicants = []
            for applicant in applicants:
                try:
                    scores = await self.score_applicant(applicant, weights)
                    applicant_with_score = {**applicant, **scores}
                    scored_applicants.append(applicant_with_score)
                except Exception as e:
                    logger.error(f"Error scoring applicant {applicant.get('candidateId', 'unknown')}: {str(e)}")
                    applicant_with_error = {
                        **applicant, 
                        "rank_score": {"final_score": 0},
                        "error": f"Failed to score: {str(e)}"
                    }
                    scored_applicants.append(applicant_with_error)
            
            # Sort applicants by final score (descending)
            ranked_applicants = sorted(
                scored_applicants, 
                key=lambda x: x.get("rank_score", {}).get("final_score", 0), 
                reverse=True
            )
            
            # Verify ranking worked
            logger.info(f"Ranking complete. Top score: {ranked_applicants[0].get('rank_score', {}).get('final_score', 0) if ranked_applicants else 'No applicants'}")
            
            return {
                "weights": weights,
                "applicants": ranked_applicants
            }
        except Exception as e:
            logger.error(f"Error ranking applicants with weights: {str(e)}")
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