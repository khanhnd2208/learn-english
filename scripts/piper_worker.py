"""Piper worker for Learn English: loads the voice once, then voices one request per line.

Started by src/services/english/enTtsService.ts as `python piper_worker.py <model.onnx>`.
Loading the voice takes seconds; voicing a word afterwards takes about a tenth of a second.

stdin:  {"id": 1, "text": "thirsty.", "out": "/path/file.wav"}
stdout: {"ready": true} once, then {"id": 1, "ok": true} or {"id": 1, "ok": false, "error": "..."}
"""
import json
import sys
import wave

from piper import PiperVoice


def reply(message):
    sys.stdout.write(json.dumps(message) + "\n")
    sys.stdout.flush()


def main():
    voice = PiperVoice.load(sys.argv[1])
    reply({"ready": True})
    for line in sys.stdin:
        try:
            job = json.loads(line)
        except ValueError:
            continue
        try:
            with wave.open(job["out"], "wb") as output:
                voice.synthesize_wav(job["text"], output)
            reply({"id": job["id"], "ok": True})
        except Exception as error:  # one bad request must not stop the worker
            reply({"id": job.get("id"), "ok": False, "error": str(error)})


if __name__ == "__main__":
    main()
