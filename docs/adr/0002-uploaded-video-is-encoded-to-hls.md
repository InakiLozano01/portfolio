---
status: accepted
---

# Uploaded video is encoded to multi-quality HLS

Artifacts accept video uploads of up to 1 GB. Each upload is encoded by ffmpeg in a worker container into HLS at several qualities, and the original file is deleted once encoding finishes, so that playback adapts to the viewer's connection and stays behind the artifact's access control.

## Considered Options

- **Serve the uploaded MP4 with range requests**: no worker and no player script, but one quality for every connection and the owner must upload a browser-ready file.
- **One optimised MP4 per upload**: simpler than HLS, still a single quality.
- **Embed only (YouTube, Drive, Vimeo)**: no server work, but the video sits outside the artifact's access control. Embeds remain allowed alongside uploads.

## Consequences

- Artifacts storage is capped at 20 GB in total because the VPS disk is shared and nearly full; uploads are refused past the cap.
- With the original deleted, a video cannot be re-encoded later at a different quality without uploading it again.
- A video is not playable until its encoding finishes, so an artifact can be published before its video is ready.
- Uploads go in parts, because Cloudflare sits in front and limits the size of a single request.
