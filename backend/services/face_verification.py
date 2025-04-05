import logging
import base64
from google.cloud import vision
from typing import Tuple, Dict, Any, List
import numpy as np
import math

logger = logging.getLogger(__name__)

# Initialize the Google Cloud Vision client
try:
    vision_client = vision.ImageAnnotatorClient()
except Exception as e:
    logger.error(f"Failed to initialize Google Cloud Vision client: {e}. Ensure credentials are set up.")
    vision_client = None # Prevent usage if initialization fails


# Define key landmarks for geometric comparison (using Vision API Enum names)
ESSENTIAL_LANDMARK_TYPES = [
    vision.FaceAnnotation.Landmark.Type.LEFT_EYE,
    vision.FaceAnnotation.Landmark.Type.RIGHT_EYE,
    vision.FaceAnnotation.Landmark.Type.NOSE_TIP,
    vision.FaceAnnotation.Landmark.Type.MOUTH_LEFT,
    vision.FaceAnnotation.Landmark.Type.MOUTH_RIGHT,
    # Optional but good to have:
    vision.FaceAnnotation.Landmark.Type.LEFT_EYE_PUPIL,
    vision.FaceAnnotation.Landmark.Type.RIGHT_EYE_PUPIL,
    vision.FaceAnnotation.Landmark.Type.MOUTH_CENTER,
    vision.FaceAnnotation.Landmark.Type.CHIN_GNATHION,
    vision.FaceAnnotation.Landmark.Type.FOREHEAD_GLABELLA,
]

# Minimum number of essential landmarks required for comparison
MIN_REQUIRED_LANDMARKS = 5 # e.g., Both eyes, nose tip, mouth corners

# --- Helper Functions ---

def calculate_distance(p1: Dict[str, float], p2: Dict[str, float]) -> float:
    """Calculate Euclidean distance between two 2D points represented as dictionaries."""
    # This function expects dictionaries like {'x': value, 'y': value}
    return math.sqrt((p1['x'] - p2['x'])**2 + (p1['y'] - p2['y'])**2)

def get_landmark_position(landmarks: List[Dict[str, Any]], landmark_type: vision.FaceAnnotation.Landmark.Type) -> Dict[str, float] | None:
    """Find the position of a specific landmark type."""
    for lm in landmarks:
        if lm['type_enum'] == landmark_type:
            return lm['position']
    return None

def normalize_landmarks(landmarks: List[Dict[str, Any]]) -> Tuple[Dict[vision.FaceAnnotation.Landmark.Type, Dict[str, float]], float] | Tuple[None, None]:
    """
    Normalize landmark positions relative to eye distance and center.
    Returns a dictionary mapping landmark enum to normalized positions, and the inter-eye distance,
    or (None, None) if eyes not found.
    """
    left_eye = get_landmark_position(landmarks, vision.FaceAnnotation.Landmark.Type.LEFT_EYE)
    right_eye = get_landmark_position(landmarks, vision.FaceAnnotation.Landmark.Type.RIGHT_EYE)

    if not left_eye or not right_eye:
        logger.warning("Could not find both eye landmarks for normalization.")
        return None, None

    inter_eye_distance = calculate_distance(left_eye, right_eye)
    if inter_eye_distance < 1e-6: # Avoid division by zero
        logger.warning("Inter-eye distance is too small for normalization.")
        return None, None

    eye_center_x = (left_eye['x'] + right_eye['x']) / 2
    eye_center_y = (left_eye['y'] + right_eye['y']) / 2

    normalized = {}
    for lm in landmarks:
        pos = lm['position']
        norm_x = (pos['x'] - eye_center_x) / inter_eye_distance
        norm_y = (pos['y'] - eye_center_y) / inter_eye_distance
        # Keep z for potential future 3D comparisons, but normalize based on 2D eye distance
        normalized[lm['type_enum']] = {'x': norm_x, 'y': norm_y, 'z': pos['z']} # Map enum to position dict

    return normalized, inter_eye_distance


