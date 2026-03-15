from __future__ import annotations

from typing import Any
from googleapiclient.discovery import build
from app.core.config import get_settings


class YouTubeTool:
    _call_count = 0
    _query_cache: dict[str, list[dict[str, Any]]] = {}

    def __init__(self) -> None:
        settings = get_settings()
        self._enabled = settings.youtube_api_enabled
        self._max_calls = settings.youtube_max_calls_per_process
        self._max_results = settings.max_youtube_results
        self._client = None
        if self._enabled and settings.youtube_api_key:
            self._client = build("youtube", "v3", developerKey=settings.youtube_api_key)

    def search_videos(self, query: str, max_results: int | None = None) -> list[dict[str, Any]]:
        if self._client is None:
            return []

        cache_key = f"{query.strip().lower()}::{max_results or self._max_results}"
        if cache_key in self._query_cache:
            return self._query_cache[cache_key]

        if self._call_count >= self._max_calls:
            return []

        req = self._client.search().list(
            q=query,
            part="snippet",
            type="video",
            maxResults=max_results or self._max_results,
        )
        resp = req.execute()
        self.__class__._call_count += 1
        items = []
        for item in resp.get("items", []):
            video_id = item["id"].get("videoId")
            if not video_id:
                continue
            snippet = item.get("snippet", {})
            items.append(
                {
                    "video_id": video_id,
                    "title": snippet.get("title", ""),
                    "description": snippet.get("description", ""),
                    "channel_title": snippet.get("channelTitle", ""),
                    "published_at": snippet.get("publishedAt", ""),
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                }
            )
        self._query_cache[cache_key] = items
        return items
