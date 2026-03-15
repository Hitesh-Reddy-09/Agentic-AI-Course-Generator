from __future__ import annotations

from app.rag.chroma_store import ChromaVectorStore


class RAGRetriever:
    def __init__(self, collection_name: str) -> None:
        self._store = ChromaVectorStore(collection_name=collection_name)

    def retrieve_context(self, query: str, k: int = 4) -> str:
        docs = self._store.similarity_search(query=query, k=k)
        return "\n\n".join(doc.page_content for doc in docs)
