import os
from pathlib import Path
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
        similarity: Optional[float] = None,
        camera_id: str = "CAM 02"
    ) -> str:
        width, height = 800, 480
        img = Image.new("RGB", (width, height), color=(15, 23, 42))
        draw = ImageDraw.Draw(img)

        if gate_mode == "GATE_IN":
            header_color = (37, 99, 235) # Blue for Gate-In
            header_title = f"{camera_id}: POS GERBANG MASUK (GATE-IN) — TIKET PARKIR AKTIF"
        elif is_anomaly:
            header_color = (220, 38, 38) # Red for Anomaly
            header_title = f"{camera_id}: [TRIGGERED] SECURITY ALERT — WAJAH PENGEMUDI TIDAK SESUAI"
        else:
            header_color = (16, 185, 129) # Emerald for Normal Exit
            header_title = f"{camera_id}: POS GERBANG KELUAR (GATE-OUT) — VERIFIKASI WAJAH SESUAI"

        draw.rectangle([(0, 0), (width, 50)], fill=header_color)
        draw.text((20, 16), header_title, fill=(255, 255, 255))
        draw.text((620, 16), datetime.now().strftime("%Y-%m-%d %H:%M:%S"), fill=(255, 255, 255))

        # Camera 1 (Plate box)
        draw.rectangle([(40, 70), (380, 420)], outline=(56, 189, 248), width=2)
        draw.text((50, 80), f"[CAM 01 — ANPR {gate_mode}]", fill=(56, 189, 248))
        draw.rectangle([(70, 190), (350, 280)], fill=(0, 0, 0), outline=(255, 255, 255), width=3)
        draw.text((120, 225), plate_str, fill=(255, 255, 255))
        draw.text((80, 300), "DETEKSI PLAT: YOLOv8 + TESSERACT OCR", fill=(148, 163, 184))

        # Camera 2 / Camera 3 (Biometric box)
        box_color = (239, 68, 68) if is_anomaly else (34, 197, 94) if gate_mode == "GATE_OUT" else (59, 130, 246)
        draw.rectangle([(420, 70), (760, 420)], outline=box_color, width=2)
        cam_label = f"[{camera_id} — {'HI-RES FORENSIC' if is_anomaly else 'DRIVER BIOMETRIC'}]"
        draw.text((430, 80), cam_label, fill=box_color)

        draw.ellipse([(520, 140), (660, 280)], outline=box_color, width=3)
        driver_caption = f"IDENTITAS: {driver_label.upper()}"
        draw.text((480, 300), driver_caption, fill=(255, 255, 255))

        if similarity is not None:
            sim_str = f"ArcFace Similarity: {similarity * 100:.1f}% (Threshold: {self.simulation_threshold * 100:.0f}%)"
            draw.text((440, 335), sim_str, fill=(254, 240, 138))
        elif gate_mode == "GATE_IN":
            draw.text((450, 335), "Fitur Wajah Disimpan ke Sesi Masuk", fill=(147, 197, 253))

        prefix = "ANOMALY_CAM3" if is_anomaly else ("ENTRY" if gate_mode == "GATE_IN" else "RECORD")
        filename = f"{prefix}_{plate_str.replace(' ', '_')}_{int(datetime.now().timestamp())}.jpg"
        save_dir = ANOMALIES_DIR if is_anomaly else FACES_DIR
        out_path = save_dir / filename
        out_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(str(out_path), quality=90)
        return filename

    @staticmethod
    def _safe_write_image(file_path: Path, img_bgr: np.ndarray) -> bool:
        """
        Safely writes an image to disk with parent directory creation and encoding fallback.
        Works 100% reliably on Windows, macOS, and Linux without path-separator or unicode bugs.
        """
        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            success, encoded_img = cv2.imencode(".jpg", img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 90])
            if success:
                with open(str(file_path), "wb") as f:
                    f.write(encoded_img)
                return True
            else:
                return bool(cv2.imwrite(str(file_path), img_bgr))
        except Exception as e:
            print(f"[ERROR] Failed to save image to {file_path}: {e}")
            return False

    @staticmethod
    def _resolve_photo_url(filename: Optional[str], default_subfolder: str = "faces") -> Optional[str]:
        """
        Determines the correct web URL for a stored photo by checking actual existence on disk.
        Prevents 404/broken image bugs between anomalies, faces, and plates directories.
        """
        if not filename:
            return None
        clean_name = Path(filename).name
        if (ANOMALIES_DIR / clean_name).exists():
            return f"/storage/anomalies/{clean_name}"
        elif (FACES_DIR / clean_name).exists():
            return f"/storage/faces/{clean_name}"
        elif (PLATES_DIR / clean_name).exists():
            return f"/storage/plates/{clean_name}"
        else:
            folder = "anomalies" if clean_name.startswith("ANOMALY") else default_subfolder
            return f"/storage/{folder}/{clean_name}"

    def _save_real_annotated_frame(
        self,
        frame: np.ndarray,
        plate_str: str,
        gate_mode: str,
        is_anomaly: bool,
        similarity: Optional[float],
        meta: dict,
        camera_label: str = "CAM 02"
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
            label = f"{camera_label}: {'ANOMALI' if is_anomaly else ('NORMAL' if gate_mode == 'GATE_OUT' else 'TERDAFTAR MASUK')}"
            cv2.rectangle(annotated, (bx, max(0, by - 28)), (bx + bw, by), color, -1)
            cv2.putText(annotated, label, (bx + 5, by - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
            
            for lx, ly in meta.get("landmarks", []):
                cv2.circle(annotated, (lx, ly), 3, (0, 255, 255), -1)

        # Header banner
        cv2.rectangle(annotated, (0, 0), (w, 45), (20, 20, 30), -1)
        header_text = f"{camera_label} LIVE | PLAT: {plate_str} | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        cv2.putText(annotated, header_text, (15, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        # Bottom info bar
        cv2.rectangle(annotated, (0, h - 35), (w, h), (10, 10, 20), -1)
        if similarity is not None:
            score_text = f"ArcFace / SFace Cosine Sim: {(similarity * 100):.1f}% (Threshold: {self.real_face_threshold * 100:.0f}%)"
        else:
            score_text = f"{camera_label} — Sesi Gerbang Masuk (GATE-IN) — Tiket Biometrik Disimpan"
        cv2.putText(annotated, score_text, (15, h - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

        prefix = "ANOMALY_WEBCAM" if is_anomaly else ("ENTRY_WEBCAM" if gate_mode == "GATE_IN" else "RECORD_WEBCAM")
        filename = f"{prefix}_{plate_str.replace(' ', '_')}_{int(datetime.now().timestamp())}.jpg"
        save_dir = ANOMALIES_DIR if is_anomaly else FACES_DIR
        out_path = save_dir / filename
        self._safe_write_image(out_path, annotated)
        return filename

    def _save_plate_frame(self, frame: np.ndarray, plate_str: str) -> str:
        """Saves Camera 1 ANPR plate photo to storage/plates/"""
        annotated = frame.copy()
        h, w = annotated.shape[:2]
        cv2.rectangle(annotated, (0, 0), (w, 35), (20, 20, 30), -1)
        cv2.putText(annotated, f"CAM 01 ● ANPR OCR | {plate_str}", (10, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        filename = f"PLATE_{plate_str.replace(' ', '_')}_{int(datetime.now().timestamp())}.jpg"
        out_path = PLATES_DIR / filename
        self._safe_write_image(out_path, annotated)
        return filename

    def _save_camera3_evidence(self, frame: np.ndarray, plate_str: str, similarity: Optional[float]) -> str:
        """Saves Camera 3 Hi-Res anomaly evidence photo when triggered"""
        annotated = frame.copy()
        h, w = annotated.shape[:2]
        cv2.rectangle(annotated, (0, 0), (w, 45), (0, 0, 180), -1)
        header = f"CAM 03 ● HI-RES BUKTI FORENSIK DIGITAL (TRIGGERED) | PLAT: {plate_str}"
        cv2.putText(annotated, header, (15, 28), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
        
        cv2.rectangle(annotated, (0, h - 35), (w, h), (10, 10, 20), -1)
        sim_str = f"Kecocokan: {similarity*100:.1f}%" if similarity is not None else "Tidak Terdaftar"
        footer = f"STATUS: ANOMALI PENGEMUDI ({sim_str}) | WAKTU: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        cv2.putText(annotated, footer, (15, h - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

        filename = f"ANOMALY_CAM3_TRIGGERED_{plate_str.replace(' ', '_')}_{int(datetime.now().timestamp())}.jpg"
        out_path = ANOMALIES_DIR / filename
        self._safe_write_image(out_path, annotated)
        return filename

    # =========================================================
    # CORE PROCESSOR: GATE-IN (Kendaraan Masuk)
    # Flowchart: Kamera 1 dan 2 mengambil gambar -> YOLOv8 OCR + SCRFD ArcFace -> Simpan
    # =========================================================
    def process_gate_in(
        self,
        clean_plate: str,
        embedding: list,
        driver_persona: str,
        photo_filename: str,
        plate_photo_filename: Optional[str] = None
    ) -> Dict[str, Any]:
        face_photo_url = self._resolve_photo_url(photo_filename, default_subfolder="faces")
        plate_photo_url = self._resolve_photo_url(plate_photo_filename, default_subfolder="plates")
        
        session = create_gate_in_session(
            plate_number=clean_plate,
            embedding=embedding,
            face_photo_path=face_photo_url,
            plate_photo_path=plate_photo_url,
            driver_persona=driver_persona,
            notes="Kendaraan terdeteksi di area Gate-In. Kamera 1 & 2 mengambil gambar."
        )

        decision_notes = (
            f"[GATE-IN] Kendaraan terdeteksi di area gate-in. Kamera 1 merekam plat nomor ({clean_plate}) "
            f"dan Kamera 2 merekam wajah pengendara. Data fitur biometrik ArcFace berhasil disimpan ke database. "
            f"Kamera 3 standby. Palang masuk terbuka."
        )

        log_id = insert_parking_log(
            session_id=session["session_id"],
            plate_number=clean_plate,
            gate_mode="GATE_IN",
            status="NORMAL",
            decision_notes=decision_notes,
            similarity_score=None,
            plate_photo_path=plate_photo_url,
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
            "camera_3_triggered": False,
            "face_photo_url": face_photo_url,
            "plate_photo_url": plate_photo_url,
            "entry_photo_url": face_photo_url,
            "exit_photo_url": None,
            "baseline_photo_url": face_photo_url,
            "anomaly_evidence_url": None,
            "camera_1_plate_photo_url": plate_photo_url,
            "camera_2_face_photo_url": face_photo_url,
            "camera_3_evidence_url": None,
            "driver_persona": driver_persona
        }

    # =========================================================
    # CORE PROCESSOR: GATE-OUT (Kendaraan Keluar - 1-to-1 Match)
    # Flowchart: Kamera 1 & 2 ambil gambar -> Cocokkan wajah histori gate-in:
    # -> Data Sesuai: Status NORMAL, Kamera 3 tidak melakukan trigger
    # -> Data Tidak Sesuai: Status ANOMALI, Kamera 3 melakukan trigger terhadap pengendara
    # =========================================================
    def process_gate_out(
        self,
        clean_plate: str,
        exit_embedding: list,
        driver_persona: str,
        exit_photo_filename: str,
        plate_photo_filename: Optional[str] = None,
        camera3_evidence_filename: Optional[str] = None,
        is_real_webcam: bool = False
    ) -> Dict[str, Any]:
        threshold = self.real_face_threshold if is_real_webcam else self.simulation_threshold
        active_session = get_active_session_by_plate(clean_plate)
        exit_photo_url = self._resolve_photo_url(exit_photo_filename, default_subfolder="faces")
        plate_photo_url = self._resolve_photo_url(plate_photo_filename, default_subfolder="plates")

        if not active_session:
            # Anomaly: Vehicle attempting to exit without Gate-In record!
            status = "ANOMALY"
            gate_action = "LOCK"
            camera_3_triggered = True
            
            # Camera 3 triggers to record evidence
            evidence_url = self._resolve_photo_url(camera3_evidence_filename, default_subfolder="anomalies") if camera3_evidence_filename else exit_photo_url
            decision_notes = (
                f"[ANOMALI GATE-OUT] Kendaraan plat {clean_plate} TIDAK MEMILIKI histori Gate-In di database! "
                f"Status: ANOMALI. Kamera 3 MELAKUKAN TRIGGER terhadap pengendara untuk merekam bukti forensik. "
                f"Palang keluar dikunci."
            )

            log_id = insert_parking_log(
                plate_number=clean_plate,
                gate_mode="GATE_OUT",
                status="ANOMALY",
                decision_notes=decision_notes,
                similarity_score=0.0,
                plate_photo_path=plate_photo_url,
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
                "camera_3_triggered": True,
                "face_photo_url": exit_photo_url,
                "plate_photo_url": plate_photo_url,
                "entry_photo_url": None,
                "exit_photo_url": exit_photo_url,
                "baseline_photo_url": None,
                "anomaly_evidence_url": evidence_url,
                "camera_1_plate_photo_url": plate_photo_url,
                "camera_2_face_photo_url": exit_photo_url,
                "camera_3_evidence_url": evidence_url,
                "driver_persona": driver_persona
            }

        # Compare exit face with entry face
        entry_embedding = active_session["entry_face_embedding"]
        entry_photo_url = active_session.get("entry_face_photo")
        similarity = face_recognizer.compute_cosine_similarity(exit_embedding, entry_embedding)
        similarity_score = round(float(similarity), 4)

        if similarity_score >= threshold:
            # Data sesuai
            status = "NORMAL"
            gate_action = "OPEN"
            camera_3_triggered = False # Flowchart: "Kamera 3 tidak melakukan trigger terhadap pengendara"
            evidence_url = None
            decision_notes = (
                f"[VERIFIKASI GATE-OUT] Data biometrik wajah SESUAI dengan histori gate-in. "
                f"Tingkat Kemiripan ArcFace: {similarity_score * 100:.1f}% (Ambang: {threshold * 100:.0f}%). "
                f"Status: NORMAL. Kamera 3 TIDAK melakukan trigger. Palang gerbang keluar dibuka otomatis."
            )
        else:
            # Data tidak sesuai
            status = "ANOMALY"
            gate_action = "LOCK"
            camera_3_triggered = True # Flowchart: "Kamera 3 melakukan trigger terhadap pengendara"
            evidence_url = self._resolve_photo_url(camera3_evidence_filename, default_subfolder="anomalies") if camera3_evidence_filename else exit_photo_url
            decision_notes = (
                f"[PERINGATAN ANOMALI GATE-OUT] Data biometrik wajah TIDAK SESUAI dengan histori gate-in! "
                f"Tingkat Kemiripan hanya {similarity_score * 100:.1f}% (di bawah ambang {threshold * 100:.0f}%). "
                f"Status: ANOMALI. Kamera 3 MELAKUKAN TRIGGER terhadap pengendara untuk merekam foto resolusi tinggi. "
                f"Palang gerbang keluar dikunci dan notifikasi keamanan terkirim!"
            )

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
            plate_photo_path=plate_photo_url,
            face_photo_path=exit_photo_url,
            entry_photo_path=entry_photo_url,
            anomaly_evidence_path=evidence_url,
            high_res_triggered=camera_3_triggered,
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
            "high_res_camera_triggered": camera_3_triggered,
            "camera_3_triggered": camera_3_triggered,
            "face_photo_url": exit_photo_url,
            "plate_photo_url": plate_photo_url,
            "entry_photo_url": entry_photo_url,
            "exit_photo_url": exit_photo_url,
            "baseline_photo_url": entry_photo_url,
            "anomaly_evidence_url": evidence_url,
            "camera_1_plate_photo_url": plate_photo_url,
            "camera_2_face_photo_url": exit_photo_url,
            "camera_3_evidence_url": evidence_url,
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
        clean_plate, _ = plate_ocr.process_plate_image(np.zeros((100, 100, 3)), plate_input)
        current_embedding, _ = face_recognizer.extract_face_embedding(
            np.zeros((100, 100, 3)), person_id_hint=driver_persona
        )

        mode = gate_mode.upper() if gate_mode else ("GATE_IN" if event_type.upper() == "ENTRY" else "GATE_OUT")

        if mode == "GATE_IN":
            photo_file = self._generate_synthetic_evidence_image(
                clean_plate, "GATE_IN", driver_persona, False, None, camera_id="CAM 02"
            )
            return self.process_gate_in(
                clean_plate=clean_plate,
                embedding=current_embedding,
                driver_persona=driver_persona,
                photo_filename=photo_file,
                plate_photo_filename=None
            )
        else:
            # Check if this persona is anomalous to simulate Camera 3 trigger
            is_anomaly = (driver_persona == "driver_thief")
            photo_file = self._generate_synthetic_evidence_image(
                clean_plate, "GATE_OUT", driver_persona, False, None, camera_id="CAM 02"
            )
            cam3_file = None
            if is_anomaly:
                cam3_file = self._generate_synthetic_evidence_image(
                    clean_plate, "GATE_OUT", driver_persona, True, 0.05, camera_id="CAM 03"
                )

            return self.process_gate_out(
                clean_plate=clean_plate,
                exit_embedding=current_embedding,
                driver_persona=driver_persona,
                exit_photo_filename=photo_file,
                plate_photo_filename=None,
                camera3_evidence_filename=cam3_file,
                is_real_webcam=False
            )

    def process_live_webcam(
        self,
        plate_input: Optional[str] = None,
        image_base64: Optional[str] = None,
        plate_image_base64: Optional[str] = None,
        camera3_image_base64: Optional[str] = None,
        gate_mode: str = "GATE_OUT",
        event_type: str = "EXIT"
    ) -> Dict[str, Any]:
        """
        Handles real multi-camera live input:
        - Camera 1 (plate_image_base64): automatic OCR extraction of plate number.
        - Camera 2 (image_base64): YuNet + SFace biometric feature extraction.
        - Camera 3 (camera3_image_base64): triggered high-res snapshot when anomaly detected!
        """
        mode = gate_mode.upper() if gate_mode else ("GATE_IN" if event_type.upper() == "ENTRY" else "GATE_OUT")
        clean_plate = None
        plate_file = None

        # 1. CAMERA 1: Process ANPR Plate if frame provided
        if plate_image_base64:
            if "," in plate_image_base64:
                plate_image_base64 = plate_image_base64.split(",")[1]
            p_bytes = base64.b64decode(plate_image_base64)
            p_arr = np.frombuffer(p_bytes, np.uint8)
            plate_frame = cv2.imdecode(p_arr, cv2.IMREAD_COLOR)
            if plate_frame is not None:
                ocr_res = plate_ocr.scan_plate_from_image(plate_frame)
                if ocr_res.get("success") and ocr_res.get("plate_number"):
                    clean_plate = ocr_res["plate_number"]
                plate_file = self._save_plate_frame(plate_frame, clean_plate or (plate_input or "B 1234 SKR"))

        # Fallback to manual plate input if OCR did not catch
        if not clean_plate:
            raw_input = plate_input.strip() if (plate_input and plate_input.strip()) else "B 1234 SKR"
            clean_plate, _ = plate_ocr.process_plate_image(np.zeros((10, 10, 3)), raw_input)

        # 2. CAMERA 2: Process Driver Face Frame
        if not image_base64:
            raise ValueError("Citra Kamera 2 (Wajah Pengendara) tidak boleh kosong.")

        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]
        f_bytes = base64.b64decode(image_base64)
        f_arr = np.frombuffer(f_bytes, np.uint8)
        face_frame = cv2.imdecode(f_arr, cv2.IMREAD_COLOR)

        if face_frame is None:
            raise ValueError("Citra Kamera 2 tidak valid.")

        current_embedding, meta, face_crop = face_recognizer.process_real_webcam_image(face_frame)

        if mode == "GATE_IN":
            photo_file = self._save_real_annotated_frame(
                frame=face_frame,
                plate_str=clean_plate,
                gate_mode="GATE_IN",
                is_anomaly=False,
                similarity=None,
                meta=meta,
                camera_label="CAM 02"
            )
            return self.process_gate_in(
                clean_plate=clean_plate,
                embedding=current_embedding,
                driver_persona="Webcam Live Masuk",
                photo_filename=photo_file,
                plate_photo_filename=plate_file
            )
        else:
            # Check active session & compute similarity
            active_session = get_active_session_by_plate(clean_plate)
            sim = None
            is_anomaly = True
            if active_session:
                sim = face_recognizer.compute_cosine_similarity(current_embedding, active_session["entry_face_embedding"])
                is_anomaly = (sim < self.real_face_threshold)

            photo_file = self._save_real_annotated_frame(
                frame=face_frame,
                plate_str=clean_plate,
                gate_mode="GATE_OUT",
                is_anomaly=is_anomaly,
                similarity=sim,
                meta=meta,
                camera_label="CAM 02"
            )

            # 3. CAMERA 3: Triggered high-res capture on Anomaly!
            cam3_file = None
            if is_anomaly:
                if camera3_image_base64 and len(camera3_image_base64) > 50:
                    try:
                        raw_c3 = camera3_image_base64.split(",")[1] if "," in camera3_image_base64 else camera3_image_base64
                        c3_bytes = base64.b64decode(raw_c3)
                        c3_arr = np.frombuffer(c3_bytes, np.uint8)
                        cam3_frame = cv2.imdecode(c3_arr, cv2.IMREAD_COLOR)
                        if cam3_frame is not None and cam3_frame.size > 0:
                            cam3_file = self._save_camera3_evidence(cam3_frame, clean_plate, sim)
                    except Exception as e:
                        print(f"[WARN] Gagal decode base64 Camera 3, fallback ke frame wajah: {e}")
                
                # If Camera 3 hardware frame wasn't supplied or failed decode, use Camera 2 frame as high-res evidence
                if not cam3_file:
                    cam3_file = self._save_camera3_evidence(face_frame, clean_plate, sim)

            return self.process_gate_out(
                clean_plate=clean_plate,
                exit_embedding=current_embedding,
                driver_persona="Webcam Live Keluar",
                exit_photo_filename=photo_file,
                plate_photo_filename=plate_file,
                camera3_evidence_filename=cam3_file,
                is_real_webcam=True
            )

decision_engine = ParkingDecisionEngine()