# --- Core Functions ---

def detect_faces(image_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Detect faces in an image using Google Cloud Vision API, extracting detailed landmark info.

    Args:
        image_bytes: Raw image bytes

    Returns:
        List of detected face features including semantic landmark types.
    """
    if not vision_client:
         logger.error("Vision client not initialized. Cannot detect faces.")
         return []
    try:
        image = vision.Image(content=image_bytes)
        response = vision_client.face_detection(image=image)
        faces = response.face_annotations

        if response.error.message:
             logger.error(f"Vision API error: {response.error.message}")
             # Consider raising an exception or returning specific error info
             return []

        if not faces:
            logger.info("No faces detected in the image") # Use info level for no faces
            return []

        face_data = []
        for face in faces:
            landmarks_list = []
            for landmark in face.landmarks:
                landmarks_list.append({
                    "type_name": landmark.type_.name,
                    "type_enum": landmark.type_,
                    "position": {
                        "x": landmark.position.x,
                        "y": landmark.position.y,
                        "z": landmark.position.z
                    }
                })

            # Store bounding poly vertices as simple dicts for easier processing later
            bounding_poly_vertices = [{"x": vertex.x, "y": vertex.y} for vertex in face.bounding_poly.vertices]

            face_info = {
                "bounding_poly": bounding_poly_vertices, # Store the list of dicts
                "landmarks": landmarks_list,
                "detection_confidence": face.detection_confidence,
                "roll_angle": face.roll_angle,
                "pan_angle": face.pan_angle,
                "tilt_angle": face.tilt_angle,
                "joy_likelihood": face.joy_likelihood.name,
                "sorrow_likelihood": face.sorrow_likelihood.name,
                "anger_likelihood": face.anger_likelihood.name,
                "surprise_likelihood": face.surprise_likelihood.name,
                "under_exposed_likelihood": face.under_exposed_likelihood.name,
                "blurred_likelihood": face.blurred_likelihood.name,
                "headwear_likelihood": face.headwear_likelihood.name,
                # Initialize area/width/height
                "area": 0.0,
                "width": 0.0,
                "height": 0.0
            }

            # Calculate area and dimensions if bounding poly is valid
            vertices = face.bounding_poly.vertices # Get the original Vertex objects for calculation
            if len(vertices) == 4:
                 try:
                    # Using Shoelace formula for polygon area
                    area = 0.5 * abs(vertices[0].x * vertices[1].y + vertices[1].x * vertices[2].y + vertices[2].x * vertices[3].y + vertices[3].x * vertices[0].y - \
                                    (vertices[1].x * vertices[0].y + vertices[2].x * vertices[1].y + vertices[3].x * vertices[2].y + vertices[0].x * vertices[3].y))
                    face_info["area"] = area

                    # ***** FIX HERE *****
                    # Convert Vertex objects to dictionaries before passing to calculate_distance
                    v0_dict = {'x': vertices[0].x, 'y': vertices[0].y}
                    v1_dict = {'x': vertices[1].x, 'y': vertices[1].y}
                    # v2_dict = {'x': vertices[2].x, 'y': vertices[2].y} # Not needed for width/height approx
                    v3_dict = {'x': vertices[3].x, 'y': vertices[3].y}

                    # Approx width (distance between vertex 0 and 1)
                    width = calculate_distance(v0_dict, v1_dict)
                    # Approx height (distance between vertex 0 and 3)
                    height = calculate_distance(v0_dict, v3_dict)

                    face_info["width"] = width
                    face_info["height"] = height
                 except AttributeError as e:
                     logger.warning(f"Could not calculate area/dimensions for a face, missing attributes? Error: {e}")
                 except Exception as e: # Catch other potential errors during calculation
                     logger.warning(f"Error calculating face area/dimensions: {e}")
            else:
                 logger.warning(f"Detected face bounding polygon does not have 4 vertices ({len(vertices)} found). Cannot calculate area/dimensions accurately.")

            face_data.append(face_info)

        return face_data

    except Exception as e:
        # Log the full traceback for unexpected errors
        logger.error(f"Error detecting faces: {str(e)}", exc_info=True)
        return []


def compare_face_features(live_face: Dict[str, Any], id_face: Dict[str, Any]) -> Tuple[bool, float, Dict[str, Any]]:
    """
    Compare facial features using normalized geometric landmark positions.

    Args:
        live_face: Face data assumed to be from the live person.
        id_face: Face data assumed to be from the ID card.

    Returns:
        Tuple of (match_result, confidence_score, debug_info)
    """
    debug_info = {
        "live_detection_confidence": live_face.get('detection_confidence', 0),
        "id_detection_confidence": id_face.get('detection_confidence', 0),
        "live_landmarks_count": len(live_face.get('landmarks', [])),
        "id_landmarks_count": len(id_face.get('landmarks', [])),
        "required_landmarks": MIN_REQUIRED_LANDMARKS,
        "geometric_comparison": {}
    }

    # --- Initial Checks ---
    if not live_face or not id_face:
         debug_info["error"] = "Missing live or ID face data."
         return False, 0.0, debug_info

    live_landmarks = live_face.get('landmarks', [])
    id_landmarks = id_face.get('landmarks', [])

    if not live_landmarks or not id_landmarks:
        debug_info["error"] = "Landmarks missing from one or both faces."
        return False, 0.0, debug_info

    # --- Normalization ---
    norm_live_landmarks, live_eye_dist = normalize_landmarks(live_landmarks)
    norm_id_landmarks, id_eye_dist = normalize_landmarks(id_landmarks)

    if not norm_live_landmarks or not norm_id_landmarks:
        debug_info["error"] = "Normalization failed (likely missing eye landmarks)."
        base_confidence = math.sqrt(live_face.get('detection_confidence', 0) * id_face.get('detection_confidence', 0))
        return False, base_confidence * 0.3, debug_info # Low confidence if geometry fails

    debug_info["live_inter_eye_distance"] = live_eye_dist
    debug_info["id_inter_eye_distance"] = id_eye_dist

    # --- Geometric Comparison ---
    comparison_results = []
    total_distance = 0.0
    landmarks_compared = 0

    common_landmark_types = set(norm_live_landmarks.keys()) & set(norm_id_landmarks.keys())
    target_comparison_types = [lm_type for lm_type in ESSENTIAL_LANDMARK_TYPES if lm_type in common_landmark_types]

    debug_info["geometric_comparison"]["common_essential_landmarks"] = [lm.name for lm in target_comparison_types]

    if len(target_comparison_types) < MIN_REQUIRED_LANDMARKS:
        debug_info["error"] = f"Insufficient common essential landmarks found ({len(target_comparison_types)}/{MIN_REQUIRED_LANDMARKS}). Cannot perform reliable geometric comparison."
        base_confidence = math.sqrt(live_face.get('detection_confidence', 0) * id_face.get('detection_confidence', 0))
        return False, base_confidence * 0.4, debug_info # Slightly higher confidence than normalization failure

    for lm_type in target_comparison_types:
        if lm_type == vision.FaceAnnotation.Landmark.Type.LEFT_EYE or lm_type == vision.FaceAnnotation.Landmark.Type.RIGHT_EYE:
            continue # Skip eyes used for normalization

        live_lm_norm = norm_live_landmarks.get(lm_type)
        id_lm_norm = norm_id_landmarks.get(lm_type)

        # Check if landmark exists in both normalized sets (should always be true here due to common_landmark_types logic, but safe check)
        if live_lm_norm and id_lm_norm:
            try:
                distance = calculate_distance(live_lm_norm, id_lm_norm)
                total_distance += distance
                landmarks_compared += 1
                comparison_results.append({
                    "type": lm_type.name,
                    "normalized_live_pos": {"x": live_lm_norm['x'], "y": live_lm_norm['y']},
                    "normalized_id_pos": {"x": id_lm_norm['x'], "y": id_lm_norm['y']},
                    "normalized_distance": distance
                })
            except KeyError as e:
                 logger.warning(f"KeyError accessing normalized landmark positions for {lm_type.name}: {e}. Skipping this landmark.")
                 debug_info["geometric_comparison"].setdefault("skipped_landmarks", []).append(lm_type.name)
            except Exception as e:
                 logger.error(f"Unexpected error comparing landmark {lm_type.name}: {e}", exc_info=True)
                 debug_info["geometric_comparison"].setdefault("comparison_errors", []).append(lm_type.name)


    debug_info["geometric_comparison"]["details"] = comparison_results
    debug_info["geometric_comparison"]["landmarks_used_in_score"] = landmarks_compared

    if landmarks_compared < max(1, MIN_REQUIRED_LANDMARKS - 2): # Require at least a few non-eye landmarks
         debug_info["error"] = f"Insufficient non-eye landmarks available or comparable for geometric score ({landmarks_compared})."
         base_confidence = math.sqrt(live_face.get('detection_confidence', 0) * id_face.get('detection_confidence', 0))
         return False, base_confidence * 0.4, debug_info

    # --- Calculate Geometric Similarity Score ---
    average_distance = total_distance / landmarks_compared
    # Adjust the scaling factor (e.g., 5.0) based on typical distances observed during testing.
    # This factor significantly impacts sensitivity. Higher values make it more sensitive to small distances.
    GEOMETRIC_DISTANCE_SENSITIVITY = 5.0
    geometric_similarity = math.exp(-GEOMETRIC_DISTANCE_SENSITIVITY * average_distance)

    debug_info["geometric_comparison"]["average_normalized_distance"] = average_distance
    debug_info["geometric_comparison"]["geometric_similarity_score"] = geometric_similarity

    # --- Final Confidence Calculation ---
    detection_confidence_factor = math.sqrt(live_face.get('detection_confidence', 0) * id_face.get('detection_confidence', 0))
    # Weight geometric similarity higher (e.g., 70%)
    final_confidence = (geometric_similarity * 0.7) + (detection_confidence_factor * 0.3)
    final_confidence = max(0.0, min(1.0, final_confidence)) # Clamp between 0 and 1

    debug_info["detection_confidence_factor"] = detection_confidence_factor
    debug_info["final_confidence"] = final_confidence

    # --- Decision ---
    match_threshold = 0.70  # Tune this threshold based on test data
    match_result = final_confidence > match_threshold

    debug_info["match_threshold"] = match_threshold
    debug_info["match_result"] = match_result

    return match_result, final_confidence, debug_info


def process_verification_image(base64_image: str) -> Dict[str, Any]:
    """
    Process the verification image to verify identity with enhanced security.

    Args:
        base64_image: Base64 encoded image containing live face and ID face.

    Returns:
        Dictionary with verification results.
    """
    try:
        # --- Image Decoding ---
        if ',' in base64_image:
            try:
                 # Handle potential prefix like 'data:image/jpeg;base64,'
                 header, image_data = base64_image.split(',', 1)
            except ValueError:
                 # Handle case where there's no comma but maybe a prefix
                 if base64_image.startswith("data:"):
                      return {"verified": False, "confidence": 0.0, "message": "Invalid base64 header format.", "debug_info": {"error": "Malformed base64 data URI"}}
                 else: # Assume it's just the data part
                      image_data = base64_image
        else:
            image_data = base64_image

        try:
            # Validate padding and decode
            image_bytes = base64.b64decode(image_data, validate=True)
        except base64.binascii.Error as decode_error:
             logger.error(f"Invalid base64 string: {decode_error}")
             return {
                "verified": False, "confidence": 0.0,
                "message": "Invalid image data format (bad base64 string).",
                "debug_info": {"error": f"Base64 decoding failed: {decode_error}"}
            }
        except ValueError as e: # Catch other potential base64 errors if validate=True isn't enough
             logger.error(f"Value error during base64 decoding: {e}")
             return {"verified": False, "confidence": 0.0, "message": "Invalid image data.", "debug_info": {"error": f"Base64 value error: {e}"}}


        # --- Face Detection ---
        all_faces = detect_faces(image_bytes)
        debug_info = {"total_faces_detected": len(all_faces)}

        if not all_faces:
            return {
                "verified": False, "confidence": 0.0,
                "message": "No faces detected. Ensure the image is clear and shows both your face and ID.",
                "debug_info": debug_info
            }

        # --- Face Count Check ---
        if len(all_faces) != 2:
            message = f"Detected {len(all_faces)} faces. Please provide an image with exactly one person and their ID card clearly visible."
            if len(all_faces) == 1:
                 message = "Only one face detected. Please ensure both your face and the face on the ID card are clearly visible."
            return {
                "verified": False, "confidence": 0.0,
                "message": message, "debug_info": debug_info
            }

        # --- Face Assignment and Validation (Live vs. ID) ---
        # Filter out faces with very low area if area calculation was successful
        valid_faces = [f for f in all_faces if f.get("area", -1) > 1e-6] # Use a small threshold to check if area was calculated
        if len(valid_faces) != 2:
            # If filtering removed faces, fall back to using all detected faces for sorting,
            # but add a warning. Use original list if filtering failed.
            logger.warning(f"Found {len(all_faces)} faces, but only {len(valid_faces)} had valid calculated areas. Proceeding with original list for sorting, but assignment may be less reliable.")
            faces_to_sort = all_faces
            debug_info["warning"] = "Area calculation failed for one or more faces, size comparison might be unreliable."
        else:
            faces_to_sort = valid_faces


        # Sort by area, largest first
        # Add a fallback sort key (e.g., detection confidence) in case areas are identical or zero
        sorted_faces = sorted(faces_to_sort, key=lambda x: (x.get("area", 0), x.get("detection_confidence", 0)), reverse=True)

        face1 = sorted_faces[0]
        face2 = sorted_faces[1]

        debug_info["face_sizes"] = [
            {"face_index": all_faces.index(face1), "area": face1.get("area"), "detection_confidence": face1.get("detection_confidence")},
            {"face_index": all_faces.index(face2), "area": face2.get("area"), "detection_confidence": face2.get("detection_confidence")}
        ]

        live_face, id_face = None, None
        size_ratio = 0.0
        ASSIGNMENT_SIZE_RATIO_THRESHOLD = 0.6 # ID area should be < 60% of live face area

        # Check if area calculation was successful for both faces
        area1 = face1.get("area", 0)
        area2 = face2.get("area", 0)

        if area1 > 1e-6 and area2 > 1e-6: # Only perform ratio check if areas are valid
            size_ratio = area2 / area1 # Ratio of smaller area to larger area
            debug_info["face_size_ratio (smaller/larger)"] = size_ratio

            if size_ratio < ASSIGNMENT_SIZE_RATIO_THRESHOLD:
                live_face, id_face = face1, face2
                debug_info["assignment_note"] = f"Assigned larger face (area {area1:.2f}) as live, smaller (area {area2:.2f}) as ID based on size ratio < {ASSIGNMENT_SIZE_RATIO_THRESHOLD}."
            else:
                # Faces are too similar in size based on area.
                 debug_info["assignment_note"] = f"Faces are too similar in size (ratio {size_ratio:.2f} >= {ASSIGNMENT_SIZE_RATIO_THRESHOLD}). Cannot reliably assign live vs ID based on size alone."
                 # In this case, we might rely more on other factors or fail, but let's proceed cautiously for now
                 # Default assignment (larger=live) but maybe lower confidence later? For now, just log.
                 live_face, id_face = face1, face2 # Keep default assignment
                 debug_info["warning"] = "Face size similarity detected. Verification result might be less certain."
                 # Or, uncomment below to fail immediately if sizes are too similar:
                 # return {
                 #     "verified": False, "confidence": 0.0,
                 #     "message": "Faces detected are too similar in size. Ensure one face is clearly you and the other is on your ID card.",
                 #     "debug_info": debug_info
                 # }

        else:
            # Area calculation failed for at least one face, cannot use size ratio reliably
            debug_info["warning"] = "Could not reliably use face area for assignment. Assigning based on detection order (largest bounding box first)."
            live_face, id_face = face1, face2 # Default assignment
            debug_info["assignment_note"] = "Assigned based on sorting order (likely largest area first) due to missing area data."


        debug_info["assigned_live_face_index"] = all_faces.index(live_face) if live_face in all_faces else -1
        debug_info["assigned_id_face_index"] = all_faces.index(id_face) if id_face in all_faces else -1


        # --- Face Comparison ---
        match_result, confidence, comparison_debug = compare_face_features(live_face, id_face)
        debug_info["comparison"] = comparison_debug

        # --- Prepare Final Result ---
        if match_result:
            message = "Face verification successful."
        else:
            # Provide more specific feedback based on failure reason
            fail_reason = comparison_debug.get("error", "")
            if "Insufficient common essential landmarks" in fail_reason:
                message = "Face verification failed: Could not detect enough matching facial features. Ensure both faces are clear and well-lit."
            elif "Normalization failed" in fail_reason:
                 message = "Face verification failed: Could not properly analyze facial landmarks (possibly missing eyes). Please try again with a clearer image."
            elif "Insufficient non-eye landmarks" in fail_reason:
                 message = "Face verification failed: Not enough comparable facial features found after alignment. Please ensure faces are clear."
            elif confidence < 0.5: # Low confidence even if threshold wasn't met technically
                 message = "Face verification failed: Low confidence match. Ensure the image is clear, well-lit, and shows your face and ID card clearly."
            else: # Generic failure
                 message = "Face verification failed: Faces do not appear to match sufficiently. Please try again."

        return {
            "verified": match_result,
            "confidence": confidence,
            "message": message,
            "debug_info": debug_info
        }

    except Exception as e:
        logger.error(f"Critical error in verification image processing: {str(e)}", exc_info=True)
        return {
            "verified": False,
            "confidence": 0.0,
            "message": f"An unexpected server error occurred during processing.", # Avoid exposing internal error details to client
            "debug_info": {"error": f"Unhandled exception: {type(e).__name__}", "details": str(e)}
        }

# Example Usage (rest of the script remains the same)
if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    # Example placeholder or file loading logic...
    example_base64_image = "data:image/jpeg;base64,/9j/4AAQSkZJRgA..." # Placeholder

    if "..." in example_base64_image or not example_base64_image:
         logger.warning("Using placeholder base64 image data or empty string.")
         # Attempt to load from file
         test_image_path = "test_image_with_id.jpg" # Make sure this file exists
         try:
             with open(test_image_path, "rb") as f:
                 image_bytes = f.read()
                 # Ensure correct base64 encoding with NO data URI prefix for this part
                 example_base64_image_data = base64.b64encode(image_bytes).decode('utf-8')
                 # Add prefix back if needed by process_verification_image, or modify process_verification_image to handle both cases
                 example_base64_image = f"data:image/jpeg;base64,{example_base64_image_data}"
                 logger.info(f"Loaded '{test_image_path}' for testing.")
         except FileNotFoundError:
             logger.error(f"Placeholder data used and test image '{test_image_path}' not found. Cannot run example.")
             example_base64_image = None # Ensure it's None if loading fails
         except Exception as e:
             logger.error(f"Error loading test image '{test_image_path}': {e}")
             example_base64_image = None # Ensure it's None if loading fails


    if vision_client and example_base64_image:
        result = process_verification_image(example_base64_image)
        import json
        # Use default=str to handle potential non-serializable types like enums if they sneak through
        print(json.dumps(result, indent=2, default=str))
    elif not vision_client:
        print("Vision client not available. Cannot run example.")
    else:
        print("No valid image data available. Cannot run example.")