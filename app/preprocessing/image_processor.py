from PIL import Image, ImageEnhance, ImageFilter
import io


class ImageProcessor:
    """Preprocesses images for better OCR/extraction."""

    def process(self, image_bytes: bytes) -> bytes:
        """Process image for better text extraction."""
        try:
            img = Image.open(io.BytesIO(image_bytes))

            # Convert to RGB if needed
            if img.mode != "RGB":
                img = img.convert("RGB")

            # Enhance contrast
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.5)

            # Enhance sharpness
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(2.0)

            # Convert to grayscale for better OCR
            img = img.convert("L")

            # Apply slight denoise
            img = img.filter(ImageFilter.MedianFilter(size=3))

            # Save to bytes
            output = io.BytesIO()
            img.save(output, format="PNG")
            return output.getvalue()

        except Exception:
            return image_bytes
