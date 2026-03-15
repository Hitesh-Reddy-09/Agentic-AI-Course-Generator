from __future__ import annotations

from youtube_transcript_api import YouTubeTranscriptApi


class TranscriptTool:
    def __init__(self) -> None:
        # Newer youtube_transcript_api versions expose instance methods (fetch/list).
        self._api = YouTubeTranscriptApi()

    def fetch_transcript(self, video_id: str) -> str:
        try:
            if hasattr(YouTubeTranscriptApi, "get_transcript"):
                # Backward compatibility for older library versions.
                data = YouTubeTranscriptApi.get_transcript(video_id)
            else:
                fetched = self._api.fetch(video_id, languages=("en",), preserve_formatting=False)
                data = [{"text": snippet.text} for snippet in fetched]
        except Exception:
            return ""
        return "\n".join(chunk["text"] for chunk in data)
