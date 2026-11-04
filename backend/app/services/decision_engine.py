import os
import cv2
import numpy as np
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
from typing import Dict, Any, Optional

from app.config import settings, FACES_DIR, PLATES_DIR, ANOMALIES_DIR
from app.services.face_recognizer import face_recognizer
from app.services.plate_ocr import plate_ocr
from app.database import (
    get_vehicle_by_plate,
    record_vehicle_visit,
    save_driver_baseline_profile,
    get_vehicle_baseline_embeddings,
    insert_parking_log
)

class ParkingDecisionEngine:
    def __init__(self):
        self.threshold = settings.COSINE_SIMILARITY_THRESHOLD
        self.min_visits = settings.MIN_VISIT_THRESHOLD

    def _generate_synthetic_evidence_image(
        self,
        plate_str: str,
        driver_label: str,
        is_anomaly: bool,
        similarity: Optional[float]
    ) -> str:
        """
        Generates a realistic high-resolution forensic snapshot
        with computer vision annotations, bounding boxes, and timestamp.
        """
        width, height = 800, 500
        # Dark tech background
        img = Image.new("RGB", (width, height), color=(15, 23, 42))
        draw = ImageDraw.Draw(img)

        # Header bar
        header_color = (220, 38, 38) if is_anomaly else (16, 185, 129)
        draw.rectangle([(0, 0), (width, 50)], fill=header_color)
        
        status_text = "SECURITY ALERT: INDIKASI ANOMALI PENGEMUDI" if is_anomaly else "STATUS NORMAL: PENGEMUDI TERVERIFIKASI"
        draw.text((20, 15), status_text, fill=(255, 255, 255))
        draw.text((600, 15), datetime.now().strftime("%Y-%m-%d %H:%M:%S"), fill=(255, 255, 255))

        # Camera 1 (Plate) View Mockup
        draw.rectangle([(40, 70), (380, 430)], outline=(56, 189, 248), width=2)
        draw.text((50, 80), "[CAM 01 - ANPR GATE]", fill=(56, 189, 248))
        # Draw vehicle license plate card
        draw.rectangle([(70, 200), (350, 290)], fill=(0, 0, 0), outline=(255, 255, 255), width=3)
        draw.text((120, 230), plate_str, fill=(255, 255, 255))

        # Camera 2 (Driver Face) View Mockup
        box_color = (239, 68, 68) if is_anomaly else (34, 197, 94)
        draw.rectangle([(420, 70), (760, 430)], outline=box_color, width=2)
        cam_label = "[CAM 02 - HI-RES BIOMETRIC (TRIGGERED)]" if is_anomaly else "[CAM 02 - DRIVER FACE VIEW]"
        draw.text((430, 80), cam_label, fill=box_color)

        # Face circle & avatar outline
        draw.ellipse([(520, 150), (660, 290)], outline=box_color, width=3)
        driver_caption = f"IDENTITY: {driver_label.upper()}"
        draw.text((490, 310), driver_caption, fill=(255, 255, 255))

        if similarity is not None:
            sim_str = f"ArcFace Similarity: {similarity * 100:.1f}% (Threshold: {self.threshold * 100:.0f}%)"
            draw.text((440, 340), sim_str, fill=(254, 240, 138))

        # Save to storage
        filename = f"{'ANOMALY' if is_anomaly else 'RECORD'}_{plate_str.replace(' ', '_')}_{int(datetime.now().timestamp())}.jpg"
        save_dir = ANOMALIES_DIR if is_anomaly else FACES_DIR
        out_path = str(save_dir / filename)
        img.save(out_path, quality=90)
        return filename

    def process_transaction(
        self,
        plate_input: str,
        event_type: str = "EXIT",
        driver_persona: str = "driver_owner"
    ) -> Dict[str, Any]:
        """
        Executes the exact workflow from William's flowchart:
        1. Plate detection (OCR)
        2. Driver face detection (SCRFD + ArcFace)
        3. Check visit history >= 3 times?
        4. If < 3: Normal (register face to baseline)
        5. If >= 3: Match face against history
           - Match >= threshold: Normal -> Gate Open
           - Match < threshold: Anomaly -> Trigger Hi-Res Camera -> Gate Locked
        """
        # Step 1: Plate OCR
        clean_plate, plate_meta = plate_ocr.process_plate_image(np.zeros((100, 100, 3)), plate_input)

        # Step 2: Extract current driver embedding
        current_embedding, face_meta = face_recognizer.extract_face_embedding(
            np.zeros((100, 100, 3)), person_id_hint=driver_persona
        )

        # Record visit in database
        visit_record = record_vehicle_visit(clean_plate)
        vehicle_id = visit_record["id"]
        total_visits = visit_record["total_visits"]

        # Step 3: Check visit rule (>= 3 visits?)
        meets_criteria = (total_visits >= self.min_visits)
        
        status = "NORMAL"
        similarity_score = None
        gate_action = "OPEN"
        high_res_triggered = False
        decision_notes = ""
        baseline_photo_url = None

        if not meets_criteria:
            # Condition: Belum 3 kali kunjungan
            status = "NORMAL"
            gate_action = "OPEN"
            high_res_triggered = False
            decision_notes = (
                f"Kunjungan ke-{total_visits} (belum memenuhi batas minimal {self.min_visits} kali). "
                f"Sistem mendaftarkan biometrik wajah ke dalam klaster baseline pemilik sah."
            )
            # Save this face as baseline profile
            photo_file = self._generate_synthetic_evidence_image(clean_plate, driver_persona, False, None)
            save_driver_baseline_profile(
                vehicle_id=vehicle_id,
                embedding=current_embedding,
                photo_path=f"/storage/faces/{photo_file}",
                driver_name=f"Pengemudi Kunjungan #{total_visits}"
            )
            face_photo_url = f"/storage/faces/{photo_file}"
            anomaly_evidence_url = None

        else:
            # Condition: Sudah memenuhi 3 kali kunjungan -> Pencocokan Wajah
            baseline_profiles = get_vehicle_baseline_embeddings(vehicle_id)
            
            if not baseline_profiles:
                # Edge-case safety: If for any reason no profile was stored earlier
                save_driver_baseline_profile(
                    vehicle_id=vehicle_id,
                    embedding=current_embedding,
                    photo_path="",
                    driver_name="Pengemudi Pertama"
                )
                max_similarity = 1.0
            else:
                # Compute Cosine Similarity against all registered baseline driver profiles
                similarities = [
                    face_recognizer.compute_cosine_similarity(current_embedding, bp["embedding"])
                    for bp in baseline_profiles
                ]
                max_similarity = max(similarities) if similarities else 0.0
                best_baseline = baseline_profiles[similarities.index(max_similarity)]
                baseline_photo_url = best_baseline.get("sample_photo_path")

            similarity_score = round(float(max_similarity), 4)

            # Decision: Wajah Sesuai?
            if similarity_score >= self.threshold:
                # Wajah Sesuai
                status = "NORMAL"
                gate_action = "OPEN"
                high_res_triggered = False
                decision_notes = (
                    f"Wajah terverifikasi sesuai dengan profil riwayat kendaraan. "
                    f"Tingkat kemiripan ArcFace: {similarity_score * 100:.1f}% "
                    f"(Ambang batas: {self.threshold * 100:.0f}%). Kendaraan diizinkan keluar."
                )
                photo_file = self._generate_synthetic_evidence_image(
                    clean_plate, driver_persona, False, similarity_score
                )
                face_photo_url = f"/storage/faces/{photo_file}"
                anomaly_evidence_url = None
            else:
                # Wajah TIDAK Sesuai -> INDIKASI ANOMALI
                status = "ANOMALY"
                gate_action = "LOCK"
                high_res_triggered = True
                decision_notes = (
                    f"INDIKASI ANOMALI: Wajah pengemudi saat ini TIDAK SESUAI dengan profil riwayat! "
                    f"Kecocokan hanya {similarity_score * 100:.1f}% (di bawah ambang batas {self.threshold * 100:.0f}%). "
                    f"Kamera resolusi tinggi dipicu untuk merekam wajah dan kendaraan ditahan oleh palang keamanan."
                )
                evidence_file = self._generate_synthetic_evidence_image(
                    clean_plate, driver_persona, True, similarity_score
                )
                face_photo_url = f"/storage/anomalies/{evidence_file}"
                anomaly_evidence_url = f"/storage/anomalies/{evidence_file}"

        # Insert parking log into DB
        log_id = insert_parking_log(
            plate_number=clean_plate,
            event_type=event_type,
            visit_number=total_visits,
            status=status,
            similarity_score=similarity_score,
            decision_notes=decision_notes,
            plate_photo_path=None,
            face_photo_path=face_photo_url,
            anomaly_evidence_path=anomaly_evidence_url,
            high_res_triggered=high_res_triggered
        )

        return {
            "log_id": log_id,
            "plate_number": clean_plate,
            "event_type": event_type,
            "timestamp": datetime.now().isoformat(),
            "total_visits": total_visits,
            "meets_3_visits_criteria": meets_criteria,
            "status": status,
            "similarity_score": similarity_score,
            "similarity_percentage": round(similarity_score * 100, 1) if similarity_score is not None else None,
            "threshold": self.threshold,
            "decision_notes": decision_notes,
            "gate_action": gate_action,
            "high_res_camera_triggered": high_res_triggered,
            "face_photo_url": face_photo_url,
            "baseline_photo_url": baseline_photo_url,
            "anomaly_evidence_url": anomaly_evidence_url,
            "driver_persona": driver_persona
        }

decision_engine = ParkingDecisionEngine()
