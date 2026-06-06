import sys

try:
    import fitz
except Exception as exc:
    raise SystemExit(f"PyMuPDF is required to extract PDF text: {exc}")

if len(sys.argv) != 2:
    raise SystemExit("Usage: extract-pdf-text.py <pdf-path>")

doc = fitz.open(sys.argv[1])
for page in doc:
    print(page.get_text("text"))
