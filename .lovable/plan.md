Replace the studio image on the homepage with a clean tablet-only shot.

**Steps:**
1. Generate a new image with `imagegen--generate_image` (premium quality for legible on-screen text) at `src/assets/studio-room.jpg`, overwriting the existing file.
   - Prompt: a single modern bezel-less tablet (iPad-style) lying flat on a neutral textured light-grey concrete surface; illuminated screen showing a clean, elegant booking-confirmation UI with the words "Silent Mode" and "Booking Confirmation" in a modern sans-serif font; completely empty, out-of-focus, neutral background; soft warm side lighting; shallow depth of field, editorial product photography; no massage table, no room, no people, no clutter.
2. Update the `alt` text in `src/routes/index.tsx` (line ~87) so it describes the tablet instead of the treatment room.

No other code changes; the homepage already imports `studio-room.jpg`, so the new image appears in place.