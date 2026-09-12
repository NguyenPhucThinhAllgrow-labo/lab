#!/usr/bin/env python3
"""Train the lightweight Chinese Chess move-ranking model from JSONL samples.

Each input line must contain:
  {"features": {"capture_value": 0.5, ...}, "label": 0|1}

Positive rows are moves associated with a win or selected by a stronger engine;
negative rows are alternative legal moves from the same position.
"""

from __future__ import annotations

import argparse
import json
import hashlib
import math
import random
from datetime import datetime, timezone
from pathlib import Path


FEATURES = (
    "capture_value",
    "gives_check",
    "gives_checkmate",
    "material_balance",
    "own_mobility",
    "opponent_mobility",
    "piece_position",
)

PRIOR_WEIGHTS = {
    "capture_value": 2.8,
    "gives_check": 0.75,
    "gives_checkmate": 12.0,
    "material_balance": 1.7,
    "own_mobility": 0.55,
    "opponent_mobility": -0.7,
    "piece_position": 0.4,
}


def sigmoid(value: float) -> float:
    value = max(-30.0, min(30.0, value))
    return 1.0 / (1.0 + math.exp(-value))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--learning-rate", type=float, default=0.03)
    parser.add_argument("--regularization", type=float, default=0.0005)
    args = parser.parse_args()

    samples = [json.loads(line) for line in args.dataset.read_text().splitlines() if line.strip()]
    if not samples:
        raise SystemExit("Dataset is empty")

    groups: dict[str, list[dict]] = {}
    for index, sample in enumerate(samples):
        key = f"{sample.get('game_id', 'legacy')}:{sample.get('ply', index)}"
        groups.setdefault(key, []).append(sample)

    train_pairs: list[tuple[list[float], str]] = []
    validation_pairs: list[list[float]] = []
    for key, rows in groups.items():
        positives = [row for row in rows if int(row["label"]) == 1]
        negatives = [row for row in rows if int(row["label"]) == 0]
        if not positives or not negatives:
            continue
        positive = positives[0]["features"]
        target = validation_pairs if int(hashlib.sha1(key.encode()).hexdigest()[:8], 16) % 10 == 0 else train_pairs
        for negative_row in negatives:
            negative = negative_row["features"]
            difference = [float(positive.get(name, 0.0)) - float(negative.get(name, 0.0)) for name in FEATURES]
            if target is validation_pairs:
                validation_pairs.append(difference)
            else:
                train_pairs.append((difference, key))

    if not train_pairs:
        raise SystemExit("Dataset does not contain grouped positive/negative move candidates")

    weights = dict(PRIOR_WEIGHTS)
    randomizer = random.Random(42)

    for epoch in range(args.epochs):
        randomizer.shuffle(train_pairs)
        rate = args.learning_rate / (1.0 + epoch * 0.08)
        for difference, _ in train_pairs:
            margin = sum(weights[name] * difference[index] for index, name in enumerate(FEATURES))
            error = 1.0 - sigmoid(margin)
            for index, name in enumerate(FEATURES):
                pull_to_prior = args.regularization * (weights[name] - PRIOR_WEIGHTS[name])
                weights[name] += rate * (error * difference[index] - pull_to_prior)

    validation_accuracy = None
    if validation_pairs:
        correct = sum(
            1 for difference in validation_pairs
            if sum(weights[name] * difference[index] for index, name in enumerate(FEATURES)) > 0
        )
        validation_accuracy = correct / len(validation_pairs)

    model = {
        "version": f"linear-policy-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "algorithm": "pairwise-logistic-ranking",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_examples": len(samples),
        "feature_names": list(FEATURES),
        "training_pairs": len(train_pairs),
        "validation_pairs": len(validation_pairs),
        "validation_accuracy": round(validation_accuracy, 6) if validation_accuracy is not None else None,
        "bias": 0.0,
        "weights": {name: round(value, 8) for name, value in weights.items()},
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(model, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
