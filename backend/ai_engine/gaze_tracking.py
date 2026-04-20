import cv2
import numpy as np
import logging

# Safety check for MediaPipe
USING_MEDIAPIPE = False
try:
    import mediapipe as mp
    if hasattr(mp, 'solutions'):
        mp_face_mesh = mp.solutions.face_mesh
        face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)
        USING_MEDIAPIPE = True
    else:
        logging.warning("MediaPipe solutions not available for gaze tracking.")
except ImportError:
    logging.warning("MediaPipe not installed for gaze tracking.")

def gaze_tracking(frame):
    """Detect gaze direction (left, right, center)."""
    if not USING_MEDIAPIPE or frame is None:
        return {"gaze": "center"}

    try:
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(frame_rgb)

        if results.multi_face_landmarks:
            for landmarks in results.multi_face_landmarks:
                # Basic iris/eye tracking indices
                left_eye = [landmarks.landmark[33], landmarks.landmark[159]]  
                right_eye = [landmarks.landmark[362], landmarks.landmark[386]] 

                left_eye_center = np.mean([(p.x, p.y) for p in left_eye], axis=0)
                right_eye_center = np.mean([(p.x, p.y) for p in right_eye], axis=0)

                gaze_direction = "center"
                if left_eye_center[0] < 0.4:  
                    gaze_direction = "left"
                elif right_eye_center[0] > 0.6:  
                    gaze_direction = "right"

                return {"gaze": gaze_direction}
    except Exception as e:
        logging.error(f"Gaze tracking error: {e}")

    return {"gaze": "center"}

