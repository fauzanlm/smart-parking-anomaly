import os
import cv2
import numpy as np
import base64
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
from typing import Dict, Any, Optional

from app.config import settings, FACES_DIR, PLATES_DIR, ANOMALIES_DIR
from app.services.face_recognizer import face_recognizer
from app.services.plate_ocr import plate_ocr
from app.database import (
    create_gate_in_session,
    get_active_session_by_plate,
    complete_gate_out_session,
    insert_parking_log
)

class ParkingDecisionEngine:
    def __init__(self):
        # 0.65 threshold for simulation, 0.45 threshold for real SFace webcam
        self.simulation_threshold = settings.COSINE_SIMILARITY_THRESHOLD # 0.65
        self.real_face_threshold = 0.45

    def _generate_synthetic_evidence_image(
        self,
        plate_str: str,
        gate_mode: str,
        driver_label: str,
        is_anomaly: bool,
        similarity: Optional[float] = None
    ) -> str:
        width, height = 800, 480
        img = Image.new("RGB", (width, height), color=(15, 23, 42))
        draw = ImageDraw.Draw(img)

        if gate_mode == "GATE_IN":
            header_color = (37, 99, 235) # Blue for Gate-In
            header_title = "POS GERBANG MASUK (GATE-IN) — TIKET PARKIR AKTIF TERCATAT"
        elif is_anomaly:
            header_color = (220, 38, 38) # Red for Anomaly
            header_title = "SECURITY ALERT: INDIKASI ANOMALI — WAJAH PENGEMUDI TIDAK SESUAI"
        else:
            header_color = (16, 185, 129) # Emerald for Normal Exit
            header_title = "POS GERBANG KELUAR (GATE-OUT) — VERIFIKASI WAJAH NORMAL (COCOK)"

        draw.rectangle([(0, 0), (width, 50)], fill=header_color)
        draw.text((20, 16), header_title, fill=(255, 255, 255))
        draw.text((620, 16), datetime.now().strftime("%Y-%m-%d %H:%M:%S"), fill=(255, 255, 255))

        # Camera 1 (Plate box)
        draw.rectangle([(40, 70), (380, 420)], outline=(56, 189, 248), width=2)
        draw.text((50, 80), f"[CAM 01 — ANPR {gate_mode}]", fill=(56, 189, 248))
        draw.rectangle([(70, 190), (350, 280)], fill=(0, 0, 0), outline=(255, 255, 255), width=3)
        draw.text((120, 225), plate_str, fill=(255, 255, 255))
        draw.text((80, 300), "DETEKSI PLAT: TESSERACT OCR + OTSU", fill=(148, 163, 184))

        # Camera 2 (Biometric box)
        box_color = (239, 68, 68) if is_anomaly else (34, 197, 94) if gate_mode == "GATE_OUT" else (59, 130, 246)
        draw.rectangle([(420, 70), (760, 420)], outline=box_color, width=2)
        cam_label = f"[CAM 02 — BIOMETRIC {gate_mode}]"
        draw.text((430, 80), cam_label, fill=box_color)

        draw.ellipse([(520, 140), (660, 280)], outline=box_color, width=3)
        driver_caption = f"IDENTITAS: {driver_label.upper()}"
        draw.text((480, 300), driver_caption, fill=(255, 255, 255))

        if similarity is not None:
            sim_str = f"ArcFace Similarity: {similarity * 100:.1f}% (Threshold: {self.simulation_threshold * 100:.0f}%)"
            draw.text((440, 335), sim_str, fill=(254, 240, 138))
        elif gate_mode == "GATE_IN":
            draw.text((450, 335), "Fitur Wajah Disimpan ke Sesi Masuk", fill=(147, 197, 253))

        prefix = "ANOMALY" if is_anomaly else ("ENTRY" if gate_mode == "GATE_IN" else "RECORD")
        filename = f"{prefix}_{plate_str.replace(' ', '_')}_{int(datetime.now().timestamp())}.jpg"
        save_dir = ANOMALIES_DIR if is_anomaly else FACES_DIR
        out_path = str(save_dir / filename)
        img.save(out_path, quality=90)
        return filename

    def _save_real_annotated_frame(
        self,
        frame: np.ndarray,
        plate_str: str,
        gate_mode: str,
        is_anomaly: bool,
        similarity: Optional[float],
        meta: dict
    ) -> str:
        """
        Draws professional security CCTV overlays on the real webcam capture.
        """
        annotated = frame.copy()
        h, w = annotated.shape[:2]
        
        if gate_mode == "GATE_IN":
            color = (255, 150, 0) # BGR: Blue/Cyan
        elif is_anomaly:
            color = (0, 0, 255) # Red
        else:
            color = (0, 255, 0) # Green

        # Bounding box
        if meta.get("face_detected") and "bbox" in meta:
            bx, by, bw, bh = meta["bbox"]
            cv2.rectangle(annotated, (bx, by), (bx + bw, by + bh), color, 3)
            label = f"{gate_mode}: {'ANOMALI' if is_anomaly else ('NORMAL' if gate_mode == 'GATE_OUT' else 'TERDAFTAR MASUK')}"
            cv2.rectangle(annotated, (bx, max(0, by - 28)), (bx + bw, by), color, -1)
            cv2.putText(annotated, label, (bx + 5, by - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
            
            for lx, ly in meta.get("landmarks", []):
                cv2.circle(annotated, (lx, ly), 3, (0, 255, 255), -1)

        # Header banner
        cv2.rectangle(annotated, (0, 0), (w, 45), (20, 20, 30), -1)
        header_text = f"CCTV {gate_mode} LIVE | PLAT: {plate_str} | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        cv2.putText(annotated, header_text, (15, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        # Bottom info bar
        cv2.rectangle(annotated, (0, h - 35), (w, h), (10, 10, 20), -1)
        if similarity is not None:
            score_text = f"ArcFace / SFace Cosine Sim: {(similarity * 100):.1f}% (Threshold: {self.real_face_threshold * 100:.0f}%)"
        else:
            score_text = f"Sesi Gerbang Masuk (GATE-IN) — Tiket Biometrik Disimpan"
        cv2.putText(annotated, score_text, (15, h - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

        prefix = "ANOMALY_WEBCAM" if is_anomaly else ("ENTRY_WEBCAM" if gate_mode == "GATE_IN" else "RECORD_WEBCAM")
        filename = f"{prefix}_{plate_str.replace(' ', '_')}_{int(datetime.now().timestamp())}.jpg"
        save_dir = ANOMALIES_DIR if is_anomaly else FACES_DIR
        out_path = str(save_dir / filename)
        cv2.imwrite(out_path, annotated)
        return filename

    # =========================================================
    # CORE PROCESSOR: GATE-IN (Kendaraan Masuk)
    # =========================================================
    def process_gate_in(
        self,
        clean_plate: str,
        embedding: list,
        driver_persona: str,
        photo_filename: str
    ) -> Dict[str, Any]:
        """
        Processes GATE-IN: stores face embedding, photo, and active session.
        """
        face_photo_url = f"/storage/faces/{photo_filename}"
        
        # Save session to database
        session = create_gate_in_session(
            plate_number=clean_plate,
            embedding=embedding,
            face_photo_path=face_photo_url,
            driver_persona=driver_persona,
            notes="Kendaraan terdaftar masuk di gerbang masuk (Gate-In)"
        )

        decision_notes = (
            f"[GATE-IN BERHASIL] Kendaraan plat {clean_plate} berhasil masuk. "
            f"Foto pengemudi dan vektor biometrik ArcFace (128-d) disimpan ke database sesi aktif. "
            f"Palang masuk terbuka."
        )

        log_id = insert_parking_log(
            session_id=session["session_id"],
            plate_number=clean_plate,
            gate_mode="GATE_IN",
            status="NORMAL",
            decision_notes=decision_notes,
            similarity_score=None,
            face_photo_path=face_photo_url,
            entry_photo_path=face_photo_url,
            high_res_triggered=False,
            driver_persona=driver_persona
        )

        return {
            "log_id": log_id,
            "session_id": session["session_id"],
            "plate_number": clean_plate,
            "gate_mode": "GATE_IN",
            "event_type": "ENTRY",
            "timestamp": datetime.now().isoformat(),
            "status": "NORMAL",
            "similarity_score": None,
            "similarity_percentage": None,
            "threshold": self.simulation_threshold,
            "decision_notes": decision_notes,
            "gate_action": "OPEN",
            "high_res_camera_triggered": False,
            "face_photo_url": face_photo_url,
            "entry_photo_url": face_photo_url,
            "exit_photo_url": None,
            "baseline_photo_url": face_photo_url,
            "anomaly_evidence_url": None,
            "driver_persona": driver_persona
        }

    # =========================================================
    # CORE PROCESSOR: GATE-OUT (Kendaraan Keluar - 1-to-1 Match)
    # =========================================================
    def process_gate_out(
        self,
        clean_plate: str,
        exit_embedding: list,
        driver_persona: str,
        exit_photo_filename: str,
        is_real_webcam: bool = False
    ) -> Dict[str, Any]:
        """
        Processes GATE-OUT: looks up active session, compares entry face vs exit face.
        """
        threshold = self.real_face_threshold if is_real_webcam else self.simulation_threshold
        active_session = get_active_session_by_plate(clean_plate)
        exit_photo_url = f"/storage/{'anomalies' if not active_session else 'faces'}/{exit_photo_filename}"

        if not active_session:
            # Anomaly: Vehicle trying to exit without valid Gate-In session!
            status = "ANOMALY"
            gate_action = "LOCK"
            high_res_triggered = True
            decision_notes = (
                f"[PERINGATAN ANOMALI GATE-OUT] Kendaraan plat {clean_plate} TIDAK MEMILIKI riwayat masuk "
                f"(Gate-In) yang aktif di database! Palang parkir otomatis dikunci."
            )
            evidence_url = exit_photo_url

            log_id = insert_parking_log(
                plate_number=clean_plate,
                gate_mode="GATE_OUT",
                status="ANOMALY",
                decision_notes=decision_notes,
                similarity_score=0.0,
                face_photo_path=exit_photo_url,
                entry_photo_path=None,
                anomaly_evidence_path=evidence_url,
                high_res_triggered=True,
                driver_persona=driver_persona
            )

            return {
                "log_id": log_id,
                "session_id": None,
                "plate_number": clean_plate,
                "gate_mode": "GATE_OUT",
                "event_type": "EXIT",
                "timestamp": datetime.now().isoformat(),
                "status": "ANOMALY",
                "similarity_score": 0.0,
                "similarity_percentage": 0.0,
                "threshold": threshold,
                "decision_notes": decision_notes,
                "gate_action": "LOCK",
                "high_res_camera_triggered": True,
                "face_photo_url": exit_photo_url,
                "entry_photo_url": None,
                "exit_photo_url": exit_photo_url,
                "baseline_photo_url": None,
                "anomaly_evidence_url": evidence_url,
                "driver_persona": driver_persona
            }

        # Compare exit face with entry face
        entry_embedding = active_session["entry_face_embedding"]
        entry_photo_url = active_session.get("entry_face_photo")
        similarity = face_recognizer.compute_cosine_similarity(exit_embedding, entry_embedding)
        similarity_score = round(float(similarity), 4)

        if similarity_score >= threshold:
            status = "NORMAL"
            gate_action = "OPEN"
            high_res_triggered = False
            decision_notes = (
                f"[VERIFIKASI GATE-OUT SUKSES] Wajah pengemudi keluar SESUAI dengan wajah saat masuk. "
                f"Tingkat Kemiripan ArcFace: {similarity_score * 100:.1f}% (Ambang Batas: {threshold * 100:.0f}%). "
                f"Palang gerbang keluar dibuka otomatis."
            )
            evidence_url = None
        else:
            status = "ANOMALY"
            gate_action = "LOCK"
            high_res_triggered = True
            decision_notes = (
                f"[PERINGATAN ANOMALI GATE-OUT] Wajah pengemudi keluar BERBEDA dengan pengemudi saat masuk! "
                f"Tingkat Kemiripan hanya {similarity_score * 100:.1f}% (di bawah ambang batas {threshold * 100:.0f}%). "
                f"Indikasi pencurian kendaraan atau penukaran pengemudi. Palang dikunci!"
            )
            evidence_url = exit_photo_url

        # Complete or block session in database
        complete_gate_out_session(
            session_id=active_session["id"],
            exit_face_photo=exit_photo_url,
            exit_similarity=similarity_score,
            exit_status=status,
            anomaly_evidence_path=evidence_url,
            notes=decision_notes
        )

        log_id = insert_parking_log(
            session_id=active_session["id"],
            plate_number=clean_plate,
            gate_mode="GATE_OUT",
            status=status,
            decision_notes=decision_notes,
            similarity_score=similarity_score,
            face_photo_path=exit_photo_url,
            entry_photo_path=entry_photo_url,
            anomaly_evidence_path=evidence_url,
            high_res_triggered=high_res_triggered,
            driver_persona=driver_persona
        )

        return {
            "log_id": log_id,
            "session_id": active_session["id"],
            "plate_number": clean_plate,
            "gate_mode": "GATE_OUT",
            "event_type": "EXIT",
            "timestamp": datetime.now().isoformat(),
            "status": status,
            "similarity_score": similarity_score,
            "similarity_percentage": round(similarity_score * 100, 1),
            "threshold": threshold,
            "decision_notes": decision_notes,
            "gate_action": gate_action,
            "high_res_camera_triggered": high_res_triggered,
            "face_photo_url": exit_photo_url,
            "entry_photo_url": entry_photo_url,
            "exit_photo_url": exit_photo_url,
            "baseline_photo_url": entry_photo_url,
            "anomaly_evidence_url": evidence_url,
            "driver_persona": driver_persona
        }

    # =========================================================
    # PUBLIC DISPATCHERS
    # =========================================================

    def process_transaction(
        self,
        plate_input: str,
        gate_mode: str = "GATE_OUT",
        event_type: str = "EXIT",
        driver_persona: str = "driver_owner"
    ) -> Dict[str, Any]:
        """
        Dispatches simulation transaction for GATE_IN or GATE_OUT.
        """
        clean_plate, _ = plate_ocr.process_plate_image(np.zeros((100, 100, 3)), plate_input)
        current_embedding, _ = face_recognizer.extract_face_embedding(
            np.zeros((100, 100, 3)), person_id_hint=driver_persona
        )

        # Normalize mode
        mode = gate_mode.upper() if gate_mode else ("GATE_IN" if event_type.upper() == "ENTRY" else "GATE_OUT")

        if mode == "GATE_IN":
            photo_file = self._generate_synthetic_evidence_image(
                clean_plate, "GATE_IN", driver_persona, False, None
            )
            return self.process_gate_in(
                clean_plate=clean_plate,
                embedding=current_embedding,
                driver_persona=driver_persona,
                photo_filename=photo_file
            )
        else:
            photo_file = self._generate_synthetic_evidence_image(
                clean_plate, "GATE_OUT", driver_persona, False, None
            )
            return self.process_gate_out(
                clean_plate=clean_plate,
                exit_embedding=current_embedding,
                driver_persona=driver_persona,
                exit_photo_filename=photo_file,
                is_real_webcam=False
            )

    def process_live_webcam(
        self,
        plate_input: str,
        image_base64: str,
        gate_mode: str = "GATE_OUT",
        event_type: str = "EXIT"
    ) -> Dict[str, Any]:
        """
        Processes real live webcam frame for GATE_IN or GATE_OUT.
        """
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        img_bytes = base64.b64decode(image_base64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            raise ValueError("Citra kamera tidak valid.")

        clean_plate, _ = plate_ocr.process_plate_image(np.zeros((10, 10, 3)), plate_input)
        current_embedding, meta, face_crop = face_recognizer.process_real_webcam_image(frame)

        mode = gate_mode.upper() if gate_mode else ("GATE_IN" if event_type.upper() == "ENTRY" else "GATE_OUT")

        if mode == "GATE_IN":
            photo_file = self._save_real_annotated_frame(
                frame=frame,
                plate_str=clean_plate,
                gate_mode="GATE_IN",
                is_anomaly=False,
                similarity=None,
                meta=meta
            )
            return self.process_gate_in(
                clean_plate=clean_plate,
                embedding=current_embedding,
                driver_persona="Webcam Live Masuk",
                photo_filename=photo_file
            )
        else:
            # First check if active session exists to know if anomaly
            active_session = get_active_session_by_plate(clean_plate)
            sim = None
            is_anomaly = True
            if active_session:
                sim = face_recognizer.compute_cosine_similarity(current_embedding, active_session["entry_face_embedding"])
                is_anomaly = (sim < self.real_face_threshold)

            photo_file = self._save_real_annotated_frame(
                frame=frame,
                plate_str=clean_plate,
                gate_mode="GATE_OUT",
                is_anomaly=is_anomaly,
                similarity=sim,
                meta=meta
            )
            return self.process_gate_out(
                clean_plate=clean_plate,
                exit_embedding=current_embedding,
                driver_persona="Webcam Live Keluar",
                exit_photo_filename=photo_file,
                is_real_webcam=True
            )

decision_engine = ParkingDecisionEngine()
