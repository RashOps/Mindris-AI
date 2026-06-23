"""Vector Database manager for Mindris AI using ChromaDB.

This module provides a local, persistent vector store using ChromaDB.
It abstracts the embeddings setup and provides simple methods to index
and search data.
"""

from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_huggingface import HuggingFaceEmbeddings
from utils.config import settings


class MindrisVectorStore:
    """Manages connection to the local ChromaDB storage and the embedding model."""

    def __init__(self, collection_name: str = "mindris_master_profile") -> None:
        """Initialize the ChromaDB client and create/get the collection.

        Args:
            collection_name: The name of the collection to use.
        """
        # Initialize persistent ChromaDB client
        self.client = chromadb.PersistentClient(
            path=str(settings.chroma_db_dir),
            settings=ChromaSettings(anonymized_telemetry=False),
        )

        # We use HuggingFaceEmbeddings through Langchain because it provides
        # a standard interface and runs entirely offline on WSL, removing the
        # need to communicate with Ollama on the Windows host for embeddings.
        self.embeddings = HuggingFaceEmbeddings(
            model_name=settings.embedding_model,
        )

        # Create or get the collection
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},  # Standard for text embeddings
        )

    def add_texts(
        self,
        texts: list[str],
        metadatas: list[dict[str, Any]] | None = None,
        ids: list[str] | None = None,
    ) -> None:
        """Embed and add a list of texts to the collection.

        Args:
            texts: List of strings to embed and store.
            metadatas: Optional list of metadata dicts corresponding to the texts.
            ids: Optional list of unique IDs for the texts. If None, they are generated.
        """
        if not ids:
            import uuid

            ids = [str(uuid.uuid4()) for _ in texts]

        if not metadatas:
            metadatas = [{} for _ in texts]

        # Generate embeddings
        embedded_texts = self.embeddings.embed_documents(texts)

        # Add to Chroma
        self.collection.add(
            embeddings=embedded_texts,
            documents=texts,
            metadatas=metadatas,
            ids=ids,
        )

    def search(
        self, query: str, k: int = 4, filter_dict: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """Search the collection for the most similar documents.

        Args:
            query: The search string.
            k: Number of results to return.
            filter_dict: Optional metadata filter.

        Returns:
            A list of dicts containing the document, metadata, id, and distance score.
        """
        query_embedding = self.embeddings.embed_query(query)

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            where=filter_dict,
        )

        output = []
        if not results["documents"] or not results["documents"][0]:
            return output

        # Chroma returns lists of lists because you can pass multiple query embeddings
        docs = results["documents"][0]
        metas = results["metadatas"][0] if results["metadatas"] else [{}] * len(docs)
        ids = results["ids"][0]

        # Handle distances gracefully
        if results.get("distances") and results["distances"][0]:
            distances = results["distances"][0]
        else:
            distances = [0.0] * len(docs)

        for doc, meta, doc_id, dist in zip(docs, metas, ids, distances, strict=False):
            output.append(
                {
                    "id": doc_id,
                    "document": doc,
                    "metadata": meta,
                    "distance": dist,
                }
            )

        return output

    def clear(self) -> None:
        """Clear all data from the collection. Useful for re-indexing."""
        # Get all ids to delete
        result = self.collection.get()
        if result and result["ids"]:
            self.collection.delete(ids=result["ids"])
