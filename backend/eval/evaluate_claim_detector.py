"""
if anyone is reading this then this file is just for evaluation of node and this is not part of main graph backend :)
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.agents.graph import claim_llm, CLAIM_PROMPT

TEST_SET_PATH = os.path.join(os.path.dirname(__file__), "claim_detection_testset.json")


def load_test_cases():
    with open(TEST_SET_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def run_evaluation():
    test_cases = load_test_cases()
    y_true, y_pred, mismatches = [], [], []

    for case in test_cases:
        prompt = CLAIM_PROMPT.format(
            question=case["question"], answer=case["answer"], startup_name=case["startup_name"],
        )
        result = claim_llm.invoke(prompt)

        y_true.append(case["expected_claim_found"])
        y_pred.append(result.claim_found)

        if result.claim_found != case["expected_claim_found"]:
            mismatches.append({
                "question": case["question"], "answer": case["answer"],
                "expected": case["expected_claim_found"], "got": result.claim_found,
                "extracted_claim": result.claim_text,
            })

    tp = sum(1 for t, p in zip(y_true, y_pred) if t and p)
    fp = sum(1 for t, p in zip(y_true, y_pred) if not t and p)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t and not p)
    tn = sum(1 for t, p in zip(y_true, y_pred) if not t and not p)

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    accuracy = (tp + tn) / len(y_true) if y_true else 0.0

    print("=" * 50)
    print(f"Claim Detector Evaluation — {len(test_cases)} cases")
    print("=" * 50)
    print(f"Accuracy:  {accuracy:.2%}")
    print(f"Precision: {precision:.2%}")
    print(f"Recall:    {recall:.2%}")
    print(f"F1:        {f1:.2%}")
    print(f"Confusion: TP={tp} FP={fp} FN={fn} TN={tn}")

    if mismatches:
        print(f"\n{len(mismatches)} mismatch(es):")
        for m in mismatches:
            print(f"  Q: {m['question'][:70]}")
            print(f"  A: {m['answer'][:70]}")
            print(f"  expected={m['expected']}  got={m['got']}  extracted='{m['extracted_claim']}'\n")

    return {"accuracy": accuracy, "precision": precision, "recall": recall, "f1": f1}


if __name__ == "__main__":
    run_evaluation()