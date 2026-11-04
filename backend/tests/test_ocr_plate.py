import cv2
import numpy as np
import pytest
from app.services.plate_ocr import plate_ocr

def test_clean_plate_text():
    # Test normalization of Indonesian vehicle plates
    assert plate_ocr.clean_plate_text("b1234wlm") == "B 1234 WLM"
    assert plate_ocr.clean_plate_text("B-1234-WLM") == "B 1234 WLM"
    assert plate_ocr.clean_plate_text(" D 8888 BOS ") == "D 8888 BOS"
    assert plate_ocr.clean_plate_text("DK 4567 AA") == "DK 4567 AA"

def test_scan_plate_from_image_synthetic():
    # Test OCR extraction from rendered white paper
    img = np.ones((180, 550, 3), dtype=np.uint8) * 255
    cv2.putText(img, "B 1234 WLM", (40, 110), cv2.FONT_HERSHEY_SIMPLEX, 2.2, (0, 0, 0), 4)
    
    result = plate_ocr.scan_plate_from_image(img)
    assert result["success"] is True
    assert result["plate_number"] == "B 1234 WLM"
    assert result["photo_url"] is not None

def test_scan_plate_no_text():
    # Test when showing blank paper without plate text
    blank = np.ones((100, 100, 3), dtype=np.uint8) * 255
    result = plate_ocr.scan_plate_from_image(blank)
    assert result["success"] is False
    assert result["plate_number"] is None
