import os
import cv2
import numpy as np
import base64
from datetime import datetime
from PIL import Image, ImageDraw
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
        self.threshold = settings.COSINE_SIMILARITY_THRESHOLD # 0.65 for sim, 0.45 for real SFace
        self.real_face_threshold = 0.45 # SFace official cosine threshold is ~0.36 to 0.45
        self.min_visits = settings.MIN_VISIT_THRESHOLD

    def _generate_synthetic_evidence_image(
        self,
        plate_str: str,
        driver_label: str,
        is_anomaly: bool,
        similarity: Optional[float]
    ) -> str:
        width, height = 800, 500
        img = Image.new("RGB", (width, height), color=(15, 23, 42))
        draw = ImageDraw.Draw(img)

        header_color = (220, 38, 38) if is_anomaly else (16, 185, 129)
        draw.rectangle([(0, 0), (width, 50)], fill=header_color)
        
        status_text = "SECURITY ALERT: INDIKASI ANOMALI PENGEMUDI" if is_anomaly else "STATUS NORMAL: PENGEMUDI TERVERIFIKASI"
        draw.text((20, 15), status_text, fill=(255, 255, 255))
        draw.text((600, 15), datetime.now().strftime("%Y-%m-%d %H:%M:%S"), fill=(255, 255, 255))

        draw.rectangle([(40, 70), (380, 430)], outline=(56, 189, 248), width=2)
        draw.text((50, 80), "[CAM 01 - ANPR GATE]", fill=(56, 189, 248))
        draw.rectangle([(70, 200), (350, 290)], fill=(0, 0, 0), outline=(255, 255, 255), width=3)
        draw.text((120, 230), plate_str, fill=(255, 255, 255))

        box_color = (239, 68, 68) if is_anomaly else (34, 197, 94)
        draw.rectangle([(420, 70), (760, 430)], outline=box_color, width=2)
        cam_label = "[CAM 02 - HI-RES BIOMETRIC (TRIGGERED)]" if is_anomaly else "[CAM 02 - DRIVER FACE VIEW]"
        draw.text((430, 80), cam_label, fill=box_color)

        draw.ellipse([(520, 150), (660, 290)], outline=box_color, width=3)
        driver_caption = f"IDENTITY: {driver_label.upper()}"
        draw.text((490, 310), driver_caption, fill=(255, 255, 255))

        if similarity is not None:
            sim_str = f"ArcFace Similarity: {similarity * 100:.1f}% (Threshold: {self.threshold * 100:.0f}%)"
            draw.text((440, 340), sim_str, fill=(254, 240, 138))

        filename = f"{'ANOMALY' if is_anomaly else 'RECORD'}_{plate_str.replace(' ', '_')}_{int(datetime.now().timestamp())}.jpg"
        save_dir = ANOMALIES_DIR if is_anomaly else FACES_DIR
        out_path = str(save_dir / filename)
        img.save(out_path, quality=90)
        return filename

    def _save_real_annotated_frame(
        self,
        frame: np.ndarray,
        plate_str: str,
        is_anomaly: bool,
        similarity: Optional[float],
        meta: dict
    ) -> str:
        """
        Draws professional security CCTV overlays on the real webcam capture
        and saves as digital forensic evidence.
        """
        annotated = frame.copy()
        h, w = annotated.shape[:2]
        color = (0, 0, 255) if is_anomaly else (0, 255, 0) # BGR
        
        # Bounding box
        if meta.get("face_detected") and "bbox" in meta:
            bx, by, bw, bh = meta["bbox"]
            cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), color, 3)
            # Tag label
            label = "ANOMALY DRIVER" if is_anomaly else "VERIFIED DRIVER"
            cv2.rectangle(annotated, (bx, max(0, by - 28)), (bx + bw, by), color, -1)
            cv2.putText(annotated, label, (bx + 5, by - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
            
            # Landmarks
            for lx, ly in meta.get("landmarks", []):
                cv2.circle(annotated, (lx, ly), 3, (0, 255, 255), -1)

        # Header banner
        banner_h = 45
        cv2.rectangle(annotated, (0, 0), (w, banner_h), (20, 20, 30), -1)
        header_text = f"CAM-02 LIVE WEBCAM | PLAT: {plate_str} | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        cv2.putText(annotated, header_text, (15, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        # Bottom info bar
        cv2.rectangle(annotated, (0, h - 35), (w, h), (10, 10, 20), -1)
        score_text = f"ArcFace / SFace Cosine Sim: {(similarity * 100):.1f}%" if similarity is not None else "Baseline Learning Phase"
        cv2.putText(annotated, score_text, (15, h - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

        filename = f"{'ANOMALY_WEBCAM' if is_anomaly else 'RECORD_WEBCAM'}_{plate_str.replace(' ', '_')}_{int(datetime.now().timestamp())}.jpg"
        save_dir = ANOMALIES_DIR if is_anomaly else FACES_DIR
        out_path = str(save_dir / filename)
        cv2.imwrite(out_path, annotated)
        return filename

    def process_live_webcam(
        self,
        plate_input: str,
        image_base64: str,
        event_type: str = "EXIT"
    ) -> Dict[str, Any]:
        """
        Processes real live frame captured from user's webcam.
        """
        # Decode base64 frame
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        img_bytes = base64.b64decode(image_base64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            raise ValueError("Citra kamera tidak valid.")

        clean_plate, _ = plate_ocr.process_plate_image(np.zeros((10, 10, 3)), plate_input)

        # Extract deep face embedding using real YuNet + SFace
        current_embedding, meta, face_crop = face_recognizer.process_real_webcam_image(frame)

        # Record visit in database
        visit_record = record_vehicle_visit(clean_plate)
        vehicle_id = visit_record["id"]
        total_visits = visit_record["total_visits"]
        meets_criteria = (total_visits >= self.min_visits)

        status = "NORMAL"
        similarity_score = None
        gate_action = "OPEN"
        high_res_triggered = False
        baseline_photo_url = None

        if not meets_criteria:
            # Belum 3 kali kunjungan -> Baseline phase
            status = "NORMAL"
            gate_action = "OPEN"
            high_res_triggered = False
            decision_notes = (
                f"Kunjungan ke-{total_visits} (Webcam Live). Citra wajah asli pengguna berhasil diekstraksi "
                f"dan disimpan ke dalam profil baseline pemilik kendaraan."
            )
            saved_filename = self._save_real_annotated_frame(frame, clean_plate, False, None, meta)
            face_photo_url = f"/storage/faces/{saved_filename}"
            save_driver_baseline_profile(
                vehicle_id=vehicle_id,
                embedding=current_embedding,
                photo_path=face_photo_url,
                driver_name=f"Wajah Webcam Kunjungan #{total_visits}"
            )
            anomaly_evidence_url = None

        else:
            # Sudah 3 kali kunjungan -> Real ArcFace Cosine Matching
            baseline_profiles = get_vehicle_baseline_embeddings(vehicle_id)
            if not baseline_profiles:
                max_similarity = 1.0
            else:
                similarities = [
                    face_recognizer.compute_cosine_similarity(current_embedding, bp["embedding"])
                    for bp in baseline_profiles
                ]
                max_similarity = max(similarities) if similarities else 0.0
                best_baseline = baseline_profiles[similarities.index(max_similarity)]
                baseline_photo_url = best_baseline.get("sample_photo_path")

            similarity_score = round(float(max_similarity), 4)
            # Use real face threshold (0.45)
            effective_threshold = self.real_face_threshold

            if similarity_score >= effective_threshold:
                status = "NORMAL"
                gate_action = "OPEN"
                high_res_triggered = False
                decision_notes = (
                    f"Wajah pengemudi terverifikasi ASLI & SESUAI via Webcam Live! "
                    f"Kemiripan: {similarity_score * 100:.1f}% (Ambang batas: {effective_threshold * 100:.0f}%). "
                    f"Akses keluar diberikan otomatis."
                )
                saved_filename = self._save_real_annotated_frame(frame, clean_plate, False, similarity_score, meta)
                face_photo_url = f"/storage/faces/{saved_filename}"
                anomaly_evidence_url = None
            else:
                status = "ANOMALY"
                gate_action = "LOCK"
                high_res_triggered = True
                decision_notes = (
                    f"INDIKASI ANOMALI (WEBCAM LIVE): Wajah di depan kamera TIDAK SESUAI dengan pemilik terdaftar! "
                    f"Kecocokan hanya {similarity_score * 100:.1f}% (di bawah ambang {effective_threshold * 100:.0f}%). "
                    f"Kamera resolusi tinggi merekam wajah dan gerbang dikunci!"
                )
                saved_filename = self._save_real_annotated_frame(frame, clean_plate, True, similarity_score, meta)
                face_photo_url = f"/storage/anomalies/{saved_filename}"
                anomaly_evidence_url = f"/storage/anomalies/{saved_filename}"

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
            "threshold": self.real_face_threshold,
            "decision_notes": decision_notes,
            "gate_action": gate_action,
            "high_res_camera_triggered": high_res_triggered,
            "face_photo_url": face_photo_url,
            "baseline_photo_url": baseline_photo_url,
            "anomaly_evidence_url": anomaly_evidence_url,
            "driver_persona": "Webcam Live Pengemudi"
        }

    def process_transaction(
        self,
        plate_input: str,
        event_type: str = "EXIT",
        driver_persona: str = "driver_owner"
    ) -> Dict[str, Any]:
        clean_plate, _ = plate_ocr.process_plate_image(np.zeros((100, 100, 3)), plate_input)
        current_embedding, _ = face_recognizer.extract_face_embedding(
            np.zeros((100, 100, 3)), person_id_hint=driver_persona
        )

        visit_record = record_vehicle_visit(clean_plate)
        vehicle_id = visit_record["id"]
        total_visits = visit_record["total_visits"]
        meets_criteria = (total_visits >= self.min_visits)
        
        status = "NORMAL"
        similarity_score = None
        gate_action = "OPEN"
        high_res_triggered = False
        baseline_photo_url = None

        if not meets_criteria:
            status = "NORMAL"
            gate_action = "OPEN"
            high_res_triggered = False
            decision_notes = (
                f"Kunjungan ke-{total_visits} (belum memenuhi batas minimal {self.min_visits} kali). "
                f"Sistem mendaftarkan biometrik wajah ke dalam klaster baseline pemilik sah."
            )
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
            baseline_profiles = get_vehicle_baseline_embeddings(vehicle_id)
            if not baseline_profiles:
                save_driver_baseline_profile(
                    vehicle_id=vehicle_id,
                    embedding=current_embedding,
                    photo_path="",
                    driver_name="Pengemudi Pertama"
                )
                max_similarity = 1.0
            else:
                similarities = [
                    face_recognizer.compute_cosine_similarity(current_embedding, bp["embedding"])
                    for bp in baseline_profiles
                ]
                max_similarity = max(similarities) if similarities else 0.0
                best_baseline = baseline_profiles[similarities.index(max_similarity)]
                baseline_photo_url = best_baseline.get("sample_photo_path")

            similarity_score = round(float(max_similarity), 4)

            if similarity_score >= self.threshold:
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
