import cv2
import numpy as np
import logging

# Fallback mechanism for MediaPipe
USING_MEDIAPIPE = False
try:
    import mediapipe as mp
    if hasattr(mp, 'solutions'):
        mp_face_detection = mp.solutions.face_detection
        mp_drawing = mp.solutions.drawing_utils
        mp_face_mesh = mp.solutions.face_mesh
        
        face_detection = mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5)
        face_mesh = mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5)
        USING_MEDIAPIPE = True
    else:
        logging.warning("MediaPipe solutions not available, falling back to OpenCV Haar Cascades.")
except ImportError:
    logging.warning("MediaPipe not installed, falling back to OpenCV Haar Cascades.")

# Load OpenCV Haar Cascades as fallback
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def detectFace(frame):
    """
    Detects faces using MediaPipe or OpenCV Haar Cascades as fallback.
    Returns: faceCount, annotated frame
    """
    if frame is None:
        return 0, frame
        
    faceCount = 0
    annotated_frame = frame.copy()

    if USING_MEDIAPIPE:
        try:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            detection_results = face_detection.process(rgb_frame)
            if detection_results.detections:
                faceCount = len(detection_results.detections)
                for detection in detection_results.detections:
                    mp_drawing.draw_detection(annotated_frame, detection)
            
            # Optional mesh
            mesh_results = face_mesh.process(rgb_frame)
            if mesh_results.multi_face_landmarks:
                for face_landmarks in mesh_results.multi_face_landmarks:
                    mp_drawing.draw_landmarks(
                        image=annotated_frame,
                        landmark_list=face_landmarks,
                        connections=mp_face_mesh.FACEMESH_TESSELATION,
                        landmark_drawing_spec=None,
                        connection_drawing_spec=mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=1, circle_radius=1)
                    )
            return faceCount, annotated_frame
        except Exception as e:
            logging.error(f"MediaPipe error: {e}")
            # Fall through to OpenCV if MediaPipe fails during process

    # OpenCV Fallback
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    faceCount = len(faces)
    for (x, y, w, h) in faces:
        cv2.rectangle(annotated_frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
    
    return faceCount, annotated_frame

