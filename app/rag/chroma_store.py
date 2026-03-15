from __future__ import annotations

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
from app.core.config import get_settings


class ChromaVectorStore:
    def __init__(self, collection_name: str) -> None:
        settings = get_settings()
        embeddings = HuggingFaceEmbeddings(model_name=settings.embedding_model)
        self._store = Chroma(
            collection_name=collection_name,
            persist_directory=settings.chroma_persist_directory,
            embedding_function=embeddings,
        )

    def upsert_texts(self, texts: list[str], metadatas: list[dict]) -> None:
        docs = [Document(page_content=t, metadata=m) for t, m in zip(texts, metadatas, strict=False)]
        if docs:
            self._store.add_documents(docs)

    def similarity_search(self, query: str, k: int = 4) -> list[Document]:
        return self._store.similarity_search(query=query, k=k)
