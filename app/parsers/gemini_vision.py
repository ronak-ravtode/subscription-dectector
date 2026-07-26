import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()


def extract_text_from_pdf_image(pdf_path: str) -> str:
    """Send PDF as image to Gemini Vision for text extraction."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        return ""

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = (
            "Extract all transaction data from this bank statement image. "
            "Return each transaction on a separate line with format: "
            "DATE | AMOUNT | DESCRIPTION. "
            "Example: 15/01/2024 | 15.99 | NETFLIX.COM"
        )

        import fitz
        doc = fitz.open(pdf_path)
        all_text = []

        for page_num in range(min(len(doc), 5)):
            page = doc[page_num]
            pix = page.get_pixmap(dpi=150)
            img_data = pix.tobytes("png")

            response = model.generate_content(
                [prompt, {"mime_type": "image/png", "data": img_data}]
            )
            if response.text:
                all_text.append(response.text)

        doc.close()
        return "\n".join(all_text)

    except Exception:
        return ""
