import sys
import os
import cv2
import json
import logging
from face_detection import detectFace
from gaze_tracking import gaze_tracking
from object_detection import detectObject

# Hide YOLO logs
logging.getLogger("ultralytics").setLevel(logging.WARNING)

def process_snapshot(image_path):
    if not os.path.exists(image_path):
        return {"error": "Image path does not exist"}

    frame = cv2.imread(image_path)
    if frame is None:
        return {"error": "Failed to read image"}

    results = {
        "faceCount": 0,
        "gaze": "center",
        "detectedObjects": [],
        "personCount": 0,
        "violations": []
    }

    try:
        # 1. Face Detection & Annotation
        face_count, frame = detectFace(frame)
        results["faceCount"] = face_count
        
        # 2. Gaze Tracking
        gaze_res = gaze_tracking(frame)
        results["gaze"] = gaze_res.get("gaze", "center")

        # 3. Object Detection (Cell Phone, Book, Person)
        labels, frame, person_count, detected_obj_list = detectObject(frame)
        results["detectedObjects"] = list(set(detected_obj_list))
        results["personCount"] = person_count

        # 4. Logical Violations based on AI
        if face_count > 1 or person_count > 1:
            results["violations"].append("MULTIPLE_FACES")
        if face_count == 0:
            results["violations"].append("NO_FACE")
        if results["gaze"] in ["left", "right"]:
            results["violations"].append("SUSPICIOUS_GAZE")
        if "cell phone" in results["detectedObjects"]:
            results["violations"].append("CELL_PHONE_DETECTED")
        if "book" in results["detectedObjects"]:
            results["violations"].append("BOOK_DETECTED")

        # Save annotated image (overwrite original with annotations)
        # Or save to a separate 'processed' folder? 
        # Let's overwrite so the teacher dashboard shows the AI findings.
        cv2.imwrite(image_path, frame)

    except Exception as e:
        return {"error": str(e)}

    return results

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)

    image_path = sys.argv[1]
    output = process_snapshot(image_path)
    print(json.dumps(output))
