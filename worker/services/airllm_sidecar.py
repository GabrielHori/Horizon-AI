"""
AirLLM sidecar process.

Reads JSONL commands on stdin and writes JSONL responses on stdout.
Expected messages:
- {"type": "generate", "id": "...", "prompt": "...", "max_tokens": 256, "temperature": 0.7}
Status message after model load:
- {"type": "status", "status": "READY", "model": "<model_id>"}
Errors are reported as {"type": "status", "status": "ERROR", "error": "..."} or
per request {"id": "...", "ok": false, "error": "..."}.
"""
import argparse
import json
import sys
import threading
import time
import traceback
from typing import Any, Dict


def _safe_print(obj: Dict[str, Any]) -> None:
    """Serialize a dict as JSONL to stdout."""
    try:
        sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
        sys.stdout.flush()
    except Exception:
        # Nothing we can do if stdout is broken; best effort logging on stderr
        try:
            print(f"[sidcar-log] failed to write response: {obj}", file=sys.stderr)
        except Exception:
            pass


class AirLLMSidecar:
    def __init__(self, model_id: str, max_length: int = 2048):
        self.model_id = model_id
        self.max_length = max_length
        self.model = None
        self.tokenizer = None
        self.device = "cpu"
        self.load_error = None
        self.lock = threading.Lock()  # Prevent concurrent generations

    def _detect_device(self):
        """Pick GPU when available, else CPU."""
        try:
            import torch

            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            self.device = "cpu"

    def _load_model(self):
        """Load the requested model with AirLLM."""
        try:
            from airllm import AutoModel

            self._detect_device()
            self.model = AutoModel.from_pretrained(self.model_id)
            self.tokenizer = self.model.tokenizer
            _safe_print({"type": "status", "status": "READY", "model": self.model_id})
        except Exception as exc:
            self.load_error = str(exc)
            _safe_print(
                {
                    "type": "status",
                    "status": "ERROR",
                    "model": self.model_id,
                    "error": self.load_error,
                    "traceback": traceback.format_exc(limit=2),
                }
            )

    def _generate_text(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Run generation synchronously; caller must hold lock."""
        req_id = payload.get("id")
        prompt = payload.get("prompt", "")
        max_tokens = int(payload.get("max_tokens", 256) or 256)
        temperature = float(payload.get("temperature", 0.7) or 0.7)

        if not prompt:
            return {"id": req_id, "ok": False, "error": "Empty prompt"}

        if not self.model or not self.tokenizer:
            return {"id": req_id, "ok": False, "error": self.load_error or "Model not loaded"}

        try:
            import torch

            inputs = self.tokenizer(
                [prompt],
                return_tensors="pt",
                return_attention_mask=False,
                truncation=True,
                max_length=self.max_length,
                padding=False,
            )

            input_ids = inputs["input_ids"]
            if self.device == "cuda" and torch.cuda.is_available():
                input_ids = input_ids.cuda()

            generation_output = self.model.generate(
                input_ids,
                max_new_tokens=max_tokens,
                use_cache=True,
                return_dict_in_generate=True,
                temperature=temperature,
            )

            sequences = generation_output.sequences[0]
            start = input_ids.shape[1]
            generated_tokens = sequences[start:]
            text = self.tokenizer.decode(generated_tokens, skip_special_tokens=True)
            return {"id": req_id, "ok": True, "text": text}

        except Exception as exc:
            return {
                "id": req_id,
                "ok": False,
                "error": str(exc),
                "traceback": traceback.format_exc(limit=2),
            }

    def serve(self):
        """Main loop: load model then handle JSONL requests."""
        self._load_model()

        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError:
                _safe_print({"type": "status", "status": "ERROR", "error": f"Invalid JSON: {line}"})
                continue

            if payload.get("type") != "generate":
                _safe_print({"id": payload.get("id"), "ok": False, "error": "Unsupported command"})
                continue

            acquired = self.lock.acquire(timeout=1.0)
            if not acquired:
                _safe_print({"id": payload.get("id"), "ok": False, "error": "Generation already running"})
                continue

            try:
                start = time.time()
                result = self._generate_text(payload)
                result["elapsed_ms"] = int((time.time() - start) * 1000)
                _safe_print(result)
            finally:
                self.lock.release()


def main():
    parser = argparse.ArgumentParser(description="AirLLM sidecar")
    parser.add_argument("--model", required=True, help="HuggingFace model id or local path")
    parser.add_argument("--max-length", type=int, default=2048, help="Maximum prompt length")
    args = parser.parse_args()

    # Ensure stdout uses UTF-8
    if sys.platform == "win32":
        if sys.stdout:
            sys.stdout.reconfigure(encoding="utf-8")
        if sys.stdin:
            sys.stdin.reconfigure(encoding="utf-8")

    sidecar = AirLLMSidecar(model_id=args.model, max_length=args.max_length)
    sidecar.serve()


if __name__ == "__main__":
    main()
