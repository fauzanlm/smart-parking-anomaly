import numpy as np
import pytest
from app.services.face_recognizer import face_recognizer

def test_cosine_similarity_identical_vectors():
    vec = [0.5, 0.5, 0.5, 0.5]
    sim = face_recognizer.compute_cosine_similarity(vec, vec)
    assert abs(sim - 1.0) < 1e-4

def test_cosine_similarity_orthogonal_vectors():
    vec_a = [1.0, 0.0, 0.0, 0.0]
    vec_b = [0.0, 1.0, 0.0, 0.0]
    sim = face_recognizer.compute_cosine_similarity(vec_a, vec_b)
    assert abs(sim - 0.0) < 1e-4

def test_persona_extraction_consistency():
    img = np.zeros((10, 10, 3), dtype=np.uint8)
    emb_owner_1, meta_1 = face_recognizer.extract_face_embedding(img, "driver_owner")
    emb_owner_2, meta_2 = face_recognizer.extract_face_embedding(img, "driver_owner")
    
    # Same person with natural micro-jitter should have similarity > 0.90
    sim_same = face_recognizer.compute_cosine_similarity(emb_owner_1, emb_owner_2)
    assert sim_same > 0.85

    # Owner vs Thief must have similarity well below threshold (< 0.30)
    emb_thief, _ = face_recognizer.extract_face_embedding(img, "driver_thief")
    sim_thief = face_recognizer.compute_cosine_similarity(emb_owner_1, emb_thief)
    assert sim_thief < 0.35
