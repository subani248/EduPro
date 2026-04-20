import cv2
import numpy as np
from ultralytics import YOLO
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Initialize the YOLO model
model = None
try:
    # Use Nano model for faster loading and execution on average hardware
    model = YOLO("yolo11n.pt")  
except Exception as e:
    logging.error(f"Failed to load YOLO model: {e}")

# Confidence threshold (Lowered to 0.4 for better cell phone detection)
CONFIDENCE_THRESHOLD = 0.4

def detectObject(frame, confidence_threshold=CONFIDENCE_THRESHOLD, resize_width=640):
    """
    Perform object detection on a single frame, focusing on 'cell phone', 'book', and 'person'.
    """
    labels_this_frame = []
    detected_objects = []  # Track objects of interest
    person_count = 0

    if model is None:
        return labels_this_frame, frame, person_count, detected_objects


    # Validate input frame
    if frame is None or not isinstance(frame, np.ndarray):
        raise ValueError("Invalid frame. Please provide a valid numpy array.")

    # Resize the frame to improve processing speed
    height, width = frame.shape[:2]
    if width > resize_width:
        aspect_ratio = height / width
        frame = cv2.resize(frame, (resize_width, int(resize_width * aspect_ratio)))

    try:
        # Perform object detection
        results = model(frame)

        for result in results:
            for box in result.boxes.data.cpu().numpy():
                x1, y1, x2, y2, score, class_id = box

                if score > confidence_threshold:  # Apply confidence threshold
                    label = model.names[int(class_id)]
                    labels_this_frame.append((label, float(score)))

                    # Check for specific objects (cell phone, book, and person)
                    if label.lower() == "person":
                        person_count += 1
                        detected_objects.append("person")
                    elif label.lower() == "cell phone":
                        detected_objects.append("cell phone")
                    elif label.lower() == "book":
                        detected_objects.append("book")

                    # Draw bounding box
                    cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (255, 0, 0), 2)
                    cv2.putText(frame, f"{label} {score:.2f}", (int(x1), int(y1) - 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

    except Exception as e:
        logging.error(f"Error during object detection: {e}")
        # Return empty if failed
        return [], frame, 0, []

    return labels_this_frame, frame, person_count, detected_objects
